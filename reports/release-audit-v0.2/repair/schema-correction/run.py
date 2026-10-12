from pathlib import Path
import hashlib
import json
import re
import subprocess

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent / 'outputs' / 'receiptos-verify'
FILES = ['schemas/request-v2.schema.json', 'tests/interpoll-request-classification-release.test.mjs']
identity = {'checkpointHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO).decode().strip(),
            'sourceHashes': {p: hashlib.sha256((REPO / p).read_bytes()).hexdigest() for p in FILES}}
(HERE / 'identity.json').write_text(json.dumps(identity, indent=2) + '\n', encoding='utf-8', newline='\n')
focused = ['--test', '--test-concurrency=1', 'tests/interpoll-request-classification-release.test.mjs',
           'tests/adapter-context-release.test.mjs', 'tests/requirement-admission-release.test.mjs']
for label, argv in [('normal-focused', ['node', *focused]), ('no-opt-focused', ['node', '--no-opt', *focused]),
                    ('vectors', ['node', 'tools/run-vectors-v2.mjs', str(HERE / 'vectors.json')])]:
    run = subprocess.run(argv, cwd=REPO, capture_output=True, timeout=300)
    (HERE / f'{label}.stdout').write_bytes(run.stdout)
    (HERE / f'{label}.stderr').write_bytes(run.stderr)
    text = run.stdout.decode('utf-8', 'strict')
    counts = {name: int(value) for name, value in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\r?$', text, re.MULTILINE)}
    if label == 'vectors':
        data = json.loads((HERE / 'vectors.json').read_text(encoding='utf-8'))
        counts = {k: data[k] for k in ['count', 'passed', 'failed']}
    receipt = {'argv': argv, 'exitCode': run.returncode, 'counts': counts,
               'stdoutSha256': hashlib.sha256(run.stdout).hexdigest(),
               'stderrSha256': hashlib.sha256(run.stderr).hexdigest()}
    (HERE / f'{label}.receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(receipt))
    if run.returncode:
        raise SystemExit(run.returncode)
