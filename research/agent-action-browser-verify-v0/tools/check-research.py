"""Additive source closure; never rewrites the historical root source lock."""
import argparse,hashlib,json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');args=parser.parse_args()
excluded={'source-lock.json','SHA256SUMS'}
files=[];errors=[]
for f in sorted(ROOT.rglob('*')):
    if f.is_symlink():errors.append('SYMLINK:'+str(f));continue
    if not f.is_file():continue
    rel=f.relative_to(ROOT).as_posix()
    if rel in excluded:continue
    b=f.read_bytes()
    if f.suffix not in ['.png','.zip'] and (b'\r' in b or b.startswith(b'\xef\xbb\xbf')):errors.append('LF_OR_BOM:'+rel)
    if f.suffix=='.md':
        for target in re.findall(r'\]\(([^)]+)\)',b.decode('utf-8')):
            target=target.split('#')[0]
            if target and not re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:',target) and not (f.parent/target).is_file():errors.append('BROKEN_LINK:'+rel+':'+target)
    files.append({'path':rel,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
record={'schema':'agent-action.research-source-lock.v0','scope':'All experiment files except this lock and its outer SHA256SUMS. Historical host lock is unchanged.','files':files}
if args.write:
    if errors:raise SystemExit(json.dumps(errors))
    (ROOT/'source-lock.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
    manifest=files+[{'path':'source-lock.json','sha256':hashlib.sha256((ROOT/'source-lock.json').read_bytes()).hexdigest()}]
    (ROOT/'SHA256SUMS').write_text(''.join(r['sha256']+'  '+r['path']+'\n' for r in sorted(manifest,key=lambda r:r['path'])),encoding='utf-8',newline='\n')
else:
    if json.loads((ROOT/'source-lock.json').read_text('utf-8'))!=record:errors.append('RESEARCH_SOURCE_CLOSURE_MISMATCH')
    for line in (ROOT/'SHA256SUMS').read_text().splitlines():
        expected,path=line.split('  ',1)
        if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=expected:errors.append('OUTER_MANIFEST_MISMATCH:'+path)
print(json.dumps({'files':len(files),'status':'FAIL' if errors else 'PASS','errors':errors}))
sys.exit(bool(errors))
