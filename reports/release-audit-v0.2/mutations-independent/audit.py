"""Detached source mutation observer; candidate mutation verdicts are never used."""
from pathlib import Path
import subprocess, json, hashlib, shutil, datetime, tarfile, io

ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parent/'v02-release-audit'
CANDIDATE='4888a0584369a91075eb2bdbd9a2ff6b99c46588'
NODE=shutil.which('node')
LAYERS=['INPUT','CANONICALIZATION','INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY','GUARANTEE_PRESERVATION','CONTINUITY','DOMAIN_ADAPTERS','PRODUCT_PROJECTION','EXPLAINABLE_REPORT','PROVENANCE']
VERDICTS={'VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE','REJECTED_MALFORMED','UNSUPPORTED_PROFILE'}
def digest(data): return hashlib.sha256(data).hexdigest()
def save(name,value): (ROOT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
def cmd(args,cwd=SOURCE):
    result=subprocess.run(args,cwd=cwd,capture_output=True,timeout=120,check=False)
    if result.returncode: raise RuntimeError((args,result.returncode,result.stderr.decode('utf8','replace')))
    return result.stdout

assert cmd(['git','rev-parse','HEAD']).decode().strip()==CANDIDATE
catalogs=json.loads(cmd([NODE,'--input-type=module','-e',"import {mutations} from './mutations/catalog.mjs'; import {mutationsV2} from './mutations/catalog-v2.mjs'; console.log(JSON.stringify({v1:mutations,v2:mutationsV2}));"]))
save('catalogs.json',catalogs)
# Extract immutable Git bytes, rather than development files or generated reports.
base=ROOT/'base'
if not base.exists():
    base.mkdir()
    archive=cmd(['git','archive',CANDIDATE,'src','vendor','schemas','provenance','vectors','package.json','package-lock.json'])
    with tarfile.open(fileobj=io.BytesIO(archive),mode='r:') as tar: tar.extractall(base,filter='data')
    (base/'observer.mjs').write_bytes((ROOT/'observer.mjs').read_bytes())
# Dependencies come from the independently installed exact checkout; no harness output is consumed.
if not (ROOT/'node_modules').exists(): shutil.copytree(SOURCE/'node_modules',ROOT/'node_modules')

def clone(label):
    folder=ROOT/'copies-run02'/label
    folder.parent.mkdir(exist_ok=True)
    if folder.exists(): raise RuntimeError('Refuse existing disposable copy: '+str(folder))
    shutil.copytree(base,folder)
    return folder

FAULT='import sys\nsys.stderr.write("Independent synthetic checker crash control\\n")\nsys.exit(7)\n'
def normalize(value,key=''):
    if isinstance(value,dict): return {k:normalize(v,k) for k,v in value.items() if k!='argv'}
    if isinstance(value,list): return [normalize(v) for v in value]
    return value
def shape(report):
    errors=[]
    if not isinstance(report,dict): return ['report root not object']
    if report.get('overall') not in VERDICTS: errors.append('invalid overall vocabulary')
    layers=report.get('layers')
    if not isinstance(layers,dict) or set(layers)!=set(LAYERS): return errors+['missing/extraneous layer identities']
    for name,layer in layers.items():
        if not isinstance(layer,dict) or not isinstance(layer.get('status'),str) or not isinstance(layer.get('reasonCodes'),list): errors.append('invalid layer shape '+name)
    if layers['PRODUCT_PROJECTION'].get('status')!=report['overall']: errors.append('projection incoherent')
    if layers['PRODUCT_PROJECTION'].get('reasonCodes')!=report.get('reason_codes'): errors.append('reasons incoherent')
    return errors
def literal(vector,report):
    errors=shape(report)
    if errors:return errors
    expected=vector['expected']
    if report['overall']!=expected['overall']:errors.append('overall differs')
    for layer,status in expected['layers'].items():
        if report['layers'][layer]['status']!=status:errors.append('layer '+layer+' differs')
    for reason in expected['reason_codes']:
        if reason not in report['reason_codes']:errors.append('missing reason '+reason)
    for field,expected_value in expected.get('native',{}).items():
        actual=report['layers']
        for segment in field.split('.'): actual=actual.get(segment) if isinstance(actual,dict) else None
        if actual!=expected_value:errors.append('native '+field+' differs')
    return errors
def checker_failures(value,path=''):
    result=[]
    if isinstance(value,dict):
        if path.endswith('.execution'):
            if value.get('status')!='COMPLETED' or isinstance(value.get('exitCode'),int) and value['exitCode']!=0: result.append({'kind':'CRASH','path':path,'execution':value})
        for key,item in value.items():result+=checker_failures(item,path+'.'+key)
    elif isinstance(value,list):
        for index,item in enumerate(value):result+=checker_failures(item,path+f'[{index}]')
    return result
INVALID_CODES={'NATIVE_RVR_INVALID_OUTPUT','NATIVE_RVR_EXECUTION_UNAVAILABLE','TRUSTLESS_NATIVE_OUTPUT_INVALID','TRUSTLESS_CHECKER_UNAVAILABLE','TRUSTLESS_NATIVE_RUNNER_UNAVAILABLE','PRF_NATIVE_OUTPUT_MALFORMED','PRF_NATIVE_EXECUTION_UNAVAILABLE'}
def native_invalid(report):
    reasons=report.get('reason_codes',[])
    return sorted(INVALID_CODES.intersection(reasons))
def execute(folder,family,identifier,label):
    file=folder/'vectors'/('v0.2' if family=='v2' else '')/(identifier+'.json')
    try: process=subprocess.run([NODE,str(folder/'observer.mjs'),str(file)],cwd=folder,capture_output=True,timeout=45,check=False)
    except subprocess.TimeoutExpired:return {'process':'TIMEOUT','report':None}
    output=process.stdout.decode('utf8','replace');error=process.stderr.decode('utf8','replace')
    record={'process':'COMPLETED' if process.returncode==0 else 'CRASH','exit':process.returncode,'stdout_sha256':digest(process.stdout),'stderr_sha256':digest(process.stderr),'stderr':error,'report':None}
    (ROOT/'raw').mkdir(exist_ok=True)
    (ROOT/'raw'/(label+'.stdout.json')).write_bytes(process.stdout)
    (ROOT/'raw'/(label+'.stderr.txt')).write_bytes(process.stderr)
    if process.returncode==0:
        try:record['report']=json.loads(output);record['shape_errors']=shape(record['report']);record['process']='INVALID_OUTPUT' if record['shape_errors'] else 'COMPLETED'
        except Exception as exc:record['process']='INVALID_OUTPUT';record['parse_error']=str(exc)
    if isinstance(record['report'],dict):
        record['checker_failures']=checker_failures(record['report']['layers'])
        record['invalid_native_codes']=native_invalid(record['report'])
    return record

baseline_cache={}
def baseline(family,id):
    key=family+'-'+id
    if key not in baseline_cache:
        vector=json.loads((base/'vectors'/('v0.2' if family=='v2' else '')/(id+'.json')).read_text(encoding='utf8'))
        folder=base
        if (vector.get('execution_setup') or {}).get('fault')=='crash-rvr':
            folder=clone('baseline-'+key);(folder/'src/adapters/native/rvr-bridge.py').write_text(FAULT,encoding='utf8',newline='\n')
        run=execute(folder,family,id,'baseline-'+key)
        baseline_cache[key]={'vector':vector,'run':run,'literal_errors':literal(vector,run['report']) if run['report'] else ['no report']}
    return baseline_cache[key]

def semantic_summary(report):
    if not isinstance(report,dict):return None
    return {'overall':report.get('overall'),'reasons':report.get('reason_codes'),'layers':{name:{'status':value.get('status'),'semanticOutcome':value.get('semanticOutcome')} for name,value in report.get('layers',{}).items()}}

rows=[]
for family,catalog in catalogs.items():
    for mutant in catalog:
        label=family+'-'+mutant['id']
        print('AUDIT '+label,flush=True)
        folder=clone(label)
        patches=mutant.get('patches',[{'file':mutant.get('file'),'changes':mutant.get('changes')}])
        edits=[];applied=True
        for patch in patches:
            path=folder/patch['file'];original=path.read_text(encoding='utf8');edited=original;replacements=[]
            for before,after in patch['changes']:
                occurrence=edited.count(before);valid=occurrence==1 and before!=after
                replacements.append({'from':before,'to':after,'occurrences':occurrence,'changed':valid})
                if not valid:applied=False;break
                edited=edited.replace(before,after)
            if original==edited:applied=False
            if applied:path.write_text(edited,encoding='utf8',newline='\n')
            edits.append({'file':patch['file'],'original_sha256':digest(original.encode()),'mutant_sha256':digest(edited.encode()),'changes':replacements})
        row={'family':family,'id':mutant['id'],'positive':mutant['positive'],'witness':mutant['witness'],'applied':applied,'edits':edits,'explicit_fault':mutant.get('fault')}
        if not applied:row['classification']='NOT_APPLIED';rows.append(row);continue
        positive_base=baseline(family,mutant['positive']);witness_base=baseline(family,mutant['witness'])
        positive=execute(folder,family,mutant['positive'],label+'-positive')
        if mutant.get('fault')=='crash-rvr':(folder/'src/adapters/native/rvr-bridge.py').write_text(FAULT,encoding='utf8',newline='\n')
        witness=execute(folder,family,mutant['witness'],label+'-witness')
        positive_errors=literal(positive_base['vector'],positive['report']) if positive['report'] else ['no report']
        row.update({'baseline_positive':semantic_summary(positive_base['run']['report']),'baseline_witness':semantic_summary(witness_base['run']['report']),'mutant_positive':semantic_summary(positive['report']),'mutant_witness':semantic_summary(witness['report']),'baseline_errors':positive_base['literal_errors']+witness_base['literal_errors'],'positive_errors':positive_errors,'positive_run':positive,'witness_run':witness})
        # Explicit V08 fault is held fixed in both baseline and mutant and only
        # a false semantic CONTRADICTED conclusion distinguishes this mutant.
        controlled_fault=mutant.get('fault')=='crash-rvr' and mutant['witness']=='V08'
        if row['baseline_errors']:classification='INVALID_BASELINE'
        elif positive['process']!='COMPLETED' or witness['process']!='COMPLETED':classification='INVALID_OUTPUT' if 'INVALID_OUTPUT' in [positive['process'],witness['process']] else 'CRASHED'
        elif positive.get('checker_failures') or witness.get('checker_failures') and not controlled_fault:classification='CRASHED'
        elif positive.get('invalid_native_codes') or witness.get('invalid_native_codes') and not controlled_fault:classification='INVALID_OUTPUT'
        elif positive_errors:classification='CONTROL_BROKEN'
        elif witness['report']['overall']!=witness_base['run']['report']['overall']:classification='SEMANTIC_KILLED'
        else:classification='SURVIVED'
        row['controlled_fault_held_fixed']=controlled_fault
        row['classification']=classification
        rows.append(row);save('partial-results.json',rows)

save('baseline-inputs-and-reports.json',baseline_cache)
counts={family:{status:sum(row['family']==family and row['classification']==status for row in rows) for status in sorted(set(row['classification'] for row in rows))} for family in catalogs}
save('independent-mutation-results.json',{'candidate':CANDIDATE,'started_or_recorded_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'observer_sha256':digest((ROOT/'observer.mjs').read_bytes()),'audit_script_sha256':digest(Path(__file__).read_bytes()),'node':cmd([NODE,'--version']).decode().strip(),'method':'Independent Python substitution, immutable Git archive bytes, original observer executing verifier only, detached literal controls, native failure inspection. Candidate mutation classifications are not consumed.','count':len(rows),'counts':counts,'rows':rows})
print(json.dumps(counts),flush=True)
