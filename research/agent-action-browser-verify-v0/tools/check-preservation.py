import hashlib,json,os,pathlib,subprocess,sys
RESEARCH=pathlib.Path(__file__).resolve().parents[1];HOST=RESEARCH.parents[1]
SUPPORT=pathlib.Path(os.environ.get('AGENT_ACTION_SUPPORT','D:/PAVLO HQ/Workspaces/agent-action-verify-v0'))
pins=json.loads((RESEARCH/'source-pins.json').read_text('utf-8'))
baseline=json.loads((RESEARCH/'evidence/baseline-file-inventory.json').read_text('utf-8'))
failures=[]
for path,expected in baseline.items():
    file=HOST/path
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest()!=expected:failures.append('HISTORICAL_FILE_CHANGED:'+path)
for row in pins['repositories']:
    if not row['runtime_dependency']:continue
    checkout=SUPPORT/'sources'/row['repository'].replace('/','--')
    p=subprocess.run(['git','rev-parse','HEAD'],cwd=checkout,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode or p.stdout.decode().strip()!=row['sha']:failures.append('EXTERNAL_SOURCE_PIN:'+row['repository'])
    for path,expected in row['runtime_files'].items():
        f=checkout/path
        if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=expected:failures.append('EXTERNAL_SOURCE_BYTES:'+row['repository']+'/'+path)
print(json.dumps({'historical_files':len(baseline),'runtime_repositories':sum(r['runtime_dependency'] for r in pins['repositories']),'failures':failures}))
sys.exit(bool(failures))
