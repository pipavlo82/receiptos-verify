import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectAdapters,adapters } from '../src/adapters/index.mjs';
import { inspectAdaptersV2,adaptersV2 } from '../src/adapters/index-v2.mjs';
test('v1 registry remains twelve surfaces; versioned generic pipeline declares eight including one interface',()=>{
  assert.equal(inspectAdapters().length,12);assert.equal(adapters.length,12);
  const current=inspectAdaptersV2();assert.equal(current.length,8);assert.equal(new Set(current.map(x=>x.profileId)).size,8);
  assert.equal(current.filter(x=>x.maturity==='INTERFACE_ONLY').length,1);
  for(const entry of current){assert.match(entry.sourceCommit,/^[0-9a-f]{40}$/);assert.ok(entry.requiredEvidence.length);assert.ok(entry.nativeVocabulary);}
  for(const adapter of adaptersV2){assert.equal(typeof adapter.provenance,'function');assert.equal(adapter.provenance().sourceCommit,adapter.descriptor.sourceCommit);}
});
test('unimplemented adapter operation reports explicit unsupported rather than canned success',()=>{
  for(const adapter of adaptersV2)assert.equal(adapter.bind_subject().status,'UNSUPPORTED');
});
