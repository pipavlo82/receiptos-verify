import { canonicalize, digest, equal, keys } from '../../../src/core/common.mjs';
import { parseStrict } from '../../../src/core/strict-json.mjs';
import { verifyV2 } from '../../../src/core/verify-v2.mjs';
import { verifyIntegrity } from '../../../src/adapters/crystal.mjs';
import { actionMaterial } from '../../../src/adapters/interpoll-v2.mjs';
import { verifyAnchor } from './anchor.mjs';

export const PROFILE='agent-action-receipt.v0';
export const COMPATIBILITY='agent-action.receiptos-common-json.v0';
export const PROJECTION='agent-action.browser-projection.v0';
export const REPLAY='agent-action.local-review-marker.v0';
export const SCOPE='LOCAL_SYNTHETIC_TRANSITION_ONLY';
export const LIMITATIONS=Object.freeze([
  'This verifies a supplied laboratory action and replays a local state transition.',
  'It does not prove that an external service or agent performed the action.',
  'The signature establishes control of a selected demonstration key, not a correct judgment.',
  'The local log does not establish independently authenticated public-log inclusion.',
  'Verification does not grant permission to execute an action.',
]);
const root=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x);
const initial=()=>({status:'NOT_CHECKED',reason:'NOT_CHECKED'});
function admitted(value) {return typeof value==='string'||Buffer.isBuffer(value)?parseStrict(value):parseStrict(canonicalize(value));}

// One finite laboratory operation, not a general executor: add one review marker.
// Called by the issuer to actually execute; called again by the verifier to replay.
export function replayLocalAction(input,action) {
  keys(input,['schema','item_id','review_markers']);
  if(input.schema!==REPLAY||typeof input.item_id!=='string'||!input.item_id
    ||!Number.isSafeInteger(input.review_markers)||input.review_markers<0||input.review_markers>=1000000)
    throw new Error('LOCAL_ACTION_INPUT_MALFORMED');
  if(action?.kind!=='reaction'||action.targetType!=='post'||action.targetId!==input.item_id||action.value!=='up')
    throw new Error('LOCAL_ACTION_UNSUPPORTED');
  return {schema:REPLAY,item_id:input.item_id,review_markers:input.review_markers+1};
}

