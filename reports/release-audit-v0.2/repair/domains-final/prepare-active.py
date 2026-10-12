from pathlib import Path
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
original = HERE.parent / 'audit02-domains-after' / 'replay-active-contexts.mjs'
source = original.read_text(encoding='utf-8')
old = "const repo=new URL('../../outputs/receiptos-verify/',import.meta.url);"
new = "const repo=new URL('../v02-audit-repaired/',import.meta.url);"
assert source.count(old) == 1
source = source.replace(old, new)
assert source.count("new URL('summary.json',import.meta.url)") == 1
source = source.replace("new URL('summary.json',import.meta.url)", "new URL('active-context-summary.json',import.meta.url)")
source = source.replace('findingsCheckpoint:sourceHead', "findingsCheckpoint:'dde5419f453969ae33b9e88b3151dba3e370f196',sourceHead")
controller = HERE / 'replay-active-contexts.mjs'
controller.write_text(source, encoding='utf-8', newline='\n')
run = subprocess.run(['node', str(controller)], cwd=HERE, capture_output=True, timeout=120)
(HERE / 'active-controller.stdout').write_bytes(run.stdout)
(HERE / 'active-controller.stderr').write_bytes(run.stderr)
receipt = {'exitCode': run.returncode, 'onlyChanges': 'repository URL, output summary filename and separate checkpoint/source-HEAD metadata; exact frozen before inputs and literal expectations unchanged',
           'originalControllerSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
           'repairedControllerSha256': hashlib.sha256(controller.read_bytes()).hexdigest(),
           'stdoutSha256': hashlib.sha256(run.stdout).hexdigest(), 'stderrSha256': hashlib.sha256(run.stderr).hexdigest()}
(HERE / 'active-controller-identity.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps(receipt))
raise SystemExit(run.returncode)
