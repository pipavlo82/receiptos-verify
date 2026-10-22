import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {research,support,host} from '../lib/paths.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const label=process.argv[2]??'normal',out=resolve(support,'mutations',label);
mkdirSync(out,{recursive:true});
const positive=['A','log-not-required','consistency-positive'];
const definitions=[
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
const allowed={
 'caller-claim':['wrong-claim','wrong-caller-action-id'],
 'action-input-binding':['wrong-input','wrong-input-commitment'],
 'required-log-result':['D','F','G','wrong-leaf','wrong-path','wrong-index','wrong-size','wrong-log','invalid-signature','missing-checkpoint','wrong-checkpoint-id','conflicting-checkpoint','unsupported-log','missing-consistency','conflicting-history','valid-other-leaf','signed-wrong-size','selected-forged-id','ambiguous-key','changed-old-record'],
 'receipt-leaf-binding':['wrong-leaf','valid-other-leaf'],'checkpoint-tree-size':['wrong-size','signed-wrong-size'],
 'native-merkle-proof':['F','wrong-path','wrong-index'],'checkpoint-identity':['wrong-checkpoint-id','selected-forged-id'],
 'trusted-checkpoint':['G','invalid-signature'],
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
  return {command:[process.execPath,...process.execArgv,resolve(research,'tools/run-cases.mjs'),runLabel],exit_code:p.status,signal:p.signal,error:p.error?.message??null,results};
}
const baseline=execute('baseline');
if(baseline.exit_code!==0||!baseline.results?.every(c=>c.passed))throw new Error('MUTATION_BASELINE_FAILED');
const records=[];
try{
  for(const [module,guard,killer] of definitions){
    const path=resolve(research,'lib',module+'.mjs'),original=originals.get(path),text=original.toString('utf8');
    const marker=' // GUARD: '+guard,idx=text.indexOf(marker);
    if(idx<0||idx!==text.lastIndexOf(marker))throw new Error('MUTATION_TARGET_NOT_UNIQUE:'+guard);
    const positions=[...text.slice(0,idx).matchAll(/^[ \t]*if\(/gm)];
    const start=positions.at(-1)?.index;
    if(start===undefined)throw new Error('MUTATION_TARGET_MISSING:'+guard);
    const mutated=text.slice(0,start)+'    if(false)'+text.slice(idx);
    let run,restored=false;
    try{writeFileSync(path,mutated);run=execute(guard);}
    finally{writeFileSync(path,original);restored=hash(readFileSync(path))===hash(original);}
    const changes=run.results?.filter(c=>{
      const b=baseline.results.find(x=>x.case_id===c.case_id);
      return JSON.stringify(c.report)!==JSON.stringify(b.report);
    }).map(c=>c.case_id)??[];
    const controls=positive.every(id=>run.results?.find(c=>c.case_id===id)?.passed);
    const witness=run.results?.find(c=>c.case_id===killer);
    // A kill requires an executed, determinate semantic promotion under an
    // independently negative fixture. A process crash or missing data never kills.
    const killed=run.exit_code===1&&controls&&restored&&witness?.report.status==='VERIFIED'&&!witness.passed;
    const classification=killed?'KILLED':run.error||!run.results?'CRASHED':'NOT_COVERED';
    const record={guard,module,killer,classification,positive_controls:positive,controls_pass:controls,
      witness_predicate:'negative witness status becomes VERIFIED',exit_code:run.exit_code,
      changed_cases:changes,expected_change_domain:allowed[guard]??[killer],unexpected_changes:changes.filter(id=>!(allowed[guard]??[killer]).includes(id)),exclusivity_expected:false,
      original_sha256:hash(original),mutant_sha256:hash(mutated),restored,command:run.command};
    records.push(record);console.log(JSON.stringify(record));
  }
}finally{for(const [p,b]of originals)writeFileSync(p,b);}
const restoration=[...originals].map(([path,b])=>({path,sha256:hash(b),restored:hash(readFileSync(path))===hash(b)}));
const harnessControls=[];
for(const [name,suffix,expected]of [['noop','\n','NOT_COVERED'],['crash','\nconst = broken syntax;\n','CRASHED']]){
  const path=paths[0],original=originals.get(path);let run;
  try{writeFileSync(path,Buffer.concat([original,Buffer.from(suffix)]));run=execute('control-'+name);}
  finally{writeFileSync(path,original);}
  const classification=!run.results?'CRASHED':'NOT_COVERED';
  harnessControls.push({name,expected,classification,exit_code:run.exit_code,restored:hash(readFileSync(path))===hash(original),passed:classification===expected});
}
const report={schema:'agent-action.physical-mutations.v0',records,restoration,harness_controls:harnessControls,
  unwitnessed:['Completeness of the upstream host verifier, native canonicalizers and capsule algorithms is not claimed.',
    'Malformed-input admission, every error reason, every optional consistency branch and cryptographic library internals are not mutation-complete.']};
writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
process.exitCode=records.some(r=>r.classification!=='KILLED'||r.unexpected_changes.length)||restoration.some(r=>!r.restored)||harnessControls.some(r=>!r.passed||!r.restored)?1:0;
