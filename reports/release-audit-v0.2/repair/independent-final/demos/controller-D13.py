import hashlib,json,pathlib,shutil,subprocess
ws=pathlib.Path(__file__).resolve().parent.parent
source=ws/'work/v02-audit-final';copy=ws/'work/audit02-d13-final'
copy.mkdir(exist_ok=False)
for name in ['src','vendor','schemas','provenance','node_modules','web','vectors','tools']:
    shutil.copytree(source/name,copy/name)
shutil.copyfile(source/'package.json',copy/'package.json')
recorded=json.loads((ws/'work/audit02-core-release-final/results/D1.json').read_bytes())['input']
input={name:recorded[name]['value'] for name in ['request','bundle']}
for name,value in input.items():
    (copy/(name+'.json')).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
path=copy/'src/adapters/native/rvr-bridge.py'
before=hashlib.sha256(path.read_bytes()).hexdigest()
path.write_text('import sys\nsys.stderr.write("Independent audit checker crash\\n")\nsys.exit(7)\n',encoding='utf-8',newline='\n')
run=subprocess.run(['node','src/cli.mjs','verify','request.json','bundle.json'],cwd=copy,capture_output=True)
report=json.loads(run.stdout)
assert run.returncode==3 and report['overall']=='CANNOT_RECOMPUTE'
assert report['layers']['RECOMPUTATION']['execution']['exitCode']==7
assert report['layers']['AUTHENTICITY']['status']=='VERIFIED'
out=ws/'outputs/receiptos-verify/reports/release-audit-v0.2/repair/independent-final/demos';out.mkdir(exist_ok=True,parents=True)
(out/'D13.json').write_text(json.dumps({'id':'D13','candidate':'eb942148eeb489db809b39e053ec905105cc3056',
    'input':input,'independent_expected':'CANNOT_RECOMPUTE','actual':report,'cli_exit':run.returncode,
    'fault_setup':{'disposable_copy':str(copy),'source_file':'src/adapters/native/rvr-bridge.py','original_sha256':before,'fault_sha256':hashlib.sha256(path.read_bytes()).hexdigest()},
    'command':['node','src/cli.mjs','verify','request.json','bundle.json'],'stdout_sha256':hashlib.sha256(run.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(run.stderr).hexdigest()},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'D13':report['overall'],'native_exit':7,'cli_exit':run.returncode}))
