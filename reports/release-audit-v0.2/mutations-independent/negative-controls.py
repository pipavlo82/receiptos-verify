from pathlib import Path
import subprocess,json,hashlib,shutil,datetime
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parent/'v02-release-audit'
NODE=shutil.which('node')
verify1='export async function verify(requestInput,bundleInput) {'
verify2='export async function verifyV2(requestInput,bundleInput) {'
def sha(data):return hashlib.sha256(data).hexdigest()
def mutant(family,id,file,before,after,positive=None,witness=None):
    result={'id':id,'positive':positive or ('V01' if family=='v1' else 'G01'),'witness':witness or ('V04' if family=='v1' else 'G03')}
    if family=='v1':result.update({'file':file,'changes':[[before,after]]})
    else:result['patches']=[{'file':file,'changes':[[before,after]]}]
    return result
rows=[]
for family in ['v1','v2']:
    entry=verify1 if family=='v1' else verify2
    file='src/core/verify.mjs' if family=='v1' else 'src/core/verify-v2.mjs'
    projector='src/projection/project.mjs' if family=='v1' else 'src/projection/project-v2.mjs'
    controls=[('zero',[]),('no-op',[mutant(family,'NOOP',file,entry,entry)]),('unapplied',[mutant(family,'UNAPPLIED',file,'INDEPENDENT_NONEXISTENT_SOURCE_MARKER','noop')]),('outer-crash',[mutant(family,'OUTER_CRASH',file,entry,entry+'\n  process.exit(7);')]),('outer-null',[mutant(family,'OUTER_NULL',file,entry,entry+'\n  return null;')]),('damaged-positive',[mutant(family,'DAMAGED_POSITIVE',projector,"return result('VERIFIED',reasons);","return result('CONTRADICTED',['INDEPENDENT_DAMAGED_POSITIVE']);")])]
    if family=='v1':
        native='    request = native.parse_json_bytes(data, \'bridge stdin\')'
        condition="\n    if request.get('operation') == 'recompute' and request['input']['originalBundle']['canonicalResult']['outcome'] == 'REFUTED':\n        "
        positive,witness='V01','V07';nativefile='src/adapters/native/rvr-bridge.py'
    else:
        native='        payload = json.loads(sys.stdin.buffer.read().decode("utf-8", "strict"))'
        condition='\n        if "poison" in payload["input"]["corpus"][0]["content"]: '
        positive,witness='G24','G12';nativefile='src/adapters/native/trustless-bridge.py'
    controls += [('inner-crash',[mutant(family,'INNER_CRASH',nativefile,native,native+condition+'sys.exit(7)',positive,witness)]),('inner-null',[mutant(family,'INNER_NULL',nativefile,native,native+condition+'sys.stdout.write("null\\n"); sys.exit(0)',positive,witness)])]
    for label,catalog in controls:
        folder=ROOT/'negative-copies'/(family+'-'+label)
        folder.parent.mkdir(exist_ok=True)
        shutil.copytree(ROOT/'base',folder)
        (folder/'tools').mkdir();(folder/'mutations').mkdir()
        for tool in ['corpus.mjs','corpus-v2.mjs','verify-vector.mjs','verify-vector-v2.mjs','run-mutations.mjs','mutation-harness-v2.mjs']:
            (folder/'tools'/tool).write_bytes((SOURCE/'tools'/tool).read_bytes())
        (folder/'mutations/catalog.mjs').write_text('export const mutations='+json.dumps(catalog)+';\n',encoding='utf8',newline='\n')
        if family=='v1':command=[NODE,'tools/run-mutations.mjs','--out','control-result.json']
        else:
            driver="import {auditMutants} from './tools/mutation-harness-v2.mjs'; const catalog="+json.dumps(catalog)+"; try {console.log(JSON.stringify(await auditMutants(catalog,{writeReport:false,label:'independent-'+"+json.dumps(label)+"})));} catch(error) {console.log(JSON.stringify({caught:error.message}));process.exitCode=2;}\n"
            (folder/'driver.mjs').write_text(driver,encoding='utf8',newline='\n');command=[NODE,'driver.mjs']
        run=subprocess.run(command,cwd=folder,capture_output=True,timeout=100,check=False)
        out=run.stdout.decode('utf8','replace');err=run.stderr.decode('utf8','replace')
        result=json.loads((folder/'control-result.json').read_text()) if (folder/'control-result.json').exists() else None
        if family=='v2':
            try:result=json.loads(out)
            except Exception:pass
        row={'family':family,'control':label,'catalog':catalog,'exit_code':run.returncode,'stdout':out,'stderr':err,'stdout_sha256':sha(run.stdout),'stderr_sha256':sha(run.stderr),'candidate_harness_result':result,'successful_semantic_coverage_claimed':bool(result and result.get('counts',{}).get('KILLED',0)>0)}
        rows.append(row)
        print(family,label,run.returncode,(result or {}).get('counts',(result or {}).get('caught')),flush=True)
        (ROOT/'negative-control-results.json').write_text(json.dumps({'candidate':'4888a0584369a91075eb2bdbd9a2ff6b99c46588','script_sha256':sha(Path(__file__).read_bytes()),'rows':rows},indent=2)+'\n',encoding='utf8',newline='\n')
