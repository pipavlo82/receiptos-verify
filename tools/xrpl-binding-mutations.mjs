#!/usr/bin/env node
// Destructive controls run only in one disposable copy. This tool never calls
// live(), creates a wallet, signs, submits, or opens a network connection.
import { cp, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const CAPTURE='reports/xrpl-poc/testnet-capture.json';
const POLICY='profiles/xrpl-poc-testnet-policy.json';
const ADAPTER='src/adapters/xrpl-anchor.mjs';
const SURFACE='src/core/claim-surface.mjs';
const REQUIRED=['receipt_root','claim','subject','submitting_account','transaction','network','ledger_checkpoint'];
const ORIGINAL_CAPTURE_SHA256='7f7fa0ad162a5d619ff594e0aa562beb361fdd0d275821f7d1f0b2d54e7231ce';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const worker=`
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { descriptor,evaluateXrplAnchor,evaluateXrplClaim } from './src/adapters/xrpl-anchor.mjs';
import { validateBindingContract } from './src/core/binding-contract.mjs';
import { replay } from './tools/xrpl-poc.mjs';
const c=JSON.parse(await readFile('${CAPTURE}','utf8'));
const p=JSON.parse(await readFile('${POLICY}','utf8'));
const mode=process.argv[2]??'normal';
const clone=x=>structuredClone(x);
const input={profile:c.profile,receipt:clone(c.receipt),claim_preimage:clone(c.claim_preimage),observation:clone(c.observation)};
const trust={basis:'ACCEPTED_CAPTURE_REPLAY',endpoint:p.endpoint,network_id:p.network_id,checkpoint:clone(p.checkpoint),account:p.account,transaction_hash:p.transaction_hash,required_transaction_result:null,claim_context:{verification_time:p.verification_time,established_assumptions:[],dependency_results:[],evidence_basis:['receipt-root']}};
const request=clone(c.request_a);
if(mode==='checkpoint'||mode==='checkpoint-replay'){
 const middle=input.observation.history[1];
 trust.checkpoint={ledger_index:middle.ledger_index,ledger_hash:middle.ledger_hash.toLowerCase()};
 input.observation.history=input.observation.history.slice(1);
}
if(mode==='assumption'){request.assumptions=['A'];trust.claim_context.established_assumptions='AB';}
if(mode==='assumption-positive'){request.assumptions=['A'];trust.claim_context.established_assumptions=['A'];}
if(mode==='checkpoint-replay'){
 c.observation=input.observation;
 c.audit_transform={kind:'COUNTERFACTUAL_CALLER_CHECKPOINT_NOT_NEW_LIVE_OBSERVATION',original_capture_sha256:'${ORIGINAL_CAPTURE_SHA256}'};
 p.checkpoint=trust.checkpoint;
 const bytes=Buffer.from(JSON.stringify(c,null,2)+'\\n');
 p.capture_sha256=createHash('sha256').update(bytes).digest('hex');
 await writeFile('counterfactual-capture.json',bytes);await writeFile('counterfactual-policy.json',JSON.stringify(p,null,2)+'\\n');
 try {const actual=await replay('counterfactual-capture.json','counterfactual-policy.json');process.stdout.write(JSON.stringify({replay_exit:0,result:actual})+'\\n');}
 catch(error){process.stdout.write(JSON.stringify({replay_exit:1,code:error.code??'UNKNOWN_ERROR'})+'\\n');}
}else{
 const direct=await evaluateXrplAnchor(input,trust);
 const core=validateBindingContract(descriptor,direct.binding_report,direct.binding_evidence);
 const product=await evaluateXrplClaim(input,request,trust);
 const summarize=x=>({adapter_anchor_native:x.adapter_anchor_native,anchor_native:x.anchor_native,integrity:x.integrity?.status??null,binding_contract:x.binding_contract,transaction_hash:x.transaction_hash??null,claim_relation:x.claim_relation?.status??null,overall:x.overall??null,reason_codes:x.reason_codes});
 process.stdout.write(JSON.stringify({mode,transaction:c.observation.hash,same_transaction_bytes:input.observation.tx_blob===c.observation.tx_blob,direct:summarize(direct),core,product:summarize(product)})+'\\n');
}
`;

function execute(cwd,args) {
  const actual=spawnSync(process.execPath,args,{cwd,encoding:'utf8',windowsHide:true,shell:false,timeout:180000,maxBuffer:8*1024*1024});
  let output=null;
  try {output=JSON.parse(actual.stdout.trim());} catch {}
  return {command:['node',...args],exit:actual.status,signal:actual.signal,error:actual.error?.code??null,
    stdout_sha256:sha(actual.stdout??''),stderr_sha256:sha(actual.stderr??''),output,
    semantic_assertion_failed: /code: ['"]ERR_ASSERTION['"]/.test(actual.stdout??'')
      && /# fail 1\b/.test(actual.stdout??'')
      && /not ok .*A\/raw string AB permanent cold-review witness/.test(actual.stdout??''),
    stderr:(actual.stderr??'').replaceAll(cwd,'<DISPOSABLE_CHECKOUT>').slice(0,4096)};
}
function started(run) {return run.exit===0&&!run.error&&!run.signal&&run.output!==null;}
function positive(run) {
  return started(run)&&run.output.direct.anchor_native==='ANCHOR_MATCH'&&run.output.core.status==='VERIFIED'
    &&run.output.product.anchor_native==='ANCHOR_MATCH'&&run.output.product.claim_relation==='COMPATIBLE'
    &&run.output.product.overall==='CONTINUE_REQUIRED_LAYERS';
}
function omissionRun(run,id) {
  return started(run)&&run.output.direct.adapter_anchor_native==='ANCHOR_MATCH'
    &&run.output.direct.anchor_native==='ANCHOR_NOT_ESTABLISHED'&&run.output.direct.integrity==='VERIFIED'
    &&run.output.core.status==='INSUFFICIENT_EVIDENCE'&&JSON.stringify(run.output.core.missing)===JSON.stringify([id])
    &&run.output.core.failures.length===1&&run.output.core.failures[0].binding===id
    &&run.output.core.failures[0].reasonCodes.includes('REQUIRED_BINDING_MISSING')
    &&run.output.product.binding_contract.status==='INSUFFICIENT_EVIDENCE'
    &&run.output.product.overall==='INSUFFICIENT_EVIDENCE';
}
function checkpointRun(run) {
  return started(run)&&run.output.same_transaction_bytes===true&&run.output.direct.adapter_anchor_native==='ANCHOR_MATCH'
    &&run.output.direct.anchor_native==='ANCHOR_MISMATCH'&&run.output.direct.integrity==='VERIFIED'
    &&run.output.core.status==='CONTRADICTED'&&run.output.core.failures.length===1
    &&run.output.core.failures[0].binding==='ledger_checkpoint'
    &&run.output.core.failures[0].reasonCodes.includes('BINDING_RELATION_MISMATCH')
    &&run.output.product.binding_contract.status==='CONTRADICTED'&&run.output.product.overall==='CONTRADICTED';
}
function patchOnce(source,search,replacement) {
  const matches=typeof search==='string'?source.split(search).length-1:[...source.matchAll(search)].length;
  if(matches!==1)return {applied:false,matches,after:source};
  const after=source.replace(search,replacement);
  return {applied:after!==source,matches,after};
}
function inventory() {
  return [
    ...REQUIRED.map(binding=>({id:'OMIT_'+binding,binding,file:ADAPTER,kind:'OMISSION',
      search:new RegExp("^    bind\\('"+binding+"'[\\s\\S]*?; // XRPL_BINDING "+binding+"(?:\\r?\\n|$)",'gm'),
      replacement:'    // Deliberately omitted required binding: '+binding+'\n'})),
    {id:'BYPASS_COMMITTED_CHECKPOINT',binding:'ledger_checkpoint',file:ADAPTER,kind:'CHECKPOINT',
      search:'        || binding.trusted_checkpoint.ledger_index !== trust.checkpoint.ledger_index\n        || !sameHash(binding.trusted_checkpoint.ledger_hash, trust.checkpoint.ledger_hash))',replacement:')'},
    {id:'RESTORE_PERMISSIVE_ASSUMPTION_CONTEXT',binding:'assumptions',file:SURFACE,kind:'ASSUMPTION',
      search:'      || !contextIdentityLists(context)) {',replacement:'      || false) {'},
  ];
}

export async function auditBindingMutations(options={}) {
  let catalogue=inventory();
  const report={schema:'receiptos.xrpl.binding-mutation-audit.v1',status:'FAIL',
    scope:'Offline source-omission and direct-API controls; not live XRPL integration or consensus proof.',
    runtime:{node:process.version},capture_sha256:null,required_bindings:REQUIRED,
    negative_control:options.negativeControl??null,baseline:null,mutants:[],
    counts:{inventory:0,killed:0,survived:0,crashed:0,unapplied:0,invalid_output:0,positive_control_failed:0}};
  if(options.negativeControl==='empty')catalogue=[];
  if(options.negativeControl==='unapplied')catalogue=[{...catalogue[0],search:'INTENTIONALLY_ABSENT_MUTATION_TARGET'}];
  if(options.negativeControl==='crash')catalogue=[{id:'CRASH_NOT_A_KILL',file:ADAPTER,kind:'CRASH',
    search:'export async function evaluateXrplAnchor(input, trust) {',
    replacement:"export async function evaluateXrplAnchor(input, trust) { throw new Error('SYNTHETIC_CRASH_CONTROL');"}];
  report.counts.inventory=catalogue.length;
  if(!catalogue.length){report.failure='EMPTY_MUTANT_INVENTORY';return report;}
  if(options.negativeControl&&!['empty','unapplied','crash','positive-control'].includes(options.negativeControl)){
    report.failure='UNKNOWN_NEGATIVE_CONTROL';return report;
  }
  let disposable;
  try {
    const captureBytes=await readFile(join(ROOT,CAPTURE));report.capture_sha256=sha(captureBytes);
    if(report.capture_sha256!==ORIGINAL_CAPTURE_SHA256){report.failure='ORIGINAL_CAPTURE_CHANGED';return report;}
    disposable=await mkdtemp(join(tmpdir(),'receiptos-xrpl-binding-'));
    for(const path of ['src','schemas','vendor','provenance','docs/xrpl','profiles']){
      const target=join(disposable,path);await mkdir(dirname(target),{recursive:true});await cp(join(ROOT,path),target,{recursive:true});
    }
    for(const path of ['package.json','tools/xrpl-poc.mjs','tests/xrpl-assumption-context.test.mjs',CAPTURE]){
      await mkdir(dirname(join(disposable,path)),{recursive:true});await cp(join(ROOT,path),join(disposable,path));
    }
    await symlink(join(ROOT,'node_modules'),join(disposable,'node_modules'),process.platform==='win32'?'junction':'dir');
    await writeFile(join(disposable,'mutation-worker.mjs'),worker);
    if(options.negativeControl==='positive-control'){
      const damaged=JSON.parse(captureBytes);damaged.receipt.session_id+='-damaged-positive-control';
      await writeFile(join(disposable,CAPTURE),JSON.stringify(damaged,null,2)+'\n');
    }
    report.baseline=execute(disposable,['mutation-worker.mjs','normal']);
    if(!positive(report.baseline)){
      report.counts.positive_control_failed++;report.failure='BASELINE_POSITIVE_CONTROL_FAILED';return report;
    }
    const baselineAssumption=execute(disposable,['mutation-worker.mjs','assumption']);
    report.baseline_assumption=baselineAssumption;
    if(!started(baselineAssumption)||baselineAssumption.output.product.anchor_native!=='ANCHOR_MATCH'
      ||baselineAssumption.output.product.claim_relation!=='INSUFFICIENT_EVIDENCE'
      ||baselineAssumption.output.product.overall!=='INSUFFICIENT_EVIDENCE'){
      report.counts.positive_control_failed++;report.failure='ASSUMPTION_REGRESSION_BASELINE_FAILED';return report;
    }
    for(const mutation of catalogue){
      const file=join(disposable,mutation.file),source=await readFile(file,'utf8');
      const applied=patchOnce(source,mutation.search,mutation.replacement);
      const row={id:mutation.id,binding:mutation.binding??null,kind:mutation.kind,source:mutation.file,
        source_before_sha256:sha(source),source_after_sha256:sha(applied.after),matches:applied.matches,
        applied:applied.applied,outcome:null,semantic_kill:false};
      report.mutants.push(row);
      if(!applied.applied){row.outcome='UNAPPLIED';report.counts.unapplied++;continue;}
      await writeFile(file,applied.after);
      try{
        row.syntax=execute(disposable,['--check',mutation.file]);
        if(row.syntax.exit!==0||row.syntax.error){row.outcome='INVALID_OUTPUT';report.counts.invalid_output++;continue;}
        const mode=mutation.kind==='CHECKPOINT'?'checkpoint':mutation.kind==='ASSUMPTION'?'assumption':'normal';
        row.witness=execute(disposable,['mutation-worker.mjs',mode]);
        if(!started(row.witness)){
          row.outcome=row.witness.exit!==0||row.witness.error||row.witness.signal?'CRASH':'INVALID_OUTPUT';
          report.counts[row.outcome==='CRASH'?'crashed':'invalid_output']++;continue;
        }
        let killed=false;
        if(mutation.kind==='OMISSION'){
          row.replay=execute(disposable,['tools/xrpl-poc.mjs','replay','--json']);
          let error;try{error=JSON.parse(row.replay.stderr.trim());}catch{}
          killed=omissionRun(row.witness,mutation.binding)&&row.replay.exit===1
            &&error?.code==='REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED';
          row.kill_mechanism='CORE_REQUIRED_BINDING_REJECTION';
        }else if(mutation.kind==='CHECKPOINT'){
          row.positive=execute(disposable,['mutation-worker.mjs','normal']);
          row.replay=execute(disposable,['mutation-worker.mjs','checkpoint-replay']);
          killed=checkpointRun(row.witness)&&positive(row.positive)&&started(row.replay)
            &&row.replay.output.replay_exit===1&&row.replay.output.code==='REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED';
          row.kill_mechanism='CORE_INDEPENDENT_CHECKPOINT_RELATION_REJECTION';
        }else if(mutation.kind==='ASSUMPTION'){
          row.positive=execute(disposable,['mutation-worker.mjs','assumption-positive']);
          row.regression=execute(disposable,['--test','--test-name-pattern','A/raw string AB permanent cold-review witness','tests/xrpl-assumption-context.test.mjs']);
          // A semantic assertion failure is required, not an arbitrary exit 1.
          killed=positive(row.positive)&&row.witness.output.product.anchor_native==='ANCHOR_MATCH'
            &&row.witness.output.product.claim_relation==='COMPATIBLE'
            &&row.witness.output.product.overall==='CONTINUE_REQUIRED_LAYERS'
            &&row.regression.exit===1&&row.regression.stdout_sha256!==sha('');
          const tap=spawnTapClassification(row.regression);
          row.regression_classification=tap;
          killed=killed&&tap.semantic_assertion_failed;
          row.kill_mechanism='DIRECT_API_REGRESSION_SEMANTIC_DISAGREEMENT';
        }
        row.semantic_kill=killed;row.outcome=killed?'KILLED':'SURVIVED';
        report.counts[killed?'killed':'survived']++;
      }finally{await writeFile(file,source);}
    }
    report.status=report.counts.killed===catalogue.length&&report.counts.crashed===0&&report.counts.unapplied===0
      &&report.counts.invalid_output===0&&report.counts.positive_control_failed===0?'PASS':'FAIL';
    report.capture_unchanged=sha(await readFile(join(ROOT,CAPTURE)))===ORIGINAL_CAPTURE_SHA256;
    if(!report.capture_unchanged){report.status='FAIL';report.failure='ORIGINAL_CAPTURE_CHANGED';}
    return report;
  }catch(error){report.failure=error.code??'MUTATION_INFRASTRUCTURE_FAILURE';return report;}
  finally{
    if(disposable){
      const target=resolve(disposable),parent=resolve(tmpdir());
      if(dirname(target)!==parent||!basename(target).startsWith('receiptos-xrpl-binding-'))throw new Error('UNSAFE_DISPOSABLE_CLEANUP_TARGET');
      // Remove the dependency junction itself before recursive cleanup. The
      // original checkout's dependency directory is never a removal target.
      try{await unlink(join(target,'node_modules'));}catch(error){if(error.code!=='ENOENT')throw error;}
      await rm(target,{recursive:true,force:true});
    }
  }
}

// execute() stores only a compact, public-safe stream tail needed to classify
// assertions. A process exit or malformed output alone is never a semantic kill.
function spawnTapClassification(run){
  return {semantic_assertion_failed:run.semantic_assertion_failed===true};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),at=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]??null;};
  const report=await auditBindingMutations({negativeControl:at('--negative-control')});
  const output=at('--output');
  if(output){await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(resolve(output),JSON.stringify(report,null,2)+'\n');}
  process.stdout.write(args.includes('--json')?JSON.stringify(report,null,2)+'\n':JSON.stringify({status:report.status,...report.counts,failure:report.failure??null})+'\n');
  if(report.status!=='PASS')process.exitCode=1;
}
