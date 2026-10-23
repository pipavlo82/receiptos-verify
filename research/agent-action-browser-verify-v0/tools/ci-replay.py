"""Bounded POSIX CI replay; uploads generated reports, never upstream source/bundles.

The inherited Windows Crystal bridge has an author-specific executable path.
Windows is covered by the separately recorded local replay, not this CI matrix.
This controller is research tooling, not a product runtime or conformance claim.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

RESEARCH = Path(__file__).resolve().parents[1]
HOST = RESEARCH.parents[1]


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8', newline='\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_determinism(support):
    checks = []

    def byte_check(name, actual, expected):
        same = actual.read_bytes() == expected.read_bytes()
        checks.append({'name': name, 'comparison': 'complete bytes', 'passed': same,
                       'actual_sha256': digest(actual), 'expected_sha256': digest(expected)})

    for family in ('actions', 'canonicalization'):
        normal = support / family / 'normal/results.json'
        for mode in ('repeat', 'optimized'):
            byte_check(f'{family}-normal-vs-{mode}', support / family / mode / 'results.json', normal)
    frozen_actions = RESEARCH / 'evidence/actions/normal/results.json'
    original = json.loads(frozen_actions.read_text('utf-8'))
    actual = json.loads((support / 'actions/normal/results.json').read_text('utf-8'))
    checks.append({
        'name': 'original-action-semantics-preserved', 'comparison': 'complete parsed original records in original order',
        'passed': len(original) == 37 and len(actual) >= len(original) and actual[:len(original)] == original,
        'original_cases': len(original), 'current_cases': len(actual),
        'frozen_receipt_sha256': digest(frozen_actions),
    })
    byte_check('canonicalization-frozen-receipt', support / 'canonicalization/normal/results.json',
               RESEARCH / 'evidence/canonicalization/normal/results.json')
    byte_check('browser-canonicalization-frozen-receipt', support / 'browser/normal/canonicalization.json',
               RESEARCH / 'evidence/browser/normal/canonicalization.json')
    report = {'schema': 'agent-action.ci-determinism.v0',
              'status': 'PASS' if all(row['passed'] for row in checks) else 'FAIL', 'checks': checks}
    write_json(support / 'determinism.json', report)
    if report['status'] != 'PASS':
        raise RuntimeError('CI_DETERMINISM_OR_HISTORICAL_SEMANTICS_CHANGED')


def package_reports(support, upload, commands, status):
    # This literal allowlist excludes sources/, browser-build/, tmp/, raw native
    # reports, node_modules, compiled lens code, subprocess stdout and stderr.
    allowed = ['runtime.json', 'source-pins-observed.json', 'determinism.json']
    for mode in ('normal', 'repeat', 'optimized'):
        allowed.extend([
            f'runs/{mode}/commands.json',
            f'actions/{mode}/summary.json',
            f'actions/{mode}/results.json',
            f'canonicalization/{mode}/commands.json',
            f'canonicalization/{mode}/results.json',
        ])
    allowed.extend([
        'browser/normal/results.json',
        'browser/normal/canonicalization.json',
        'mutations/normal/report.json',
    ])
    inventory = []
    for relative in allowed:
        source = support / relative
        if source.is_symlink():
            raise RuntimeError('ARTIFACT_SYMLINK_REJECTED:' + relative)
        if not source.is_file():
            continue
        if not source.resolve().is_relative_to(support.resolve()):
            raise RuntimeError('ARTIFACT_OUTSIDE_SUPPORT:' + relative)
        if source.stat().st_size > 32 * 1024 * 1024:
            raise RuntimeError('ARTIFACT_TOO_LARGE:' + relative)
        destination = upload / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        inventory.append({'path': relative, 'bytes': source.stat().st_size, 'sha256': digest(source)})
    write_json(upload / 'summary.json', {
        'schema': 'agent-action.ci-replay.v0',
        'status': status,
        'commands': commands,
        'artifact_files': inventory,
        'scope': 'Experimental finite research replay; not production readiness or independent organizational approval.',
        'excluded': ['external source checkouts', 'compiled recompute-lens bundle', 'node_modules', 'raw subprocess logs'],
    })


def main():
    if os.name != 'posix':
        raise SystemExit('This CI lane is POSIX-only; it does not patch the frozen Windows bridge.')
    runner_temp = Path(os.environ['RUNNER_TEMP']).resolve()
    support = Path(os.environ['AGENT_ACTION_SUPPORT']).resolve()
    if support == HOST or HOST.is_relative_to(support) or support.is_relative_to(HOST):
        raise SystemExit('CI_SUPPORT_MUST_BE_OUTSIDE_CHECKOUT')
    support.mkdir(parents=True, exist_ok=False)
    upload = runner_temp / 'research-ci-upload'
    upload.mkdir(exist_ok=False)
    command_logs = support / 'ci-commands'
    command_logs.mkdir()
    commands = []
    environment = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHON_EXECUTABLE=str(Path(sys.executable).resolve()))

    def run(name, argv, env=environment):
        started = time.monotonic()
        result = subprocess.run(argv, cwd=HOST, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout = command_logs / (name + '.stdout.txt')
        stderr = command_logs / (name + '.stderr.txt')
        stdout.write_bytes(result.stdout)
        stderr.write_bytes(result.stderr)
        commands.append({'name': name, 'argv': argv, 'exit_code': result.returncode,
                         'elapsed_seconds': time.monotonic() - started,
                         'stdout_sha256': digest(stdout), 'stderr_sha256': digest(stderr)})
        print(json.dumps({'command': name, 'exit_code': result.returncode}), flush=True)
        if result.returncode:
            # Keep bounded failure diagnostics in the job console. Full raw
            # subprocess logs remain outside the upload allowlist.
            print(result.stdout.decode('utf-8', 'replace')[-2000:], flush=True)
            print(result.stderr.decode('utf-8', 'replace')[-2000:], flush=True)
            raise RuntimeError('CI_COMMAND_FAILED:' + name)
        return result.stdout.decode('utf-8').strip()

    status = 'FAIL'
    try:
        tools = {name: Path(shutil.which(name) or '').resolve() for name in ('node', 'bun', 'git')}
        if any(not path.is_file() for path in tools.values()):
            raise RuntimeError('CI_REQUIRED_RUNTIME_UNAVAILABLE')
        # A fresh controlled PATH has no literal python. The research controller
        # must supply its own temporary host-only shim; CI does not create one.
        binary_path = support / 'no-python-path'
        binary_path.mkdir()
        for name, path in tools.items():
            (binary_path / name).symlink_to(path)
        replay_env = dict(environment, PATH=str(binary_path), BUN_EXECUTABLE=str(tools['bun']))
        if shutil.which('python', path=replay_env['PATH']) is not None:
            raise RuntimeError('CI_NO_PYTHON_ALIAS_CONTROL_FAILED')
        runtime = {
            'node': run('node-version', [str(tools['node']), '--version']),
            'bun': run('bun-version', [str(tools['bun']), '--version']),
            'python': sys.version,
            'python_executable': str(Path(sys.executable).resolve()),
            'platform': sys.platform,
            'head': run('head', [str(tools['git']), 'rev-parse', 'HEAD']),
            'python_alias_on_replay_path': None,
            'path_tools': {name: str(path) for name, path in tools.items()},
            'initial_tmpdir': os.environ.get('TMPDIR'),
            'initial_tempdir_physical': str(Path(tempfile.gettempdir()).resolve()),
        }
        if runtime['node'] != 'v22.15.0' or runtime['bun'] != '1.3.14' or sys.version_info[:2] != (3, 12):
            raise RuntimeError('CI_RUNTIME_PIN_MISMATCH')
        write_json(support / 'runtime.json', runtime)
        run('prepare-sources', [sys.executable, '-B', str(RESEARCH / 'tools/prepare-sources.py')])
        run('preservation-before', [sys.executable, '-B', str(RESEARCH / 'tools/check-preservation.py')])
        pins = json.loads((RESEARCH / 'source-pins.json').read_text('utf-8'))
        observed = []
        for row in pins['repositories']:
            if row['runtime_dependency']:
                source = support / 'sources' / row['repository'].replace('/', '--')
                head = run('source-' + row['repository'].replace('/', '--'),
                           [str(tools['git']), '-C', str(source), 'rev-parse', 'HEAD'])
                observed.append({'repository': row['repository'], 'expected_sha': row['sha'], 'observed_sha': head})
        write_json(support / 'source-pins-observed.json', observed)
        run('research-closure-before', [sys.executable, '-B', str(RESEARCH / 'tools/check-research.py')])
        run('normal', [sys.executable, '-B', str(RESEARCH / 'tools/validate.py'), '--mode', 'normal', '--browser', '--mutations'], replay_env)
        # On macOS the default temp path can itself contain symlinks. Exercise an
        # explicit symlink too, without overriding the normal/default-TMPDIR run.
        physical_tmp = support / 'physical-temp'
        physical_tmp.mkdir()
        symlink_tmp = support / 'symlink-temp'
        symlink_tmp.symlink_to(physical_tmp, target_is_directory=True)
        linked_env = dict(replay_env, TMPDIR=str(symlink_tmp))
        for mode in ('repeat', 'optimized'):
            run(mode, [sys.executable, '-B', str(RESEARCH / 'tools/validate.py'), '--mode', mode], linked_env)
        check_determinism(support)
        run('preservation-after', [sys.executable, '-B', str(RESEARCH / 'tools/check-preservation.py')])
        run('research-closure-after', [sys.executable, '-B', str(RESEARCH / 'tools/check-research.py')])
        run('diff-check', [str(tools['git']), 'diff', '--check'])
        if run('clean-worktree', [str(tools['git']), 'status', '--porcelain', '--untracked-files=all']):
            raise RuntimeError('CI_WORKTREE_CHANGED')
        status = 'PASS'
    finally:
        package_reports(support, upload, commands, status)
    print(json.dumps({'status': status, 'commands': len(commands), 'reports': str(upload)}))


if __name__ == '__main__':
    main()
