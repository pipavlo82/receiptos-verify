import { readFileSync } from 'node:fs';
import { verifyAction } from '../../vendor/interpoll-v02/engagement.js';
import { digest, equal, sha256 } from '../core/common.mjs';

export const descriptor = Object.freeze({
  profileId: 'receiptos.verify.interpoll-action.v2',
  sourceRepository: 'Interpoll1/decentralised',
  sourceCommit: '559e47f2cd2ffcbd8ad38293da89448d8ec3152d',
  license: 'Unlicense upstream; Apache-2.0 product glue', maturity: 'EXPERIMENTAL',
  integrationMode: 'PINNED_SOURCE',
  capabilities: ['native-schnorr-authorization', 'caller-selected-action', 'exact-retry', 'supplied-observation-binding', 'trace-commitment'],
  requiredEvidence: ['signed_intent', 'accepted_action', 'attempts', 'observation', 'final_committed_result'],
  nativeVocabulary: ['VALID', 'INVALID', 'accepted', 'duplicate', 'PRESERVED', 'VIOLATED', 'NOT_ESTABLISHED'],
});
const materialFields = ['version', 'namespace', 'kind', 'actor', 'targetType', 'targetId', 'value', 'createdAt', 'nonce'];
const limitations = Object.freeze([
  'Native Schnorr verification establishes key control over the signed intent; fresh server admission is not evaluated.',
  'Execution observations and relay acceptance are supplied artifacts, not independently authenticated Interpoll server or SQL execution.',
  'A trace digest binds supplied bytes only. It does not establish that an action was executed, viewed by a human, or accepted by a deployed relay.',
]);
const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
const exactKeys = (x, required, optional = []) => object(x) && required.every(k => Object.hasOwn(x, k)) && Object.keys(x).every(k => required.includes(k) || optional.includes(k));
export function actionMaterial(action) {
  if (!object(action)) return null;
  return Object.fromEntries(materialFields.map(k => [k, action[k]]));
}
export function commitActionTrace(input) {
  return {
    action_id: input.signed_intent.id,
    attempt_ids: input.attempts.map(x => x.id),
    observation_digest: digest(input.observation),
    evidence_digest: digest({ signed_intent: input.signed_intent, accepted_action: input.accepted_action, attempts: input.attempts, observation: input.observation }),
  };
}
function output(status, reasonCodes, nativeResult) {
  return { status, reasonCodes, nativeResult, productProjection: { status, reasonCodes }, provenance: { ...descriptor }, limitations: [...limitations] };
}

