"""Separate CI controller; verifies immutable c617 and is never imported by it."""
import argparse
import datetime
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

CANDIDATE = 'c617bd8cec6649cd25833e59a02cf823fc2198fc'
TREE = '4cbfcdcf323e18978268cab4c6870ae693a281b9'
SOURCE_LOCK = '938820d6a5608fcb34eda832289c539802f51577f6f6e8eb72cd4b11559a9511'
PACKAGE_LOCK = '699f2fc389c8d95ad0e5c7f2ef1b3566152b1f9e5123e2ab49cb5c9d59285023'
COUNTS = {'tests': 707, 'pass': 707, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}
MUTATION_CATEGORIES = {'KILLED', 'SURVIVED', 'CRASHED', 'INVALID_OUTPUT', 'NOT_APPLIED', 'CONTROL_BROKEN', 'INVALID_BASELINE'}
V1_MUTANTS = {'ignore-requested-subject', 'compare-receipt-to-itself', 'accept-any-valid-signature',
              'promote-reproduced-to-verified', 'accept-empty-evidence', 'count-crash-as-semantic-refutation',
              'package-presence-as-pass', 'ignore-policy-version', 'ignore-guarantee-dependency',
              'ignore-retry-action-change', 'ignore-evidence-grade', 'ignore-authority', 'ignore-commit',
              'ignore-canonicalization-profile'}
UI_SERVER_CONTROLS = {
    'local UI serves real verification; hostile origin and paths fail',
    'v0.2 UI API advertises all 68 unique controls without deleting original vectors',
    'v0.2 UI API preserves duplicate raw request members for strict rejection',
}


def require(condition, detail):
    if not condition:
        raise RuntimeError(str(detail))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def validate_tests(receipt, stdout, stderr):
    counts = {key.decode(): int(value) for key, value in re.findall(
        rb'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\r?$', stdout, re.M)}
    require(receipt['exit_code'] == 0 and counts == receipt['counts'] == COUNTS, ('test counts', counts))
    require(receipt['stdout_sha256'] == sha(stdout) and receipt['stderr_sha256'] == sha(stderr), 'Test byte receipt mismatch')
    passed_names = set(re.findall(r'^ok \d+ - (.*)\r?$', stdout.decode('utf-8'), re.M))
    require(UI_SERVER_CONTROLS <= passed_names, ('Missing successful real UI/server controls', UI_SERVER_CONTROLS - passed_names))
    return {'counts': counts, 'ui_server_controls': sorted(UI_SERVER_CONTROLS),
            'boundary': 'Actual Node HTTP server/API smoke inside the full suite; not a rendered-browser certification.'}


def validate_vectors(report):
    require(report['count'] == report['passed'] == len(report['rows']) == 68 and report['failed'] == 0, 'Vector count/witness failure')
    require(report['versions'] == {'v0.1': {'count': 30, 'passed': 30, 'failed': 0},
                                   'v0.2': {'count': 38, 'passed': 38, 'failed': 0}}, 'Vector regression inventory failure')
    ids = [row['id'] for row in report['rows']]
    require(len(set(ids)) == 68 and all(row['errors'] == [] for row in report['rows']), 'Duplicate/failing vectors')
    require({f'V{i:02}' for i in range(1, 31)} <= set(ids), 'Original vector missing')
    return {key: report[key] for key in ('count', 'passed', 'failed', 'versions')}


