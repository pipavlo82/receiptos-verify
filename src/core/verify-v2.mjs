import { canonicalize, digest, equal, result, problem } from './common.mjs';
import { parseStrict } from './strict-json.mjs';
import { admitV2 } from './admission-v2.mjs';
import { inspectEvidenceV2, evaluateEvidenceV2 } from './evidence-v2.mjs';
import { verifyAuthenticityV2 } from './authenticity-v2.mjs';
import { requestSurface } from './claim-surface.mjs';
import { projectV2, REQUIRED_V2 } from '../projection/project-v2.mjs';
import { verifyIntegrity, descriptor as crystal } from '../adapters/crystal.mjs';
import { recompute, descriptor as rvr } from '../adapters/rvr.mjs';
import { evaluateSemanticAbi, descriptor as semanticAbi } from '../adapters/semantic-abi-v2.mjs';
import { evaluateTrustless, descriptor as trustless } from '../adapters/trustless.mjs';
import { evaluateInterpollV2, actionMaterial, commitActionTrace, descriptor as interpoll } from '../adapters/interpoll-v2.mjs';
import { evaluatePrfV2, descriptor as prf } from '../adapters/prf-v2.mjs';
import { evaluateContinuity } from '../adapters/chronicle.mjs';

export const PROFILE_V2 = 'receiptos.verify.generic.v2';
export const LAYERS_V2 = ['INPUT','CANONICALIZATION',...REQUIRED_V2,'GUARANTEE_PRESERVATION','CONTINUITY','DOMAIN_ADAPTERS','PRODUCT_PROJECTION','EXPLAINABLE_REPORT','PROVENANCE'];
const adapters = { rvr, 'semantic-abi': rvr, trustless, interpoll };
const notRun = () => ({...result('CANNOT_RECOMPUTE',['COMMITTED_EVIDENCE_UNAVAILABLE']),semanticOutcome:'UNVERIFIABLE',execution:{status:'NOT_RUN'}});

async function executeAdapter(request,bundle,inspected) {
  const input = bundle.payload.adapter, surface = bundle.statement.surface;
  if (!Object.hasOwn(adapters,request.adapter)) return {...result('UNSUPPORTED',['ADAPTER_UNSUPPORTED']),semanticOutcome:'UNVERIFIABLE'};
  if (inspected.missing.length) return notRun();
  if (request.adapter==='trustless') return evaluateTrustless(input);
  if (request.adapter==='interpoll') {
    const evaluated = evaluateInterpollV2(input,request.adapter_requirement ?? {});
    // Re-run the supplied trace relation. Supplied observations are not server provenance.
    const replay = equal(input.final_committed_result,commitActionTrace(input));
    return {...evaluated,adapterProjection:evaluated.status,
      status:evaluated.status==='REJECTED_MALFORMED'?'REJECTED_MALFORMED':replay?'REPRODUCED':'DIVERGED',
      semanticOutcome:evaluated.status==='VERIFIED'?'VERIFIED':evaluated.status==='CONTRADICTED'?'REFUTED':'UNVERIFIABLE',
      execution:{status:'COMPLETED',runtime:'node',relation:'pinned Schnorr verification and exact supplied trace'}};
  }
  if (surface.claim.kind!=='SHA256_EQUALS') return {...result('UNSUPPORTED',['NATIVE_CLAIM_KIND_UNSUPPORTED']),semanticOutcome:'UNVERIFIABLE'};
  for (const claim of [input?.originalBundle?.claim,input?.candidateCase?.claim]) {
    if (!claim || claim.schema!=='rvr.claim.sha256-equals.v0' || claim.operation!=='SHA256_EQUALS'
      || claim.evidenceMember!=='artifact' || claim.expectedDigest!==surface.claim.parameters.expected_digest) {
      throw problem('NATIVE_CLAIM_MISMATCH','Native RVR predicate differs from the authenticated evidence claim.');
    }
  }
  const native = await recompute(input);
  return {...native,adapterProjection:native.status,status:native.status==='REJECTED_MALFORMED'?native.status:native.recomputationStatus??native.status};
}

