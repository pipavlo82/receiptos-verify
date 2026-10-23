import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateV2Schema} from '../../../src/core/admission-v2.mjs';
import {research,support,host} from '../lib/paths.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const label=process.argv[2]??'normal',out=resolve(support,'mutations',label);
mkdirSync(out,{recursive:true});
const positive=['A','log-not-required','consistency-positive'];
// The original 21 physical mutations remain a separate population. Appended
// review witnesses do not retroactively change their historical outcome count.
const originalDefinitions=[
  ['profile','receipt-profile','H'],['profile','caller-receipt-root','wrong-selected-receipt'],
  ['profile','host-receipt-carrier','wrong-host-carrier'],['profile','agent-action-subject','B'],
  ['profile','caller-claim','wrong-caller-action-id'],['profile','action-id-binding','wrong-action-id'],
  ['profile','protected-scope','C'],['profile','action-input-binding','wrong-input-commitment'],
  ['profile','native-host-result','native-authority-unavailable'],['profile','native-result-preservation','wrong-native-record'],
  ['profile','local-result-binding','wrong-local-output'],['profile','required-log-result','D'],
  ['anchor','receipt-leaf-binding','valid-other-leaf'],['anchor','checkpoint-tree-size','signed-wrong-size'],
  ['anchor','native-merkle-proof','wrong-path'],['anchor','checkpoint-identity','selected-forged-id'],
  ['anchor','selected-checkpoint','conflicting-checkpoint'],['anchor','selected-log','wrong-log'],
  ['anchor','checkpoint-signature','invalid-signature'],['anchor','trusted-checkpoint','G'],
  ['anchor','manifest-extension','changed-old-record'],
];
const verified={status:'VERIFIED',reason:'LOCAL_ACTION_REPLAY_AND_SELECTED_EVIDENCE_VERIFIED'};
const reviewDefinitions=[
  ['profile','schema-supported','unsupported-caller-schema',verified],
  ['profile','receipt-admission','requires-log-string',verified],
  ['profile','receipt-identity-result','E',{status:'REFUTED',reason:'HOST_RECEIPT_CARRIER_MISMATCH'}],
  ['profile','authority-premise-binding','authority-premise-mismatch',{status:'UNVERIFIABLE',reason:'NATIVE_HOST_REJECTED_MALFORMED'}],
];
const definitions=[...originalDefinitions.map(d=>[...d,verified,'original-21']),
  ...reviewDefinitions.map(d=>[...d,'review-followup-4'])];
if(originalDefinitions.length!==21||reviewDefinitions.length!==4||definitions.length!==25
  ||new Set(definitions.map(d=>d[1])).size!==25)throw new Error('MUTATION_POPULATION_INCOMPLETE');
