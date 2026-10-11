"""CI controller for the immutable first public candidate; never imported by it."""
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

CANDIDATE = '62cd3e59c8f568496ed087d55f0aec3d63363b0a'
TREE = '8a5de5a3735e04f3f45cf164b59da17289693bc2'
SOURCE_LOCK = 'bd6ad5d4640823ab55458777f93aa5f7999107415fe4550c3d99cbe9b0eb54f6'
p = argparse.ArgumentParser()
p.add_argument('--repo', required=True)
p.add_argument('--out', required=True)
args = p.parse_args()
root, out = pathlib.Path(args.repo).resolve(), pathlib.Path(args.out).resolve()

def require(condition, detail):
    if not condition:
        raise RuntimeError(str(detail))

require(out != root and root not in out.parents, 'Evidence directory must be outside candidate')
out.mkdir(parents=True, exist_ok=True)
env = dict(os.environ)
env.pop('NODE_PATH', None)
env.update(PYTHONNOUSERSITE='1', PYTHONDONTWRITEBYTECODE='1', PYTHONIOENCODING='utf-8', TZ='UTC')
rows = []
summary = {'schema': 'receiptos.verify.public-candidate-gate.v1', 'candidate': CANDIDATE,
           'tree': TREE, 'source_lock_sha256': SOURCE_LOCK, 'status': 'INCOMPLETE',
           'controller_commit': os.environ.get('GITHUB_SHA'), 'commands': rows}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def save(name, value):
    (out / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')

def git(*parts):
    return subprocess.check_output(['git', *parts], cwd=root).decode('utf-8').strip()

def run(label, argv):
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    failure = None
    try:
        r = subprocess.run(argv, cwd=root, env=env, capture_output=True, timeout=1200)
        stdout, stderr, code, state = r.stdout, r.stderr, r.returncode, 'COMPLETED'
    except subprocess.TimeoutExpired as error:
        stdout, stderr, code, state = error.stdout or b'', error.stderr or b'', None, 'TIMED_OUT'
        failure = error
    except OSError as error:
        stdout, stderr, code, state = b'', str(error).encode('utf-8'), None, 'DID_NOT_START'
        failure = error
    (out / (label + '.stdout')).write_bytes(stdout)
    (out / (label + '.stderr')).write_bytes(stderr)
    rows.append({'label': label, 'argv': argv, 'cwd': str(root), 'started_utc': start,
                 'process_status': state, 'exit': code, 'stdout_sha256': sha(stdout), 'stderr_sha256': sha(stderr)})
    save('commands.json', rows)
    print(label + ': ' + state + ', exit ' + str(code), flush=True)
    if failure is not None:
        raise failure
    if code != 0:
        print(stdout.decode('utf-8', errors='replace')[-6000:], flush=True)
        print(stderr.decode('utf-8', errors='replace')[-3000:], file=sys.stderr, flush=True)
        raise RuntimeError(label + ' failed')
    return stdout

try:
    require(git('rev-parse', 'HEAD') == CANDIDATE, 'Wrong candidate')
    require(git('rev-parse', 'HEAD^{tree}') == TREE, 'Wrong tree')
    require(not git('status', '--porcelain=v1'), 'Initial checkout is dirty')
    require(not (root / 'node_modules').exists(), 'Requires fresh dependencies')
    require(sha((root / 'source-lock.json').read_bytes()) == SOURCE_LOCK, 'Wrong source lock')
    inventory = []
    tracked = subprocess.check_output(['git', 'ls-files', '-s', '-z'], cwd=root).split(b'\0')
    for entry in filter(None, tracked):
        meta, rawpath = entry.split(b'\t', 1)
        mode, blob, stage = meta.decode().split()
        name = rawpath.decode('utf-8')
        path = root / name
        require(mode in ('100644', '100755') and stage == '0' and path.is_file() and not path.is_symlink(), name)
        data = path.read_bytes()
        inventory.append({'path': name, 'mode': mode, 'git_blob': blob, 'bytes': len(data), 'sha256': sha(data)})
    save('tracked-files.json', inventory)
    summary['tracked_files'] = len(inventory)
    summary['initial_status'] = 'CLEAN'
    summary['package_lock_sha256'] = sha((root / 'package-lock.json').read_bytes())
    summary['runtime'] = {name: run('version-' + name, command).decode().strip() for name, command in [
        ('node', ['node', '--version']), ('python', [sys.executable, '--version']),
        ('python-path', ['python', '--version']),
        ('bun', [str(shutil.which('bun') or 'bun'), '--version'])]}
    npm = shutil.which('npm.cmd') if os.name == 'nt' else shutil.which('npm')
    require(npm, 'npm unavailable')
    summary['runtime']['npm'] = run('version-npm', [npm, '--version']).decode().strip()
    cache = out.with_name(out.name + '-npm-cache')
    require(not cache.exists(), 'Requires a fresh install cache')
    run('install', [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', str(cache)])
    run('dependencies', [npm, 'ls', '--all', '--json'])
    run('dependency-resolution', ['node', '--input-type=module', '-e',
        "console.log(import.meta.resolve('ajv')); console.log(import.meta.resolve('@noble/curves/secp256k1.js'));"])
    run('initial-source-lock', ['node', 'tools/check-sources.mjs'])
    run('initial-diff-check', ['git', 'diff', '--check'])
    scratch = root / 'reports' / 'tmp'
    require(not scratch.exists(), 'Requires an initially absent test scratch directory')
    scratch.mkdir(parents=True)
    require(not list(scratch.iterdir()), 'Scratch setup must not inject evidence or fixtures')
    summary['test_scratch_setup'] = {'path': 'reports/tmp', 'initially_absent': True, 'created_empty': True,
                                   'reason': 'git.test.mjs requires an existing mkdtemp parent'}
    save('test-scratch-setup.json', summary['test_scratch_setup'])
    tap = run('tests', [npm, 'test']).decode('utf-8')
    counts = {key: int(value) for key, value in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$', tap, re.M)}
    summary['tests'] = counts
    require(counts == {'tests': 275, 'pass': 275, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}, counts)
    run('vectors', [npm, 'run', 'vectors'])
    vectors = json.loads((root / 'reports/vectors.json').read_text(encoding='utf-8'))
    summary['vectors'] = {key: vectors[key] for key in ('count', 'passed', 'failed')}
    require(summary['vectors'] == {'count': 30, 'passed': 30, 'failed': 0}, 'Vector inventory/count failure')
    require(len(vectors['rows']) == 30 and all(not row['errors'] for row in vectors['rows']), 'Vector witness failure')
    shutil.copyfile(root / 'reports/vectors.json', out / 'vectors.json')
    run('mutations', [npm, 'run', 'mutations'])
    mutations = json.loads((root / 'reports/mutations.json').read_text(encoding='utf-8'))
    summary['mutations'] = {'count': mutations['count'], 'counts': mutations['counts']}
    require(mutations['count'] == len(mutations['rows']) == 14, 'Mutant inventory/count failure')
    require(set(mutations['counts']) == {'KILLED', 'SURVIVED', 'CRASHED', 'INVALID_OUTPUT', 'NOT_APPLIED', 'CONTROL_BROKEN', 'INVALID_BASELINE'}, 'Unknown mutation categories')
    require(mutations['counts']['KILLED'] == 14 and all(value == 0 for key, value in mutations['counts'].items() if key != 'KILLED'), 'Not all mutants semantically killed')
    require(all(row['status'] == 'KILLED' and row['applied'] and row['baseline_controls_valid']
               and row['positive_preserved'] and row['positive_process_status'] == 'COMPLETED'
               and row['witness_process_status'] == 'COMPLETED' for row in mutations['rows']), 'Mutation semantic/positive control failure')
    shutil.copyfile(root / 'reports/mutations.json', out / 'mutations.json')
    demo = json.loads(run('cli-demo', ['node', 'src/cli.mjs', 'demo']))
    require(demo['sameReceipt'] is True, 'Demo must use the same receipt')
    require(demo['positive']['overall'] == 'VERIFIED' and demo['wrong_commit']['overall'] == 'CONTRADICTED', 'Demo product projection failure')
    require(demo['wrong_commit']['layers']['SUBJECT_BINDING']['status'] == 'CONTRADICTED', 'Demo subject binding failure')
    for result in (demo['positive'], demo['wrong_commit']):
        require(result['layers']['INTEGRITY']['status'] == result['layers']['AUTHENTICITY']['status'] == 'VERIFIED', 'Demo integrity/authenticity failure')
        require(result['layers']['RECOMPUTATION']['status'] == 'REPRODUCED', 'Demo native recomputation failure')
    summary['demo'] = {'same_receipt': demo['sameReceipt'], 'request_A': demo['positive']['overall'],
                       'request_B': demo['wrong_commit']['overall']}
    run('capsule-demo', ['node', 'tools/write-demo.mjs'])
    run('local-reproduction', ['node', 'tools/reproduce.mjs', 'V02'])
    reproduction = json.loads((root / 'reports/local-reproduction.json').read_text(encoding='utf-8'))
    require(reproduction['code_commit'] == CANDIDATE and reproduction['replay'] == 'REPRODUCED', 'Local reproduction failure')
    require(reproduction['independent_operator'] == 'NOT_CLAIMED', 'Independent operator overclaim')
    shutil.copyfile(root / 'reports/local-reproduction.json', out / 'local-reproduction.json')
    run('final-source-lock', ['node', 'tools/check-sources.mjs'])
    run('final-diff-check', ['git', 'diff', '--check'])
    changes = git('diff', '--name-only').splitlines()
    require(all(name.startswith('reports/') for name in changes), changes)
    summary['changed_generated_reports'] = changes
    summary['remote'] = git('remote', 'get-url', 'origin')
    summary['status'] = 'PASS'
except Exception as error:
    summary['status'] = 'FAIL'
    summary['error'] = type(error).__name__ + ': ' + str(error)
    raise
finally:
    summary['completed_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    save('summary.json', summary)
    print(json.dumps({key: summary[key] for key in ('candidate', 'status', 'tests', 'vectors', 'mutations') if key in summary}), flush=True)
