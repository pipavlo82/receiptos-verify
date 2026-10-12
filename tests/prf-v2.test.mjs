import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { evaluatePrfV2 } from '../src/adapters/prf-v2.mjs';
import { makePrfFixture as fixture } from './helpers/prf-v02-fixture.mjs';
import { digest } from '../src/core/common.mjs';
const selectTuple = f => { f.context.required_relation_input_digest = digest({ award: f.input.upstream.award, settlements: f.input.upstream.settlements }); };
function check(f, status, guaranteeStatus, reason) {
  const actual = evaluatePrfV2(f.input, f.context);
  assert.equal(actual.status, status, JSON.stringify(actual));
  assert.equal(actual.guaranteeProjection.status, guaranteeStatus);
  assert.ok(actual.reasonCodes.includes(reason));
  return actual;
}
test('PRF executes exact merged main native award relation', () => {
  const actual = check(fixture(), 'VERIFIED', 'PRESERVED', 'PRF_NATIVE_RESULT_AND_DEPENDENCIES_PRESERVED');
  assert.equal(actual.execution.status, 'COMPLETED');
  assert.equal(actual.execution.exitCode, 0);
  assert.equal(actual.recomputation.status, 'REPRODUCED');
  assert.deepEqual(actual.nativeResult.recomputed, { outcome: 'PRESERVED', reason: 'award_bound_to_actual_settlement' });
});
test('PRF changed actual payment diverges from producer positive native result', () => {
  const f = fixture(); f.input.upstream.settlements[0].amount = 100;
  selectTuple(f);
  const actual = check(f, 'CONTRADICTED', 'UNVERIFIABLE', 'PRF_NATIVE_RESULT_DIVERGED');
  assert.equal(actual.nativeResult.recomputed.outcome, 'VIOLATED');
  assert.equal(actual.recomputation.status, 'DIVERGED');
});
test('PRF reproduced native negative can preserve transfer without becoming positive', () => {
  const f = fixture(); f.input.upstream.settlements[0].amount = 100;
  const negative = { outcome: 'VIOLATED', reason: 'amount_mismatch' };
  f.input.upstream.native_result = negative; f.input.downstream.native_result = structuredClone(negative); f.context.required_native_result = structuredClone(negative);
  selectTuple(f);
  const actual = check(f, 'CONTRADICTED', 'PRESERVED', 'PRF_REPRODUCED_NEGATIVE_TRANSFER_PRESERVED');
  assert.equal(actual.recomputation.status, 'REPRODUCED');
  assert.equal(actual.nativeResult.upstream.outcome, 'VIOLATED');
  assert.equal(actual.nativeResult.transfer.outcome, 'PRESERVED');
});
test('PRF changed downstream native relation is violated despite positive upstream', () => {
  const f = fixture(); f.input.downstream.native_result = { outcome: 'VIOLATED', reason: 'amount_mismatch' };
  check(f, 'CONTRADICTED', 'VIOLATED', 'PRF_DOWNSTREAM_NATIVE_RESULT_CHANGED');
});
test('PRF downstream cannot drop a caller required dependency', () => {
  const f = fixture(); f.input.downstream.dependencies.pop();
  check(f, 'CONTRADICTED', 'VIOLATED', 'PRF_GUARANTEE_DEPENDENCY_CHANGED');
});
test('PRF downstream cannot substitute a dependency version', () => {
  const f = fixture(); f.input.downstream.dependencies[1].version = '2';
  check(f, 'CONTRADICTED', 'VIOLATED', 'PRF_GUARANTEE_DEPENDENCY_CHANGED');
});
test('PRF missing separately selected acceptance basis is unverifiable', () => {
  const f = fixture(); delete f.context.accepted_basis;
  check(f, 'INSUFFICIENT_EVIDENCE', 'UNVERIFIABLE', 'PRF_ACCEPTED_DEPENDENCY_BASIS_REQUIRED');
});
test('PRF empty dependency basis is not preservation evidence', () => {
  const f = fixture(); f.context.accepted_basis.dependencies = [];
  check(f, 'INSUFFICIENT_EVIDENCE', 'UNVERIFIABLE', 'PRF_ACCEPTED_DEPENDENCY_BASIS_REQUIRED');
});
test('PRF unknown native premises are not promoted by process exit zero', () => {
  const f = fixture(); f.input.upstream.settlements = [];
  const unknown = { outcome: 'UNVERIFIABLE', reason: 'missing_settlement' };
  f.input.upstream.native_result = unknown; f.input.downstream.native_result = structuredClone(unknown); f.context.required_native_result = structuredClone(unknown);
  selectTuple(f);
  const actual = check(f, 'INSUFFICIENT_EVIDENCE', 'UNVERIFIABLE', 'PRF_NATIVE_RELATION_UNESTABLISHED');
  assert.equal(actual.execution.exitCode, 0);
  assert.equal(actual.recomputation.status, 'REPRODUCED');
});
test('PRF native result retained rather than inferred from expected fixture field', () => {
  const f = fixture(); f.input.upstream.award.expected_outcome = 'PRESERVED';
  selectTuple(f);
  const actual = check(f, 'CONTRADICTED', 'UNVERIFIABLE', 'PRF_NATIVE_RESULT_DIVERGED');
  assert.deepEqual(actual.nativeResult.recomputed, { outcome: 'UNVERIFIABLE', reason: 'invalid_award' });
});
test('PRF changed caller selected native expectation cannot self-grade', () => {
  const f = fixture(); f.context.required_native_result = { outcome: 'VIOLATED', reason: 'amount_mismatch' };
  check(f, 'CONTRADICTED', 'VIOLATED', 'PRF_CALLER_NATIVE_EXPECTATION_MISMATCH');
});
test('PRF unknown profile and guarantee versions remain unsupported', () => {
  const f = fixture(); f.input.profile = 'award-actual-settlement-v99';
  check(f, 'UNSUPPORTED_PROFILE', 'UNVERIFIABLE', 'PRF_PROFILE_UNSUPPORTED');
  const g = fixture(); g.context.required_guarantee = 'universal-economic-truth';
  check(g, 'UNSUPPORTED_PROFILE', 'UNVERIFIABLE', 'PRF_GUARANTEE_UNSUPPORTED');
});
test('PRF caller-selected dependency ordering is set based with exact versions', () => {
  const f = fixture(); f.input.downstream.dependencies.reverse();
  check(f, 'VERIFIED', 'PRESERVED', 'PRF_NATIVE_RESULT_AND_DEPENDENCIES_PRESERVED');
});
test('PRF duplicate dependency identities do not establish preservation', () => {
  const f = fixture(); f.input.downstream.dependencies.push(structuredClone(f.input.downstream.dependencies[0]));
  check(f, 'INSUFFICIENT_EVIDENCE', 'UNVERIFIABLE', 'PRF_ACCEPTED_DEPENDENCY_BASIS_REQUIRED');
});
test('PRF malformed producer native vocabulary is rejected', () => {
  const f = fixture(); f.input.upstream.native_result.outcome = 'PASS';
  check(f, 'REJECTED_MALFORMED', 'UNVERIFIABLE', 'PRF_INPUT_MALFORMED');
});
test('PRF unavailable native execution is not a contradiction or positive verdict', () => {
  const f = fixture();
  const moduleUrl = new URL('../src/adapters/prf-v2.mjs', import.meta.url).href;
  const script = `import { evaluatePrfV2 } from ${JSON.stringify(moduleUrl)}; const f = ${JSON.stringify(f)}; process.stdout.write(JSON.stringify(evaluatePrfV2(f.input,f.context)));`;
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'));
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...env, PATH: '' }, windowsHide: true, timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);
  const actual = JSON.parse(child.stdout);
  assert.equal(actual.status, 'CANNOT_RECOMPUTE');
  assert.equal(actual.guaranteeProjection.status, 'UNVERIFIABLE');
  assert.equal(actual.recomputation.status, 'CANNOT_RECOMPUTE');
  assert.ok(actual.reasonCodes.includes('PRF_NATIVE_EXECUTION_UNAVAILABLE'));
});
test('PRF evaluator does not mutate independent consumer requirements', () => {
  const f = fixture(), before = structuredClone(f);
  check(f, 'VERIFIED', 'PRESERVED', 'PRF_NATIVE_RESULT_AND_DEPENDENCIES_PRESERVED');
  assert.deepEqual(f, before);
});
test('PRF missing independently selected relation input cannot self-bind to producer', () => {
  const f = fixture(); delete f.context.required_relation_input_digest;
  check(f, 'INSUFFICIENT_EVIDENCE', 'UNVERIFIABLE', 'PRF_RELATION_SELECTOR_REQUIRED');
});
test('PRF unrelated compatible award cannot reuse caller relation selector', () => {
  const f = fixture(); f.input.upstream.award.target_ref = 'different-task'; f.input.upstream.settlements[0].target_ref = 'different-task';
  const actual = check(f, 'CONTRADICTED', 'VIOLATED', 'PRF_CALLER_RELATION_INPUT_MISMATCH');
  assert.equal(actual.nativeResult.recomputed.outcome, 'PRESERVED');
  assert.equal(actual.recomputation.status, 'REPRODUCED');
});
