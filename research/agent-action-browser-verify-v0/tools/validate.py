"""Replay selected host checks and this additive experiment; no provider network."""
import argparse, contextlib, hashlib, json, os, pathlib, shlex, subprocess, sys, tempfile, time
RESEARCH=pathlib.Path(__file__).resolve().parents[1]
HOST=RESEARCH.parents[1]
SUPPORT=pathlib.Path(os.environ.get('AGENT_ACTION_SUPPORT','D:/PAVLO HQ/Workspaces/agent-action-verify-v0'))
BUN=os.environ.get('BUN_EXECUTABLE','C:/Users/msi/.bun/bin/bun.exe' if os.name=='nt' else 'bun')
parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['normal','repeat','optimized','fresh'],default='normal');parser.add_argument('--mutations',action='store_true');parser.add_argument('--browser',action='store_true')
args=parser.parse_args();out=SUPPORT/'runs'/args.mode;out.mkdir(parents=True,exist_ok=True)
environment=dict(os.environ,PYTHONDONTWRITEBYTECODE='1',PYTHON_EXECUTABLE=sys.executable,TMP=str(SUPPORT/'tmp'),TEMP=str(SUPPORT/'tmp'))
(SUPPORT/'tmp').mkdir(exist_ok=True)
if args.mode=='optimized':environment['PYTHONOPTIMIZE']='1'
node=['node']+(['--no-opt'] if args.mode=='optimized' else [])
base=['admission','admission-v2','capsule','generic-boundary-v2','native-boundary-v2','projection-v2','projection-release',
      'interpoll-v2','semantic-abi-v2','provenance-v2','requirement-admission-release','interpoll-request-classification-release',
      'trustless-v02','trustless-grade-v2','adapter-context-release','guarantee-boundary-v2']
commands=[('versions',['node','--version']),('python',[sys.executable,'--version']),('bun',[BUN,'--version']),
 ('portability-tests',[sys.executable,'-B',str(RESEARCH/'tests/portability_test.py')]),
 ('provenance',node+['tools/check-provenance-v2.mjs']),
 ('host-and-profile-tests',node+['--test','--test-concurrency=1']+['tests/'+x+'.test.mjs' for x in base]+[str(RESEARCH/'tests/contract.test.mjs')]),
 ('actions',node+[str(RESEARCH/'tools/run-cases.mjs'),args.mode]),
 ('canonicalization',node+[str(RESEARCH/'tools/canonical-differential.mjs'),str(SUPPORT/'canonicalization'/args.mode)]),
 ('browser-build',[BUN,str(RESEARCH/'tools/build-browser.ts')])]
if args.browser:commands.append(('browser',node+[str(RESEARCH/'tools/browser-test.mjs'),args.mode]))
if args.mutations:commands.append(('mutations',node+[str(RESEARCH/'tools/mutations.mjs'),args.mode]))
records=[]

@contextlib.contextmanager
def command_environment(name, inherited):
    """Bridge frozen POSIX host adapters only; never alter the caller's PATH."""
    if name != 'host-and-profile-tests' or os.name == 'nt':
        yield inherited, None
        return
    with tempfile.TemporaryDirectory(prefix='agent-action-host-python-') as temporary:
        launcher = pathlib.Path(temporary).resolve() / 'python'
        launcher.write_text('#!/bin/sh\nexec ' + shlex.quote(sys.executable) + ' "$@"\n', encoding='utf-8', newline='\n')
        launcher.chmod(0o700)
        scoped = dict(inherited, PATH=str(launcher.parent) + os.pathsep + inherited.get('PATH', ''))
        yield scoped, {'scope': name, 'path': str(launcher), 'interpreter': sys.executable}

for name,argv in commands:
    start=time.monotonic()
    with command_environment(name, environment) as (step_environment, launcher):
        p=subprocess.run(argv,cwd=HOST,env=step_environment,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    (out/(name+'.stdout.txt')).write_bytes(p.stdout);(out/(name+'.stderr.txt')).write_bytes(p.stderr)
    record={'name':name,'argv':argv,'cwd':str(HOST),'exit_code':p.returncode,'elapsed_seconds':time.monotonic()-start,
            'stdout_sha256':hashlib.sha256(p.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(p.stderr).hexdigest()}
    if launcher is not None:record['python_launcher']=launcher
    records.append(record);(out/'commands.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'mode':args.mode,'command':name,'exit_code':p.returncode}),flush=True)
    if p.returncode:print(p.stdout.decode('utf-8','replace')[-3000:]);print(p.stderr.decode('utf-8','replace')[-2000:]);sys.exit(p.returncode)
