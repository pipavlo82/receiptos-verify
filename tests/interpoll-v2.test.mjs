import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAction } from '../vendor/interpoll-v02/engagement.js';
import { evaluateInterpollV2 } from '../src/adapters/interpoll-v2.mjs';
import { makeInterpollFixture, refreshInterpollCommitment } from './helpers/interpoll-v02-fixture.mjs';

function check(fixture, status, reason) {
  const result = evaluateInterpollV2(fixture.input, fixture.context);
  assert.equal(result.status, status);
  assert.ok(result.reasonCodes.includes(reason), JSON.stringify(result));
  return result;
}
test('I01 native signed action matches independently selected execution', () => {
  const f = makeInterpollFixture();
  assert.equal(verifyAction(f.input.signed_intent, { fresh: false }), true);
  const actual = check(f, 'VERIFIED', 'EXACT_SIGNED_ACTION_SUPPLIED_EXECUTION_RELATION');
  assert.equal(actual.nativeResult.signature, 'VALID');
  assert.equal(actual.nativeResult.execution, 'OBSERVATION_SUPPLIED');
  assert.equal(actual.nativeResult.admission, 'NOT_EVALUATED');
});
test('I02 valid signature does not authorize changed accepted target', () => {
  const f = makeInterpollFixture(); f.input.accepted_action.action.targetId = 'synthetic-post-b'; refreshInterpollCommitment(f.input);
  const actual = check(f, 'CONTRADICTED', 'ACCEPTED_ACTION_CHANGED');
  assert.equal(actual.nativeResult.signature, 'VALID');
});
test('I03 valid signature does not authorize changed accepted action type', () => {
  const f = makeInterpollFixture(); f.input.accepted_action.action.kind = 'view'; refreshInterpollCommitment(f.input);
  check(f, 'CONTRADICTED', 'ACCEPTED_ACTION_CHANGED');
});
test('I04 pending retry and duplicate preserve exact intent and original execution', () => {
  const f = makeInterpollFixture();
  f.input.attempts.unshift({ id: 'synthetic-pending', action: structuredClone(f.input.signed_intent), delivery_status: 'pending', execution_attempted: false });
  f.input.attempts.push({ id: 'synthetic-duplicate', action: structuredClone(f.input.signed_intent), delivery_status: 'duplicate', execution_attempted: false });
  refreshInterpollCommitment(f.input);
  assert.equal(check(f, 'VERIFIED', 'EXACT_SIGNED_ACTION_SUPPLIED_EXECUTION_RELATION').nativeResult.retry_relation, 'PRESERVED');
});
test('I05 material retry mutation is contradicted despite valid original signature', () => {
  const f = makeInterpollFixture();
  const retry = structuredClone(f.input.attempts[0]);
  retry.id = 'synthetic-mutated-retry'; retry.action.value = 'down';
  retry.delivery_status = 'pending'; retry.execution_attempted = false;
  f.input.attempts.push(retry); refreshInterpollCommitment(f.input);
  assert.deepEqual(f.input.attempts[0].action, f.input.signed_intent);
  assert.equal(f.input.observation.attempt_id, f.input.attempts[0].id);
  const actual = check(f, 'CONTRADICTED', 'RETRY_AUTHORIZED_ACTION_CHANGED');
  assert.equal(actual.nativeResult.signature, 'VALID');
  assert.equal(actual.nativeResult.retry_relation, 'VIOLATED');
});
test('I06 duplicate acceptance does not establish a new execution', () => {
  const f = makeInterpollFixture(); f.input.accepted_action.status = 'duplicate'; f.input.attempts[0].delivery_status = 'duplicate'; f.input.attempts[0].execution_attempted = false;
  refreshInterpollCommitment(f.input);
  check(f, 'INSUFFICIENT_EVIDENCE', 'ACTION_NEW_EXECUTION_NOT_ESTABLISHED');
});
test('I07 signature and accepted intent do not replace execution observation', () => {
  const f = makeInterpollFixture(); f.input.observation = null; refreshInterpollCommitment(f.input);
  const actual = check(f, 'INSUFFICIENT_EVIDENCE', 'ACTION_EXECUTION_OBSERVATION_MISSING');
  assert.equal(actual.nativeResult.signature, 'VALID');
});
test('I08 valid signature with unsupported caller authority is withheld', () => {
  const f = makeInterpollFixture(); f.context.authority.actor = 'ff'.repeat(32);
  const actual = check(f, 'UNSUPPORTED_PROFILE', 'ACTION_AUTHORITY_UNSUPPORTED');
  assert.equal(actual.nativeResult.signature, 'VALID');
});
test('caller requested action is never derived from evidence itself', () => {
  const f = makeInterpollFixture(); delete f.context.requested_action;
  check(f, 'INSUFFICIENT_EVIDENCE', 'CALLER_ACTION_REQUIRED');
});
test('valid signed action for A cannot satisfy caller selected target B', () => {
  const f = makeInterpollFixture(); f.context.requested_action.targetId = 'synthetic-post-b';
  check(f, 'CONTRADICTED', 'SIGNED_INTENT_REQUEST_MISMATCH');
});
test('signed intent tampering fails actual native Schnorr relation', () => {
  const f = makeInterpollFixture(); f.input.signed_intent = { ...f.input.signed_intent, value: 'down' };
  check(f, 'CONTRADICTED', 'ACTION_SIGNATURE_INVALID');
});
test('altered trace bytes without new commitment are contradicted', () => {
  const f = makeInterpollFixture(); f.input.observation.result = 'REJECTED';
  check(f, 'CONTRADICTED', 'RETRY_COMMITMENT_MISMATCH');
});
test('a reproduced supplied rejection remains negative', () => {
  const f = makeInterpollFixture(); f.input.observation.result = 'REJECTED'; refreshInterpollCommitment(f.input);
  check(f, 'CONTRADICTED', 'ACTION_OBSERVED_REJECTION');
});
test('commitment cannot promote duplicate into a new execution', () => {
  const f = makeInterpollFixture(); f.input.attempts[0].delivery_status = 'duplicate'; refreshInterpollCommitment(f.input);
  check(f, 'CONTRADICTED', 'DUPLICATE_IS_NOT_NEW_EXECUTION');
});
test('distinct execution observation must bind existing exact action attempt', () => {
  const f = makeInterpollFixture(); f.input.observation.action_id = '00'.repeat(32); refreshInterpollCommitment(f.input);
  check(f, 'CONTRADICTED', 'ACTION_OBSERVATION_BINDING_MISMATCH');
});
test('authorization only is a separately selected narrower claim', () => {
  const f = makeInterpollFixture(); f.context.required_outcome = 'AUTHORIZATION_ONLY'; f.input.observation = null; refreshInterpollCommitment(f.input);
  const actual = check(f, 'VERIFIED', 'EXACT_SIGNED_ACTION_AUTHORIZATION_ONLY');
  assert.equal(actual.nativeResult.execution, 'NOT_ESTABLISHED');
});
test('duplicate attempts and extra semantic fields are malformed', () => {
  const f = makeInterpollFixture(); f.input.attempts.push(structuredClone(f.input.attempts[0])); refreshInterpollCommitment(f.input);
  check(f, 'REJECTED_MALFORMED', 'ACTION_ATTEMPT_MALFORMED');
  const g = makeInterpollFixture(); g.input.executed_action = structuredClone(g.input.signed_intent);
  check(g, 'REJECTED_MALFORMED', 'ACTION_TRACE_MALFORMED');
});
test('synthetic signatures, trace commitments and bounded result are deterministic', () => {
  const f = makeInterpollFixture(), g = makeInterpollFixture();
  assert.deepEqual(f, g);
  assert.deepEqual(evaluateInterpollV2(f.input, f.context), evaluateInterpollV2(g.input, g.context));
});
test('Interpoll evaluator preserves caller-selected and producer input bytes', () => {
  const f = makeInterpollFixture(), before = structuredClone(f);
  check(f, 'VERIFIED', 'EXACT_SIGNED_ACTION_SUPPLIED_EXECUTION_RELATION');
  assert.deepEqual(f, before);
});
