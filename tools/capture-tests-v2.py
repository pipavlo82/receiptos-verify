"""Capture exact test bytes/counts without shell newline translation."""
import argparse, glob, hashlib, json, os, pathlib, re, subprocess

parser = argparse.ArgumentParser()
modes = parser.add_mutually_exclusive_group()
modes.add_argument('--jitless', action='store_true')
modes.add_argument('--no-opt', action='store_true')
parser.add_argument('--label', default='normal')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'reports' / 'v0.2'
out.mkdir(parents=True, exist_ok=True)
(root / 'reports' / 'tmp').mkdir(parents=True, exist_ok=True)
command = ['node'] + (['--jitless'] if args.jitless else ['--no-opt'] if args.no_opt else []) + ['--test'] + sorted(glob.glob('tests/*.test.mjs', root_dir=root))
run = subprocess.run(command, cwd=root, capture_output=True, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
stdout_path = out / (args.label + '-tests.stdout.txt')
stderr_path = out / (args.label + '-tests.stderr.txt')
stdout_path.write_bytes(run.stdout)
stderr_path.write_bytes(run.stderr)
counts = {name: int(value) for name, value in re.findall(rb'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\r?$', run.stdout, re.M)}
counts = {key.decode(): value for key, value in counts.items()}
receipt = {'schema': 'receiptos.verify.test-command-receipt.v2', 'command': command, 'exit_code': run.returncode, 'counts': counts,
           'stdout_sha256': hashlib.sha256(run.stdout).hexdigest(), 'stderr_sha256': hashlib.sha256(run.stderr).hexdigest()}
(out / (args.label + '-tests.json')).write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps(receipt))
if run.returncode:
    lines = run.stdout.decode('utf-8', errors='replace').splitlines()
    for index, line in enumerate(lines):
        if line.startswith('not ok '):
            print('\n'.join(lines[index:index + 45]))
raise SystemExit(run.returncode or (0 if counts.get('tests', 0) and counts.get('fail') == 0 else 1))
