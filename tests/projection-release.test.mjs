import test from 'node:test';
import assert from 'node:assert/strict';
import { verify } from '../src/core/verify.mjs';
import { project } from '../src/projection/project.mjs';
import { fresh, signBundle } from './helpers/independent-fixture.mjs';

// Independently authored real native inputs; no product fixture/build/signing,
// canonicalization or digest helpers supply this regression's expected result.
test('authenticated definite FAIL contradicts a positive native replay without erasing either result', async () => {
  const pair = fresh();
  const positive = await verify(pair.request, pair.bundle);
  assert.equal(positive.overall, 'VERIFIED', 'paired complete native positive');
  pair.bundle.statement.asserted_result = 'FAIL';
  signBundle(pair.bundle);
  const report = await verify(pair.request, pair.bundle);
  assert.equal(report.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(report.layers.SUBJECT_BINDING.status, 'VERIFIED');
  assert.equal(report.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(report.layers.RECOMPUTATION.semanticOutcome, 'VERIFIED');
  assert.deepEqual(report.layers.RECOMPUTATION.nativeResult, positive.layers.RECOMPUTATION.nativeResult);
  assert.equal(report.overall, 'CONTRADICTED');
  assert.ok(report.reason_codes.includes('ASSERTED_NATIVE_RESULT_CONTRADICTION'));
});

test('independent recomputation may resolve producer CANNOT_CHECK uncertainty', async () => {
  const pair = fresh();
  pair.bundle.statement.asserted_result = 'CANNOT_CHECK';
  signBundle(pair.bundle);
  const report = await verify(pair.request, pair.bundle);
  assert.equal(report.overall, 'VERIFIED');
  assert.equal(report.layers.RECOMPUTATION.semanticOutcome, 'VERIFIED');
  assert.ok(!report.reason_codes.includes('ASSERTED_NATIVE_RESULT_CONTRADICTION'));
});

test('independent native REFUTED replay remains negative', async () => {
  const pair = fresh('negative', 'Negative control\n', 'negative artifact\n', '0'.repeat(64));
  const report = await verify(pair.request, pair.bundle);
  assert.equal(report.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(report.layers.RECOMPUTATION.semanticOutcome, 'REFUTED');
  assert.equal(report.overall, 'CONTRADICTED');
});

const required = ['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'];
function completeLayers() {
  return Object.fromEntries(Object.entries({INPUT:'ADMITTED',CANONICALIZATION:'VERIFIED',INTEGRITY:'VERIFIED',AUTHENTICITY:'VERIFIED',SUBJECT_BINDING:'VERIFIED',RECOMPUTATION:'REPRODUCED',EVIDENCE_SUFFICIENCY:'SUFFICIENT',SEMANTIC_COMPATIBILITY:'COMPATIBLE'})
    .map(([name,status])=>[name,{status,reasonCodes:[],nativeResult:null,...(name==='RECOMPUTATION'?{semanticOutcome:'VERIFIED'}:{})}]));
}
test('projection admits a complete exact positive', () => assert.equal(project(completeLayers(),required,true).status,'VERIFIED'));

for(const semanticOutcome of ['UNVERIFIABLE',null,'PASS',true,1]) test(`replay identity cannot substitute for native semantic result ${JSON.stringify(semanticOutcome)}`, () => {
  const layers=completeLayers();layers.RECOMPUTATION.semanticOutcome=semanticOutcome;
  assert.equal(project(layers,required,true).status,'INSUFFICIENT_EVIDENCE');
});
for(const [name,mutate] of [
  ['null layers',()=>({layers:null,required})],
  ['null required',layers=>({layers,required:null})],
  ['string false support',layers=>({layers,required,supported:'false'})],
  ['object reason codes',layers=>{layers.AUTHENTICITY.reasonCodes={invalid:true};return {layers,required};}],
]) test(`projection rejects malformed internal input: ${name}`, () => {
  const input=mutate(completeLayers());
  assert.equal(project(input.layers,input.required,input.supported??true).status,'REJECTED_MALFORMED');
});
test('projection cannot remove implicit mandatory subject and evidence obligations', () => {
  const layers={INPUT:{status:'ADMITTED',reasonCodes:[]},CANONICALIZATION:{status:'VERIFIED',reasonCodes:[]},INTEGRITY:{status:'VERIFIED',reasonCodes:[]}};
  assert.equal(project(layers,['INTEGRITY']).status,'INSUFFICIENT_EVIDENCE');
});
for(const name of ['INPUT','CANONICALIZATION']) test(`projection requires successful ${name} admission`, () => {
  const layers=completeLayers();delete layers[name];
  assert.equal(project(layers,required).status,'INSUFFICIENT_EVIDENCE');
});
test('projection preserves the exact explicit contradiction reason', () => {
  const layers=completeLayers();layers.RECOMPUTATION.reasonCodes=['ASSERTED_NATIVE_RESULT_CONTRADICTION'];
  const report=project(layers,required);
  assert.equal(report.status,'CONTRADICTED');
  assert.ok(report.reasonCodes.includes('ASSERTED_NATIVE_RESULT_CONTRADICTION'));
});
