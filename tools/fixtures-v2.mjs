import { createPrivateKey, sign } from 'node:crypto';
import { canonicalize, digest, sha256 } from '../src/core/common.mjs';
import { requestSurface } from '../src/core/claim-surface.mjs';
import { signingBytesV2 } from '../src/core/authenticity-v2.mjs';
import { baseline, publicKey } from './fixtures.mjs';
import { buildTrustlessEvidence, trustlessClaimBinding } from '../tests/helpers/trustless-v02-fixture.mjs';
import { makeInterpollFixture } from '../tests/helpers/interpoll-v02-fixture.mjs';
import { actionMaterial } from '../src/adapters/interpoll-v2.mjs';
// Public deterministic synthetic seed, never a deployed credential.
const key=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.alloc(32,1)]),format:'der',type:'pkcs8'});
export function resignV2(pair) {
  pair.bundle.statement.payload_digest=digest(pair.bundle.payload);
  pair.bundle.signature_base64=sign(null,signingBytesV2(pair.bundle.statement),key).toString('base64');
  return pair;
}
export function attachV2(pair,entries) {
  pair.bundle.statement.evidence_manifest=entries.map(({id,role,bytes})=>({id,role,digest:sha256(bytes),size:bytes.length}));
  pair.bundle.evidence=entries.map(({id,bytes})=>({id,bytes_base64:bytes.toString('base64')}));
  return resignV2(pair);
}
export function reattachAdapterV2(pair) {
  const entries=pair.bundle.statement.evidence_manifest.filter(item=>item.role!=='adapter-input').map(item=>({...item,bytes:Buffer.from(pair.bundle.evidence.find(entry=>entry.id===item.id).bytes_base64,'base64')}));
  entries.push({id:'adapter-input',role:'adapter-input',bytes:canonicalize(pair.bundle.payload.adapter)});
  return attachV2(pair,entries);
}
export async function baselineV2(options={}) {
  const old=await baseline(options);
  const request={schema:'receiptos.verify.request.v2',verification_profile:'receiptos.verify.generic.v2',adapter:'rvr',
    claim:{id:'synthetic:artifact-predicate',kind:'SHA256_EQUALS',parameters:{expected_digest:old.request.claim.expected_digest}},
    subject:old.request.subject,scope:{evidence_member:'artifact'},authority:{id:'synthetic-demo',class:'INDEPENDENT_RECOMPUTATION'},
    policy:{...old.request.policy,id:'local-generic',version:'2',established_assumptions:[],dependency_results:[],accepted_authorities:[{id:'synthetic-demo',class:'INDEPENDENT_RECOMPUTATION'}]},
    version:'2',time:{not_before:0,not_after:100},assumptions:[],dependencies:[],evidence_requirements:['artifact','adapter-input','execution'],evidence:[],requested_guarantees:[]};
  const bundle={schema:'receiptos.verify.bundle.v2',canonicalization_profile:'receiptos.verify.canonical-json.v1',statement:{schema:'receiptos.verify.statement.v2',verification_profile:request.verification_profile,adapter:request.adapter,surface:structuredClone(requestSurface(request)),
    asserted_result:options.negative?'FAIL':'PASS',evidence_manifest:[],payload_digest:'0'.repeat(64),crypto:{provider:'ed25519',key_id:'synthetic-demo'}},signature_base64:'',evidence:[],
    payload:{crystal:old.bundle.payload.crystal,adapter:old.bundle.payload.rvr,guarantees:null,continuity:null}};
  const entries=old.bundle.statement.evidence_manifest.map(item=>({...item,bytes:Buffer.from(old.bundle.evidence.find(entry=>entry.id===item.id).bytes_base64,'base64')}));
  entries.push({id:'adapter-input',role:'adapter-input',bytes:canonicalize(bundle.payload.adapter)});
  return attachV2({request,bundle},entries);
}
export async function trustlessV2(options={}) {
  const pair=await baselineV2();
  const evidence=await buildTrustlessEvidence(options), binding=trustlessClaimBinding(evidence);
  pair.request.adapter='trustless';pair.bundle.statement.adapter='trustless';
  pair.request.claim={id:'synthetic:trustless-scan',kind:'TRUSTLESS_CHECK',parameters:binding};
  pair.request.subject={kind:'trustless-native-case',id:evidence.case_id,artifact_digest:binding.input_digest,version:'1'};
  pair.request.scope={case_id:evidence.case_id,relation:'scan-subject-binding'};
  pair.request.evidence_requirements=['adapter-input','execution'];
  pair.bundle.statement.surface=structuredClone(requestSurface(pair.request));
  pair.bundle.statement.asserted_result=options.negative?'FAIL':'PASS';
  pair.bundle.payload.adapter=evidence;
  return attachV2(pair,[{id:'adapter-input',role:'adapter-input',bytes:canonicalize(evidence)}]);
}
export async function interpollV2() {
  const pair=await baselineV2(), fixture=makeInterpollFixture();
  pair.request.adapter='interpoll';pair.bundle.statement.adapter='interpoll';
  pair.request.adapter_requirement=fixture.context;
  pair.request.claim={id:'synthetic:agent-action',kind:'SIGNED_ACTION_TRACE',parameters:{action:actionMaterial(fixture.input.signed_intent),outcome:'EXECUTION_OBSERVED'}};
  pair.request.subject={kind:'agent-action',id:fixture.input.signed_intent.id,artifact_digest:digest(fixture.input),version:'1'};
  pair.request.scope={namespace:fixture.input.signed_intent.namespace,observation:'supplied-trace-only'};
  pair.request.evidence_requirements=['adapter-input','execution'];
  pair.bundle.statement.surface=structuredClone(requestSurface(pair.request));pair.bundle.payload.adapter=fixture.input;
  return attachV2(pair,[{id:'adapter-input',role:'adapter-input',bytes:canonicalize(fixture.input)}]);
}
export const fixturePublicKey=publicKey;
