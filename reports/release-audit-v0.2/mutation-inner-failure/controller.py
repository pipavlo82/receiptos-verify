"""Detached adversarial mutation-harness probe; modifies disposable copies only."""
import datetime, hashlib, json, pathlib, shutil, subprocess

ws=pathlib.Path(__file__).resolve().parent.parent
source=ws/'work/v02-release-audit'
out=ws/'work/audit02-mutations'
out.mkdir(exist_ok=True)
cases=[]
marker="    request = native.parse_json_bytes(data, 'bridge stdin')"
for kind,body in [('native-crash','sys.exit(7)'),('native-null','print("null"); sys.exit(0)')]:
    root=out/kind;root.mkdir(exist_ok=False)
    for name in ['src','vendor','schemas','vectors','tools','provenance','node_modules']:
        shutil.copytree(source/name,root/name)
    shutil.copyfile(source/'package.json',root/'package.json')
    (root/'mutations').mkdir()
    changed=marker+"\n    if request.get('operation') == 'recompute' and request['input']['originalBundle']['canonicalResult']['outcome'] == 'REFUTED':\n        "+body
    catalog={'id':kind,'file':'src/adapters/native/rvr-bridge.py','positive':'V01','witness':'V07','changes':[[marker,changed]]}
    (root/'mutations/catalog.mjs').write_text('export const mutations='+json.dumps([catalog])+';\n',encoding='utf-8',newline='\n')
    baseline_script="""import {readFile,writeFile} from 'node:fs/promises';
import {verify} from './src/core/verify.mjs';
const reports={};for(const id of ['V01','V07']){const input=JSON.parse(await readFile('vectors/'+id+'.json','utf8'));reports[id]={input,report:await verify(input.request,input.bundle)};}
await writeFile('baseline.json',JSON.stringify(reports,null,2)+'\\n');"""
    before=subprocess.run(['node','--input-type=module','-e',baseline_script],cwd=root,capture_output=True)
    assert before.returncode==0,before.stderr
    baseline=json.loads((root/'baseline.json').read_bytes())
    assert baseline['V01']['report']['overall']=='VERIFIED' and baseline['V07']['report']['overall']=='CONTRADICTED'
    started=datetime.datetime.now(datetime.timezone.utc).isoformat()
    run=subprocess.run(['node','tools/run-mutations.mjs','--out','mutation-observed.json'],cwd=root,capture_output=True)
    (root/'runner.stdout').write_bytes(run.stdout);(root/'runner.stderr').write_bytes(run.stderr)
    observed=json.loads((root/'mutation-observed.json').read_bytes())
    isolated=list((root/'reports/tmp').glob('i-*'))
    assert len(isolated)==1
    outputs={}
    for id in ['V01','V07']:
        result=subprocess.run(['node','tools/verify-vector.mjs',str(isolated[0]/'vectors'/ (id+'.json'))],cwd=isolated[0],capture_output=True)
        outputs[id]={'exit_code':result.returncode,'stdout':result.stdout.decode(),'stderr':result.stderr.decode(),'report':json.loads(result.stdout)}
    record={'id':kind,'candidate':'4888a0584369a91075eb2bdbd9a2ff6b99c46588','started_utc':started,'catalog':catalog,
            'harness_sha256':hashlib.sha256((source/'tools/run-mutations.mjs').read_bytes()).hexdigest(),
            'original_bridge_sha256':hashlib.sha256((source/'src/adapters/native/rvr-bridge.py').read_bytes()).hexdigest(),
            'mutant_bridge_sha256':hashlib.sha256((isolated[0]/'src/adapters/native/rvr-bridge.py').read_bytes()).hexdigest(),
            'baseline':baseline,'runner_exit':run.returncode,'runner_report':observed,'mutant_full_outputs':outputs,
            'independent_required_classification':'CRASHED' if kind=='native-crash' else 'INVALID_OUTPUT',
            'independent_required_semantic_kills':0}
    (out/(kind+'-before.json')).write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
    cases.append({'case':kind,'harness_status':observed['rows'][0]['status'],'harness_exit':run.returncode,
                  'positive':outputs['V01']['report']['overall'],'witness':outputs['V07']['report']['overall'],
                  'required':record['independent_required_classification']})
(out/'inner-failure-finding-before.json').write_text(json.dumps({'actual_probes':cases,'source_candidate':'4888a0584369a91075eb2bdbd9a2ff6b99c46588'},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(cases))
