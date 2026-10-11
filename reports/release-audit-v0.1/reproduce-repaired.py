"""Reproduce the dedicated repair commit in a fresh independent checkout."""
import subprocess,pathlib,json,shutil,os,hashlib,re,datetime
root=pathlib.Path(__file__).resolve().parents[2]
sha='b893eeb1b22eada6431d7b2e819439e9f4f67414'
dst=root/'reports/tmp/release-rc-audit/repaired-a';out=root/'reports/release-audit-v0.1/canonical-after';out.mkdir(exist_ok=True)
assert not dst.exists(),'Fresh destination must not exist'
subprocess.run(['git','clone','--no-hardlinks','--no-checkout',str(root),str(dst)],check=True,capture_output=True)
subprocess.run(['git','checkout','--detach',sha],cwd=dst,check=True,capture_output=True)
subprocess.run(['git','remote','remove','origin'],cwd=dst,check=True)
status=subprocess.check_output(['git','status','--porcelain=v1'],cwd=dst).decode();assert not status
cache=dst/'reports/tmp/empty-install-cache';assert not cache.exists()
env=dict(os.environ);env.pop('NODE_PATH',None);rows=[]
def run(label,args):
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 r=subprocess.run(args,cwd=dst,env=env,capture_output=True)
 (out/(label+'.stdout')).write_bytes(r.stdout);(out/(label+'.stderr')).write_bytes(r.stderr)
 row={'label':label,'cwd':str(dst),'argv':args,'started_utc':start,'exit':r.returncode,'stdout_sha256':hashlib.sha256(r.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(r.stderr).hexdigest()};rows.append(row)
 (out/'commands.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
 print(label,r.returncode,flush=True)
 return r
run('install',[shutil.which('npm.cmd'),'ci','--ignore-scripts','--no-audit','--no-fund','--cache',str(cache)])
run('initial-source-lock',['node','tools/check-sources.mjs'])
run('initial-diff-check',['git','diff','--check'])
run('dependency-resolution',['node','--input-type=module','-e',"console.log(import.meta.resolve('ajv')); console.log(import.meta.resolve('@noble/curves/secp256k1.js')); "])
run('dependency-tree',[shutil.which('npm.cmd'),'ls','--all','--json'])
run('tests',[shutil.which('npm.cmd'),'test'])
run('vectors',[shutil.which('npm.cmd'),'run','vectors'])
run('mutations',[shutil.which('npm.cmd'),'run','mutations'])
run('cli-demo',['node','src/cli.mjs','demo'])
run('capsule-demo',['node','tools/write-demo.mjs'])
run('local-reproduction',['node','tools/reproduce.mjs','V02'])
run('final-source-lock',['node','tools/check-sources.mjs'])
run('final-diff-check',['git','diff','--check'])
for name in ['vectors','mutations']:
 shutil.copyfile(dst/'reports'/f'{name}.json',out/f'{name}.json')
tap=(out/'tests.stdout').read_text(encoding='utf8');counts={k:int(v) for k,v in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$',tap,re.M)}
summary={'commit':sha,'tree':subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=dst,text=True).strip(),'initial_status':status,'fresh_own_empty_cache':str(cache),'tests':counts,'vectors':json.loads((out/'vectors.json').read_text(encoding='utf8')),'mutations':json.loads((out/'mutations.json').read_text(encoding='utf8')),'command_exits':{x['label']:x['exit'] for x in rows}}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps({'tests':counts,'mutations':summary['mutations']['counts'],'all_commands_success':all(x['exit']==0 for x in rows)}),flush=True)
assert all(x['exit']==0 for x in rows),'One or more fresh repair release gates failed'