function nativeBinding(request,bundle,inspected,native) {
  const surface=bundle.statement.surface, input=bundle.payload.adapter;
  if (!Object.hasOwn(adapters,request.adapter)) return result('INSUFFICIENT_EVIDENCE',['NATIVE_BINDING_UNSUPPORTED']);
  const attachment=role=>inspected.entries.find(entry=>entry.role===role);
  if (!attachment('adapter-input')) return result('INSUFFICIENT_EVIDENCE',['ADAPTER_INPUT_EVIDENCE_MISSING']);
  if (!attachment('adapter-input').bytes.equals(canonicalize(input))) return result('CONTRADICTED',['ADAPTER_INPUT_COMMITMENT_MISMATCH']);
  if (surface.authority.id!==bundle.statement.crypto.key_id
      || surface.authority.class!=='INDEPENDENT_RECOMPUTATION'
      || !request.policy.accepted_authorities.some(authority=>equal(authority,surface.authority))) return result('CONTRADICTED',['AUTHORITY_MISMATCH']);
  if (request.adapter!==bundle.statement.adapter) return result('CONTRADICTED',['ADAPTER_BINDING_MISMATCH']);
  if (['rvr','semantic-abi'].includes(request.adapter)) {
    if (!equal(surface.claim.parameters,{expected_digest:input.originalBundle?.claim?.expectedDigest??null})) return result('CONTRADICTED',['NATIVE_CLAIM_SURFACE_MISMATCH']);
    if (!equal(surface.scope,{evidence_member:'artifact'})) return result('CONTRADICTED',['NATIVE_SCOPE_MISMATCH']);
    const artifact=attachment('artifact'), saved=attachment('native-result');
    if (!artifact || !saved) return result('INSUFFICIENT_EVIDENCE',['NATIVE_EVIDENCE_MISSING']);
    if (native.observedArtifactDigest && (native.observedArtifactDigest!==artifact.digest || surface.subject.artifact_digest!==artifact.digest)) return result('CONTRADICTED',['ARTIFACT_MISMATCH']);
    if (!saved.bytes.equals(canonicalize(input.originalBundle.canonicalResult))) return result('CONTRADICTED',['NATIVE_SAVED_RESULT_MISMATCH']);
  } else if (request.adapter==='trustless') {
    const actual=native.nativeBinding;
    if (!actual) return result('INSUFFICIENT_EVIDENCE',['TRUSTLESS_NATIVE_BINDING_UNAVAILABLE']);
    if (surface.claim.kind!=='TRUSTLESS_CHECK' || !equal(surface.claim.parameters,{profile:actual.profileId,case_id:actual.caseId,input_digest:actual.inputDigest})
      || surface.subject.kind!=='trustless-native-case' || surface.subject.id!==actual.caseId || surface.subject.artifact_digest!==actual.inputDigest) return result('CONTRADICTED',['TRUSTLESS_NATIVE_SURFACE_MISMATCH']);
    if (!equal(surface.scope,{case_id:actual.caseId,relation:'scan-subject-binding'})) return result('CONTRADICTED',['NATIVE_SCOPE_MISMATCH']);
  } else if (request.adapter==='interpoll') {
    if (surface.claim.kind!=='SIGNED_ACTION_TRACE' || !equal(surface.claim.parameters,{action:actionMaterial(input.signed_intent),outcome:request.adapter_requirement?.required_outcome??'EXECUTION_OBSERVED'})
      || surface.subject.kind!=='agent-action' || surface.subject.id!==input.signed_intent.id || surface.subject.artifact_digest!==digest(input)) return result('CONTRADICTED',['ACTION_NATIVE_SURFACE_MISMATCH']);
    if (!equal(surface.scope,{namespace:input.signed_intent.namespace,observation:'supplied-trace-only'})) return result('CONTRADICTED',['NATIVE_SCOPE_MISMATCH']);
  }
  return result('VERIFIED',[],{adapter:request.adapter,sourceCommit:adapters[request.adapter]?.sourceCommit});
}

