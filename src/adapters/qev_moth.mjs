import { runNative, parsedExecution } from './native/process.mjs';
import { createHash } from 'node:crypto';

export const descriptor = Object.freeze({
  profileId: 'rvr-qev-moth-counts-v0',
  sourceRepository: 'https://github.com/pipavlo82/quantum-execution-evidence',
  sourceCommit: '5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05', license: 'Apache-2.0', maturity: 'EXPERIMENTAL',
  capabilities: ['NATIVE_SAVED_COUNTS_CONSISTENCY', 'NATIVE_DOMAIN_RVR_REPLAY', 'NATIVE_RECEIPTOS_PORTABLE_EXPORT'],
  requiredEvidence: ['synthetic-moth-wrapper', 'native-domain-rvr-bundle', 'independent-expected-claim'],
  nativeVocabulary: { semantic: ['VERIFIED', 'REFUTED', 'UNVERIFIABLE'], recomputation: ['REPRODUCED', 'DIVERGED', 'CANNOT_RECOMPUTE'] },
});
const limitations = [
  'Fresh synthetic Moth-shaped bytes only. Native LIVE_MOTH_API_CAPTURE and qpu literals are assertions and establish no provider origin or hardware execution.',
  'Provider authentication, entropy qualification, cryptographic randomness, shot order and nonempty Toeplitz extraction are NOT_ESTABLISHED.',
  'ReceiptOS establishes exact local RVR attachment/root/projection consistency; its native limits are retained and no on-chain anchor is claimed.',
  'Historical metadata role names and claim/profile locks are preserved unmodified; no captured provider payload bytes are vendored.',
];
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const hashResult = (value) => createHash('sha256').update(canonical(value), 'utf8').digest('hex');

export async function evaluateQevMoth(input) {
  const execution = await runNative('qev_moth', { operation: 'evaluate', input });
  const parsed = parsedExecution(execution);
  const provenance = { ...descriptor, runtime: parsed?.runtime ?? null,
    functions: ['moth_rvr.recompute', 'moth_rvr_relation.evaluate', 'moth_comet.evaluate', 'moth_receiptos.replay'] };
  const base = { limitations, provenance, execution, providerAuthentication: 'NOT_ESTABLISHED', synthetic: input?.synthetic === true };
  if (!parsed) return { ...base, status: 'CANNOT_RECOMPUTE', reasonCodes: ['NATIVE_QEV_MOTH_EXECUTION_UNAVAILABLE'], nativeResult: null };
  if (!parsed.ok) return { ...base, status: parsed.nativeError?.barrier ? 'CANNOT_RECOMPUTE'
    : parsed.nativeError?.reasonCode === 'INDEPENDENT_CLAIM_MISMATCH' ? 'CONTRADICTED' : 'REJECTED_MALFORMED',
    reasonCodes: [parsed.nativeError?.reasonCode ?? 'NATIVE_QEV_MOTH_INPUT_INVALID'], nativeResult: parsed.nativeError };
  const nativeResult = parsed.value;
  const replay = nativeResult?.rvr;
  const result = replay?.canonicalResult;
  if (parsed.ok !== true || !replay || replay.evaluationPerformed !== true || !['REPRODUCED', 'DIVERGED'].includes(replay.recomputationStatus)
      || !['VERIFIED', 'REFUTED', 'UNVERIFIABLE'].includes(replay.verificationOutcome)
      || result?.schema !== 'rvr.qev.moth-counts-result.v0' || result.outcome !== replay.verificationOutcome
      || result.reasonCode !== replay.verificationReasonCode || result.limits?.providerAuthentication !== 'NOT_ESTABLISHED'
      || !replay.identities || replay.identities.resultDigest !== hashResult(result)
      || replay.identities.claimDigest !== hashResult(input.expectedClaim)
      || replay.identities.verificationProfileDigest !== input.bundle?.receipt?.verificationProfileDigest
      || (replay.recomputationStatus === 'REPRODUCED'
        && Object.entries(replay.identities).some(([key, value]) => input.bundle?.receipt?.[key] !== value))) {
    return { ...base, status: 'CANNOT_RECOMPUTE', reasonCodes: ['NATIVE_QEV_MOTH_INVALID_OUTPUT'], nativeResult };
  }
  const status = replay.verificationOutcome === 'REFUTED' || replay.recomputationStatus === 'DIVERGED' ? 'CONTRADICTED' : 'UNVERIFIABLE';
  return { ...base, status, reasonCodes: [replay.verificationReasonCode, replay.reasonCode, 'PROVIDER_AUTHENTICATION_NOT_ESTABLISHED'],
    nativeResult, semanticOutcome: replay.verificationOutcome, recomputationStatus: replay.recomputationStatus,
    requestedBytes: result.observation?.requestedBytes ?? null, deliveredBytes: result.observation?.deliveredBytes ?? null,
    observation: result.observation, receiptOsRoot: nativeResult.receiptOs?.receiptOs?.root ?? null };
}

export async function buildQevMothEvidence(options = {}) {
  const execution = await runNative('qev_moth', { operation: 'build', options });
  const parsed = parsedExecution(execution);
  if (!parsed?.ok) throw new Error(`Native QEV Moth fixture construction failed: ${execution.stderr || execution.stdout}`);
  return parsed.value;
}
