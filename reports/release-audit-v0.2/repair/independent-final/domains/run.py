from pathlib import Path
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
BEFORE = HERE.parent / 'audit02-domains'
REPO = HERE.parent / 'v02-audit-final'
HEAD = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO).decode().strip()
assert HEAD == 'eb942148eeb489db809b39e053ec905105cc3056'
controllers = []
original = BEFORE / 'audit-domains.mjs'
source = original.read_text(encoding='utf-8')
old = "const root=fileURLToPath(new URL('./repo/',import.meta.url));"
assert source.count(old) == 1
source = source.replace(old, "const root=fileURLToPath(new URL('../v02-audit-final/',import.meta.url));")
controllers.append(('audit-domains.mjs', original, source, 'Only repository URL changes; original detached literal oracles unchanged.'))
original = HERE.parent / 'audit02-domains-after' / 'replay-active-contexts.mjs'
source = original.read_text(encoding='utf-8')
old = "const repo=new URL('../../outputs/receiptos-verify/',import.meta.url);"
assert source.count(old) == 1
source = source.replace(old, "const repo=new URL('../v02-audit-final/',import.meta.url);")
source = source.replace("new URL('summary.json',import.meta.url)", "new URL('active-context-summary.json',import.meta.url)")
source = source.replace('findingsCheckpoint:sourceHead', "findingsCheckpoint:'dde5419f453969ae33b9e88b3151dba3e370f196',sourceHead")
controllers.append(('replay-active-contexts.mjs', original, source, 'Only repository URL, summary filename and separate findings/source identity metadata change; exact frozen inputs unchanged.'))
receipts = []
for filename, original, source, note in controllers:
    controller = HERE / filename
    controller.write_text(source, encoding='utf-8', newline='\n')
    run = subprocess.run(['node', str(controller)], cwd=HERE, capture_output=True, timeout=180)
    (HERE / (filename + '.stdout')).write_bytes(run.stdout)
    (HERE / (filename + '.stderr')).write_bytes(run.stderr)
    receipt = {'candidate': HEAD, 'controller': filename, 'exitCode': run.returncode, 'change': note,
               'originalControllerSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
               'controllerSha256': hashlib.sha256(controller.read_bytes()).hexdigest(),
               'stdoutSha256': hashlib.sha256(run.stdout).hexdigest(), 'stderrSha256': hashlib.sha256(run.stderr).hexdigest()}
    receipts.append(receipt)
    (HERE / 'controller-receipts.json').write_text(json.dumps(receipts, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(receipt), flush=True)
    if run.returncode:
        print(run.stderr.decode('utf-8'))
        raise SystemExit(run.returncode)
current = json.loads((HERE / 'summary.json').read_text(encoding='utf-8'))
baseline = json.loads((BEFORE / 'summary.json').read_text(encoding='utf-8'))
assert current['candidate'] == HEAD
assert current['count'] == current['pass'] == 51
assert [r['id'] for r in current['rows']] == [r['id'] for r in baseline['rows']]
rows = []
for row in current['rows']:
    identifier = row['id']
    old = json.loads((BEFORE / 'cases' / f'{identifier}.json').read_text(encoding='utf-8'))
    new = json.loads((HERE / 'cases' / f'{identifier}.json').read_text(encoding='utf-8'))
    rows.append({'id': identifier, 'literalOracleUnchanged': old['oracle'] == new['oracle'],
                 'exactInputUnchanged': old['input'] == new['input'], 'statusUnchanged': old['actual'] == new['actual'],
                 'layerStatusesUnchanged': {k: v['status'] for k, v in old['output'].get('layers', {}).items()}
                 == {k: v['status'] for k, v in new['output'].get('layers', {}).items()}})
comparison = {'frozenCandidate': baseline['candidate'], 'releaseCandidate': HEAD, 'count': len(rows),
              'matchingOracleCount': sum(r['literalOracleUnchanged'] for r in rows),
              'matchingInputCount': sum(r['exactInputUnchanged'] for r in rows),
              'matchingStatusCount': sum(r['statusUnchanged'] for r in rows),
              'matchingLayerCount': sum(r['layerStatusesUnchanged'] for r in rows), 'rows': rows}
(HERE / 'before-after-comparison.json').write_text(json.dumps(comparison, indent=2) + '\n', encoding='utf-8', newline='\n')
active = json.loads((HERE / 'active-context-summary.json').read_text(encoding='utf-8'))
assert active['sourceHead'] == HEAD
assert len(active['rows']) == 9 and all(r['assessment'] == 'PASS' for r in active['rows'])
files = [p for p in HERE.rglob('*') if p.is_file() and p.name != 'evidence-manifest.json']
manifest = {'files': [{'path': p.relative_to(HERE).as_posix(), 'size': p.stat().st_size,
                        'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)]}
(HERE / 'evidence-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({k: v for k, v in comparison.items() if k != 'rows'}), flush=True)
