import { createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalize, digest } from '../../../src/core/common.mjs';
import { buildManifest } from '../../../src/core/capsule.mjs';
import { evaluateInterpollV2, actionMaterial } from '../../../src/adapters/interpoll-v2.mjs';
import { interpollV2, resignV2 } from '../../../tools/fixtures-v2.mjs';
import { PROFILE,COMPATIBILITY,REPLAY,SCOPE,replayLocalAction } from '../lib/profile.mjs';
import { LOG_PROFILE,checkpointBytes,checkpointIdentity } from '../lib/anchor.mjs';
import { research } from '../lib/paths.mjs';

// PUBLIC deterministic laboratory seed. It is intentionally not a real credential
// or public-log authority; any user can reproduce these fixtures and signatures.
const key=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.alloc(32,2)]),format:'der',type:'pkcs8'});
const publicKey=createPublicKey(key).export({format:'der',type:'spki'}).toString('base64');
// JSON material is independently supplied; do not retain shared object aliases
// between the standalone receipt and the host's evidence carrier.
const clone=value=>JSON.parse(JSON.stringify(value));
const inputState={schema:REPLAY,item_id:'synthetic-post-a',review_markers:0};
const literalExpectedOutput={schema:REPLAY,item_id:'synthetic-post-a',review_markers:1};
function checkpoint(records,{sequence=0,previous=null,logId='laboratory-review-log'}={}) {
  const tree=buildManifest(records.map(r=>({id:r.id,bytes:Buffer.from(r.bytes_base64,'base64')})));
  const body={schema:LOG_PROFILE,log_id:logId,sequence,tree_size:tree.manifest.length,merkle_root:tree.merkleRoot,previous_checkpoint_id:previous};
  return {tree,checkpoint:{body,id:checkpointIdentity(body),key_id:'public-demo-log-key',signature_base64:sign(null,checkpointBytes(body),key).toString('base64')}};
}
const rootRecord=root=>({id:'receipt/'+root.slice(2),bytes_base64:Buffer.from(root,'ascii').toString('base64')});
function attachLog(pkg,caller) {
  const records=[rootRecord('0x'+'1'.repeat(64)),rootRecord(pkg.receipt.anchor.receipt_root),rootRecord('0x'+'f'.repeat(64))];
  const cp=checkpoint(records);
  const index=cp.tree.manifest.findIndex(x=>x.id==='receipt/'+pkg.receipt.anchor.receipt_root.slice(2));
  pkg.log={profile:LOG_PROFILE,leaf:cp.tree.manifest[index],proof:cp.tree.proofs[index],checkpoint:cp.checkpoint};
  caller.log_selection={profile:LOG_PROFILE,log_id:cp.checkpoint.body.log_id,checkpoint_id:cp.checkpoint.id,
    trusted_keys:[{id:'public-demo-log-key',public_key_spki_base64:publicKey}],require_consistency:false};
  return records;
}
async function issue(overrides={}) {
  const pair=await interpollV2(),action=actionMaterial(pair.bundle.payload.adapter.signed_intent);
  const actuallyExecuted=replayLocalAction(inputState,action);
  if(JSON.stringify(actuallyExecuted)!==JSON.stringify(literalExpectedOutput))throw new Error('INDEPENDENT_EXECUTION_EXPECTATION_FAILED');
  const native=evaluateInterpollV2(pair.bundle.payload.adapter,pair.request.adapter_requirement);
  const body={schema:PROFILE,profile:PROFILE,canonicalization_profile:COMPATIBILITY,receipt_id:'laboratory-review-marker-001',
    agent:{id:'laboratory-review-agent',key:action.actor},action,
    claim:{kind:'LOCAL_ACTION_REPLAY_EQUALS',action_id:pair.bundle.payload.adapter.signed_intent.id,output_digest:digest(actuallyExecuted)},
    input_commitment:digest(inputState),observed_result:actuallyExecuted,
    evidence_attachments:{adapter_input_sha256:digest(pair.bundle.payload.adapter),input_state_sha256:digest(inputState)},
    verification:{host_profile:'receiptos.verify.generic.v2',native_profile:'receiptos.verify.interpoll-action.v2',replay_profile:REPLAY},
    native_verifier_result:native.nativeResult,
    recomputation_result:{profile:REPLAY,status:'REPRODUCED',input_digest:digest(inputState),output_digest:digest(actuallyExecuted)},
    authority:clone(pair.bundle.statement.surface.authority),scope:SCOPE,
    assumptions:clone(pair.bundle.statement.surface.assumptions),dependencies:clone(pair.bundle.statement.surface.dependencies),...overrides};
  // Use the existing native Crystal builder to compute the root, then retain only
  // this new profile's body fields. Defaults from its Handoff fixture are not adopted.
  const seed={...body,anchor:{receipt_root:null}};
  const {runNative,parsedExecution}=await import('../../../src/adapters/native/process.mjs');
  const execution=await runNative('crystal',{operation:'build',evidence:seed});
  const parsed=parsedExecution(execution);
  if(!parsed?.ok)throw new Error('NATIVE_CRYSTAL_ISSUE_FAILED');
  const receipt=parsed.value;
  pair.bundle.payload.crystal=receipt;resignV2(pair);
  const caller={schema:'agent-action.request.v0',profile:PROFILE,expected_receipt_root:receipt.anchor.receipt_root,
    agent:clone(body.agent),action:clone(action),claim:clone(body.claim),scope:body.scope,host_request:clone(pair.request),requires_log:true,log_selection:null};
  const pkg={schema:'agent-action.package.v0',receipt,host_bundle:pair.bundle,input_state:clone(inputState),log:null};
  attachLog(pkg,caller);return {caller,package:pkg};
}
const baseline=await issue(),cases=[];
const add=(id,title,expected,edit=()=>{},pair=clone(baseline))=>{edit(pair);cases.push({case_id:id,title,expected,...pair});};
add('A','Matching receipt, exact requested action, local replay and selected checkpoint',{status:'VERIFIED',reason:'LOCAL_ACTION_REPLAY_AND_SELECTED_EVIDENCE_VERIFIED'});
add('B','Intact receipt covers another caller-selected agent',{status:'REFUTED',reason:'AGENT_ACTION_SUBJECT_MISMATCH'},p=>p.caller.agent.id='another-agent');
add('C','External execution requested from a local supplied-trace receipt',{status:'UNVERIFIABLE',reason:'REQUESTED_ACTION_GUARANTEE_NOT_COVERED'},()=>{},await issue({scope:'PROVEN_EXTERNAL_EXECUTION'}));
add('D','Required log proof missing',{status:'UNVERIFIABLE',reason:'LOG_PROOF_MISSING'},p=>p.package.log=null);
add('E','Receipt modified after commitment',{status:'REFUTED',reason:'RECEIPT_IDENTITY_NOT_VERIFIED'},p=>p.package.receipt.observed_result.review_markers=2);
add('F','Correct receipt, wrong log root',{status:'REFUTED',reason:'MERKLE_INCLUSION_INVALID'},p=>p.package.log.checkpoint.body.merkle_root='0'.repeat(64));
add('G','Mathematical inclusion but caller has no trusted checkpoint key',{status:'UNVERIFIABLE',reason:'LOG_TRUST_ROOT_MISSING'},p=>p.caller.log_selection.trusted_keys=[]);
add('H','Unsupported receipt profile',{status:'UNVERIFIABLE',reason:'RECEIPT_PROFILE_UNSUPPORTED'},p=>p.caller.profile='agent-action-receipt.v99');
add('wrong-selected-receipt','Caller selected a different receipt identity',{status:'REFUTED',reason:'CALLER_RECEIPT_ROOT_MISMATCH'},p=>p.caller.expected_receipt_root='0x'+'0'.repeat(64));
add('wrong-host-carrier','Native positive host bundle carries another intact Crystal object',{status:'REFUTED',reason:'HOST_RECEIPT_CARRIER_MISMATCH'},p=>{p.package.host_bundle.payload.crystal.anchor.extra='uncommitted-by-native-root';resignV2({bundle:p.package.host_bundle});});
add('wrong-claim','Caller selected a different expected output',{status:'REFUTED',reason:'CALLER_CLAIM_MISMATCH'},p=>p.caller.claim.output_digest='0'.repeat(64));
add('wrong-caller-action-id','Caller selects a different action ID with the same expected output',{status:'REFUTED',reason:'CALLER_CLAIM_MISMATCH'},p=>p.caller.claim.action_id='0'.repeat(64));
add('wrong-input','Different input state accompanies intact receipt',{status:'REFUTED',reason:'ACTION_INPUT_COMMITMENT_MISMATCH'},p=>p.package.input_state.review_markers=4);
add('native-authority-unavailable','Existing host cannot authenticate selected authority',{status:'UNVERIFIABLE',reason:'NATIVE_HOST_INSUFFICIENT_EVIDENCE'},p=>p.caller.host_request.policy.trusted_keys=[]);
add('wrong-leaf','Proof names a different receipt leaf',{status:'REFUTED',reason:'RECEIPT_LOG_LEAF_MISMATCH'},p=>p.package.log.leaf.digest='0'.repeat(64));
add('wrong-path','Merkle sibling is changed',{status:'REFUTED',reason:'MERKLE_INCLUSION_INVALID'},p=>p.package.log.proof.siblings[0].hash='0'.repeat(64));
add('wrong-index','Merkle leaf index exceeds tree size',{status:'REFUTED',reason:'MERKLE_INCLUSION_INVALID'},p=>p.package.log.proof.index=99);
add('wrong-size','Checkpoint tree size conflicts with proof',{status:'REFUTED',reason:'CHECKPOINT_TREE_SIZE_MISMATCH'},p=>p.package.log.checkpoint.body.tree_size=4);
add('wrong-log','Caller selects another log identity',{status:'REFUTED',reason:'LOG_IDENTITY_MISMATCH'},p=>p.caller.log_selection.log_id='another-log');
add('invalid-signature','Checkpoint signature is invalid',{status:'REFUTED',reason:'CHECKPOINT_SIGNATURE_INVALID'},p=>p.package.log.checkpoint.signature_base64=Buffer.alloc(64).toString('base64'));
add('missing-checkpoint','Inclusion proof lacks its checkpoint',{status:'UNVERIFIABLE',reason:'CHECKPOINT_MISSING'},p=>p.package.log.checkpoint=null);
add('wrong-checkpoint-id','Checkpoint carried identity differs from body',{status:'REFUTED',reason:'CHECKPOINT_IDENTITY_MISMATCH'},p=>p.package.log.checkpoint.id='0'.repeat(64));
add('conflicting-checkpoint','Caller pins another checkpoint',{status:'REFUTED',reason:'SELECTED_CHECKPOINT_MISMATCH'},p=>p.caller.log_selection.checkpoint_id='0'.repeat(64));
add('unsupported-log','Unknown Merkle/log proof convention',{status:'UNVERIFIABLE',reason:'LOG_PROFILE_UNSUPPORTED'},p=>p.package.log.profile='unrecognized-log-v99');
add('log-not-required','Caller requests local action replay without log assertion',{status:'VERIFIED',reason:'LOCAL_ACTION_REPLAY_AND_SELECTED_EVIDENCE_VERIFIED'},p=>{p.package.log=null;p.caller.requires_log=false;});
const consistency=clone(baseline),oldRecords=[rootRecord('0x'+'1'.repeat(64))],old=checkpoint(oldRecords);
const newRecords=[...oldRecords,rootRecord(consistency.package.receipt.anchor.receipt_root),rootRecord('0x'+'f'.repeat(64))];
const current=checkpoint(newRecords,{sequence:1,previous:old.checkpoint.id});
consistency.package.log.checkpoint=current.checkpoint;
consistency.package.log.consistency={profile:'agent-action.full-manifest-extension.v0',previous_checkpoint:old.checkpoint,previous_records:oldRecords,current_records:newRecords};
consistency.caller.log_selection.checkpoint_id=current.checkpoint.id;
consistency.caller.log_selection.previous_checkpoint_id=old.checkpoint.id;
consistency.caller.log_selection.require_consistency=true;
add('consistency-positive','Full supplied manifests establish selected local extension',{status:'VERIFIED',reason:'LOCAL_ACTION_REPLAY_AND_SELECTED_EVIDENCE_VERIFIED'},()=>{},consistency);
add('missing-consistency','Selected consistency obligation lacks evidence',{status:'UNVERIFIABLE',reason:'CONSISTENCY_EVIDENCE_MISSING'},p=>p.package.log.consistency=undefined,clone(consistency));
// Remove an omitted optional JSON property rather than encode undefined.
delete cases.at(-1).package.log.consistency;
add('conflicting-history','Previous checkpoint link is changed',{status:'REFUTED',reason:'CONSISTENCY_CHECKPOINT_CONFLICT'},p=>p.package.log.consistency.previous_checkpoint.id='0'.repeat(64),clone(consistency));
add('wrong-native-record','Intact receipt records a different native verifier result',{status:'REFUTED',reason:'SAVED_NATIVE_RESULT_MISMATCH'},()=>{},await issue({native_verifier_result:{status:'VERIFIED'}}));
add('wrong-input-commitment','Intact receipt falsely names the input commitment',{status:'REFUTED',reason:'ACTION_INPUT_COMMITMENT_MISMATCH'},()=>{},await issue({input_commitment:'0'.repeat(64)}));
add('wrong-local-output','Intact receipt claims a local output that replay does not reproduce',{status:'REFUTED',reason:'LOCAL_ACTION_RESULT_MISMATCH'},()=>{},await issue({observed_result:{...literalExpectedOutput,review_markers:9}}));
add('wrong-action-id','Intact receipt and caller name an unrelated signed action ID',{status:'REFUTED',reason:'CLAIM_ACTION_ID_MISMATCH'},()=>{},await issue({claim:{...baseline.package.receipt.claim,action_id:'0'.repeat(64)}}));
add('valid-other-leaf','Mathematically valid inclusion is for another receipt',{status:'REFUTED',reason:'RECEIPT_LOG_LEAF_MISMATCH'},p=>{
  const records=attachLog(p.package,p.caller),tree=checkpoint(records).tree;
  const i=tree.manifest.findIndex(x=>x.id!==p.package.log.leaf.id);
  p.package.log.leaf=tree.manifest[i];p.package.log.proof=tree.proofs[i];
});
add('signed-wrong-size','Authentic selected checkpoint misstates its proof tree size',{status:'REFUTED',reason:'CHECKPOINT_TREE_SIZE_MISMATCH'},p=>{
  const c=p.package.log.checkpoint;c.body.tree_size=4;c.id=checkpointIdentity(c.body);
  c.signature_base64=sign(null,checkpointBytes(c.body),key).toString('base64');p.caller.log_selection.checkpoint_id=c.id;
});
add('selected-forged-id','Caller selects a falsely labeled checkpoint identity',{status:'REFUTED',reason:'CHECKPOINT_IDENTITY_MISMATCH'},p=>{
  p.package.log.checkpoint.id='0'.repeat(64);p.caller.log_selection.checkpoint_id='0'.repeat(64);
});
add('ambiguous-key','Duplicated selected key identity is ambiguous',{status:'UNVERIFIABLE',reason:'AMBIGUOUS_LOG_TRUST_ROOT'},p=>p.caller.log_selection.trusted_keys.push(clone(p.caller.log_selection.trusted_keys[0])));
const changedHistory=clone(consistency);
const changedRecords=newRecords.map(r=>r.id===oldRecords[0].id?{...r,bytes_base64:Buffer.from('changed old record').toString('base64')}:r);
const changedCp=checkpoint(changedRecords,{sequence:1,previous:old.checkpoint.id});
const changedIndex=changedCp.tree.manifest.findIndex(x=>x.id===changedHistory.package.log.leaf.id);
changedHistory.package.log.checkpoint=changedCp.checkpoint;
changedHistory.package.log.proof=changedCp.tree.proofs[changedIndex];
changedHistory.package.log.consistency.current_records=changedRecords;
changedHistory.caller.log_selection.checkpoint_id=changedCp.checkpoint.id;
add('changed-old-record','Two authentic checkpoints do not establish retention of old entries',{status:'REFUTED',reason:'CONSISTENCY_OLD_ENTRY_CHANGED'},()=>{},changedHistory);
// Review follow-up: change one field outside the already committed receipt so
// receipt identity cannot mask the wrapper schema/admission/binding checks.
add('unsupported-caller-schema','Caller request names an unsupported schema',{status:'UNVERIFIABLE',reason:'SCHEMA_UNSUPPORTED'},p=>p.caller.schema='agent-action.request.v99');
add('unsupported-package-schema','Action package names an unsupported schema',{status:'UNVERIFIABLE',reason:'SCHEMA_UNSUPPORTED'},p=>p.package.schema='agent-action.package.v99');
add('requires-log-string','Log requirement must be a boolean rather than a truthy string',{status:'UNVERIFIABLE',reason:'RECEIPT_ADMISSION_FAILED'},p=>p.caller.requires_log='false');
add('authority-premise-mismatch','Host authority premise differs from the intact receipt',{status:'REFUTED',reason:'AUTHORITY_PREMISE_BINDING_MISMATCH'},p=>p.package.host_bundle.statement.surface.authority={id:'changed-authority'});
const output=resolve(research,'fixtures/actions.json');mkdirSync(resolve(research,'fixtures'),{recursive:true});
writeFileSync(output,JSON.stringify(cases,null,2)+'\n');
writeFileSync(resolve(research,'fixtures/public-demo-keys.json'),JSON.stringify({classification:'PUBLIC_TEST_MATERIAL_NOT_PRODUCTION_AUTHORITY',log_key_id:'public-demo-log-key',public_key_spki_base64:publicKey},null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,actually_executed_output:literalExpectedOutput,output}));
