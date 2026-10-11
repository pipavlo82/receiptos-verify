import test from 'node:test';
import assert from 'node:assert/strict';
import { baselineV2, resignV2 } from '../tools/fixtures-v2.mjs';
import { verifyV2 } from '../src/core/verify-v2.mjs';
import { makePrfFixture } from './helpers/prf-v02-fixture.mjs';

const supported = { id: 'native-result-and-dependencies-preserved' };
const baseline = baselineV2();
async function fixture() {
  const pair = structuredClone(await baseline), prf = makePrfFixture();
  pair.request.requested_guarantees = [structuredClone(supported)];
  pair.request.guarantee_requirement = prf.context;
  pair.bundle.payload.guarantees = prf.input;
  return resignV2(pair);
}

test('v2 exact supported guarantee declaration preserves the separately selected relation', async () => {
  const pair = await fixture(), report = await verifyV2(pair.request, pair.bundle);
  assert.equal(report.overall, 'VERIFIED');
  assert.equal(report.layers.GUARANTEE_PRESERVATION.status, 'PRESERVED');
  assert.ok(report.layers.GUARANTEE_PRESERVATION.reasonCodes.includes('PRF_NATIVE_RESULT_AND_DEPENDENCIES_PRESERVED'));
  assert.deepEqual(report.layers.GUARANTEE_PRESERVATION.nativeResult.recomputed, {
    outcome: 'PRESERVED', reason: 'award_bound_to_actual_settlement',
  });
});

for (const [name, declaration] of [
  ['original independent probe declaration', { ...supported, version: 'unknown-99', parameters: { preserve: 'whole-application-behavior' } }],
  ['unknown guarantee version', { ...supported, version: 'unknown-99' }],
  ['additional semantic parameters', { ...supported, parameters: { preserve: 'whole-application-behavior' } }],
  ['additional scope', { ...supported, scope: { relation: 'all-downstream-programs' } }],
  ['additional authority requirement', { ...supported, authority: { id: 'unestablished-external-authority' } }],
  ['false-valued additional field', { ...supported, permit_unknown_dependencies: false }],
  ['null-valued additional field', { ...supported, version: null }],
  ['unknown guarantee identity', { id: 'universal-guarantee-preservation' }],
]) {
  test(`v2 refuses ${name} instead of silently ignoring caller conditions`, async () => {
    const pair = await fixture();
    // The exact same authenticated native evidence stays valid. Only the
    // independently selected downstream guarantee declaration changes.
    pair.request.requested_guarantees = [structuredClone(declaration)];
    const report = await verifyV2(pair.request, pair.bundle);
    assert.equal(report.layers.INPUT.status, 'ADMITTED');
    assert.equal(report.layers.INTEGRITY.status, 'VERIFIED');
    assert.equal(report.layers.AUTHENTICITY.status, 'VERIFIED');
    assert.equal(report.layers.RECOMPUTATION.status, 'REPRODUCED');
    assert.equal(report.layers.GUARANTEE_PRESERVATION.status, 'UNVERIFIABLE');
    assert.deepEqual(report.layers.GUARANTEE_PRESERVATION.reasonCodes, ['GUARANTEE_UNSUPPORTED']);
    assert.equal(report.layers.GUARANTEE_PRESERVATION.nativeResult, null);
    assert.equal(report.overall, 'INSUFFICIENT_EVIDENCE');
    assert.ok(report.reason_codes.includes('GUARANTEE_UNSUPPORTED'));
  });
}

test('v2 multiple guarantee obligations cannot be reduced to one supported guarantee', async () => {
  const pair = await fixture();
  pair.request.requested_guarantees.push({ id: 'whole-application-behavior' });
  const report = await verifyV2(pair.request, pair.bundle);
  assert.equal(report.layers.GUARANTEE_PRESERVATION.status, 'UNVERIFIABLE');
  assert.deepEqual(report.layers.GUARANTEE_PRESERVATION.reasonCodes, ['GUARANTEE_UNSUPPORTED']);
  assert.equal(report.overall, 'INSUFFICIENT_EVIDENCE');
});

test('v2 an unrequested guarantee does not manufacture a preservation claim', async () => {
  const pair = await fixture();
  pair.request.requested_guarantees = [];
  const report = await verifyV2(pair.request, pair.bundle);
  assert.equal(report.overall, 'VERIFIED');
  assert.equal(report.layers.GUARANTEE_PRESERVATION.status, 'NOT_REQUESTED');
  assert.equal(report.layers.GUARANTEE_PRESERVATION.nativeResult, null);
});
