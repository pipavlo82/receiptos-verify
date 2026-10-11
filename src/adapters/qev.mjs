import { runNative, parsedExecution } from './native/process.mjs';
import { evaluateQevMoth, buildQevMothEvidence } from './qev_moth.mjs';
export { buildQevMothEvidence };

export const descriptor = Object.freeze({
  profileId: 'quantum-evidence.v0',
  sourceRepository: 'https://github.com/pipavlo82/quantum-execution-evidence',
  sourceCommit: '5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05',
  license: 'Apache-2.0; nested Semantic ABI Apache-2.0 / CC0-1.0', maturity: 'EXPERIMENTAL',
  capabilities: ['SYNTHETIC_FINITE_POSTPROCESSING', 'INDEPENDENT_REQUEST_BINDING'],
  requiredEvidence: ['qev-request', 'qev-package', 'synthetic-ordered-bit-lines'],
  nativeVocabulary: { input: ['VALID', 'INVALID', 'UNSUPPORTED'], relation: ['SATISFIED', 'REFUTED', 'CANNOT_ESTABLISH'], claim: ['ESTABLISHED_OVER_SUPPLIED_BYTES', 'NOT_ESTABLISHED'], provider: ['NOT_ESTABLISHED'] },
});
const limitations = [
  'Fresh SYNTHETIC finite postprocessing only; no provider captures or live hardware are used.',
  'Native provider authenticity, authentic QPU execution, entropy and device certification remain unestablished.',
  'Native Semantic ABI link compatibility does not establish physical truth or source authority.',
  'This narrow runtime does not claim the full upstream corpus, mutation gate or complete standalone source-lock check.',
];

export async function evaluateQev(input) {
  if (input?.profile === 'rvr-qev-moth-counts-v0') return evaluateQevMoth(input);
  const execution = await runNative('qev', { operation: 'evaluate', input });
  const parsed = parsedExecution(execution);
  const provenance = { ...descriptor, runtime: parsed?.runtime ?? null, functions: ['qev.checker.verify'] };
  if (!parsed) return { status: 'CANNOT_RECOMPUTE', reasonCodes: ['NATIVE_QEV_EXECUTION_UNAVAILABLE'], nativeResult: null, limitations, provenance, execution };
  if (!parsed.ok) return { status: 'REJECTED_MALFORMED', reasonCodes: [parsed.nativeError?.reason ?? 'NATIVE_QEV_INPUT_INVALID'], nativeResult: parsed.nativeError, limitations, provenance, execution };
  const nativeResult = parsed.value;
  let status;
  if (nativeResult.input_status === 'INVALID') status = 'REJECTED_MALFORMED';
  else if (nativeResult.input_status === 'UNSUPPORTED') status = 'UNSUPPORTED';
  else if ([nativeResult.integrity, nativeResult.request_binding, nativeResult.deterministic_verification].includes('REFUTED')) status = 'CONTRADICTED';
  else status = 'UNVERIFIABLE';
  return { status, reasonCodes: [...nativeResult.reasons, 'PROVIDER_AUTHENTICATION_NOT_ESTABLISHED'],
    nativeResult, providerAuthentication: nativeResult.provider_authenticity,
    limitations, provenance, execution };
}

export async function buildQevEvidence(options = {}) {
  const execution = await runNative('qev', { operation: 'build', options });
  const parsed = parsedExecution(execution);
  if (!parsed?.ok) throw new Error(`Native QEV synthetic construction failed: ${execution.stderr}`);
  return parsed.value;
}
