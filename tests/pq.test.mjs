import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoProviders, descriptor } from '../src/adapters/pq.mjs';

// This callback is a synthetic provider-contract control, not real ML-DSA or
// cryptographic evidence. Its invocation counter proves premise admission.
function fixture(kind = 'REAL_CRYPTO', native = {valid:true,synthetic:true}) {
  let calls = 0;
  const providers = new CryptoProviders().register('synthetic-contract-control', {kind,verify:async()=>{calls++;return native;}});
  const input = {provider:'synthetic-contract-control',key_id:'synthetic:K',authority:{key_id:'synthetic:K',valid_after:0,valid_until:10,revoked:false}};
  return {providers,input,calls:()=>calls};
}
async function rejectsBeforeProvider(edit, now = 5) {
  const f = fixture(), positive = structuredClone(f.input); edit(f.input);
  const r = await f.providers.verify(f.input,now);
  assert.equal(r.status,'UNVERIFIABLE'); assert.ok(r.reasonCodes.includes('TEMPORAL_KEY_AUTHORITY_NOT_ESTABLISHED'));
  assert.equal(f.calls(),0,'missing or malformed premise must not invoke the provider');
  const control = await f.providers.verify(positive,5);
  assert.equal(control.status,'VERIFIED'); assert.equal(f.calls(),1,'paired valid premise must reach the callback');
}

test('complete explicit authority admits only the half-open interval',async()=>{
  const f=fixture();
  assert.equal((await f.providers.verify(f.input,0)).status,'VERIFIED');
  assert.equal((await f.providers.verify(f.input,9)).status,'VERIFIED');
  assert.equal((await f.providers.verify(f.input,10)).status,'UNVERIFIABLE');
  assert.equal(f.calls(),2);
  assert.equal(descriptor.maturity,'EXPERIMENTAL');
});

for(const key of ['valid_after','valid_until']) {
  test(`missing ${key} is not an open-ended authority interval`,async()=>rejectsBeforeProvider(input=>{delete input.authority[key];}));
  for(const value of [null,'0',false,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,-1]) {
    test(`malformed ${key} ${typeof value}:${String(value)} rejects before crypto`,async()=>rejectsBeforeProvider(input=>{input.authority[key]=value;}));
  }
}
test('equal endpoints are not an established authority interval',async()=>rejectsBeforeProvider(input=>{input.authority.valid_after=5;input.authority.valid_until=5;}));
test('inverted endpoints are not an established authority interval',async()=>rejectsBeforeProvider(input=>{input.authority.valid_after=10;input.authority.valid_until=0;}));

test('absent explicit revocation state is unknown',async()=>rejectsBeforeProvider(input=>{delete input.authority.revoked;}));
for(const value of [null,0,'false',{},[],true]) test(`revocation ${typeof value}:${String(value)} is not explicit unrevoked authority`,async()=>rejectsBeforeProvider(input=>{input.authority.revoked=value;}));

for(const [name,edit] of [
  ['both key identities missing',input=>{delete input.key_id;delete input.authority.key_id;}],
  ['both key identities empty',input=>{input.key_id='';input.authority.key_id='';}],
  ['both key identities non-string',input=>{input.key_id=1;input.authority.key_id=1;}],
  ['different key identities',input=>{input.authority.key_id='synthetic:other';}],
]) test(`${name} cannot satisfy exact key authority`,async()=>rejectsBeforeProvider(edit));

for(const now of [-1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'5',5.5]) test(`invalid verification time ${typeof now}:${String(now)} rejects before crypto`,async()=>rejectsBeforeProvider(()=>{},now));

for(const kind of ['MOCK','STRUCTURAL']) test(`${kind} remains unestablished after a complete temporal gate`,async()=>{
  const f=fixture(kind),r=await f.providers.verify(f.input,5);
  assert.equal(f.calls(),1);assert.equal(r.status,'UNVERIFIABLE');assert.ok(r.reasonCodes.includes('MOCK_OR_STRUCTURAL_NOT_CRYPTOGRAPHIC_VERIFICATION'));
});
test('a real-provider contract negative remains negative after temporal admission',async()=>{
  const f=fixture('REAL_CRYPTO',{valid:false,synthetic:true}),r=await f.providers.verify(f.input,5);
  assert.equal(f.calls(),1);assert.equal(r.status,'CONTRADICTED');assert.equal(r.nativeResult.valid,false);
  assert.match(r.limitations.join(' '),/not complete upstream/);
});
