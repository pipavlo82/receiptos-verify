import { schnorr } from '@noble/curves/secp256k1.js';
import { createHash } from 'node:crypto';
import { actionBytes } from '../../vendor/interpoll-v02/engagement.js';
import { actionMaterial, commitActionTrace } from '../../src/adapters/interpoll-v2.mjs';

// Public synthetic test key, never an operational Interpoll identity.
const privateKey = '0000000000000000000000000000000000000000000000000000000000000003';
export function makeInterpollFixture() {
  const actor = Buffer.from(schnorr.getPublicKey(Buffer.from(privateKey, 'hex'))).toString('hex');
  const payload = { version: 1, namespace: 'v1', kind: 'reaction', actor, targetType: 'post', targetId: 'synthetic-post-a', value: 'up', createdAt: 1000, nonce: '00'.repeat(16) };
  const id = createHash('sha256').update(actionBytes(payload)).digest('hex');
  const signed = { ...payload, id, signature: Buffer.from(schnorr.sign(Buffer.from(id, 'hex'), Buffer.from(privateKey, 'hex'), Buffer.alloc(32))).toString('hex') };
  const input = {
    signed_intent: signed, accepted_action: { status: 'accepted', action: structuredClone(signed) },
    attempts: [{ id: 'synthetic-attempt-1', action: structuredClone(signed), delivery_status: 'accepted', execution_attempted: true }],
    observation: { action_id: signed.id, attempt_id: 'synthetic-attempt-1', result: 'APPLIED' },
    final_committed_result: null,
  };
  input.final_committed_result = commitActionTrace(input);
  return { input, context: { requested_action: actionMaterial(signed), authority: { actor, namespace: 'v1' }, required_outcome: 'EXECUTION_OBSERVED' } };
}
export function refreshInterpollCommitment(input) {
  input.final_committed_result = commitActionTrace(input);
  return input;
}
