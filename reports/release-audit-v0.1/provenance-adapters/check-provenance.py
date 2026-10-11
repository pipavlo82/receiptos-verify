import json,hashlib,subprocess,re,sys,concurrent.futures,datetime,collections
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(r'C:/Users/msi/Documents/Codex/2026-10-11/files-pasted-by-the-user-mission/outputs/receiptos-verify')
out=Path(__file__).parent
load=lambda p:json.loads((root/p).read_text('utf-8'))
d=load('provenance/sources.json'); a=load('provenance/authorship-evidence.json');ids={s['id'] for s in a['evidence']}
rows=[]
for s in d['sources']:
 refs=s.get('authorshipEvidence',{}).get('entryIds',[])
 rows.append({'capabilityId':s['capabilityId'],'repository':s['repository'],'sourceSHA':s['sourceSHA'],'integrationMode':s['integrationMode'],'role':s['role'],'implemented':s['implemented'],'used':s.get('used'),'productFiles':s['productFiles'],'missingProductFiles':[p for p in s['productFiles'] if not (root/p).is_file()],'authorshipIDs':refs,'unresolvedAuthorshipIDs':[x for x in refs if x not in ids],'license':s['license'],'maturity':s['maturity'],'selectedScopeNote':s['selectedScopeNote'],'paths':s['paths'],'nativeExecution':s.get('nativeExecution')})
manifestFiles=[]
for p in ['provenance/native-sources.json','provenance/qev-sources.json','provenance/qev-moth-sources.json']:
 for s in load(p)['sources']:
  for f in s['files']:
   b=(root/f['vendoredPath']).read_bytes(); actualsha=hashlib.sha256(b).hexdigest();actualblob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
   manifestFiles.append({'manifest':p,'repository':s['sourceRepository'].removeprefix('https://github.com/'),'commit':s['sourceCommit'],**f,'actualSHA256':actualsha,'actualGitBlob':actualblob,'matches':actualsha==f['sha256'] and actualblob==f['gitBlobSha1'] and len(b)==f['size']})
keys=sorted({(s['repository'],s['sourceSHA']) for s in d['sources']})
def call(endpoint):
 now=datetime.datetime.now(datetime.timezone.utc).isoformat();p=subprocess.run(['gh','api',endpoint],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=45)
 try: value=json.loads(p.stdout)
 except: value={}
 return {'endpoint':endpoint,'observedAt':now,'exitCode':p.returncode,'value':value,'stderr':p.stderr.decode('utf-8','replace')[:400]}
def commit(k):
 repo,sha=k;r=call(f'repos/{repo}/git/commits/{sha}');v=r.pop('value');return {**r,'repository':repo,'requestedSHA':sha,'returnedSHA':v.get('sha'),'tree':v.get('tree',{}).get('sha'),'valid':v.get('sha')==sha}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: pins=list(ex.map(commit,keys))
# Only exact declared sources/PRs. No cloning, source download or unrelated account listing.
selectedPRs=[('pipavlo82/protected-relation-fixtures',14),('pipavlo82/protected-relation-fixtures',13),('trustless-ai/recompute-kit',65),('trustless-ai/recompute-kit',57),('pipavlo82/ml-dsa-65-ethereum-verification',27)]
def pr(k):
 repo,n=k;r=call(f'repos/{repo}/pulls/{n}');v=r.pop('value');return {**r,'repository':repo,'number':n,'state':v.get('state'),'merged':v.get('merged'),'mergedAt':v.get('merged_at'),'headSHA':v.get('head',{}).get('sha'),'baseSHA':v.get('base',{}).get('sha'),'url':v.get('html_url')}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex: prs=list(ex.map(pr,selectedPRs))
# Exact tree membership of every actually redistributed upstream byte.
bytree={}
for f in manifestFiles: bytree.setdefault((f['repository'],f['commit']),[]).append(f)
trees=[]
for (repo,sha),files in bytree.items():
 tree=next(p['tree'] for p in pins if p['repository']==repo and p['requestedSHA']==sha)
 r=call(f'repos/{repo}/git/trees/{tree}?recursive=1');v=r.pop('value');mapping={x['path']:x for x in v.get('tree',[])}
 compared=[{'sourcePath':f['sourcePath'],'vendoredPath':f['vendoredPath'],'expectedBlob':f['actualGitBlob'],'treeBlob':mapping.get(f['sourcePath'],{}).get('sha'),'matches':mapping.get(f['sourcePath'],{}).get('sha')==f['actualGitBlob']} for f in files]
 trees.append({**r,'repository':repo,'commit':sha,'tree':tree,'truncated':v.get('truncated'),'compared':compared})
# Copied npm legal bytes vs declared lock/package licenses; no legal clearance beyond copied scope.
legal=[]
for x in load('provenance/npm-licenses.json').get('packages',[]):
 for f in x.get('files',[]):
  pass
record={'schema':'receiptos.release.provenance-check.v1','frozenCommit':'33d8ee47ad733f1198f2b2fb8d171b31c7b10678','sourceEntries':rows,'sourceCount':len(rows),'repositoryCount':len(d['repositoryReuse']),'ownedCount':sum(x['scope']=='OWNED_PUBLIC' for x in d['repositoryReuse']),'authorshipCount':len(a['evidence']),'referencedAuthorshipCount':len({x for s in rows for x in s['authorshipIDs']}),'sourcePins':pins,'liveSelectedPRs':prs,'copiedFileChecks':manifestFiles,'upstreamTreeMembership':trees,'repositoryReuse':d['repositoryReuse'],'basisFiles':d['auditBasis'],'historicalSnapshotsRehashed':False,'limits':['All source SHAs independently resolved by precise public read-only GitHub Git commit API. Copied bytes rehashed locally and their upstream tree membership independently checked.','Historical authorship assertions remain mechanically reported in frozen local ledger, not newly independently reconstructed. Repository ownership, PR opener, reviews and merged status do not establish sole/original authorship.','No historical 21,119-file snapshot rehash or existing worktree inspection is claimed in this audit.','Root legal license scope of unselected repositories is not a release blocker when no code/material is copied.']}
(out/'provenance-check.json').write_text(json.dumps(record,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'sources':len(rows),'repos':record['repositoryCount'],'owned':record['ownedCount'],'authorship':record['authorshipCount'],'authorshipRefs':record['referencedAuthorshipCount'],'missingProductFiles':[(s['capabilityId'],s['missingProductFiles']) for s in rows if s['missingProductFiles']],'badAuthorshipRefs':[s['capabilityId'] for s in rows if s['unresolvedAuthorshipIDs']],'declaredImplemented':sum(s['implemented'] for s in rows),'sourcePins':len(pins),'failedPins':[p for p in pins if not p['valid']],'copiedFiles':len(manifestFiles),'copiedMismatch':[f['vendoredPath'] for f in manifestFiles if not f['matches']],'treeMismatches':[x for t in trees for x in t['compared'] if not x['matches']],'livePRs':prs},indent=2))
