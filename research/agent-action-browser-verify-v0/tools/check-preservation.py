"""Pinned historical preservation with two explicit versioned inventory exceptions."""
import hashlib
import json
import os
import pathlib
import subprocess
import sys

RESEARCH = pathlib.Path(__file__).resolve().parents[1]
HOST = RESEARCH.parents[1]
BASELINE_SHA256 = '35152e9ba590f8bb8493e75bea8a00ea2752af765a40ed91847f8580e965dce8'
BASELINE_COUNT = 2156
POLICY = 'receiptos.verify.historical-preservation.v2'
VERSIONED_METADATA = {
    'source-lock.json': ('provenance/source-inventory-v1/source-lock.json', '938820d6a5608fcb34eda832289c539802f51577f6f6e8eb72cd4b11559a9511'),
    'tools/check-sources.mjs': ('provenance/source-inventory-v1/check-sources.mjs', 'c6cb62c308762ba4d3722dc14de74c0898a700c7f65f174deeb68354b0b00fe6'),
}


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def unique_fields(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON field: ' + key)
        result[key] = value
    return result


def read_baseline(data):
    if hashlib.sha256(data).hexdigest() != BASELINE_SHA256:
        raise ValueError('HISTORICAL_BASELINE_INVENTORY_CHANGED')
    baseline = json.loads(data, object_pairs_hook=unique_fields)
    if not isinstance(baseline, dict) or len(baseline) != BASELINE_COUNT:
        raise ValueError('HISTORICAL_BASELINE_COUNT_CHANGED')
    return baseline


def regular_inside(host, path):
    """Resolve the host alias, then reject links/junctions within its boundary."""
    current = host.resolve()
    for part in pathlib.PurePosixPath(path).parts:
        current = current / part
        if current.is_symlink() or current.is_junction():
            return False
    return current.is_file() and current.resolve().is_relative_to(host.resolve())


def verify_history(host, baseline, counts=None):
    """Only the two named metadata paths may differ; their original bytes survive."""
    failures = []
    unchanged = 0
    for path, expected in baseline.items():
        if path in VERSIONED_METADATA:
            snapshot, frozen = VERSIONED_METADATA[path]
            if expected != frozen:
                failures.append('HISTORICAL_METADATA_BASELINE_CHANGED:' + path)
            file = host / snapshot
            if not regular_inside(host, snapshot) or digest(file) != frozen:
                failures.append('HISTORICAL_METADATA_SNAPSHOT_CHANGED:' + path)
            current = host / path
            if not regular_inside(host, path):
                failures.append('CURRENT_METADATA_NOT_REGULAR:' + path)
        else:
            file = host / path
            if not regular_inside(host, path) or digest(file) != expected:
                failures.append('HISTORICAL_FILE_CHANGED:' + path)
            else:
                unchanged += 1
    for path in VERSIONED_METADATA:
        if path not in baseline:
            failures.append('HISTORICAL_METADATA_BASELINE_MISSING:' + path)
    if counts is not None:
        counts['historical_files_unchanged'] = unchanged
    return failures


def main():
    support = pathlib.Path(os.environ.get('AGENT_ACTION_SUPPORT', 'D:/PAVLO HQ/Workspaces/agent-action-verify-v0'))
    failures = []
    counts = {'historical_files_unchanged': 0}
    try:
        baseline = read_baseline((RESEARCH / 'evidence/baseline-file-inventory.json').read_bytes())
        failures.extend(verify_history(HOST, baseline, counts))
    except (OSError, ValueError, TypeError) as error:
        baseline = {}
        failures.append(str(error))
    pins = json.loads((RESEARCH / 'source-pins.json').read_text('utf-8'))
    for row in pins['repositories']:
        if not row['runtime_dependency']:
            continue
        checkout = support / 'sources' / row['repository'].replace('/', '--')
        process = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=checkout, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode or process.stdout.decode().strip() != row['sha']:
            failures.append('EXTERNAL_SOURCE_PIN:' + row['repository'])
        for path, expected in row['runtime_files'].items():
            file = checkout / path
            if file.is_symlink() or not file.is_file() or digest(file) != expected:
                failures.append('EXTERNAL_SOURCE_BYTES:' + row['repository'] + '/' + path)
    print(json.dumps({
        'policy': POLICY, 'historical_files': len(baseline),
        'historical_files_unchanged': counts['historical_files_unchanged'],
        'historical_files_expected_unchanged': len(baseline) - len(VERSIONED_METADATA) if baseline else 0,
        'versioned_metadata_paths': list(VERSIONED_METADATA),
        'original_metadata_snapshots': [row[0] for row in VERSIONED_METADATA.values()],
        'runtime_repositories': sum(row['runtime_dependency'] for row in pins['repositories']),
        'failures': failures,
        'boundary': 'Current inventory validity is a separate check:sources gate; no historical report or receipt exception.',
    }))
    return bool(failures)


if __name__ == '__main__':
    sys.exit(main())
