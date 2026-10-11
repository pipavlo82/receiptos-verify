"""One-time, read-only pinned GitHub tree verification before local vendoring."""
import ast
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
SNAPSHOT = ROOT.parents[1] / 'work/snapshots/pipavlo82__quantum-execution-evidence'
REPO = 'pipavlo82/quantum-execution-evidence'
COMMIT = '5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05'

def load(path):
    return json.loads((SNAPSHOT / path).read_bytes())

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path]))

def tree(pair):
    repo, commit = pair
    head = api(f'repos/{repo}/git/commits/{commit}')
    identity = head['tree']['sha']
    data = api(f'repos/{repo}/git/trees/{identity}?recursive=1')
    assert data['sha'] == identity and not data.get('truncated')
    return pair, (identity, {r['path']: r for r in data['tree'] if r['type'] == 'blob'})

sources = {}
for node in ast.parse((SNAPSHOT / 'qev/source_inventory.py').read_bytes()).body:
    if isinstance(node, ast.Assign) and node.targets[0].id in ('RVR_VENDOR_FILES', 'RECEIPTOS_VENDOR_FILES'):
        for row in ast.literal_eval(node.value):
            sources[row['path']] = row

rvr = 'profiles/rvr-qev-moth-counts-v0/'
receiptos = 'profiles/moth-receiptos-v0/'
selected = {'LICENSE', 'NOTICE', rvr + 'sources.json', receiptos + 'sources.json'}
selected.update(load(rvr + 'sources.json'))
selected.update(load(receiptos + 'sources.json'))
profile = load(rvr + 'verification-profile.json')
rows = [profile['profileSchemaContract']['manifest'], profile['profileSchemaContract']['constraints'],
        profile['verificationSpecification'], *profile['schemaContracts'], *profile['conformanceVectorSet']['members']]
selected.update(row['path'] for row in rows)
packaging = load(receiptos + 'profile.json')
selected.update(row['path'] for key in ('dependencies', 'vendorFiles', 'rvrPins') for row in packaging[key])
selected.update(sources)
assert not any(path.startswith('fixtures/') or '/capture/' in path for path in selected)
pairs = {(REPO, COMMIT)} | {(r['repository'].removeprefix('https://github.com/').removesuffix('.git'), r['commit']) for r in sources.values()}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    trees = dict(pool.map(tree, pairs))
records = []
pending = []
for path in sorted(selected):
    data = (SNAPSHOT / path).read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    row = trees[(REPO, COMMIT)][1][path]
    assert row['sha'] == blob and row['size'] == len(data), path
    record = {'sourcePath': path, 'vendoredPath': 'vendor/qev_moth/' + path, 'gitBlobSha1': blob,
              'sha256': hashlib.sha256(data).hexdigest(), 'size': len(data), 'copiedUnmodified': True}
    if path in sources:
        origin = sources[path]
        pair = (origin['repository'].removeprefix('https://github.com/').removesuffix('.git'), origin['commit'])
        upstream = trees[pair][1][origin['source_path']]
        assert upstream['sha'] == blob == origin['git_blob_sha1'] and origin['sha256'] == record['sha256']
        record['originalUpstream'] = {'repository': origin['repository'], 'commit': origin['commit'],
                                      'path': origin['source_path'], 'tree': trees[pair][0]}
    records.append(record)
    pending.append((ROOT / record['vendoredPath'], data))
for path, data in pending:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
source = {'adapter': 'qev_moth', 'sourceRepository': 'https://github.com/' + REPO,
          'sourceCommit': COMMIT, 'sourceTree': trees[(REPO, COMMIT)][0],
          'license': 'Apache-2.0 authored subset and Apache-2.0 nested RVR/ReceiptOS; original LICENSE and NOTICE retained',
          'files': records, 'verification': {'method': 'Independent pinned GitHub commit/tree API plus local Git blob SHA-1 and SHA-256',
          'apiTrees': [f'https://api.github.com/repos/{repo}/git/trees/{trees[(repo, commit)][0]}?recursive=1' for repo, commit in sorted(pairs)]},
          'runtimeStatus': 'IMPLEMENTED', 'capturedProviderBytesCopied': False,
          'metadataOnlyHistoricalReferences': [rvr + 'claim.json', rvr + 'roles.json', rvr + 'conformance.json', receiptos + 'conformance.json'],
          'adapterPaths': ['src/adapters/qev_moth.mjs', 'src/adapters/native/qev-moth-bridge.py', 'src/adapters/native/qev-moth-fixture.py', 'src/adapters/native/process.mjs', 'src/adapters/native/pins.mjs']}
(ROOT / 'provenance/qev-moth-sources.json').write_text(json.dumps({'schema': 'receiptos.verify.qev-moth-sources.v1', 'sources': [source]}, indent=2) + '\n', encoding='utf-8', newline='\n')
pinfile = ROOT / 'src/adapters/native/pins.mjs'
current = pinfile.read_text(encoding='utf-8')
start = current.index('const pins = ') + len('const pins = ')
end = current.index(';\n\nexport', start)
pins = json.loads(current[start:end])
pins['qev_moth'] = {key: source[key] for key in ('sourceCommit', 'sourceRepository')}
pins['qev_moth']['files'] = {r['vendoredPath']: {key: r[key] for key in ('sha256', 'gitBlobSha1', 'size', 'sourcePath')} for r in records}
pinfile.write_text(current[:start] + json.dumps(pins, indent=2) + current[end:], encoding='utf-8', newline='\n')
print(json.dumps({'files': len(records), 'bytes': sum(r['size'] for r in records), 'sourceTree': source['sourceTree'], 'capturedProviderBytesCopied': False}))