const allowed={
 'caller-claim':['wrong-claim','wrong-caller-action-id'],
 'action-input-binding':['wrong-input','wrong-input-commitment'],
 'required-log-result':['D','F','G','wrong-leaf','wrong-path','wrong-index','wrong-size','wrong-log','invalid-signature','missing-checkpoint','wrong-checkpoint-id','conflicting-checkpoint','unsupported-log','missing-consistency','conflicting-history','valid-other-leaf','signed-wrong-size','selected-forged-id','ambiguous-key','changed-old-record'],
 'receipt-leaf-binding':['wrong-leaf','valid-other-leaf'],'checkpoint-tree-size':['wrong-size','signed-wrong-size'],
 'native-merkle-proof':['F','wrong-path','wrong-index'],'checkpoint-identity':['wrong-checkpoint-id','selected-forged-id'],
 'trusted-checkpoint':['G','invalid-signature'],
 'schema-supported':['unsupported-caller-schema','unsupported-package-schema'],
};
const paths=['profile','anchor'].map(x=>resolve(research,'lib',x+'.mjs'));
const originals=new Map(paths.map(p=>[p,readFileSync(p)]));
function execute(name){
  const runLabel='mutation-'+label+'-'+name;
  const resultPath=resolve(support,'actions',runLabel,'results.json');
  if(existsSync(resultPath))unlinkSync(resultPath);
  const p=spawnSync(process.execPath,[...process.execArgv,resolve(research,'tools/run-cases.mjs'),runLabel],{cwd:host,encoding:'utf8',timeout:60000});
  writeFileSync(resolve(out,name+'.stdout.txt'),p.stdout??'');writeFileSync(resolve(out,name+'.stderr.txt'),p.stderr??'');
  let results;try{results=JSON.parse(readFileSync(resultPath));}catch{}
  return {command:[process.execPath,...process.execArgv,resolve(research,'tools/run-cases.mjs'),runLabel],
    exit_code:p.status,signal:p.signal,error:p.error?.message??null,result_path:resultPath,results};
}
const baseline=execute('baseline');
if(baseline.exit_code!==0||!baseline.results?.every(c=>c.passed))throw new Error('MUTATION_BASELINE_FAILED');
const baselineById=new Map(baseline.results.map(c=>[c.case_id,c]));
const semanticEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validHostReport(report){
  if(report===null)return true;
  try{return validateV2Schema('report',report);}catch{return false;}
}
function validResults(results){
  if(!Array.isArray(results)||results.length!==baseline.results.length||new Set(results.map(c=>c?.case_id)).size!==results.length)return false;
  return results.every(c=>{
    const b=baselineById.get(c?.case_id),r=c?.report,n=r?.native_host_result;
    return b&&c.input_sha256===b.input_sha256&&semanticEqual(c.expected,b.expected)&&typeof c.passed==='boolean'
      &&r?.schema==='agent-action.verification-report.v0'&&['VERIFIED','REFUTED','UNVERIFIABLE'].includes(r.status)
      &&typeof r.reason==='string'&&r.reason.length>0
      &&validHostReport(n);
  });
}
if(!validResults(baseline.results))throw new Error('MUTATION_BASELINE_OUTPUT_INVALID');
function removeGuard(text,guard){
  const marker=' // GUARD: '+guard,idx=text.indexOf(marker);
  if(idx<0||idx!==text.lastIndexOf(marker))throw new Error('MUTATION_TARGET_NOT_UNIQUE:'+guard);
  const start=[...text.slice(0,idx).matchAll(/^[ \t]*if\(/gm)].at(-1)?.index;
  if(start===undefined)throw new Error('MUTATION_TARGET_MISSING:'+guard);
  return text.slice(0,start)+'    if(false)'+text.slice(idx);
}
function assess(run,killer,expectedMutant,{applied,restored}){
  const witness=run.results?.find(c=>c.case_id===killer),base=baselineById.get(killer);
  const controls=positive.every(id=>{
    const c=run.results?.find(c=>c.case_id===id);
    return c?.passed&&semanticEqual(c.report,baselineById.get(id).report);
  });
  let classification;
  if(run.error||run.signal||![0,1].includes(run.exit_code)||!run.results)classification='CRASHED';
  else if(!validResults(run.results))classification='INVALID_OUTPUT';
  else if(!applied)classification='NOT_APPLIED';
  else if(!restored)classification='RESTORATION_FAILED';
  else if(!controls)classification='CONTROL_BROKEN';
  else if(!base?.passed||base.report.status==='VERIFIED')classification='INVALID_BASELINE';
  else if(killer==='authority-premise-mismatch'&&!(witness?.report.native_host_result?.schema==='receiptos.verify.report.v2'
    &&witness.report.native_host_result.overall==='REJECTED_MALFORMED'
    &&witness.report.native_host_result.layers.INPUT?.status==='REJECTED_MALFORMED'))classification='INVALID_OUTPUT';
  else{
    const changedAsExpected=run.exit_code===1&&!witness?.passed&&witness?.report.status===expectedMutant.status
      &&witness?.report.reason===expectedMutant.reason;
    classification=!changedAsExpected?'NOT_COVERED':base.report.status!==expectedMutant.status?'KILLED':
      killer==='E'?'CONTRACT_REASON_WITNESS':'NOT_COVERED';
  }
  return {classification,controls,witness};
}
const records=[];
try{
  for(const [module,guard,killer,expectedMutant,population] of definitions){
    const path=resolve(research,'lib',module+'.mjs'),original=originals.get(path),mutated=removeGuard(original.toString('utf8'),guard);
    let run,readback,restored=false;
    try{writeFileSync(path,mutated);readback=readFileSync(path);run=execute(guard);}
    finally{writeFileSync(path,original);restored=hash(readFileSync(path))===hash(original);}
    const applied=hash(readback)!==hash(original)&&hash(readback)===hash(mutated);
    const changes=run.results?.filter(c=>!semanticEqual(c.report,baselineById.get(c.case_id)?.report)).map(c=>c.case_id)??[];
    const {classification,controls,witness}=assess(run,killer,expectedMutant,{applied,restored});
    const expectedClassification=guard==='receipt-identity-result'?'CONTRACT_REASON_WITNESS':'KILLED';
    const record={guard,module,killer,population,classification,expected_classification:expectedClassification,positive_controls:positive,controls_pass:controls,
      witness_predicate:'exact status/reason change from the passed negative baseline, with valid reports and unchanged positive semantics',
      expected_baseline:baselineById.get(killer).expected,expected_mutant:expectedMutant,
      observed_mutant:witness?{status:witness.report.status,reason:witness.report.reason}:null,exit_code:run.exit_code,
      changed_cases:changes,expected_change_domain:allowed[guard]??[killer],unexpected_changes:changes.filter(id=>!(allowed[guard]??[killer]).includes(id)),exclusivity_expected:false,
      original_sha256:hash(original),mutant_sha256:hash(mutated),observed_mutant_sha256:hash(readback),applied,restored,command:run.command,result_path:run.result_path};
    records.push(record);console.log(JSON.stringify(record));
  }
}finally{for(const [p,b]of originals)writeFileSync(p,b);}
const restoration=[...originals].map(([path,b])=>({path,sha256:hash(b),restored:hash(readFileSync(path))===hash(b)}));
const harnessControls=[];
const profile=originals.get(paths[0]).toString('utf8'),identityRemoved=removeGuard(profile,'receipt-identity-result');
const controlDefinitions=[
  ['noop',profile+'\n','NOT_COVERED'],
  ['crash',profile+'\nconst = broken syntax;\n','CRASHED'],
  ['malformed-output',identityRemoved.replace("schema:'agent-action.verification-report.v0'","schema:'malformed-output-control'"),'INVALID_OUTPUT'],
  ['malformed-native',identityRemoved.replace('report.status=status;report.reason=reason;',"report.status=status;report.reason=reason;report.native_host_result={schema:'receiptos.verify.report.v2',overall:'VERIFIED',layers:{}};"),'INVALID_OUTPUT'],
  ['damaged-positive',identityRemoved.replace('report.status=status;report.reason=reason;',"report.status=status;report.reason=status==='VERIFIED'?'DAMAGED_POSITIVE_CONTROL':reason;"),'CONTROL_BROKEN'],
];
for(const [name,mutated,expected]of controlDefinitions){
  const path=paths[0],original=originals.get(path);let run,readback;
  try{writeFileSync(path,mutated);readback=readFileSync(path);run=execute('control-'+name);}
  finally{writeFileSync(path,original);}
  const restored=hash(readFileSync(path))===hash(original),applied=hash(readback)===hash(mutated)&&hash(readback)!==hash(original);
  const {classification,controls}=assess(run,'E',{status:'REFUTED',reason:'HOST_RECEIPT_CARRIER_MISMATCH'},{applied,restored});
  harnessControls.push({name,expected,classification,exit_code:run.exit_code,original_sha256:hash(original),
    mutant_sha256:hash(mutated),observed_mutant_sha256:hash(readback),applied,restored,positive_semantics_preserved:controls,
    passed:classification===expected,command:run.command,result_path:run.result_path});
}
const restoredRun=execute('restored');
const restoredSemantics=restoredRun.exit_code===0&&semanticEqual(restoredRun.results,baseline.results);
const populations=['original-21','review-followup-4'].map(name=>({name,records:records.filter(r=>r.population===name).length,
  outcomes:Object.fromEntries([...new Set(records.filter(r=>r.population===name).map(r=>r.classification))]
    .map(c=>[c,records.filter(r=>r.population===name&&r.classification===c).length]))}));
const report={schema:'agent-action.physical-mutations.v0',populations,records,restoration,restored_semantics_match_baseline:restoredSemantics,
  harness_controls:harnessControls,guard_coverage:[
    {guard:'receipt-subject-admission',classification:'UNWITNESSED_DEFENSE_IN_DEPTH',reason:'No isolated committed witness removes this check while preserving the receipt-root identity boundary.'},
    {guard:'native-verification-profile',classification:'UNWITNESSED_DEFENSE_IN_DEPTH',reason:'Receipt-bound profile fields are also protected by identity; no separate physical mutation kill is claimed.'},
    {guard:'recomputation-result-preservation',classification:'UNWITNESSED_DEFENSE_IN_DEPTH',reason:'Receipt-bound saved recomputation is also protected by identity; no separate physical mutation kill is claimed.'},
  ],unwitnessed:['Completeness of the upstream host verifier, native canonicalizers and capsule algorithms is not claimed.',
    'Malformed-input admission, every error reason, every optional consistency branch and cryptographic library internals are not mutation-complete.']};
writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
process.exitCode=records.some(r=>r.classification!==r.expected_classification||r.unexpected_changes.length)||restoration.some(r=>!r.restored)
  ||!restoredSemantics||harnessControls.some(r=>!r.passed||!r.restored||!r.applied)?1:0;
