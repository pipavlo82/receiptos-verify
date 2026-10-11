import base64
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import subprocess

BASE = pathlib.Path(__file__).resolve().parents[2]
ROOT = BASE / 'outputs/receiptos-verify'
OUT = pathlib.Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)
def load(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))
def h(b): return hashlib.sha256(b).hexdigest()
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def git(*args): return subprocess.check_output(['git','-C',str(ROOT),*args]).decode().strip()
def api(endpoint):
    p=subprocess.run(['gh','api',endpoint],capture_output=True,text=True,encoding='utf-8',timeout=45)
    if p.returncode: return {'endpoint':endpoint,'error':p.stderr,'returncode':p.returncode}
    try: return {'endpoint':endpoint,'data':json.loads(p.stdout)}
    except ValueError: return {'endpoint':endpoint,'error':'non-JSON output'}
catalog=load('provenance/sources.json')
assert git('rev-parse','HEAD')=='4888a0584369a91075eb2bdbd9a2ff6b99c46588'
assert not git('diff','--name-only') and not git('diff','--cached','--name-only')
copied=[]
for path in ['provenance/native-sources.json','provenance/qev-sources.json','provenance/qev-moth-sources.json']:
    for s in load(path)['sources']:
        for f in s['files']:
            copied.append(dict(repository=s['sourceRepository'].split('github.com/')[-1], sourceSHA=s['sourceCommit'], sourcePath=f['sourcePath'],productPath=f['vendoredPath'],expectedBlob=f['gitBlobSha1'],expectedSHA256=f['sha256'],license=s['license'],manifest=path))
for s in catalog['v02Integrations']:
    for f in s['copiedFiles']:
        copied.append(dict(repository=s['repository'],sourceSHA=s['sourceSHA'],sourcePath=f['sourcePath'],productPath=f['productPath'],expectedBlob=f['gitBlob'],expectedSHA256=f['sha256'],license=s['license'],manifest=s['sourceFragment']))
for f in copied:
    b=(ROOT/f['productPath']).read_bytes()
    f.update(bytes=len(b),actualSHA256=h(b),actualBlob=blob(b),localIdentityMatches=h(b)==f['expectedSHA256'] and blob(b)==f['expectedBlob'])
pins=sorted({(s['repository'],s['sourceSHA']) for s in catalog['sources']} | {(s['repository'],s['sourceSHA']) for s in catalog['v02Integrations']} | {(s['repository'],s['sourceSHA']) for s in copied})
requests={f'repos/{repo}/git/commits/{sha}' for repo,sha in pins}
requests.update(f"repos/{f['repository']}/contents/{f['sourcePath']}?ref={f['sourceSHA']}" for f in copied)
current_repos=sorted({s['repository'] for s in catalog['v02Integrations']})
requests.update(f'repos/{repo}' for repo in current_repos)
requests.update(['repos/trustless-ai/recompute-kit/pulls/57','repos/pipavlo82/protected-relation-fixtures/pulls/14','repos/trustless-ai/semantic-abi/pulls/1'])
requests.update(f'repos/Interpoll1/decentralised/commits/{sha}' for sha in ['2cfde5efc3d10b56c73e74723d3f328b77f2fc1f','a1eb47653aa7b8f0484ab977d75a5db41d226d02'])
requests.update(['repos/pipavlo82/protected-relation-fixtures/commits/717f04b3216c560949331dfc084e2fa6bb5e95bd','repos/trustless-ai/semantic-abi/commits/8fb67bd43140a1cc7aab5c272796da0417d3ceaf'])
results={}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for result in pool.map(api,sorted(requests)):
        results[result['endpoint']]=result
        if result.get('error'): print('API_ERROR',result['endpoint'],result['error'][:120],flush=True)
defaults=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    endpoints=[f"repos/{r}/commits/{results[f'repos/{r}'].get('data',{}).get('default_branch','main')}" for r in current_repos]
    for result in pool.map(api,endpoints): results[result['endpoint']]=result; defaults.append(result)