def validate_mutations(report, family, inventory):
    ids = V1_MUTANTS if family == 'v1' else {f'M{i:02}' for i in range(1, 15)}
    require(report['passed'] is True and report['count'] == len(report['rows']) == 14, 'Empty/incomplete mutant inventory')
    require({row['id'] for row in report['rows']} == ids, 'Wrong mutant identity inventory')
    counts = report['counts']
    require(set(counts) == MUTATION_CATEGORIES and counts['KILLED'] == 14
            and all(value == 0 for key, value in counts.items() if key != 'KILLED'), 'Not all semantic kills')
    for row in report['rows']:
        require(row['status'] == 'KILLED' and row['applied'] is True and row['baseline_controls_valid'] is True
                and row['positive_preserved'] is True and row['positive_process_status'] == 'COMPLETED'
                and row['witness_process_status'] == 'COMPLETED', ('Invalid semantic/positive witness', row['id']))
        require(row['baseline_projection'] != row['mutant_projection'] and row['positive'] != row['witness'], 'No semantic disagreement')
        require(row.get('checker_execution_failed') is False and row.get('checker_output_invalid') is False, 'Crash/invalid output is not a kill')
        patches = [dict(file=row['source_file'], original_sha256=row['original_sha256'], mutant_sha256=row['mutant_sha256'])] if family == 'v1' else row['patches']
        require(bool(patches), 'Mutation not applied')
        for patch in patches:
            require(inventory[patch['file']]['sha256'] == patch['original_sha256'], 'Mutation original source identity mismatch')
            require(re.fullmatch(r'[0-9a-f]{64}', patch['mutant_sha256']) is not None
                    and patch['original_sha256'] != patch['mutant_sha256'], 'No-op mutation')
            if family == 'v2':
                require(bool(patch['replacements']) and all(change['occurrences'] == 1 and change['changed'] is True
                        and change['from_sha256'] != change['to_sha256'] for change in patch['replacements']), 'Unapplied replacement')
        if family == 'v1':
            require(row['expected_fault_preserved'] is (row['id'] == 'count-crash-as-semantic-refutation'), 'Fixed-fault V08 distinction lost')
        else:
            require(row['positive_errors'] == [] and row['baseline_errors'] == {'positive': [], 'witness': []}
                    and row['positive_exit_code'] == row['witness_exit_code'] == 0, 'Invalid mutation process/control')
    return {'count': report['count'], 'counts': counts, 'witnesses': [
        {'id': row['id'], 'positive': row['positive'], 'witness': row['witness'], 'status': row['status']} for row in report['rows']]}


def validate_demo_v1(demo):
    require(demo['sameReceipt'] is True and demo['positive']['overall'] == 'VERIFIED'
            and demo['wrong_commit']['overall'] == 'CONTRADICTED', 'Original demo polarity failure')
    require(demo['wrong_commit']['layers']['SUBJECT_BINDING']['status'] == 'CONTRADICTED', 'Original subject-binding failure')
    for report in (demo['positive'], demo['wrong_commit']):
        require(report['layers']['INTEGRITY']['status'] == report['layers']['AUTHENTICITY']['status'] == 'VERIFIED'
                and report['layers']['RECOMPUTATION']['status'] == 'REPRODUCED', 'Original demo layer failure')
    return {'same_receipt': True, 'request_A': 'VERIFIED', 'request_B': 'CONTRADICTED'}


def validate_demo_v2(demo):
    expected = {'A': {'matching': 'VERIFIED', 'wrong_commit': 'CONTRADICTED'}, 'B': {'wrong_scope': 'CONTRADICTED'},
                'C': {'compatible': 'VERIFIED', 'incompatible': 'CONTRADICTED'},
                'D': {'matching': 'VERIFIED', 'mutated_retry': 'CONTRADICTED'},
                'E': {'preserved': 'VERIFIED', 'violated': 'CONTRADICTED'}}
    actual = {name: {control: report['overall'] for control, report in controls.items()} for name, controls in demo['reports'].items()}
    require(demo['passed'] is True and demo['errors'] == [] and actual == expected, ('v0.2 demo outcomes', actual))
    native = [demo['reports']['C'][key]['layers']['RECOMPUTATION']['nativeResult'] for key in ('compatible', 'incompatible')]
    require(native[0] == native[1], 'Caller incompatibility rewrote native Trustless result')
    require(demo['reports']['E']['preserved']['layers']['GUARANTEE_PRESERVATION']['status'] == 'PRESERVED'
            and demo['reports']['E']['violated']['layers']['GUARANTEE_PRESERVATION']['status'] == 'VIOLATED', 'PRF projection failure')
    return actual


