import hashlib
import json
from pathlib import Path
import re
import subprocess
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent / 'outputs' / 'receiptos-verify'
for mode, flags in [('normal', []), ('no-opt', ['--no-opt'])]:
    argv = ['node', *flags, '--test', '--test-concurrency=1',
            'tests/adapter-context-release.test.mjs',
            'tests/interpoll-v2.test.mjs', 'tests/prf-v2.test.mjs']
    started = time.time()
    run = subprocess.run(argv, cwd=REPO, capture_output=True, timeout=120)
    stdout_path = HERE / f'{mode}-focused.stdout'
    stderr_path = HERE / f'{mode}-focused.stderr'
    stdout_path.write_bytes(run.stdout)
    stderr_path.write_bytes(run.stderr)
    text = run.stdout.decode('utf-8', 'strict')
    counts = {key: int(re.search(rf'^# {key} (\d+)$', text, re.MULTILINE).group(1))
              for key in ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']}
    receipt = {'argv': argv, 'cwd': str(REPO), 'exitCode': run.returncode,
               'seconds': time.time() - started, 'counts': counts,
               'stdoutSha256': hashlib.sha256(run.stdout).hexdigest(),
               'stderrSha256': hashlib.sha256(run.stderr).hexdigest()}
    (HERE / f'{mode}-focused.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(receipt))
    if run.returncode:
        raise SystemExit(run.returncode)