// The caller supplies requested_action and authority separately from producer input.
export function evaluateInterpollV2(input, context = {}) {
  const native = { signature: 'NOT_ESTABLISHED', admission: 'NOT_EVALUATED', retry_relation: 'NOT_ESTABLISHED', execution: 'NOT_ESTABLISHED', final_commitment: 'NOT_ESTABLISHED', acceptance_status: input?.accepted_action?.status ?? null };
  try {
    if (sha256(readFileSync(new URL('../../vendor/interpoll-v02/engagement.js', import.meta.url))) !== '50f609b6408d81dfa12c3a454a6db7a2d98600e1ed81ac68131f0bbc81d6d5c3') return output('CANNOT_RECOMPUTE', ['INTERPOLL_NATIVE_SOURCE_MISMATCH'], native);
  } catch {
    return output('CANNOT_RECOMPUTE', ['INTERPOLL_NATIVE_SOURCE_UNAVAILABLE'], native);
  }
  try {
    if (!exactKeys(input, ['signed_intent', 'accepted_action', 'attempts', 'observation', 'final_committed_result']) || !Array.isArray(input.attempts)) return output('REJECTED_MALFORMED', ['ACTION_TRACE_MALFORMED'], native);
    if (!verifyAction(input.signed_intent, { fresh: false })) {
      native.signature = 'INVALID';
      return output('CONTRADICTED', ['ACTION_SIGNATURE_INVALID'], native);
    }
    native.signature = 'VALID';
    if (!exactKeys(context.requested_action, materialFields)) return output('INSUFFICIENT_EVIDENCE', ['CALLER_ACTION_REQUIRED'], native);
    if (!equal(actionMaterial(input.signed_intent), context.requested_action)) return output('CONTRADICTED', ['SIGNED_INTENT_REQUEST_MISMATCH'], native);
    if (!exactKeys(context.authority, ['actor', 'namespace']) || context.authority.actor !== input.signed_intent.actor || context.authority.namespace !== input.signed_intent.namespace) return output('UNSUPPORTED_PROFILE', ['ACTION_AUTHORITY_UNSUPPORTED'], native);
    const outcome = context.required_outcome ?? 'EXECUTION_OBSERVED';
    if (!['EXECUTION_OBSERVED', 'AUTHORIZATION_ONLY'].includes(outcome)) return output('UNSUPPORTED_PROFILE', ['ACTION_OUTCOME_UNSUPPORTED'], native);
    if (!exactKeys(input.accepted_action, ['status', 'action']) || !['accepted', 'duplicate'].includes(input.accepted_action.status)) return output('REJECTED_MALFORMED', ['ACTION_ACCEPTANCE_MALFORMED'], native);
    if (!equal(input.accepted_action.action, input.signed_intent)) return output('CONTRADICTED', ['ACCEPTED_ACTION_CHANGED'], native);
    if (!input.attempts.length) return output('INSUFFICIENT_EVIDENCE', ['ACTION_ATTEMPTS_MISSING'], native);
    const ids = new Set();
    for (const attempt of input.attempts) {
      if (!exactKeys(attempt, ['id', 'action', 'delivery_status', 'execution_attempted']) || typeof attempt.id !== 'string' || !attempt.id || ids.has(attempt.id) || !['accepted', 'duplicate', 'pending', 'rejected'].includes(attempt.delivery_status) || typeof attempt.execution_attempted !== 'boolean') return output('REJECTED_MALFORMED', ['ACTION_ATTEMPT_MALFORMED'], native);
      ids.add(attempt.id);
      if (!equal(attempt.action, input.signed_intent)) { // MUTATE: v2-retry-action-guard
        native.retry_relation = 'VIOLATED';
        return output('CONTRADICTED', ['RETRY_AUTHORIZED_ACTION_CHANGED'], native);
      }
      if (attempt.delivery_status === 'duplicate' && attempt.execution_attempted) return output('CONTRADICTED', ['DUPLICATE_IS_NOT_NEW_EXECUTION'], native);
    }
    native.retry_relation = 'PRESERVED';
    if (!exactKeys(input.final_committed_result, ['action_id', 'attempt_ids', 'observation_digest', 'evidence_digest'])) return output('INSUFFICIENT_EVIDENCE', ['RETRY_COMMITMENT_MISSING'], native);
    if (!equal(input.final_committed_result, commitActionTrace(input))) return output('CONTRADICTED', ['RETRY_COMMITMENT_MISMATCH'], native);
    native.final_commitment = 'PRESERVED';
    if (outcome === 'AUTHORIZATION_ONLY') return output('VERIFIED', ['EXACT_SIGNED_ACTION_AUTHORIZATION_ONLY'], native);
    const observation = input.observation;
    if (!object(observation)) return output('INSUFFICIENT_EVIDENCE', ['ACTION_EXECUTION_OBSERVATION_MISSING'], native);
    if (!exactKeys(observation, ['action_id', 'attempt_id', 'result']) || !['APPLIED', 'REJECTED'].includes(observation.result)) return output('REJECTED_MALFORMED', ['ACTION_OBSERVATION_MALFORMED'], native);
    const observedAttempt = input.attempts.find(x => x.id === observation.attempt_id);
    if (observation.action_id !== input.signed_intent.id || !observedAttempt) return output('CONTRADICTED', ['ACTION_OBSERVATION_BINDING_MISMATCH'], native);
    if (!observedAttempt.execution_attempted || observedAttempt.delivery_status === 'duplicate') return output('INSUFFICIENT_EVIDENCE', ['ACTION_NEW_EXECUTION_NOT_ESTABLISHED'], native);
    if (observedAttempt.delivery_status !== 'accepted') return output('INSUFFICIENT_EVIDENCE', ['ACTION_EXECUTION_ACCEPTANCE_NOT_ESTABLISHED'], native);
    native.execution = 'OBSERVATION_SUPPLIED';
    native.observation = structuredClone(observation);
    if (observation.result === 'REJECTED') return output('CONTRADICTED', ['ACTION_OBSERVED_REJECTION'], native);
    return output('VERIFIED', ['EXACT_SIGNED_ACTION_SUPPLIED_EXECUTION_RELATION'], native);
  } catch (error) {
    return output('REJECTED_MALFORMED', ['ACTION_TRACE_MALFORMED'], { ...native, error: error.message });
  }
}
