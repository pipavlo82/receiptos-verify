import datetime,hashlib,json,os,pathlib,shutil,subprocess
ws=pathlib.Path(__file__).resolve().parent.parent
product=ws/'outputs/receiptos-verify';root=ws/'work/v02-audit-repaired';out=product/'reports/release-audit-v0.2/repair/fresh'
commit='1fecfc2587c5d89d350017a2a7a98ca78e933b9f'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=product).decode().strip()==commit
assert not subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all'],cwd=product)
out.mkdir(parents=True,exist_ok=False)
receipt={'schema':'receiptos.verify.repaired-audit-gate.v2','commit':commit,'controller_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'commands':[],'status':'RUNNING'}
def save():(out/'summary.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n')
def run(label,argv,cwd=root):
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();p=subprocess.run(argv,cwd=cwd,capture_output=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
    (out/(label+'.stdout')).write_bytes(p.stdout);(out/(label+'.stderr')).write_bytes(p.stderr)
    receipt['commands'].append({'label':label,'argv':argv,'cwd':str(cwd),'started_utc':started,'exit_code':p.returncode,'stdout_sha256':hashlib.sha256(p.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(p.stderr).hexdigest()});save()
    print(label+': '+str(p.returncode),flush=True)
    if p.returncode:receipt['status']='FAIL';save();raise SystemExit(p.returncode)
    return p.stdout
run('clone',['git','clone','--no-hardlinks','--no-checkout',str(product),str(root)],ws)
run('checkout',['git','checkout','--detach',commit])
receipt['tree']=run('tree',['git','rev-parse','HEAD^{tree}']).decode().strip()
initial=run('initial-status',['git','status','--porcelain=v1','--untracked-files=all']);assert not initial
receipt['initial_status']='CLEAN';receipt['fresh_path']=str(root)
files=[]
for row in subprocess.check_output(['git','ls-tree','-r','-z',commit],cwd=root).split(b'\0'):
    if row:
        meta,name=row.split(b'\t',1);mode,kind,oid=meta.split();path=root/name.decode();assert not path.is_symlink() and path.is_file()
        data=path.read_bytes();assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==oid.decode()
        files.append({'path':name.decode(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'git_blob':oid.decode()})
(out/'tracked-files.json').write_text(json.dumps(files,indent=2)+'\n',encoding='utf-8',newline='\n');receipt['tracked_regular_files']=len(files)
receipt['source_lock_sha256']=hashlib.sha256((root/'source-lock.json').read_bytes()).hexdigest();receipt['package_lock_sha256']=hashlib.sha256((root/'package-lock.json').read_bytes()).hexdigest()
node=shutil.which('node');python=shutil.which('python');npm=shutil.which('npm.cmd');bun=shutil.which('bun') or str(pathlib.Path.home()/'.bun/bin/bun.exe')
for label,argv in [('node',[node,'--version']),('python',[python,'--version']),('npm',[npm,'--version']),('bun',[bun,'--version'])]:run('version-'+label,argv)
cache=ws/'work/v02-audit-repaired-npm-cache';assert not cache.exists();receipt['cache_initially_absent']=True
run('npm-ci',[npm,'ci','--ignore-scripts','--no-audit','--no-fund','--cache',str(cache)])
run('dependency-resolution',[node,'--input-type=module','-e',"console.log(import.meta.resolve('ajv'));console.log(import.meta.resolve('@noble/curves/secp256k1.js'));"])
for label,argv in [
 ('sources-before',[node,'tools/check-sources.mjs']),('provenance-license',[node,'tools/check-provenance-v2.mjs']),
 ('tests-normal',[python,'-B','tools/capture-tests-v2.py','--label','audit-repaired-normal']),
 ('tests-no-opt',[python,'-B','tools/capture-tests-v2.py','--no-opt','--label','audit-repaired-no-opt']),
 ('tests-repeat',[python,'-B','tools/capture-tests-v2.py','--label','audit-repaired-repeat']),
 ('vectors',[node,'tools/run-vectors-v2.mjs']),
 ('mutations-v1',[node,'tools/run-mutations.mjs','--out','reports/v0.2/audit-repaired-v1-mutations.json']),
 ('mutations-v2',[node,'tools/run-mutations-v2.mjs']),('cli-v1',[node,'src/cli.mjs','demo']),('cli-v2',[node,'src/cli.mjs','demo-v2']),
 ('determinism',[node,'tools/determinism-v2.mjs']),('sources-after',[node,'tools/check-sources.mjs']),('diff-check',['git','diff','--check'])]:run(label,argv)
receipt['tests']={}
for label in ['normal','no-opt','repeat']:
    stem='audit-repaired-'+label+'-tests'
    receipt['tests'][label]=json.loads((root/'reports/v0.2'/(stem+'.json')).read_bytes())['counts']
    for suffix in ['.json','.stdout.txt','.stderr.txt']:shutil.copyfile(root/'reports/v0.2'/(stem+suffix),out/(stem+suffix))
receipt['vectors']={k:v for k,v in json.loads((root/'reports/v0.2/vectors.json').read_bytes()).items() if k in ['count','passed','failed','versions']}
for label,name in [('v1','audit-repaired-v1-mutations.json'),('v2','mutations.json')]:
    r=json.loads((root/'reports/v0.2'/name).read_bytes());receipt['mutations_'+label]={'count':r['count'],'counts':r['counts']}
for name in ['vectors.json','audit-repaired-v1-mutations.json','mutations.json','demos.json','determinism.json']:shutil.copyfile(root/'reports/v0.2'/name,out/name)
shutil.copytree(root/'reports/v0.2/determinism',out/'determinism')
receipt['final_source_diff']=run('final-source-diff',['git','diff','--name-only','--','.',':(exclude)reports']).decode();assert not receipt['final_source_diff']
shutil.copyfile(pathlib.Path(__file__).resolve(),out/'controller.py')
receipt['status']='PASS';receipt['completed_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();save()
print(json.dumps({k:receipt[k] for k in ['status','commit','tree','tests','vectors','mutations_v1','mutations_v2']}))
