import { canonicalize, digest, equal, keys, subjectSchema, HEX, result, problem } from './common.mjs';
import { parseStrict } from './strict-json.mjs';
import { inspectEvidence, evaluateEvidence } from './evidence.mjs';
import { verifyAuthenticity } from './authenticity.mjs';
import { bindSubject } from './subject.mjs';
import { project } from '../projection/project.mjs';
import { verifyIntegrity, descriptor as crystalDescriptor } from '../adapters/crystal.mjs';
import { recompute, descriptor as rvrDescriptor } from '../adapters/rvr.mjs';
import { evaluateSemantic } from '../adapters/semantic_abi.mjs';
import { evaluateGuarantees } from '../adapters/prf.mjs';
import { evaluateContinuity } from '../adapters/chronicle.mjs';
import { evaluateExecution } from '../adapters/recompute_kit.mjs';
import { evaluateActionRetry } from '../adapters/interpoll.mjs';
import { evaluateStochastic } from '../adapters/stochastic.mjs';
import { inspectAnchor } from '../adapters/ledger.mjs';
import { inspectVectorPack } from '../adapters/pq.mjs';
import { validateSchema } from './schemas.mjs';
import { evidenceCost } from '../analytics/cost.mjs';
export const PROFILE='receiptos.verify.git-artifact.v1';
export const CANON='receiptos.verify.canonical-json.v1';
export const REQUIRED=['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'];
export const LAYER_NAMES=['INPUT','CANONICALIZATION',...REQUIRED,'GUARANTEE_PRESERVATION','CONTINUITY','DOMAIN_ADAPTERS','PRODUCT_PROJECTION','EXPLAINABLE_REPORT','PROVENANCE'];
function admit(request,bundle) {
  // Canonicalize object API inputs as well: reject accessors, sparse arrays, cycles and unsafe numbers.
  canonicalize(request);canonicalize(bundle);
  validateSchema('request',request);validateSchema('bundle',bundle);
  keys(request,['schema','verification_profile','claim','subject','policy','evidence','semantic_requirement','requested_guarantees'],['continuity_request','domain_profile','domain_requirement','guarantee_context']);
  if(request.schema!=='receiptos.verify.request.v1') throw problem('REQUEST_SCHEMA_UNSUPPORTED','Unsupported request schema.');
  subjectSchema(request.subject);
  keys(request.claim,['kind','expected_digest']);
  if(request.claim.kind!=='SHA256_EQUALS'||!HEX.test(request.claim.expected_digest)) throw problem('CLAIM_MALFORMED','SHA256_EQUALS requires a digest.');
  keys(request.policy,['id','version','trusted_keys','required_layers','minimum_grade','verification_time']);
  if(typeof request.policy.id!=='string'||!request.policy.id||typeof request.policy.version!=='string'||!request.policy.version||!Array.isArray(request.policy.trusted_keys)||!Array.isArray(request.policy.required_layers)||request.policy.required_layers.some(l=>!LAYER_NAMES.includes(l))||!Number.isSafeInteger(request.policy.verification_time)||request.policy.verification_time<0||!Array.isArray(request.evidence)||!Array.isArray(request.requested_guarantees)) throw problem('POLICY_MALFORMED','Malformed policy.');
  const keyIds=new Set();
  for(const k of request.policy.trusted_keys) {keys(k,['id','spki_base64']);if(typeof k.id!=='string'||keyIds.has(k.id)||typeof k.spki_base64!=='string') throw problem('POLICY_MALFORMED','Duplicate/invalid trust key.');keyIds.add(k.id);}
  keys(bundle,['schema','canonicalization_profile','statement','signature_base64','evidence','payload']);
  if(bundle.schema!=='receiptos.verify.bundle.v1') throw problem('BUNDLE_SCHEMA_UNSUPPORTED','Unsupported bundle schema.');
  const s=bundle.statement;
  keys(s,['schema','verification_profile','subject','claim','policy','semantic_contract','asserted_result','evidence_manifest','payload_digest','crypto']);
  subjectSchema(s.subject);keys(s.policy,['id','version','digest']);keys(s.crypto,['provider','key_id']);
  if(s.schema!=='receiptos.verify.statement.v1'||!HEX.test(s.payload_digest)||!HEX.test(s.policy.digest)||!['PASS','FAIL','CANNOT_CHECK'].includes(s.asserted_result)) throw problem('STATEMENT_MALFORMED','Malformed signed statement.');
  keys(bundle.payload,['crystal','rvr','relations']);
  keys(bundle.payload.relations,['guarantee','continuity','domain','execution']);
  if(request.domain_profile==='interpoll') {
    keys(request.domain_requirement,['authorized_action','expected_authority']);
    keys(request.domain_requirement.expected_authority,['actor','namespace','targetType','targetId']);
    if(!/^[0-9a-f]{64}$/.test(request.domain_requirement.expected_authority.actor)||Object.values(request.domain_requirement.expected_authority).some(v=>typeof v!=='string'||!v)) throw problem('ACTION_REQUIREMENT_MALFORMED','Caller must select exact actor, namespace and target.');
  }
  if(request.guarantee_context) keys(request.guarantee_context,['basis_accepted','accepted_basis_id','supported_guarantee_ids','obligation_results','established_assumptions']);
}
function nativeOutcome(rvr) {
  if(rvr.semanticOutcome) return rvr.semanticOutcome;
  return rvr.nativeResult?.verification?.verificationOutcome??rvr.nativeResult?.verificationOutcome??rvr.nativeResult?.verification?.outcome??'UNVERIFIABLE';
}
async function domain(request,input) {
  if(!request.domain_profile) return result('NOT_REQUESTED');
  if(request.domain_profile==='interpoll') return evaluateActionRetry({...input,authorized_action:request.domain_requirement.authorized_action,expected_authority:request.domain_requirement.expected_authority});
  if(request.domain_profile==='stochastic') return evaluateStochastic(input);
  if(request.domain_profile==='pq') return inspectVectorPack(input);
  if(request.domain_profile==='ledger') return inspectAnchor(input);
  if(request.domain_profile==='qev') {try {return await (await import('../adapters/qev.mjs')).evaluateQev({...input,request:request.domain_requirement,expectedClaim:request.domain_requirement?.expectedClaim});} catch(error) {return result('CANNOT_RECOMPUTE',['QEV_ADAPTER_UNAVAILABLE'],{error:error.code??error.message});}}
  return result('UNSUPPORTED',['DOMAIN_PROFILE_UNSUPPORTED']);
}
export async function verify(requestInput,bundleInput) {
  const layers=Object.fromEntries(LAYER_NAMES.map(k=>[k,result('NOT_RUN')]));
  let request,bundle,inspected,supported=false,admitted=false;
  try {
    request=typeof requestInput==='string'||Buffer.isBuffer(requestInput)?parseStrict(requestInput):requestInput;
    bundle=typeof bundleInput==='string'||Buffer.isBuffer(bundleInput)?parseStrict(bundleInput):bundleInput;
    admit(request,bundle);admitted=true;layers.INPUT=result('ADMITTED');
    if(bundle.canonicalization_profile!==CANON) throw problem('CANONICALIZATION_PROFILE_UNSUPPORTED','Unknown canonicalization profile.'); // MUTATE: canonicalization
    layers.CANONICALIZATION=result('VERIFIED',[],{profile:CANON,statement_digest:digest(bundle.statement)});
    inspected=inspectEvidence(bundle);
    const crystal=await verifyIntegrity(bundle.payload.crystal);
    layers.INTEGRITY=crystal;
    if(!['VERIFIED','CANNOT_RECOMPUTE'].includes(crystal.status)) layers.INTEGRITY=result('REJECTED_MALFORMED',crystal.reasonCodes,crystal.nativeResult,{execution:crystal.execution});
    layers.AUTHENTICITY=verifyAuthenticity(request,bundle);
    layers.SUBJECT_BINDING=bindSubject(request,bundle.statement);
    supported=request.verification_profile===PROFILE&&bundle.statement.verification_profile===PROFILE;
    const nativeInput=structuredClone(bundle.payload.rvr);
    for(const claim of [nativeInput?.originalBundle?.claim,nativeInput?.candidateCase?.claim]) {
      if(!claim||claim.schema!=='rvr.claim.sha256-equals.v0'||claim.operation!=='SHA256_EQUALS'||claim.evidenceMember!=='artifact'||claim.expectedDigest!==bundle.statement.claim.expected_digest) throw problem('NATIVE_CLAIM_MISMATCH','Native supplied claim differs from the signed product claim.');
    }
    if(nativeInput?.candidateCase?.claim) nativeInput.candidateCase.claim.expectedDigest=request.claim.expected_digest;
    const rvr=inspected.missing.length?{...result('CANNOT_RECOMPUTE',['COMMITTED_EVIDENCE_UNAVAILABLE']),execution:{status:'NOT_RUN',reason:'Product-required committed bytes are unavailable'},semanticOutcome:'UNVERIFIABLE',savedCanonicalResult:bundle.payload.rvr.originalBundle.canonicalResult}:await recompute(nativeInput);
    rvr.semanticOutcome=nativeOutcome(rvr);
    rvr.adapterProjection=rvr.status;
    if(rvr.recomputationStatus && rvr.status!=='REJECTED_MALFORMED') rvr.status=rvr.recomputationStatus;
    layers.RECOMPUTATION=rvr;
    if((rvr.semanticOutcome==='REFUTED'&&bundle.statement.asserted_result==='PASS')||(rvr.semanticOutcome==='VERIFIED'&&bundle.statement.asserted_result==='FAIL')) rvr.reasonCodes.push('ASSERTED_NATIVE_RESULT_CONTRADICTION');
    const artifact=inspected.entries.find(e=>e.role==='artifact');
    if(rvr.observedArtifactDigest&&artifact&&rvr.observedArtifactDigest!==artifact.digest) throw problem('NATIVE_ARTIFACT_MISMATCH','Native replay covers different artifact bytes.');
    if(rvr.nativeCanonicalResult?.evaluation?.expectedDigest&&rvr.nativeCanonicalResult.evaluation.expectedDigest!==request.claim.expected_digest) throw problem('NATIVE_CLAIM_MISMATCH','Native verifier did not use the independently selected claim.');
    const saved=inspected.entries.find(e=>e.role==='native-result');
    if(saved&&!saved.bytes.equals(canonicalize(bundle.payload.rvr.originalBundle.canonicalResult))) throw problem('NATIVE_SAVED_RESULT_MISMATCH','Native saved result differs from the committed attachment.');
    const execution=evaluateExecution(bundle.payload.relations.execution,{executed:rvr.execution?.status==='COMPLETED',semanticObserved:['VERIFIED','REFUTED'].includes(rvr.semanticOutcome),processStatus:rvr.execution?.status,subject:bundle.statement.subject,executablePin:rvrDescriptor.sourceCommit});
    if(execution.status==='CONTRADICTED') layers.RECOMPUTATION=result('CONTRADICTED',execution.reasonCodes,{rvr:rvr.nativeResult,execution});
    layers.EVIDENCE_SUFFICIENCY=evaluateEvidence(inspected,execution,request.policy);
    const context={verification_time:request.policy.verification_time,authority_class:rvr.status==='REPRODUCED'&&execution.status==='VERIFIED'?'INDEPENDENT_RECOMPUTATION':null,evidence_classes:execution.status==='VERIFIED'?['artifact','execution']:[],established_assumptions:[],evidence_subject:bundle.statement.subject.id};
    layers.SEMANTIC_COMPATIBILITY=evaluateSemantic(bundle.statement.semantic_contract,request.semantic_requirement,context);
    const guarantees=bundle.payload.relations.guarantee;
    layers.GUARANTEE_PRESERVATION=guarantees?evaluateGuarantees(guarantees.upstream,request.requested_guarantees,guarantees.downstream,{...context,...request.guarantee_context}):result(request.requested_guarantees.length?'UNVERIFIABLE':'NOT_REQUESTED',request.requested_guarantees.length?['GUARANTEE_EVIDENCE_MISSING']:[]);
    layers.CONTINUITY=request.continuity_request?evaluateContinuity(bundle.payload.relations.continuity,request.continuity_request):result('NOT_REQUESTED');
    layers.DOMAIN_ADAPTERS=await domain(request,bundle.payload.relations.domain);
    layers.PROVENANCE=result('RECORDED',[],{sources:'provenance/sources.json',crystal:crystalDescriptor,rvr:rvrDescriptor,evidence_cost:evidenceCost(inspected,[crystal.execution,rvr.execution,layers.DOMAIN_ADAPTERS.execution]),independence:'Pinned upstream computations; product host and its tests are a single new implementation.'});
  } catch(error) {
    layers.INPUT=result('REJECTED_MALFORMED',[error.code??'SCHEMA_MISMATCH'],{message:error.message});
  }
  const required=admitted?[...new Set([...REQUIRED,...request.policy.required_layers,...(request.requested_guarantees.length?['GUARANTEE_PRESERVATION']:[]),...(request.continuity_request?['CONTINUITY']:[]),...(request.domain_profile?['DOMAIN_ADAPTERS']:[])])]:[...REQUIRED];
  const overall=project(layers,required,supported);
  layers.PRODUCT_PROJECTION=overall;
  let explanation=layers.SUBJECT_BINDING.explanation??'The requested verification layers did not establish the claim.';
  if(layers.SUBJECT_BINDING.status==='CONTRADICTED'&&layers.AUTHENTICITY.status==='VERIFIED') explanation='Authenticated '+explanation[0].toLowerCase()+explanation.slice(1);
  if(layers.SUBJECT_BINDING.status!=='CONTRADICTED') explanation=`${overall.status}. ${explanation} ${overall.reasonCodes.join(', ')}`;
  layers.EXPLAINABLE_REPORT=result('GENERATED',overall.reasonCodes,{explanation});
  return {schema:'receiptos.verify.report.v1',projection_version:'receiptos.verify.projection.v1',overall:overall.status,reason_codes:overall.reasonCodes,explanation,required_layers:required,layers,boundaries:['Integrity is not authenticity.','Signature is not semantic correctness.','Replay preserves negative outcomes.','Historical observations are not repeated execution.']};
}