export async function verifyV2(requestInput,bundleInput) {
  const layers=Object.fromEntries(LAYERS_V2.map(name=>[name,result('NOT_RUN')]));
  let request,bundle,admitted=false,supported=false;
  try {
    request=typeof requestInput==='string'||Buffer.isBuffer(requestInput)?parseStrict(requestInput):requestInput;
    bundle=typeof bundleInput==='string'||Buffer.isBuffer(bundleInput)?parseStrict(bundleInput):bundleInput;
    admitV2(request,bundle);admitted=true;layers.INPUT=result('ADMITTED');
    if (bundle.canonicalization_profile!=='receiptos.verify.canonical-json.v1') throw problem('CANONICALIZATION_PROFILE_UNSUPPORTED','Unsupported canonicalization profile.');
    layers.CANONICALIZATION=result('VERIFIED',[],{profile:bundle.canonicalization_profile,statement_digest:digest(bundle.statement)});
    const inspected=inspectEvidenceV2(bundle);
    layers.INTEGRITY=await verifyIntegrity(bundle.payload.crystal);
    layers.AUTHENTICITY=verifyAuthenticityV2(request,bundle);
    supported=request.verification_profile===PROFILE_V2 && bundle.statement.verification_profile===PROFILE_V2
      && Object.hasOwn(adapters,request.adapter) && (!request.semantic_profile || request.semantic_profile===semanticAbi.profileId);
    const native=await executeAdapter(request,bundle,inspected);
    layers.RECOMPUTATION=native;
    const binding=nativeBinding(request,bundle,inspected,native);
    const supportedBasis=['rvr','semantic-abi'].includes(request.adapter)?['artifact','native-result','adapter-input',...(inspected.git?['git-commit','git-tree']:[])]:['adapter-input'];
    const context={verification_time:request.policy.verification_time,established_assumptions:request.policy.established_assumptions,
      dependency_results:request.policy.dependency_results,evidence_basis:[...new Set([...inspected.entries.map(item=>item.role).filter(role=>supportedBasis.includes(role)),...(native.execution?.status==='COMPLETED'?['execution']:[])])]};
    const semantic=evaluateSemanticAbi({expected:requestSurface(request),observed:bundle.statement.surface,context});
    layers.SEMANTIC_COMPATIBILITY=semantic;
    const identityDimensions=['subject','artifact','commit','version'].map(name=>semantic.compatibility.dimensions[name]);
    const identityReasons=identityDimensions.flatMap(value=>value?.reasonCodes??[]);
    layers.SUBJECT_BINDING=identityReasons.length?result('CONTRADICTED',[...new Set(identityReasons)])
      :binding.status!=='VERIFIED'?binding:result('VERIFIED',[],{requested:request.subject,covered:bundle.statement.surface.subject});
    layers.EVIDENCE_SUFFICIENCY=evaluateEvidenceV2(inspected,request,native,binding);
    if ((native.semanticOutcome==='REFUTED'&&bundle.statement.asserted_result==='PASS') || (native.semanticOutcome==='VERIFIED'&&bundle.statement.asserted_result==='FAIL')) {
      layers.DOMAIN_ADAPTERS=result('CONTRADICTED',['ASSERTED_NATIVE_RESULT_CONTRADICTION']);
    } else layers.DOMAIN_ADAPTERS=request.adapter==='interpoll'?result(native.adapterProjection,native.reasonCodes,native.nativeResult,{limitations:native.limitations}):result('NOT_REQUESTED');
    if (request.requested_guarantees.length) {
      if (!equal(request.requested_guarantees,[{id:'native-result-and-dependencies-preserved'}])) layers.GUARANTEE_PRESERVATION=result('UNVERIFIABLE',['GUARANTEE_UNSUPPORTED']);
      else if (!bundle.payload.guarantees) layers.GUARANTEE_PRESERVATION=result('UNVERIFIABLE',['GUARANTEE_EVIDENCE_MISSING']);
      else {
        const guarantee=evaluatePrfV2(bundle.payload.guarantees,request.guarantee_requirement??{});
        layers.GUARANTEE_PRESERVATION={...guarantee,status:guarantee.guaranteeProjection.status};
      }
    } else layers.GUARANTEE_PRESERVATION=result('NOT_REQUESTED');
    layers.CONTINUITY=request.continuity_request?evaluateContinuity(bundle.payload.continuity,request.continuity_request):result('NOT_REQUESTED');
    layers.PROVENANCE=result('RECORDED',[],{sources:'provenance/sources.json',adapters:[crystal,adapters[request.adapter]??null,semanticAbi,...(request.requested_guarantees.length?[prf]:[])],
      boundary:'Pinned public computations and product relations; supplied execution observations do not establish external execution provenance.'});
  } catch (error) {layers.INPUT=result('REJECTED_MALFORMED',[error.code??'SCHEMA_MISMATCH'],{message:error.message});}
  const required=admitted?[...new Set([...REQUIRED_V2,...request.policy.required_layers,...(request.requested_guarantees.length?['GUARANTEE_PRESERVATION']:[]),...(request.continuity_request?['CONTINUITY']:[]),...(request.adapter==='interpoll'?['DOMAIN_ADAPTERS']:[])])]:[...REQUIRED_V2];
  const overall=projectV2(layers,required,supported);
  layers.PRODUCT_PROJECTION=overall;
  const explanation=layers.SUBJECT_BINDING.status==='CONTRADICTED'
    ?(layers.AUTHENTICITY.status==='VERIFIED'?'Authenticated':'Supplied')+' evidence for the covered subject does not establish the caller-selected subject, artifact or version. '+overall.reasonCodes.join(', ')
    :`${overall.status}: supplied evidence is evaluated only for the caller-selected claim surface. ${overall.reasonCodes.join(', ')}`;
  layers.EXPLAINABLE_REPORT=result('GENERATED',overall.reasonCodes,{explanation});
  return {schema:'receiptos.verify.report.v2',projection_version:'receiptos.verify.projection.v2',overall:overall.status,reason_codes:overall.reasonCodes,explanation,required_layers:required,layers,
    boundaries:['Integrity is not authenticity.','Signature is not semantic correctness or accepted authority.','Replay preserves negative outcomes.','Supplied observations are not external execution provenance.','Exact compatibility is not general scope entailment.']};
}
