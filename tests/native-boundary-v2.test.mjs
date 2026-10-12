import test from 'node:test';
import assert from 'node:assert/strict';
import { verify } from '../src/core/verify.mjs';
import { baselineV2,resignV2,attachV2 } from '../tools/fixtures-v2.mjs';
test('signed unknown predicate parameters do not expand native digest semantics',async()=>{
  const p=await baselineV2();const positive=await verify(p.request,p.bundle);assert.equal(positive.overall,'VERIFIED');
  p.request.claim.parameters.extra_guarantee='provider-authentication';p.bundle.statement.surface.claim.parameters.extra_guarantee='provider-authentication';resignV2(p);
  const r=await verify(p.request,p.bundle);assert.equal(r.overall,'CONTRADICTED');assert.ok(r.reason_codes.includes('NATIVE_CLAIM_SURFACE_MISMATCH'));
  assert.deepEqual(r.layers.RECOMPUTATION.nativeResult,positive.layers.RECOMPUTATION.nativeResult);
});
test('arbitrary producer attachment labels cannot invent an accepted evidence basis',async()=>{
  const p=await baselineV2();p.request.evidence_requirements.push('provider-authentication');p.bundle.statement.surface.evidence_requirements.push('provider-authentication');
  const entries=p.bundle.statement.evidence_manifest.map(e=>({...e,bytes:Buffer.from(p.bundle.evidence.find(x=>x.id===e.id).bytes_base64,'base64')}));
  entries.push({id:'untrusted-label',role:'provider-authentication',bytes:Buffer.from('producer assertion')});attachV2(p,entries);
  const r=await verify(p.request,p.bundle);assert.equal(r.overall,'INSUFFICIENT_EVIDENCE');assert.ok(r.reason_codes.includes('EVIDENCE_BASIS_UNESTABLISHED'));
});
test('version dispatch never executes an object API schema getter',async()=>{
  let ran=false;const input={};Object.defineProperty(input,'schema',{enumerable:true,get(){ran=true;throw new Error('must not execute');}});
  const r=await verify(input,{});assert.equal(r.overall,'REJECTED_MALFORMED');assert.equal(ran,false);
});
