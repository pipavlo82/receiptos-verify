"""Additive source closure; never rewrites the historical root source lock."""
import argparse
import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA = 'agent-action.research-source-lock.v0'
SCOPE = 'All experiment files except this lock and its outer SHA256SUMS. Historical host lock is unchanged.'
EXCLUDED = {'source-lock.json', 'SHA256SUMS'}
SHA256 = re.compile(r'[0-9a-f]{64}')


def exact_path(value):
    """Admit only the exact relative POSIX spelling used by the inventory."""
    return (isinstance(value, str) and bool(value) and '\\' not in value
            and not any(part in ('', '.', '..') for part in value.split('/'))
            and not pathlib.PurePosixPath(value).is_absolute()
            and not re.match(r'^[A-Za-z]:', value))


def unique_fields(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON field: ' + key)
        result[key] = value
    return result


def inventory_map(record):
    if (not isinstance(record, dict) or set(record) != {'schema', 'scope', 'files'}
            or record['schema'] != SCHEMA or record['scope'] != SCOPE
            or not isinstance(record['files'], list)):
        raise ValueError('invalid inventory metadata')
    result = {}
    for row in record['files']:
        if (not isinstance(row, dict) or set(row) != {'path', 'bytes', 'sha256'}
                or not exact_path(row['path']) or row['path'] in EXCLUDED
                or type(row['bytes']) is not int or row['bytes'] < 0
                or not isinstance(row['sha256'], str) or not SHA256.fullmatch(row['sha256'])):
            raise ValueError('invalid inventory entry')
        if row['path'] in result:
            raise ValueError('duplicate inventory path: ' + row['path'])
        result[row['path']] = {'bytes': row['bytes'], 'sha256': row['sha256']}
    return result


def manifest_map(text):
    result = {}
    for line in text.splitlines():
        if len(line) < 67 or line[64:66] != '  ' or not SHA256.fullmatch(line[:64]) or not exact_path(line[66:]):
            raise ValueError('invalid outer manifest entry')
        digest, path = line[:64], line[66:]
        if path in result:
            raise ValueError('duplicate outer manifest path: ' + path)
        result[path] = digest
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    files, errors = [], []
    try:
        for f in ROOT.rglob('*'):
            rel = f.relative_to(ROOT).as_posix()
            if f.is_symlink():
                errors.append('SYMLINK:' + rel)
                continue
            if not f.is_file() or rel in EXCLUDED:
                continue
            b = f.read_bytes()
            if f.suffix not in ['.png', '.zip'] and (b'\r' in b or b.startswith(b'\xef\xbb\xbf')):
                errors.append('LF_OR_BOM:' + rel)
            if f.suffix == '.md':
                for target in re.findall(r'\]\(([^)]+)\)', b.decode('utf-8')):
                    target = target.split('#')[0]
                    if target and not re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:', target) and not (f.parent / target).is_file():
                        errors.append('BROKEN_LINK:' + rel + ':' + target)
            files.append({'path': rel, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()})
    except (OSError, UnicodeError, ValueError) as error:
        errors.append('RESEARCH_SOURCE_READ_FAILED:' + str(error))
    # pathlib ordering depends on the host OS. Persist exact relative POSIX order.
    files.sort(key=lambda row: row['path'])
    record = {'schema': SCHEMA, 'scope': SCOPE, 'files': files}
    if args.write:
        if not errors:
            (ROOT / 'source-lock.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8', newline='\n')
            manifest = files + [{'path': 'source-lock.json', 'sha256': hashlib.sha256((ROOT / 'source-lock.json').read_bytes()).hexdigest()}]
            (ROOT / 'SHA256SUMS').write_text(''.join(row['sha256'] + '  ' + row['path'] + '\n' for row in sorted(manifest, key=lambda row: row['path'])), encoding='utf-8', newline='\n')
    else:
        try:
            locked = json.loads((ROOT / 'source-lock.json').read_text('utf-8'), object_pairs_hook=unique_fields)
            # Existing locks may use Windows Path ordering; identity is exact paths and bytes.
            if inventory_map(locked) != inventory_map(record):
                errors.append('RESEARCH_SOURCE_CLOSURE_MISMATCH')
        except (OSError, UnicodeError, ValueError, TypeError) as error:
            errors.append('RESEARCH_SOURCE_LOCK_INVALID:' + str(error))
        try:
            expected = {row['path']: row['sha256'] for row in files}
            expected['source-lock.json'] = hashlib.sha256((ROOT / 'source-lock.json').read_bytes()).hexdigest()
            if manifest_map((ROOT / 'SHA256SUMS').read_text('utf-8')) != expected:
                errors.append('OUTER_MANIFEST_MISMATCH')
        except (OSError, UnicodeError, ValueError, TypeError) as error:
            errors.append('OUTER_MANIFEST_INVALID:' + str(error))
    print(json.dumps({'files': len(files), 'status': 'FAIL' if errors else 'PASS', 'errors': errors}))
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
