from pathlib import Path
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
before = HERE.parent / 'audit02-domains' / 'audit-domains.mjs'
source = before.read_text(encoding='utf-8')
old = "const root=fileURLToPath(new URL('./repo/',import.meta.url));"
new = "const root=fileURLToPath(new URL('../v02-audit-repaired/',import.meta.url));"
assert source.count(old) == 1
rewritten = source.replace(old, new)
controller = HERE / 'audit-domains.mjs'
controller.write_text(rewritten, encoding='utf-8', newline='\n')
identity = {'frozenAuditControllerSha256': hashlib.sha256(before.read_bytes()).hexdigest(),
            'onlyChange': 'Repository URL ./repo/ -> ../v02-audit-repaired/; literal oracles unchanged.',
            'repairedControllerSha256': hashlib.sha256(controller.read_bytes()).hexdigest()}
(HERE / 'controller-identity.json').write_text(json.dumps(identity, indent=2) + '\n', encoding='utf-8', newline='\n')
run = subprocess.run(['node', str(controller)], cwd=HERE, capture_output=True, timeout=180)
(HERE / 'controller.stdout').write_bytes(run.stdout)
(HERE / 'controller.stderr').write_bytes(run.stderr)
print(json.dumps({'exitCode': run.returncode, 'stdoutSha256': hashlib.sha256(run.stdout).hexdigest(),
                  'stderrSha256': hashlib.sha256(run.stderr).hexdigest()}))
if run.returncode:
    print(run.stderr.decode('utf-8'))
raise SystemExit(run.returncode)
