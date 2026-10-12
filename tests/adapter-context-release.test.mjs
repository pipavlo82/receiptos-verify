import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInterpollV2 } from '../src/adapters/interpoll-v2.mjs';
import { evaluatePrfV2 } from '../src/adapters/prf-v2.mjs';
import { makeInterpollFixture } from './helpers/interpoll-v02-fixture.mjs';
import { makePrfFixture } from './helpers/prf-v02-fixture.mjs';

for (const [label, change] of [
  ['fresh admission requirement', f => { f.context.require_fresh_admission = true; }],
  ['server attestation requirement', f => { f.context.required_evidence_basis = 'INTERPOLL_SERVER_ATTESTATION'; }],
  ['null outcome', f => { f.context.required_outcome = null; }],
  ['numeric outcome', f => { f.context.required_outcome = 1; }],
  ['null action', f => { f.context.requested_action = null; }],
  ['array action', f => { f.context.requested_action = []; }],
  ['extra action semantics', f => { f.context.requested_action.require_server_execution = true; }],
  ['wrong action parameter type', f => { f.context.requested_action.value = null; }],
  ['unsafe action timestamp', f => { f.context.requested_action.createdAt = Number.MAX_SAFE_INTEGER + 1; }],
  ['null authority', f => { f.context.authority = null; }],
  ['wrong authority field type', f => { f.context.authority.actor = 1; }],
  ['extra authority semantics', f => { f.context.authority.policy_version = 'unimplemented'; }],
]) {
  test(`direct Interpoll rejects ${label} without upgrading supplied observations`, () => {
    const f = makeInterpollFixture(); change(f);
    const actual = evaluateInterpollV2(f.input, f.context);
    assert.equal(actual.status, 'REJECTED_MALFORMED');
    assert.ok(actual.reasonCodes.includes('ACTION_CONTEXT_MALFORMED'));
    assert.equal(actual.nativeResult.signature, 'VALID');
    assert.equal(actual.nativeResult.admission, 'NOT_EVALUATED');
    assert.equal(actual.nativeResult.execution, 'NOT_ESTABLISHED');
  });
}

test('direct Interpoll keeps a missing or partial selected action insufficient', () => {
  const f = makeInterpollFixture();
  for (const context of [{}, { requested_action: { targetId: f.input.signed_intent.targetId } }]) {
    const actual = evaluateInterpollV2(f.input, context);
    assert.equal(actual.status, 'INSUFFICIENT_EVIDENCE');
    assert.ok(actual.reasonCodes.includes('CALLER_ACTION_REQUIRED'));
  }
});

test('direct Interpoll outcome omission preserves documented default', () => {
  const f = makeInterpollFixture(); delete f.context.required_outcome;
  const actual = evaluateInterpollV2(f.input, f.context);
  assert.equal(actual.status, 'VERIFIED');
  assert.equal(actual.nativeResult.execution, 'OBSERVATION_SUPPLIED');
  assert.equal(actual.nativeResult.admission, 'NOT_EVALUATED');
});

test('direct Interpoll unsupported string outcome remains unsupported', () => {
  const f = makeInterpollFixture(); f.context.required_outcome = 'LIVE_SERVER_EXECUTION';
  const actual = evaluateInterpollV2(f.input, f.context);
  assert.equal(actual.status, 'UNSUPPORTED_PROFILE');
  assert.ok(actual.reasonCodes.includes('ACTION_OUTCOME_UNSUPPORTED'));
});

for (const [label, change] of [
  ['unsupported policy requirement', f => { f.context.required_policy_version = 'unsupported-v999'; }],
  ['authenticated chain requirement', f => { f.context.required_evidence_basis = 'AUTHENTICATED_CHAIN_SETTLEMENT'; }],
  ['null guarantee', f => { f.context.required_guarantee = null; }],
  ['numeric guarantee', f => { f.context.required_guarantee = 1; }],
  ['null tuple digest', f => { f.context.required_relation_input_digest = null; }],
  ['numeric tuple digest', f => { f.context.required_relation_input_digest = 1; }],
  ['null basis', f => { f.context.accepted_basis = null; }],
  ['array basis', f => { f.context.accepted_basis = []; }],
  ['null native expectation', f => { f.context.required_native_result = null; }],
  ['array native expectation', f => { f.context.required_native_result = []; }],
]) {
  test(`direct PRF rejects ${label} without claiming a transfer`, () => {
    const f = makePrfFixture(); change(f);
    const actual = evaluatePrfV2(f.input, f.context);
    assert.equal(actual.status, 'REJECTED_MALFORMED');
    assert.ok(actual.reasonCodes.includes('PRF_CONTEXT_MALFORMED'));
    assert.equal(actual.guaranteeProjection.status, 'UNVERIFIABLE');
    assert.equal(actual.nativeResult.recomputation, 'CANNOT_RECOMPUTE');
    assert.equal(actual.execution, null);
  });
}

test('direct PRF preserves safe missing and partial premise outcomes', () => {
  const f = makePrfFixture();
  for (const context of [{}, { required_relation_input_digest: f.context.required_relation_input_digest }]) {
    const actual = evaluatePrfV2(f.input, context);
    assert.equal(actual.status, 'INSUFFICIENT_EVIDENCE');
    assert.equal(actual.guaranteeProjection.status, 'UNVERIFIABLE');
    assert.equal(actual.nativeResult.recomputation, 'REPRODUCED');
  }
});

test('direct PRF supported context still executes the pinned native relation', () => {
  const f = makePrfFixture();
  const actual = evaluatePrfV2(f.input, f.context);
  assert.equal(actual.status, 'VERIFIED');
  assert.equal(actual.guaranteeProjection.status, 'PRESERVED');
  assert.equal(actual.nativeResult.recomputation, 'REPRODUCED');
  assert.deepEqual(actual.nativeResult.recomputed, { outcome: 'PRESERVED', reason: 'award_bound_to_actual_settlement' });
});

test('direct PRF unsupported string guarantee remains unsupported', () => {
  const f = makePrfFixture(); f.context.required_guarantee = 'UNIVERSAL_CHAIN_SETTLEMENT';
  const actual = evaluatePrfV2(f.input, f.context);
  assert.equal(actual.status, 'UNSUPPORTED_PROFILE');
  assert.equal(actual.guaranteeProjection.status, 'UNVERIFIABLE');
  assert.ok(actual.reasonCodes.includes('PRF_GUARANTEE_UNSUPPORTED'));
});
