import { runNative, parsedExecution } from './native/process.mjs';
import { createHash } from 'node:crypto';

export const descriptor = Object.freeze({
  profileId: 'rvr-generic-sha256-equals-v0',
  sourceRepository: 'https://github.com/pipavlo82/recomputable-verification-receipts',
  sourceCommit: '9dd36e882dd372f264b77b179130948aa5adcbde',
  license: 'Apache-2.0', maturity: 'STABLE',
  capabilities: ['NATIVE_DIGEST_PREDICATE', 'NATIVE_RECEIPT_REPLAY'], requiredEvidence: ['native-rvr-bundle', 'native-rvr-candidate'],
  nativeVocabulary: { semantic: ['VERIFIED', 'REFUTED', 'UNVERIFIABLE'], recomputation: ['REPRODUCED', 'DIVERGED', 'CANNOT_RECOMPUTE'] },
});
const limitations = [
  'Generic RVR SHA256_EQUALS has no Git commit binding or signature/authenticity guarantee.',
  'REPRODUCED can reproduce REFUTED or UNVERIFIABLE and does not imply semantic success.',
  'Only the exact installed generic profile is admitted; external/domain profiles are unsupported.',
];
const digest = /^[0-9a-f]{64}$/;
const profileDigest = '51f79442e96339ca45e9e6cc0c8232833efbee20e7480df00987dbc97da72948';
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
// This boundary validates the fixed ASCII generic result schema. Native RVR
// remains responsible for evaluation and its full canonical byte contract.
const asciiCanonical = (value) => Array.isArray(value) ? `[${value.map(asciiCanonical).join(',')}]` : value && typeof value === 'object'
  ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${asciiCanonical(value[key])}`).join(',')}}`
  : JSON.stringify(value);
function validOutput(parsed, input) {
  const value = parsed.value;
  if (parsed.ok !== true || parsed.profileDigest !== profileDigest || !value) return false;
  if (value.recomputationStatus === 'CANNOT_RECOMPUTE') {
    return value.evaluationPerformed === false && parsed.canonicalResult === null
      && value.verificationOutcome === undefined && value.canonicalResultDigest === undefined;
  }
  if (value.evaluationPerformed !== true || !['REPRODUCED', 'DIVERGED'].includes(value.recomputationStatus)) return false;
  const result = parsed.canonicalResult;
  if (!exactKeys(result, ['schema', 'outcome', 'reasonCode', 'evaluation']) || result.schema !== 'rvr.canonical-result.v0'
      || !exactKeys(result.evaluation, ['operation', 'evidenceMember', 'expectedDigest', 'observedDigest'])) return false;
  const ev = result.evaluation;
  const claim = input?.candidateCase?.claim;
  if (ev.operation !== 'SHA256_EQUALS' || !/^[a-z][a-z0-9._-]*$/.test(ev.evidenceMember)
      || !digest.test(ev.expectedDigest) || !(ev.observedDigest === null || digest.test(ev.observedDigest))
      || claim?.operation !== ev.operation || claim?.evidenceMember !== ev.evidenceMember || claim?.expectedDigest !== ev.expectedDigest) return false;
  const outcome = ev.observedDigest === null ? 'UNVERIFIABLE' : ev.observedDigest === ev.expectedDigest ? 'VERIFIED' : 'REFUTED';
  const reason = { VERIFIED: 'rvr.v0.digest_match', REFUTED: 'rvr.v0.digest_mismatch', UNVERIFIABLE: 'rvr.v0.required_evidence_unavailable' }[outcome];
  const resultDigest = createHash('sha256').update(asciiCanonical(result), 'utf8').digest('hex');
  const original = input?.originalBundle?.receipt;
  const members = input?.candidateCase?.evidenceSet?.members;
  if (!original || !Array.isArray(members)) return false;
  const hash = (data) => createHash('sha256').update(asciiCanonical(data), 'utf8').digest('hex');
  const evidence = { ...input.candidateCase.evidenceSet, members: [...members].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) };
  const reproduced = original.resultDigest === resultDigest && original.verificationProfileDigest === profileDigest
    && original.claimDigest === hash(claim) && original.evidenceSetDigest === hash(evidence);
  return result.outcome === outcome && result.reasonCode === reason && value.verificationOutcome === outcome
    && value.verificationReasonCode === reason && value.canonicalResultDigest === resultDigest
    && value.recomputationStatus === (reproduced ? 'REPRODUCED' : 'DIVERGED')
    && value.reasonCode === (value.recomputationStatus === 'REPRODUCED' ? 'rvr.recompute.identical' : 'rvr.recompute.canonical_result_diverged');
}

export async function recompute(nativeInput) {
  const execution = await runNative('rvr', { operation: 'recompute', input: nativeInput });
  const parsed = parsedExecution(execution);
  const provenance = { ...descriptor, runtime: parsed?.runtime ?? null, verificationProfileDigest: parsed?.profileDigest ?? null, functions: ['audit_profile', 'validate_receipt_envelope', 'recompute', 'evaluate'] };
  if (!parsed) return { status: 'CANNOT_RECOMPUTE', reasonCodes: ['NATIVE_RVR_EXECUTION_UNAVAILABLE'], nativeResult: null, limitations, provenance, execution };
  if (!parsed.ok) return { status: 'REJECTED_MALFORMED', reasonCodes: [parsed.nativeError?.reasonCode ?? 'NATIVE_RVR_INPUT_INVALID'], nativeResult: parsed.nativeError, limitations, provenance, execution };
  const nativeResult = parsed.value;
  if (!validOutput(parsed, nativeInput)) {
    return { status: 'CANNOT_RECOMPUTE', reasonCodes: ['NATIVE_RVR_INVALID_OUTPUT'], nativeResult,
      limitations, provenance, execution };
  }
  const semantic = nativeResult.verificationOutcome;
  const replay = nativeResult.recomputationStatus;
  let status;
  if (replay === 'CANNOT_RECOMPUTE') status = 'CANNOT_RECOMPUTE';
  else if (semantic === 'REFUTED' || replay === 'DIVERGED') status = 'CONTRADICTED';
  else if (semantic === 'UNVERIFIABLE') status = 'INSUFFICIENT_EVIDENCE';
  else if (semantic === 'VERIFIED' && replay === 'REPRODUCED') status = 'VERIFIED';
  else status = 'CANNOT_RECOMPUTE';
  return { status, reasonCodes: [nativeResult.verificationReasonCode, nativeResult.reasonCode].filter(Boolean), nativeResult,
    semanticOutcome: semantic ?? null, recomputationStatus: replay,
    observedArtifactDigest: parsed.canonicalResult?.evaluation?.observedDigest ?? null,
    expectedDigest: parsed.canonicalResult?.evaluation?.expectedDigest ?? null,
    nativeCanonicalResult: parsed.canonicalResult,
    savedCanonicalResult: nativeInput.originalBundle.canonicalResult,
    limitations, provenance, execution };
}

export async function buildRvrEvidence(artifactBase64, expectedDigest, options = {}) {
  const execution = await runNative('rvr', { operation: 'build', artifactBase64, expectedDigest, options });
  const parsed = parsedExecution(execution);
  if (!parsed?.ok || execution.exitCode !== 0) throw new Error(`Native RVR fixture construction failed: ${execution.stderr}`);
  return parsed.value;
}
