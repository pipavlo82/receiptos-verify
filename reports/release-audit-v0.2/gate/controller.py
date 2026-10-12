"""Independent frozen v0.2 audit command controller; no remote writes."""
import datetime, hashlib, json, os, pathlib, shutil, subprocess

workspace=pathlib.Path(__file__).resolve().parent.parent
product=workspace/'outputs/receiptos-verify'
checkout=workspace/'work/v02-release-audit'
out=product/'reports/release-audit-v0.2'
candidate='4888a0584369a91075eb2bdbd9a2ff6b99c46588'
base='62cd3e59c8f568496ed087d55f0aec3d63363b0a'
expected_branch='feat/v0.2-generic-trustless-boundary'
def plain(argv,cwd=product): return subprocess.check_output(argv,cwd=cwd)
# Stop before creating any product audit output if identity or cleanliness fails.
head=plain(['git','rev-parse','HEAD']).decode().strip()
status=plain(['git','status','--porcelain=v1','--untracked-files=all'])
branch=plain(['git','branch','--show-current']).decode().strip()
if head!=candidate or status or branch!=expected_branch:
    raise SystemExit(json.dumps({'STOP':'CANDIDATE_OR_CLEANNESS_MISMATCH','head':head,'branch':branch,'status':status.decode()}))
out.mkdir(parents=True,exist_ok=False)
receipt={'schema':'receiptos.verify.independent-release-gate.v2','candidate':candidate,'tree':plain(['git','rev-parse','HEAD^{tree}']).decode().strip(),
         'branch':branch,'initial_status':'CLEAN','public_base':base,'controller_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
         'commands':[],'status':'RUNNING'}
def write(name,value):
    path=out/name;path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
def save():write('gate/summary.json',receipt)
def run(label,argv,cwd=checkout,allow_failure=False):
    started=datetime.datetime.now(datetime.timezone.utc).isoformat()
    r=subprocess.run(argv,cwd=cwd,capture_output=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
    target=out/'gate';target.mkdir(parents=True,exist_ok=True)
    (target/(label+'.stdout')).write_bytes(r.stdout);(target/(label+'.stderr')).write_bytes(r.stderr)
    receipt['commands'].append({'label':label,'argv':argv,'cwd':str(cwd),'started_utc':started,'exit_code':r.returncode,
            'stdout_sha256':hashlib.sha256(r.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(r.stderr).hexdigest()});save()
    print(label+': '+str(r.returncode),flush=True)
    if r.returncode and not allow_failure:
        receipt['status']='FAIL';save();raise SystemExit(r.returncode)
    return r.stdout

tracked=plain(['git','ls-files','-z']).split(b'\0')
tree_data=plain(['git','ls-tree','-r','-z',candidate]).split(b'\0')
blobs={row.split(b'\t',1)[1].decode():row.split(b'\t',1)[0].split()[2].decode() for row in tree_data if row}
inventory=[]
for raw in tracked:
    if not raw:continue
    name=raw.decode();path=product/name
    if path.is_symlink() or not path.is_file():raise SystemExit('NOT_REGULAR:'+name)
    data=path.read_bytes();oid=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    inventory.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'commit_blob':blobs[name],
                      'working_bytes_match_commit_blob':oid==blobs[name]})
write('freeze/tracked-files.json',inventory)
write('freeze/identity.json',{**{k:receipt[k] for k in ['candidate','tree','branch','initial_status','public_base']},
      'tracked_regular_files':len(inventory),'source_lock_sha256':hashlib.sha256((product/'source-lock.json').read_bytes()).hexdigest(),
      'package_lock_sha256':hashlib.sha256((product/'package-lock.json').read_bytes()).hexdigest(),
      'historical_working_byte_differences':[x for x in inventory if not x['working_bytes_match_commit_blob']]})
(out/'freeze/status.txt').write_bytes(status)
(out/'freeze/working-diff.patch').write_bytes(plain(['git','diff','--binary']))
(out/'freeze/v01-candidate.diff').write_bytes(plain(['git','diff','--binary',base,candidate]))
(out/'freeze/v01-candidate-paths.txt').write_bytes(plain(['git','diff','--name-status',base,candidate]))
run('public-refs',['git','ls-remote','origin','refs/heads/main','refs/tags/v0.1.0','refs/tags/v0.1.0^{}'],product)
run('frozen-source-lock',['node','tools/check-sources.mjs'],product)
run('clone',['git','clone','--no-hardlinks','--no-checkout',str(product),str(checkout)],workspace)
run('checkout',['git','checkout','--detach',candidate])
fresh_status=run('fresh-initial-status',['git','status','--porcelain=v1','--untracked-files=all'])
if fresh_status:raise SystemExit('FRESH_DIRTY')
receipt['fresh_initial_status']='CLEAN';receipt['fresh_path']=str(checkout)
fresh_files=[]
for name,oid in blobs.items():
    data=(checkout/name).read_bytes()
    if hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()!=oid:raise SystemExit('FRESH_GIT_BLOB_MISMATCH:'+name)
    fresh_files.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'git_blob':oid})
