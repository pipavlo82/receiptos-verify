import concurrent.futures, datetime, fnmatch, json, pathlib, subprocess
BASE=pathlib.Path(__file__).resolve().parents[2]; ROOT=BASE/'outputs/receiptos-verify'; OUT=pathlib.Path(__file__).resolve().parent
catalog=json.loads((ROOT/'provenance/sources.json').read_text()); pins=json.loads((OUT/'source-audit.json').read_text())['pins']
def api(pin):
    endpoint=f"repos/{pin['repository']}/git/trees/{pin['tree']}?recursive=1"; start=datetime.datetime.now(datetime.timezone.utc).isoformat()
    p=subprocess.run(['gh','api',endpoint],capture_output=True,text=True,encoding='utf-8',timeout=60)
    return (pin['repository'],pin['sourceSHA']),dict(endpoint=endpoint,startedAt=start,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),data=json.loads(p.stdout) if p.returncode==0 else {},error=p.stderr if p.returncode else None)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: trees=dict(pool.map(api,pins))
checks=[]
for s in catalog['sources']+catalog['v02Integrations']:
    t=trees[s['repository'],s['sourceSHA']]; entries=t['data'].get('tree',[])
    for path in s.get('paths',s.get('sourcePaths',[])):
        matches=[e for e in entries if (e['path'].startswith(path) if path.endswith('/') else fnmatch.fnmatchcase(e['path'],path) if '*' in path else e['path']==path)]
        checks.append(dict(capabilityId=s['capabilityId'],repository=s['repository'],sourceSHA=s['sourceSHA'],path=path,matches=len(matches),found=bool(matches),truncated=t['data'].get('truncated')))
result=dict(schema='receiptos.independent.source-path-audit.v02',count=len(checks),found=sum(c['found'] for c in checks),notFound=[c for c in checks if not c['found']],truncatedTrees=[k for k,t in trees.items() if t['data'].get('truncated')],errors=[t for t in trees.values() if t['error']],checks=checks)
(OUT/'source-path-audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
(OUT/'public-tree-observations.json').write_text(json.dumps({r+'@'+sha:t for (r,sha),t in trees.items()},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:result[k] for k in ['count','found','notFound','truncatedTrees','errors']}))