for f in copied:
    result=results[f"repos/{f['repository']}/contents/{f['sourcePath']}?ref={f['sourceSHA']}"]
    data=result.get('data',{})
    if data.get('encoding')=='base64':
        b=base64.b64decode(data['content'])
        f.update(remoteSHA256=h(b),remoteBlob=data['sha'],remoteMatchesLocal=h(b)==f['actualSHA256'] and data['sha']==f['actualBlob'])
    else: f.update(remoteMatchesLocal=False,remoteError=result.get('error','no base64 content'))
pin_results=[]
for repo,sha in pins:
    d=results[f'repos/{repo}/git/commits/{sha}'].get('data',{})
    pin_results.append(dict(repository=repo,sourceSHA=sha,observedSHA=d.get('sha'),tree=d.get('tree',{}).get('sha'),exists=d.get('sha')==sha))
tracked=git('ls-files').splitlines()
vendor=[p for p in tracked if p.startswith('vendor/')]
declared={f['productPath'] for f in copied}
npm=load('provenance/npm-licenses.json')
npm_paths={f['path'] for p in npm['packages'] for f in p['legal']}
other=sorted(set(vendor)-declared-npm_paths)
history=load('provenance/authorship-evidence.json')
basecat=json.loads(git('show','v0.1.0:provenance/sources.json'))
historical_sources_unchanged=catalog['sources']==basecat['sources']
repo_rows=[]
role_map={'runtime':'PINNED_SOURCE_ADAPTER','adapter':'REIMPLEMENTED_FROM_SPEC','methodology':'METHODOLOGY_ONLY','fixture':'FIXTURE_ONLY','historical':'HISTORICAL_LESSON','optional_interface':'FUTURE_EXTENSION','no_useful_capability_found':'NO_TRANSFERRED_CAPABILITY'}
reuse_map=(ROOT/'FULL_WORK_REUSE_MAP.md').read_text(encoding='utf-8')
for row in catalog['repositoryReuse']:
    repo_rows.append(dict(repository=row['repository'],historicalMode=row['mode'],auditorRole=role_map.get(row['mode'],'UNCLEAR'), v02IntegrationIds=row['v02IntegrationIds'],allCapabilityPinsPresent=all(any(s['capabilityId']==x and len(s['sourceSHA'])==40 for s in catalog['sources']) for x in row['capabilityIds']), inHumanReuseMap=row['repository'] in reuse_map,reason=row['reason']))
summary=dict(schema='receiptos.independent.audit.sources.v02',observedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),candidate=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}'),repositoryAccounts=len(repo_rows),historicalSourceEntries=len(catalog['sources']),historicalSourcesUnchangedFromV01=historical_sources_unchanged,newIntegrations=len(catalog['v02Integrations']),newSourceRepositories=len(current_repos),copiedFiles=len(copied),copiedLocalMatched=sum(f['localIdentityMatches'] for f in copied),copiedPublicBytesMatched=sum(f['remoteMatchesLocal'] for f in copied),npmPackages=len(npm['packages']),npmLegalFiles=len(npm_paths),otherVendorFiles=other,sourcePins=len(pin_results),sourcePinsFound=sum(p['exists'] for p in pin_results),apiErrors=[r for r in results.values() if 'error' in r],repositoryRoles=repo_rows,pins=pin_results,copied=copied,limits=['Mechanical attribution verifies identities/history, not sole ownership or legal opinion.','Historical repository roles are preserved accounts, not claims of new execution.','Absence of private material is a selected-file/dependency-boundary conclusion; no complete global filesystem search.'])
(OUT/'source-audit.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
(OUT/'public-source-observations.json').write_text(json.dumps(dict(observedAt=summary['observedAt'],candidate=summary['candidate'],results=results),indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:summary[k] for k in ['repositoryAccounts','historicalSourceEntries','historicalSourcesUnchangedFromV01','newIntegrations','newSourceRepositories','copiedFiles','copiedLocalMatched','copiedPublicBytesMatched','npmPackages','sourcePins','sourcePinsFound','otherVendorFiles']}))
