import argparse, datetime, hashlib, json, os, pathlib, shutil, subprocess, sys
p=argparse.ArgumentParser();p.add_argument('--repo',required=True);p.add_argument('--out',required=True);a=p.parse_args()
root=pathlib.Path(a.repo).resolve();out=pathlib.Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
receipt={'schema':'receiptos.verify.fresh-v02-gate.v1','cwd':str(root),'controller_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'commands':[],'status':'RUNNING'}
def save(): (out/'summary.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n')
def run(label,argv):
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();r=subprocess.run(argv,cwd=root,capture_output=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
    (out/(label+'.stdout')).write_bytes(r.stdout);(out/(label+'.stderr')).write_bytes(r.stderr)
    receipt['commands'].append({'label':label,'argv':argv,'started_utc':started,'exit_code':r.returncode,'stdout_sha256':hashlib.sha256(r.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(r.stderr).hexdigest()});save()
    print(label+': '+str(r.returncode),flush=True)
    if r.returncode: receipt['status']='FAIL';save();raise SystemExit(r.returncode)
    return r.stdout
receipt['commit']=run('commit',['git','rev-parse','HEAD']).decode().strip();receipt['tree']=run('tree',['git','rev-parse','HEAD^{tree}']).decode().strip()
initial=run('initial-status',['git','status','--porcelain=v1','--untracked-files=all']);receipt['initial_status']='CLEAN' if not initial else initial.decode()
if initial: receipt['status']='FAIL_DIRTY_START';save();raise SystemExit(1)
tracked=run('inventory',['git','ls-files','-z']).split(b'\0');files=[]
for raw in tracked:
    if raw:
        name=raw.decode('utf-8');f=root/name
        if f.is_symlink() or not f.is_file():raise SystemExit('nonregular tracked file: '+name)
        data=f.read_bytes();files.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(out/'tracked-files.json').write_text(json.dumps(files,indent=2)+'\n',encoding='utf-8',newline='\n');receipt['tracked_files']=len(files)
receipt['source_lock_sha256']=hashlib.sha256((root/'source-lock.json').read_bytes()).hexdigest();receipt['package_lock_sha256']=hashlib.sha256((root/'package-lock.json').read_bytes()).hexdigest()
node=shutil.which('node');npm=shutil.which('npm.cmd') or shutil.which('npm');python=shutil.which('python');bun=shutil.which('bun') or str(pathlib.Path.home()/'.bun/bin/bun.exe')
for name,argv in [('node',[node,'--version']),('python',[python,'--version']),('bun',[bun,'--version']),('npm',[npm,'--version'])]:run('version-'+name,argv)
cache=pathlib.Path(__file__).resolve().parent/'v02-fresh-npm-cache'
receipt['install_cache_initially_absent']=not cache.exists()
run('npm-ci',[npm,'ci','--ignore-scripts','--no-audit','--no-fund','--cache',str(cache)])
run('dependency-resolution',[node,'--input-type=module','-e',"console.log(import.meta.resolve('ajv'));console.log(import.meta.resolve('@noble/curves/secp256k1.js'));"])
for label,argv in [
 ('source-lock-before',[node,'tools/check-sources.mjs']),('provenance-license',[node,'tools/check-provenance-v2.mjs']),
 ('tests',[python,'-B','tools/capture-tests-v2.py','--label','fresh-normal']),
 ('vectors',[node,'tools/run-vectors-v2.mjs']),('mutations-v1',[node,'tools/run-mutations.mjs','--out','reports/v0.2/regression-mutations.json']),
 ('mutations-v2',[node,'tools/run-mutations-v2.mjs']),('cli-v1',[node,'src/cli.mjs','demo']),('cli-v2',[node,'src/cli.mjs','demo-v2']),
 ('source-lock-after',[node,'tools/check-sources.mjs']),('diff-check',[ 'git','diff','--check'])]:run(label,argv)
receipt['tests']=json.loads((root/'reports/v0.2/fresh-normal-tests.json').read_bytes())['counts']
receipt['vectors']={k:v for k,v in json.loads((root/'reports/v0.2/vectors.json').read_bytes()).items() if k in ['count','passed','failed','versions']}
for version,path in [('v1','regression-mutations.json'),('v2','mutations.json')]:
    r=json.loads((root/'reports/v0.2'/path).read_bytes());receipt['mutations_'+version]={'count':r['count'],'counts':r['counts']}
receipt['final_source_diff']=run('final-source-diff',['git','diff','--name-only','--','.',':(exclude)reports']).decode()
if receipt['final_source_diff']: receipt['status']='FAIL_SOURCE_CHANGED';save();raise SystemExit(1)
shutil.copyfile(pathlib.Path(__file__).resolve(),out/'gate-controller.py')
receipt['status']='PASS';receipt['completed_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();save()
for name in ['fresh-normal-tests.json','fresh-normal-tests.stdout.txt','fresh-normal-tests.stderr.txt','vectors.json','mutations.json','regression-mutations.json']:
    shutil.copyfile(root/'reports/v0.2'/name,out/name)
print(json.dumps({k:receipt[k] for k in ['status','commit','tree','tests','vectors','mutations_v1','mutations_v2']}),flush=True)
