import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { baselineV2, resignV2 } from '../tools/fixtures-v2.mjs';
import { verifyV2 } from '../src/core/verify-v2.mjs';
import { digest } from '../src/core/common.mjs';
import { makePrfFixture } from './helpers/prf-v02-fixture.mjs';

const baseline = baselineV2();
async function fixture() {
  const pair = structuredClone(await baseline), prf = makePrfFixture();
  pair.request.requested_guarantees = [{ id: 'native-result-and-dependencies-preserved' }];
  pair.request.guarantee_requirement = prf.context;
  pair.bundle.payload.guarantees = prf.input;
  return pair;
}
function selectTuple(pair) {
  const upstream = pair.bundle.payload.guarantees.upstream;
  pair.request.guarantee_requirement.required_relation_input_digest = digest({ award: upstream.award, settlements: upstream.settlements });
}
async function verify(pair) {
  const report = await verifyV2(pair.request, resignV2(pair).bundle);
  // The independent surrounding digest predicate stays positive throughout.
  assert.equal(report.layers.INTEGRITY.status, 'VERIFIED');
  assert.equal(report.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(report.layers.SUBJECT_BINDING.status, 'VERIFIED');
  assert.equal(report.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(report.layers.RECOMPUTATION.semanticOutcome, 'VERIFIED');
  return report;
}

test('v2 composed positive native PRF tuple and transfer permit overall verification', async () => {
  const report = await verify(await fixture()), prf = report.layers.GUARANTEE_PRESERVATION;
  assert.equal(prf.status, 'PRESERVED');
  assert.deepEqual(prf.nativeResult.recomputed, { outcome: 'PRESERVED', reason: 'award_bound_to_actual_settlement' });
  assert.equal(prf.productProjection.status, 'VERIFIED');
  assert.equal(report.overall, 'VERIFIED');
});

test('v2 composed faithfully transferred PRF negative remains globally negative', async () => {
  const pair = await fixture(), input = pair.bundle.payload.guarantees;
  input.upstream.settlements[0].amount = 100;
  const negative = { outcome: 'VIOLATED', reason: 'amount_mismatch' };
  input.upstream.native_result = structuredClone(negative);
  input.downstream.native_result = structuredClone(negative);
  pair.request.guarantee_requirement.required_native_result = structuredClone(negative);
  selectTuple(pair);
  const report = await verify(pair), prf = report.layers.GUARANTEE_PRESERVATION;
  assert.equal(prf.recomputation.status, 'REPRODUCED');
  assert.deepEqual(prf.nativeResult.recomputed, negative);
  assert.deepEqual(prf.nativeResult.downstream, negative);
  assert.equal(prf.status, 'PRESERVED');
  assert.equal(prf.productProjection.status, 'CONTRADICTED');
  assert.equal(report.overall, 'CONTRADICTED');
  assert.ok(report.reason_codes.includes('PRF_REPRODUCED_NEGATIVE_TRANSFER_PRESERVED'));
});

test('v2 composed unsupported PRF profile retains unsupported classification', async () => {
  const pair = await fixture(); pair.bundle.payload.guarantees.profile = 'award-actual-settlement-v99';
  const report = await verify(pair), prf = report.layers.GUARANTEE_PRESERVATION;
  assert.equal(prf.status, 'UNVERIFIABLE');
  assert.equal(prf.productProjection.status, 'UNSUPPORTED_PROFILE');
  assert.equal(report.overall, 'UNSUPPORTED_PROFILE');
  assert.ok(report.reason_codes.includes('PRF_PROFILE_UNSUPPORTED'));
});

test('v2 composed malformed native PRF declaration retains malformed classification', async () => {
  const pair = await fixture(); pair.bundle.payload.guarantees.upstream.native_result.outcome = 'PASS';
  const report = await verify(pair), prf = report.layers.GUARANTEE_PRESERVATION;
  assert.equal(prf.status, 'UNVERIFIABLE');
  assert.equal(prf.productProjection.status, 'REJECTED_MALFORMED');
  assert.equal(report.overall, 'REJECTED_MALFORMED');
  assert.ok(report.reason_codes.includes('PRF_INPUT_MALFORMED'));
});

test('v2 composed reproduced PRF unknown premises remain insufficient', async () => {
  const pair = await fixture(), input = pair.bundle.payload.guarantees;
  input.upstream.settlements = [];
  const unknown = { outcome: 'UNVERIFIABLE', reason: 'missing_settlement' };
  input.upstream.native_result = structuredClone(unknown);
  input.downstream.native_result = structuredClone(unknown);
  pair.request.guarantee_requirement.required_native_result = structuredClone(unknown);
  selectTuple(pair);
  const report = await verify(pair), prf = report.layers.GUARANTEE_PRESERVATION;
  assert.equal(prf.recomputation.status, 'REPRODUCED');
  assert.deepEqual(prf.nativeResult.recomputed, unknown);
  assert.equal(prf.status, 'UNVERIFIABLE');
  assert.equal(prf.productProjection.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(report.overall, 'INSUFFICIENT_EVIDENCE');
});

for (const [name, code, expectedReason, expectedExit] of [
  ['crashed checker', 'raise RuntimeError("controlled PRF composition crash")', 'PRF_NATIVE_EXECUTION_UNAVAILABLE', 1],
  ['malformed native output', 'print("{\\\"unexpected\\\":true}")', 'PRF_NATIVE_OUTPUT_MALFORMED', 0],
]) test(`v2 composed PRF ${name} is unavailable computation rather than semantic refutation`, { concurrency: false }, async () => {
  const pair = await fixture(), original = childProcess.spawnSync;
  // Replace only the PRF bridge child with an actually executed failing or
  // invalid-output Python program. Upstream bytes and all other runners stay
  // intact; the fault is explicitly injected, never counted as a native result.
  childProcess.spawnSync = (executable, args, options) => executable === 'python' && args.includes('-c') && args.some(arg => typeof arg === 'string' && arg.includes('pinned_prf_award'))
    ? original(executable, ['-I', '-B', '-X', 'utf8', '-c', code], options) : original(executable, args, options);
  syncBuiltinESMExports();
  try {
    const report = await verify(pair), prf = report.layers.GUARANTEE_PRESERVATION;
    assert.equal(prf.execution.exitCode, expectedExit);
    assert.equal(prf.recomputation.status, 'CANNOT_RECOMPUTE');
    assert.equal(prf.nativeResult.recomputed, null);
    assert.equal(prf.status, 'UNVERIFIABLE');
    assert.equal(prf.productProjection.status, 'CANNOT_RECOMPUTE');
    assert.equal(report.overall, 'CANNOT_RECOMPUTE');
    assert.ok(report.reason_codes.includes(expectedReason));
  } finally {
    childProcess.spawnSync = original;
    syncBuiltinESMExports();
  }
});
