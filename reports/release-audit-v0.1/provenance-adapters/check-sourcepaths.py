import json,subprocess,concurrent.futures,datetime,fnmatch,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(r'C:/Users/msi/Documents/Codex/2026-10-11/files-pasted-by-the-user-mission/outputs/receiptos-verify');out=Path(__file__).parent
source=json.loads((root/'provenance/sources.json').read_text())['sources'];pins=json.loads((out/'provenance-check.json').read_text())['sourcePins']
def read(p):
 endpoint=f'repos/{p["repository"]}/git/trees/{p["tree"]}?recursive=1';r=subprocess.run(['gh','api',endpoint],capture_output=True,timeout=45)
 try:v=json.loads(r.stdout)
 except:v={}
 return ((p['repository'],p['requestedSHA']),{'endpoint':endpoint,'exitCode':r.returncode,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'truncated':v.get('truncated'),'mapping':{x['path']:x for x in v.get('tree',[])}})
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:trees=dict(ex.map(read,pins))
rows=[]
for s in source:
 t=trees[(s['repository'],s['sourceSHA'])];mapping=t['mapping'];paths=[]
 for path in s['paths']:
  if any(c in path for c in '*?['):matches=[x for x in mapping if fnmatch.fnmatch(x,path)];paths.append({'path':path,'kind':'PATTERN_REFERENCE','matches':len(matches),'exists':bool(matches)})
  else:paths.append({'path':path,'kind':'EXACT_SOURCE_PATH','exists':path.rstrip('/') in mapping,'gitBlob':mapping.get(path.rstrip('/'),{}).get('sha')})
 pins=[]
 for p in s.get('selectedSourcePathPins',[]):
  path=p.get('path') or p.get('sourcePath');expected=p.get('git_blob_sha1') or p.get('git_blob_oid') or p.get('gitBlobSha1');actual=mapping.get(path,{}).get('sha');pins.append({'path':path,'expectedGitBlob':expected,'upstreamGitBlob':actual,'matches':actual==expected})
 rows.append({'capabilityId':s['capabilityId'],'repository':s['repository'],'sourceSHA':s['sourceSHA'],'paths':paths,'selectedPathPinChecks':pins,'treeTruncated':t['truncated']})
record={'schema':'receiptos.release.exact-source-path-check.v1','treeQueries':[{k:v for k,v in t.items() if k!='mapping'} for t in trees.values()],'records':rows,'limits':['Source tree membership only; no new independent authorship/originality reconstruction. Pattern references remain patterns, not complete native capabilities.']}
(out/'source-path-check.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'treeQueries':len(trees),'failedQueries':[t['endpoint'] for t in trees.values() if t['exitCode']],'truncatedTrees':[t['endpoint'] for t in trees.values() if t['truncated']],'nonexistentPaths':[(r['capabilityId'],p['path']) for r in rows for p in r['paths'] if not p['exists']],'mismatchedSelectedPins':[(r['capabilityId'],p) for r in rows for p in r['selectedPathPinChecks'] if not p['matches']]},indent=2))