def validate_determinism(report):
    require(report['passed'] is True and (report['generic_groups'], report['generic_runs'], report['native_groups'], report['native_runs'])
            == (7, 42, 4, 12), 'Empty/incomplete determinism inventory')
    require(len(report['generic']) == 7 and len(report['native']) == 4, 'Determinism group mismatch')
    for group in report['generic']:
        require(group['passed'] is True and group['raw_report_difference_only_execution_argv'] is True and len(group['rows']) == 6, 'Product determinism failure')
        require(len({row['semantic_identity_sha256'] for row in group['rows']}) == 1
                and {row['mode'] for row in group['rows']} == {'normal', 'repeat', 'jitless', 'env-variant', 'path-a', 'path-b'}
                and all(row['exit_code'] == 0 for row in group['rows']), 'Product determinism witness failure')
    for group in report['native']:
        require(group['passed'] is True and group['stdout_byte_identical'] is True and len(group['rows']) == 3
                and {row['mode'] for row in group['rows']} == {'normal', 'repeat', 'optimized'}
                and len({row['stdout_sha256'] for row in group['rows']}) == 1
                and all(row['exit_code'] == 0 for row in group['rows']), 'Native determinism failure')
    return {key: report[key] for key in ('passed', 'generic_groups', 'generic_runs', 'native_groups', 'native_runs', 'identity_exclusions', 'limitations')}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    root, out = pathlib.Path(args.repo).resolve(), pathlib.Path(args.out).resolve()
    require(out != root and root not in out.parents, 'Evidence directory must be outside candidate')
    out.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    env.pop('NODE_PATH', None)
    env.update(PYTHONNOUSERSITE='1', PYTHONDONTWRITEBYTECODE='1', PYTHONIOENCODING='utf-8', TZ='UTC')
    rows = []
    summary = {'schema': 'receiptos.verify.public-candidate-gate.v2', 'candidate': CANDIDATE, 'tree': TREE,
               'source_lock_sha256': SOURCE_LOCK, 'package_lock_sha256': PACKAGE_LOCK, 'status': 'INCOMPLETE',
               'controller_commit': os.environ.get('GITHUB_SHA'), 'controller_sha256': sha(pathlib.Path(__file__).read_bytes()), 'commands': rows}

    def save(name, value):
        (out / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')

    def run(label, argv):
        started = datetime.datetime.now(datetime.timezone.utc).isoformat()
        failure = None
        try:
            process = subprocess.run(argv, cwd=root, env=env, capture_output=True, timeout=1200)
            stdout, stderr, code, state = process.stdout, process.stderr, process.returncode, 'COMPLETED'
        except subprocess.TimeoutExpired as error:
            stdout, stderr, code, state, failure = error.stdout or b'', error.stderr or b'', None, 'TIMED_OUT', error
        except OSError as error:
            stdout, stderr, code, state, failure = b'', str(error).encode('utf-8'), None, 'DID_NOT_START', error
        (out / (label + '.stdout')).write_bytes(stdout)
        (out / (label + '.stderr')).write_bytes(stderr)
        rows.append({'label': label, 'argv': argv, 'cwd': str(root), 'started_utc': started, 'process_status': state,
                     'exit_code': code, 'stdout_sha256': sha(stdout), 'stderr_sha256': sha(stderr)})
        save('commands.json', rows)
        print(label + ': ' + state + ', exit ' + str(code), flush=True)
        if failure is not None:
            raise failure
        if code != 0:
            print(stdout.decode('utf-8', errors='replace')[-6000:], flush=True)
            print(stderr.decode('utf-8', errors='replace')[-3000:], file=sys.stderr, flush=True)
            raise RuntimeError(label + ' failed')
        return stdout

    def git(label, *parts):
        return run(label, ['git', *parts]).decode('utf-8').strip()

    def copy(name, target=None):
        source = root / name
        destination = out / (target or source.name)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    try:
        require(git('identity-head', 'rev-parse', 'HEAD') == CANDIDATE, 'Wrong candidate')
        require(git('identity-tree', 'rev-parse', 'HEAD^{tree}') == TREE, 'Wrong tree')
        require(not git('initial-status', 'status', '--porcelain=v1', '--untracked-files=all'), 'Initial checkout is dirty')
        require(not (root / 'node_modules').exists(), 'Requires fresh dependencies')
        require(sha((root / 'source-lock.json').read_bytes()) == SOURCE_LOCK
                and len(json.loads((root / 'source-lock.json').read_bytes())['files']) == 345, 'Wrong source lock')
        require(sha((root / 'package-lock.json').read_bytes()) == PACKAGE_LOCK, 'Wrong dependency lock')
        inventory = {}
        tracked = run('tracked-index', ['git', 'ls-files', '-s', '-z']).split(b'\0')
        for entry in filter(None, tracked):
            metadata, rawpath = entry.split(b'\t', 1)
            mode, blob, stage = metadata.decode().split()
            name = rawpath.decode('utf-8')
            path = root / name
            require(mode in ('100644', '100755') and stage == '0' and path.is_file() and not path.is_symlink(), name)
            data = path.read_bytes()
            require(hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == blob, ('Checkout bytes differ from Git blob', name))
            inventory[name] = {'path': name, 'mode': mode, 'git_blob': blob, 'bytes': len(data), 'sha256': sha(data)}
        require(bool(inventory), 'Empty tracked inventory')
        save('tracked-files.json', list(inventory.values()))
        summary['tracked_regular_files'] = len(inventory)
        summary['initial_status'] = 'CLEAN'
        expected_runtime = {'node': 'v22.15.0', 'python': 'Python 3.12.10', 'python-path': 'Python 3.12.10', 'bun': '1.3.14', 'npm': '10.9.2'}
        npm = shutil.which('npm.cmd') if os.name == 'nt' else shutil.which('npm')
        require(npm, 'npm unavailable')
        summary['runtime'] = {name: run('version-' + name, command).decode().strip() for name, command in [
            ('node', ['node', '--version']), ('python', [sys.executable, '--version']), ('python-path', ['python', '--version']),
            ('bun', [str(shutil.which('bun') or 'bun'), '--version']), ('npm', [npm, '--version'])]}
        require(summary['runtime'] == expected_runtime, ('Wrong runtime versions', summary['runtime']))
        cache = out.with_name(out.name + '-npm-cache')
        require(not cache.exists(), 'Requires an initially absent npm cache')
        summary['npm_cache_initially_absent'] = True
        run('npm-ci', [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', str(cache)])
        run('dependencies', [npm, 'ls', '--all', '--json'])
        run('dependency-resolution', ['node', '--input-type=module', '-e',
            "console.log(import.meta.resolve('ajv'));console.log(import.meta.resolve('@noble/curves/secp256k1.js'));"])
        lock = json.loads(run('sources-before', ['node', 'tools/check-sources.mjs']))
        require(lock == {'status': 'PASS', 'files': 345, 'sourceLockDigest': SOURCE_LOCK}, lock)
        provenance = json.loads(run('provenance-license-before', ['node', 'tools/check-provenance-v2.mjs']))
        require(provenance['status'] == 'PASS', provenance)
        summary['provenance_license'] = provenance
        run('diff-check-before', ['git', 'diff', '--check'])
        scratch = root / 'reports' / 'tmp'
        require(not scratch.exists(), 'Requires an initially absent test scratch directory')
        scratch.mkdir(parents=True)
        summary['scratch'] = {'path': 'reports/tmp', 'initially_absent': True, 'created_empty': not any(scratch.iterdir())}
        require(summary['scratch']['created_empty'], 'Scratch must not inject fixtures/evidence')
        summary['tests'] = {}
        for mode in ('normal', 'no-opt', 'repeat'):
            label = 'public-v02-' + mode
            stem = root / 'reports/v0.2' / (label + '-tests')
            require(not stem.with_suffix('.json').exists(), 'Test receipt must be newly generated')
            command = [sys.executable, '-B', 'tools/capture-tests-v2.py'] + (['--no-opt'] if mode == 'no-opt' else []) + ['--label', label]
            run('tests-' + mode, command)
            receipt = json.loads(pathlib.Path(str(stem) + '.json').read_bytes())
            stdout = pathlib.Path(str(stem) + '.stdout.txt').read_bytes()
            stderr = pathlib.Path(str(stem) + '.stderr.txt').read_bytes()
            summary['tests'][mode] = validate_tests(receipt, stdout, stderr)
            for suffix in ('.json', '.stdout.txt', '.stderr.txt'):
                copy('reports/v0.2/' + label + '-tests' + suffix)
        run('vectors', ['node', 'tools/run-vectors-v2.mjs'])
        vectors = json.loads((root / 'reports/v0.2/vectors.json').read_bytes())
        summary['vectors'] = validate_vectors(vectors)
        copy('reports/v0.2/vectors.json')
        run('mutations-v1', ['node', 'tools/run-mutations.mjs', '--out', 'reports/v0.2/public-v02-v1-mutations.json'])
        run('mutations-v2', ['node', 'tools/run-mutations-v2.mjs'])
        for family, name in [('v1', 'public-v02-v1-mutations.json'), ('v2', 'mutations.json')]:
            report = json.loads((root / 'reports/v0.2' / name).read_bytes())
            summary['mutations_' + family] = validate_mutations(report, family, inventory)
            copy('reports/v0.2/' + name)
        demo_v1 = json.loads(run('cli-v1', ['node', 'src/cli.mjs', 'demo']))
        demo_v2 = json.loads(run('cli-v2', ['node', 'src/cli.mjs', 'demo-v2']))
        summary['cli_v1'] = validate_demo_v1(demo_v1)
        summary['cli_v2'] = validate_demo_v2(demo_v2)
        save('cli-v1.json', demo_v1)
        save('cli-v2.json', demo_v2)
        run('determinism', ['node', 'tools/determinism-v2.mjs'])
        determinism = json.loads((root / 'reports/v0.2/determinism.json').read_bytes())
        summary['determinism'] = validate_determinism(determinism)
        copy('reports/v0.2/determinism.json')
        shutil.copytree(root / 'reports/v0.2/determinism', out / 'determinism')
        require(json.loads(run('sources-after', ['node', 'tools/check-sources.mjs'])) == lock, 'Source lock changed')
        require(json.loads(run('provenance-license-after', ['node', 'tools/check-provenance-v2.mjs'])) == provenance, 'Provenance/license changed')
        run('diff-check-after', ['git', 'diff', '--check'])
        changes = git('final-tracked-diff', 'diff', '--name-only').splitlines()
        require(all(name.startswith('reports/') for name in changes), ('Source drift', changes))
        source_hash_changes = [name for name, row in inventory.items() if not name.startswith('reports/')
                               and (not (root / name).is_file() or sha((root / name).read_bytes()) != row['sha256'])]
        require(not source_hash_changes, ('Non-report tracked bytes changed', source_hash_changes))
        require(git('final-head', 'rev-parse', 'HEAD') == CANDIDATE, 'Candidate HEAD changed')
        summary['generated_report_changes'] = changes
        summary['source_bytes_unchanged'] = True
        summary['remote'] = git('remote-identity', 'remote', 'get-url', 'origin')
        summary['status'] = 'PASS'
    except Exception as error:
        summary['status'] = 'FAIL'
        summary['error'] = type(error).__name__ + ': ' + str(error)
        raise
    finally:
        summary['completed_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        save('summary.json', summary)
        shutil.copyfile(pathlib.Path(__file__).resolve(), out / 'controller.py')
        print(json.dumps({key: summary[key] for key in ('candidate', 'status', 'tests', 'vectors', 'mutations_v1', 'mutations_v2', 'determinism') if key in summary}), flush=True)


if __name__ == '__main__':
    main()
