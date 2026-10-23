import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyAgentAction,replayLocalAction,REPLAY} from '../lib/profile.mjs';
const cases=JSON.parse(readFileSync(new URL('../fixtures/actions.json',import.meta.url)));
const positive=cases.find(c=>c.case_id==='A');
const request=JSON.stringify(positive.caller),pkg=JSON.stringify(positive.package);
const malformed=[
 ['duplicate field',pkg.replace('"schema":','"schema":"duplicate","schema":')],
 ['unsafe integer',pkg.replace('"review_markers":1','"review_markers":9007199254740993')],
 ['negative zero',pkg.replace('"review_markers":1','"review_markers":-0')],
 ['float syntax',pkg.replace('"review_markers":1','"review_markers":1.0')],
 ['nonfinite',pkg.replace('"review_markers":1','"review_markers":1e309')],
 ['invalid UTF-8',Buffer.from([0xff,0xfe])],
 ['unpaired surrogate',pkg.replace('laboratory-review-agent','\\ud800')],
 ['non-ASCII key',pkg.replace('"observed_result":','"\u00e9":')],
];
for(const [name,bytes]of malformed)test('strict raw admission: '+name,async()=>{
 const r=await verifyAgentAction(request,bytes);assert.equal(r.status,'UNVERIFIABLE');assert.equal(r.local_recomputation.status,'NOT_CHECKED');
});
test('top-level receipt_root is not silently interpreted under either upstream convention',async()=>{
 const p=structuredClone(positive.package);p.receipt.receipt_root=p.receipt.anchor.receipt_root;
 const r=await verifyAgentAction(positive.caller,p);assert.equal(r.status,'UNVERIFIABLE');
});
test('unknown optional anchor semantics are not adopted by this profile',async()=>{
 const p=structuredClone(positive.package);p.receipt.anchor.providerAuthentication='VERIFIED';
 assert.equal((await verifyAgentAction(positive.caller,p)).status,'UNVERIFIABLE');
});
test('no production action executor is exposed by local transition',()=>{
 assert.throws(()=>replayLocalAction({schema:REPLAY,item_id:'synthetic-post-a',review_markers:0},{...positive.caller.action,kind:'transfer'}));
});
test('bounded local transition refuses overflow and altered target',()=>{
 assert.throws(()=>replayLocalAction({schema:REPLAY,item_id:'synthetic-post-a',review_markers:1000000},positive.caller.action));
 assert.throws(()=>replayLocalAction({schema:REPLAY,item_id:'another',review_markers:0},positive.caller.action));
});
test('positive native outcomes are preserved without upgrading permission or public authenticity',async()=>{
 const r=await verifyAgentAction(positive.caller,positive.package);assert.equal(r.status,'VERIFIED');
 assert.equal(r.native_host_result.overall,'VERIFIED');assert.equal(r.local_recomputation.status,'REPRODUCED');
 for(const key of ['external_execution','public_log_authenticity','execution_permission'])assert.equal(r[key],'NOT_COVERED');
 assert.equal(r.log_inclusion.claim_authorization,'NOT_COVERED');
 assert.deepEqual(r.native_host_result.layers.RECOMPUTATION.nativeResult,positive.package.receipt.native_verifier_result);
});

for(const id of ['unsupported-caller-schema','unsupported-package-schema','requires-log-string','authority-premise-mismatch'])
test('review witness preserves the committed receipt and exact refusal: '+id,async()=>{
 const c=cases.find(c=>c.case_id===id);assert.ok(c,'required review witness is present');
 assert.deepEqual(c.package.receipt,positive.package.receipt);
 const r=await verifyAgentAction(c.caller,c.package);
 assert.deepEqual({status:r.status,reason:r.reason},c.expected);
 if(id==='authority-premise-mismatch'){
  assert.equal(r.receipt_identity.status,'VERIFIED');
  assert.equal(r.native_host_result.schema,'receiptos.verify.report.v2');
  assert.equal(r.native_host_result.overall,'REJECTED_MALFORMED');
  assert.equal(r.native_host_result.layers.INPUT.status,'REJECTED_MALFORMED');
 }
});