write('freeze/fresh-tracked-files.json',fresh_files)
node=shutil.which('node');npm=shutil.which('npm.cmd');python=shutil.which('python');bun=shutil.which('bun') or str(pathlib.Path.home()/'.bun/bin/bun.exe')
for name,cmd in [('node',[node,'--version']),('npm',[npm,'--version']),('python',[python,'--version']),('bun',[bun,'--version']),('git',['git','--version'])]:
    run('version-'+name,cmd)
cache=workspace/'work/v02-release-audit-npm-cache'
receipt['install_cache_initially_absent']=not cache.exists()
if cache.exists():raise SystemExit('AUDIT_CACHE_ALREADY_EXISTS')
run('npm-ci',[npm,'ci','--ignore-scripts','--no-audit','--no-fund','--cache',str(cache)])
run('dependency-resolution',[node,'--input-type=module','-e',"console.log(import.meta.resolve('ajv'));console.log(import.meta.resolve('@noble/curves/secp256k1.js'));"])
# A clean empty scratch parent is necessary for the frozen v1 Git tests.
(checkout/'reports/tmp').mkdir(parents=True,exist_ok=True)
for label,cmd in [
    ('source-lock-before',[node,'tools/check-sources.mjs']),
    ('provenance-license',[node,'tools/check-provenance-v2.mjs']),
    ('tests-normal',[python,'-B','tools/capture-tests-v2.py','--label','audit-normal']),
    ('tests-no-opt',[python,'-B','tools/capture-tests-v2.py','--no-opt','--label','audit-no-opt']),
    ('vectors',[node,'tools/run-vectors-v2.mjs']),
    ('mutations-v1',[node,'tools/run-mutations.mjs','--out','reports/v0.2/audit-v1-mutations.json']),
    ('mutations-v2',[node,'tools/run-mutations-v2.mjs']),
    ('cli-v1',[node,'src/cli.mjs','demo']),
    ('cli-v2',[node,'src/cli.mjs','demo-v2']),
    ('determinism',[node,'tools/determinism-v2.mjs']),
    ('source-lock-after',[node,'tools/check-sources.mjs']),
    ('diff-check',['git','diff','--check']),
]:run(label,cmd)
for label in ['audit-normal','audit-no-opt']:
    receipt[label]=json.loads((checkout/'reports/v0.2'/(label+'-tests.json')).read_bytes())['counts']
receipt['vectors']={k:v for k,v in json.loads((checkout/'reports/v0.2/vectors.json').read_bytes()).items() if k in ['count','passed','failed','versions']}
for label,file in [('mutations_v1','audit-v1-mutations.json'),('mutations_v2','mutations.json')]:
    r=json.loads((checkout/'reports/v0.2'/file).read_bytes());receipt[label]={'count':r['count'],'counts':r['counts']}
receipt['final_source_diff']=run('final-source-diff',['git','diff','--name-only','--','.',':(exclude)reports']).decode()
if receipt['final_source_diff']:raise SystemExit('FROZEN_SOURCE_CHANGED')
for file in ['audit-normal-tests.json','audit-normal-tests.stdout.txt','audit-normal-tests.stderr.txt','audit-no-opt-tests.json','audit-no-opt-tests.stdout.txt','audit-no-opt-tests.stderr.txt','vectors.json','audit-v1-mutations.json','mutations.json','demos.json','determinism.json']:
    shutil.copyfile(checkout/'reports/v0.2'/file,out/'gate'/file)
shutil.copytree(checkout/'reports/v0.2/determinism',out/'gate/determinism')
shutil.copyfile(pathlib.Path(__file__).resolve(),out/'gate/controller.py')
receipt['status']='PASS';receipt['completed_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();save()
print(json.dumps({k:receipt[k] for k in ['status','candidate','tree','audit-normal','audit-no-opt','vectors','mutations_v1','mutations_v2']}),flush=True)
