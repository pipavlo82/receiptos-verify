import concurrent.futures, datetime, hashlib, json, pathlib, re, subprocess
BASE=pathlib.Path(__file__).resolve().parents[2]
ROOT=BASE/'outputs/receiptos-verify'; OUT=pathlib.Path(__file__).resolve().parent
catalog=json.loads((ROOT/'provenance/sources.json').read_text())
requests=set(); declarations=[]
for s in catalog['v02Integrations']:
    for e in s.get('contributionEvidence',[]):
        url=e.get('url',e.get('evidence_url',''))
        if '/commit/' in url:
            repo,commit=url.split('github.com/')[-1].split('/commit/')
            endpoint=f'repos/{repo}/commits/{commit}'
            requests.add(endpoint); declarations.append(dict(capability=s['capabilityId'],endpoint=endpoint,actor=e.get('actor',e.get('github_login')),paths=e.get('paths',[e.get('sourcePath')]),role=e.get('role')))
        if 'issuecomment-6072721352' in url:
            requests.add('repos/trustless-ai/recompute-kit/issues/comments/6072721352')
def api(endpoint):
    start=datetime.datetime.now(datetime.timezone.utc).isoformat()
    p=subprocess.run(['gh','api',endpoint],capture_output=True,text=True,encoding='utf-8',timeout=45)
    end=datetime.datetime.now(datetime.timezone.utc).isoformat()
    return dict(endpoint=endpoint,startedAt=start,finishedAt=end,returncode=p.returncode,data=json.loads(p.stdout) if p.returncode==0 else None,error=p.stderr if p.returncode else None)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: results={r['endpoint']:r for r in pool.map(api,sorted(requests))}
checks=[]
for e in declarations:
    d=results[e['endpoint']]['data'] or {}; paths=[f['filename'] for f in d.get('files',[])]
    checks.append(dict(**e,actualActor=(d.get('author') or {}).get('login'),actualAuthor=d.get('commit',{}).get('author',{}).get('name'),actualPaths=paths,actorMatches=(d.get('author') or {}).get('login')==e['actor'],pathsMatch=all(p in paths for p in e['paths'] if p),message=d.get('commit',{}).get('message')))
npm=json.loads((ROOT/'provenance/npm-licenses.json').read_text())
licenses=[]
for p in npm['packages']:
    for f in p['legal']:
        b=(ROOT/f['path']).read_bytes()
        licenses.append(dict(package=p.get('name'),path=f['path'],expectedSHA256=f['sha256'],actualSHA256=hashlib.sha256(b).hexdigest(),matches=hashlib.sha256(b).hexdigest()==f['sha256']))
evidence=dict(schema='receiptos.independent.audit.attribution.v02',candidate='4888a0584369a91075eb2bdbd9a2ff6b99c46588',checks=checks,apiObservations=results,npmLicenseChecks=licenses)
(OUT/'attribution-audit.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(declarations=len(checks),actorMatches=sum(c['actorMatches'] for c in checks),pathsMatch=sum(c['pathsMatch'] for c in checks),npmLicenseFiles=len(licenses),npmLicenseMatches=sum(c['matches'] for c in licenses),errors=[r for r in results.values() if r['returncode']])))
