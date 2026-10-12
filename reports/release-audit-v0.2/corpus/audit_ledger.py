import concurrent.futures,datetime,json,pathlib,subprocess
BASE=pathlib.Path(__file__).resolve().parents[2];ROOT=BASE/'outputs/receiptos-verify';OUT=pathlib.Path(__file__).resolve().parent
catalog=json.loads((ROOT/'provenance/sources.json').read_text());ledger=json.loads((ROOT/'provenance/authorship-evidence.json').read_text())
requests={f"repos/{r['repository']}" for r in catalog['repositoryReuse']}; declarations=[]
for row in ledger['evidence']:
    auth=row.get('authorship_evidence',{}); proofs=[]
    if row.get('contribution_commit'): proofs.append(row['contribution_commit'])
    proofs+=auth.get('authorship_evidence_commits',[])
    proofs += [x['sha'] for x in auth.get('mechanical_commit_authors',[])]
    for commit in sorted(set(proofs)):
        ep=f"repos/{row['source_repository']}/commits/{commit}";requests.add(ep)
        declarations.append(dict(entry=row['id'],source_repository=row['source_repository'],types=row['contribution_types'],contributors=row['contributors'],endpoint=ep,declaredAuthorLogin=auth.get('author_login')))
def api(ep):
    t=datetime.datetime.now(datetime.timezone.utc).isoformat();p=subprocess.run(['gh','api',ep],capture_output=True,text=True,encoding='utf-8',timeout=60)
    return ep,dict(endpoint=ep,startedAt=t,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),data=json.loads(p.stdout) if p.returncode==0 else None,error=p.stderr if p.returncode else None,returncode=p.returncode)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: responses=dict(pool.map(api,sorted(requests)))
repo_visibility=[dict(repository=r['repository'],visibility=(responses[f"repos/{r['repository']}"]['data'] or {}).get('visibility')) for r in catalog['repositoryReuse']]
checks=[]
for e in declarations:
    r=responses[e['endpoint']];d=r['data'] or {};actor=(d.get('author') or {}).get('login'); e.update(actualSHA=d.get('sha'),actualAuthorLogin=actor,actualAuthorName=d.get('commit',{}).get('author',{}).get('name'),exists=r['returncode']==0,declaredAuthorMatches=e['declaredAuthorLogin'] is None or actor==e['declaredAuthorLogin']);checks.append(e)
original=[r for r in ledger['evidence'] if 'ORIGINAL_CODE' in r['contribution_types']]
without=[r['id'] for r in original if not any(c['entry']==r['id'] for c in checks)]
result=dict(schema='receiptos.independent.historical-attribution-audit.v02',ledgerEntries=len(ledger['evidence']),originalCodeEntries=len(original),originalCodeWithoutCommitProof=without,repoVisibility=repo_visibility,checks=checks,apiObservations=responses,limits=['Source-path scope and historical role distinctions require human review; existence/author metadata is not sole ownership proof.','Historical states remain time-scoped even where current PR state changed.'])
(OUT/'historical-ledger-audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(repositories=len(repo_visibility),public=sum(r['visibility']=='public' for r in repo_visibility),ledgerEntries=result['ledgerEntries'],originalCodeEntries=len(original),originalCodeWithoutCommitProof=without,commitDeclarations=len(checks),found=sum(c['exists'] for c in checks),authorMismatches=[c for c in checks if not c['declaredAuthorMatches']],errors=[dict(endpoint=r['endpoint'],error=r['error']) for r in responses.values() if r['returncode']])))
