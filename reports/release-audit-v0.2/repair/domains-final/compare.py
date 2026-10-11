from pathlib import Path
import hashlib
import json

HERE = Path(__file__).resolve().parent
BEFORE = HERE.parent / 'audit02-domains'
current = json.loads((HERE / 'summary.json').read_text(encoding='utf-8'))
baseline = json.loads((BEFORE / 'summary.json').read_text(encoding='utf-8'))
assert current['candidate'] == '1fecfc2587c5d89d350017a2a7a98ca78e933b9f'
assert current['count'] == current['pass'] == 51
assert [r['id'] for r in current['rows']] == [r['id'] for r in baseline['rows']]
rows = []
for row in current['rows']:
    identifier = row['id']
    old = json.loads((BEFORE / 'cases' / f'{identifier}.json').read_text(encoding='utf-8'))
    new = json.loads((HERE / 'cases' / f'{identifier}.json').read_text(encoding='utf-8'))
    old_layers = {k: v['status'] for k, v in old['output'].get('layers', {}).items()}
    new_layers = {k: v['status'] for k, v in new['output'].get('layers', {}).items()}
    rows.append({'id': identifier, 'literalOracleUnchanged': old['oracle'] == new['oracle'],
                 'exactInputUnchanged': old['input'] == new['input'],
                 'productOrAdapterStatusUnchanged': old['actual'] == new['actual'],
                 'layerStatusesUnchanged': old_layers == new_layers})
report = {'frozenCandidate': baseline['candidate'], 'repairedCommit': current['candidate'],
          'count': len(rows), 'matchingOracleCount': sum(r['literalOracleUnchanged'] for r in rows),
          'matchingInputCount': sum(r['exactInputUnchanged'] for r in rows),
          'matchingStatusCount': sum(r['productOrAdapterStatusUnchanged'] for r in rows),
          'matchingLayerCount': sum(r['layerStatusesUnchanged'] for r in rows), 'rows': rows}
(HERE / 'before-after-comparison.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
paths = [p for p in HERE.rglob('*') if p.is_file() and p.name != 'evidence-manifest.json']
manifest = {'files': [{'path': p.relative_to(HERE).as_posix(), 'size': p.stat().st_size,
                        'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths)]}
(HERE / 'evidence-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({k: v for k, v in report.items() if k != 'rows'}))