export async function verifyAgentAction(callerInput,packageInput) {
  const report={schema:'agent-action.verification-report.v0',profile:PROFILE,projection_version:PROJECTION,
    status:'UNVERIFIABLE',reason:'NOT_EVALUATED',receipt_identity:initial(),claim_compatibility:initial(),
    local_recomputation:initial(),log_inclusion:initial(),native_host_result:null,native_receipt_result:null,
    external_execution:'NOT_COVERED',public_log_authenticity:'NOT_COVERED',execution_permission:'NOT_COVERED',
    limitations:[...LIMITATIONS]};
  const finish=(status,reason)=>{
    report.status=status;report.reason=reason;
    if(['AGENT_ACTION_SUBJECT_MISMATCH','CALLER_CLAIM_MISMATCH','CLAIM_ACTION_ID_MISMATCH',
      'ACTION_INPUT_COMMITMENT_MISMATCH','LOCAL_ACTION_RESULT_MISMATCH','REQUESTED_ACTION_GUARANTEE_NOT_COVERED'].includes(reason))
      report.claim_compatibility={status,reason,scope:SCOPE};
    return report;
  };
  try {
    const caller=admitted(callerInput),pkg=admitted(packageInput);
    keys(caller,['schema','profile','expected_receipt_root','agent','action','claim','scope','host_request','requires_log','log_selection']);
    keys(pkg,['schema','receipt','host_bundle','input_state','log']);
    if(caller.schema!=='agent-action.request.v0'||pkg.schema!=='agent-action.package.v0')return finish('UNVERIFIABLE','SCHEMA_UNSUPPORTED');
    if(caller.profile!==PROFILE||pkg.receipt?.profile!==PROFILE) // GUARD: receipt-profile
      return finish('UNVERIFIABLE','RECEIPT_PROFILE_UNSUPPORTED');
    const receipt=pkg.receipt;
    keys(receipt,['schema','profile','canonicalization_profile','receipt_id','agent','action','claim','input_commitment',
      'observed_result','evidence_attachments','verification','native_verifier_result','recomputation_result',
      'authority','scope','assumptions','dependencies','anchor']);
    keys(receipt.anchor,['receipt_root']);
    keys(receipt.agent,['id','key']);
    keys(receipt.claim,['kind','action_id','output_digest']);
    keys(receipt.verification,['host_profile','native_profile','replay_profile']);
    if(typeof receipt.receipt_id!=='string'||!receipt.receipt_id||typeof receipt.agent.id!=='string'||!receipt.agent.id)
      return finish('UNVERIFIABLE','RECEIPT_SUBJECT_MALFORMED');
    if(receipt.schema!==PROFILE||receipt.canonicalization_profile!==COMPATIBILITY||!root(receipt.anchor.receipt_root)
      ||!root(caller.expected_receipt_root)||typeof caller.requires_log!=='boolean')return finish('UNVERIFIABLE','RECEIPT_ADMISSION_FAILED');
    report.native_receipt_result=await verifyIntegrity(receipt);
    const identity=report.native_receipt_result;
    report.receipt_identity={status:identity.status==='VERIFIED'?'VERIFIED':identity.status==='CANNOT_RECOMPUTE'?'UNVERIFIABLE':'REFUTED',
      reason:identity.reasonCodes.join(', '),expected:caller.expected_receipt_root,stored:receipt.anchor.receipt_root,
      recomputed:identity.nativeResult?.recomputed_root??null};
    // Execute the existing caller-selected verifier even when a different dimension fails.
    report.native_host_result=await verifyV2(caller.host_request,pkg.host_bundle);
    report.log_inclusion=verifyAnchor(receipt.anchor.receipt_root,pkg.log,caller.log_selection);
    if(report.receipt_identity.status!=='VERIFIED')return finish(report.receipt_identity.status,'RECEIPT_IDENTITY_NOT_VERIFIED');
    if(receipt.anchor.receipt_root!==caller.expected_receipt_root) // GUARD: caller-receipt-root
      return finish('REFUTED','CALLER_RECEIPT_ROOT_MISMATCH');
    if(!equal(pkg.host_bundle.payload.crystal,receipt)) // GUARD: host-receipt-carrier
      return finish('REFUTED','HOST_RECEIPT_CARRIER_MISMATCH');
    const input=pkg.host_bundle.payload.adapter;
    if(!equal(receipt.agent,caller.agent)||receipt.agent.key!==input.signed_intent?.actor
      ||!equal(receipt.action,caller.action)||!equal(receipt.action,actionMaterial(input.signed_intent))) // GUARD: agent-action-subject
      return finish('REFUTED','AGENT_ACTION_SUBJECT_MISMATCH');
    if(!equal(receipt.claim,caller.claim)) // GUARD: caller-claim
      return finish('REFUTED','CALLER_CLAIM_MISMATCH');
    if(receipt.claim.action_id!==input.signed_intent.id) // GUARD: action-id-binding
      return finish('REFUTED','CLAIM_ACTION_ID_MISMATCH');
    if(caller.claim.kind!=='LOCAL_ACTION_REPLAY_EQUALS'||caller.scope!==SCOPE||receipt.scope!==SCOPE) // GUARD: protected-scope
      return finish('UNVERIFIABLE','REQUESTED_ACTION_GUARANTEE_NOT_COVERED');
    if(receipt.verification.host_profile!=='receiptos.verify.generic.v2'
      ||receipt.verification.native_profile!=='receiptos.verify.interpoll-action.v2'
      ||receipt.verification.replay_profile!==REPLAY||caller.host_request.adapter!=='interpoll')
      return finish('UNVERIFIABLE','NATIVE_VERIFICATION_PROFILE_UNSUPPORTED');
    if(!equal(receipt.authority,pkg.host_bundle.statement.surface.authority)
      ||!equal(receipt.assumptions,pkg.host_bundle.statement.surface.assumptions)
      ||!equal(receipt.dependencies,pkg.host_bundle.statement.surface.dependencies))
      return finish('REFUTED','AUTHORITY_PREMISE_BINDING_MISMATCH');
    const attached={adapter_input_sha256:digest(input),input_state_sha256:digest(pkg.input_state)};
    if(!equal(receipt.evidence_attachments,attached)||receipt.input_commitment!==attached.input_state_sha256) // GUARD: action-input-binding
      return finish('REFUTED','ACTION_INPUT_COMMITMENT_MISMATCH');
    const native=report.native_host_result;
    if(native.overall!=='VERIFIED') // GUARD: native-host-result
      return finish(native.overall==='CONTRADICTED'?'REFUTED':'UNVERIFIABLE','NATIVE_HOST_'+native.overall);
    if(!equal(receipt.native_verifier_result,native.layers.RECOMPUTATION.nativeResult)) // GUARD: native-result-preservation
      return finish('REFUTED','SAVED_NATIVE_RESULT_MISMATCH');
    const output=replayLocalAction(pkg.input_state,receipt.action);
    report.local_recomputation={status:'REPRODUCED',profile:REPLAY,input_digest:digest(pkg.input_state),
      output_digest:digest(output),observed_result:output,reason:'LOCAL_TRANSITION_EXECUTED_AGAIN'};
    if(!equal(output,receipt.observed_result)||digest(output)!==caller.claim.output_digest) // GUARD: local-result-binding
      return finish('REFUTED','LOCAL_ACTION_RESULT_MISMATCH');
    if(!equal(receipt.recomputation_result,{profile:REPLAY,status:'REPRODUCED',input_digest:digest(pkg.input_state),output_digest:digest(output)}))
      return finish('REFUTED','SAVED_RECOMPUTATION_RESULT_MISMATCH');
    report.claim_compatibility={status:'VERIFIED',reason:'EXACT_CALLER_ACTION_AND_LOCAL_REPLAY',scope:SCOPE};
    if(caller.requires_log&&report.log_inclusion.status!=='VERIFIED') // GUARD: required-log-result
      return finish(report.log_inclusion.status,report.log_inclusion.reason);
    return finish('VERIFIED','LOCAL_ACTION_REPLAY_AND_SELECTED_EVIDENCE_VERIFIED');
  }catch(error){return finish('UNVERIFIABLE',error.code??error.message??'MALFORMED_AGENT_ACTION_INPUT');}
}

// Deterministic semantic projection keeps all native verdicts/reasons. Raw process
// receipts (paths, stdout, timings) are saved separately, never labeled independent review.
export function semanticReport(report) {
  const copy=structuredClone(report);
  const clean=value=>{
    if(!value||typeof value!=='object')return;
    if(value.execution&&typeof value.execution==='object') {
      const e=value.execution;
      value.execution={status:e.status,exitCode:e.exitCode??null,...(e.relation?{relation:e.relation}:{}),
        ...(e.runtime?{runtime:e.runtime}:{}),...(e.reason?{reason:e.reason}:{})};
    }
    for(const child of Object.values(value))clean(child);
  };
  clean(copy);return copy;
}
