// Original neutral-spec reimplementation. No commercial/domain adapter is imported.
const SOURCE = 'd15c666dfccff17f7350fe97d2fc7b71cb2cbaee';
export const descriptor = Object.freeze({
  profileId: 'receiptos.verify.semantic-compatibility.v1', sourceRepository: 'trustless-ai/semantic-abi',
  sourceCommit: SOURCE, license: 'Apache-2.0 code; CC0-1.0 schema concepts', maturity: 'EXPERIMENTAL',
  mode: 'PUBLIC_NEUTRAL_SPEC_REIMPLEMENTATION_WITH_PRODUCT_EXTENSIONS',
  capabilities: ['exact-claim', 'observed-authority', 'exact-subject-scope', 'time', 'assumptions', 'actual-evidence-classes'],
  requiredEvidence: ['caller-established authority', 'caller-observed evidence classes'],
  nativeVocabulary: ['valid', 'TYPE_ERROR'],
});
const limitations = [
  'Public neutral linker semantics are reimplemented; the upstream runner is not executed.',
  'Subject, interval, assumption and actual-evidence checks are explicit ReceiptOS extensions, not upstream manifest wire conformance.',
  'Context is a caller-owned premise. Labels in a signed producer manifest do not establish authority or real-world truth.',
];
const equal = (a, b) => {
  const stable = x => x === null || typeof x !== 'object' ? JSON.stringify(x) : Array.isArray(x) ? '[' + x.map(stable).join(',') + ']' : '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + stable(x[k])).join(',') + '}';
  try { return stable(a) === stable(b); } catch { return false; }
};
const text = x => typeof x === 'string' && x.length > 0;
const strings = x => Array.isArray(x) && x.every(text) && new Set(x).size === x.length;
const has = (x, k) => Object.hasOwn(x ?? {}, k);
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const subject = x => text(x) || (record(x) && Object.keys(x).length > 0);
const authorities = new Set(['INDEPENDENT_JUDGMENT', 'CRYPTOGRAPHIC_VERIFICATION', 'EX_POST_VALIDATION', 'INFRASTRUCTURE_ATTESTATION', 'ONCHAIN_COMMITMENT', 'INDEPENDENT_RECOMPUTATION', 'KEY_BINDING_AUTHORITY', 'SEMANTIC_VERIFICATION']);
function result(status, reasons, established, required, dimensions = []) {
  return { status, reasonCodes: reasons, nativeResult: {
    valid: status === 'COMPATIBLE', error: status === 'INCOMPATIBLE' ? 'TYPE_ERROR' : null,
    edge: status === 'COMPATIBLE' ? { producer_claim: established, consumer_requirement: required } : null,
    counterexample: status === 'INCOMPATIBLE' ? { mismatched_dimensions: dimensions, producer_claim: established, consumer_requirement: required } : null,
  }, limitations: [...limitations], provenance: { ...descriptor } };
}

export function evaluateSemantic(established, required, context = {}) {
  if (!record(established) || !record(required)) return result('UNVERIFIABLE', ['SEMANTIC_CONTRACT_MISSING'], established ?? null, required ?? null);
  if (!record(context)) context = {};
  const missing = [], mismatches = [];
  for (const key of ['claim_type', 'authority_class']) {
    if (!text(established[key]) || !text(required[key])) missing.push(key);
  }
  for (const key of ['subject', 'scope']) {
    if (!subject(established[key]) || !subject(required[key])) missing.push(key);
    else if (!equal(established[key], required[key])) mismatches.push(key);
  }
  if (text(established.claim_type) && text(required.claim_type) && established.claim_type !== required.claim_type) mismatches.push('claim_type');
  // Preserve the upstream distinction between issued_at and verification_time.
  for (const key of ['issued_at', 'verification_time']) {
    if ((has(established, key) && !text(established[key])) || (has(required, key) && !text(required[key]))) missing.push('temporal_boundary');
    if (has(established, key) !== has(required, key) || (has(required, key) && !equal(established[key], required[key]))) mismatches.push('temporal_boundary');
  }
  if ((has(established, 'issued_at') && has(established, 'verification_time')) || (has(required, 'issued_at') && has(required, 'verification_time'))) missing.push('unique_temporal_boundary');
  const intervals = ['valid_after', 'valid_until'];
  for (const key of intervals) {
    if (!Number.isSafeInteger(established[key]) || established[key] < 0 || !Number.isSafeInteger(required[key]) || required[key] < 0) missing.push(key);
    else if (established[key] !== required[key]) mismatches.push('temporal_boundary');
  }
  if (Number.isSafeInteger(required.valid_after) && Number.isSafeInteger(required.valid_until) && required.valid_after > required.valid_until) missing.push('valid_interval');
  if (!Number.isSafeInteger(context.verification_time)) missing.push('observed_verification_time');
  else if (context.verification_time < required.valid_after || context.verification_time > required.valid_until) mismatches.push('temporal_boundary');
  const observedEvidence = strings(context.evidence_classes) ? context.evidence_classes : [];
  const exactRecomputation = established.authority_class === 'INDEPENDENT_RECOMPUTATION'
    && required.authority_class === 'SEMANTIC_VERIFICATION' && mismatches.length === 0
    && context.authority_class === 'INDEPENDENT_RECOMPUTATION' && observedEvidence.includes('execution');
  if (text(established.authority_class) && text(required.authority_class) && established.authority_class !== required.authority_class && !exactRecomputation) mismatches.push('authority_class');
  if (!text(context.authority_class)) missing.push('observed_authority');
  else if (context.authority_class !== established.authority_class) missing.push('established_authority');
  if (!authorities.has(established.authority_class) || !authorities.has(required.authority_class)) missing.push('supported_authority_class');
  if (has(context, 'evidence_subject') && !equal(context.evidence_subject, required.subject)) mismatches.push('evidence_subject');
  for (const claim of [established, required]) {
    if (!strings(claim.assumptions) || !strings(claim.evidence_requirements) || claim.evidence_requirements.length === 0) { missing.push('assumption_or_evidence_contract'); continue; }
    for (const a of claim.assumptions) if (!Array.isArray(context.established_assumptions) || !context.established_assumptions.includes(a)) missing.push('assumption:' + a);
    for (const e of claim.evidence_requirements) if (!observedEvidence.includes(e)) missing.push('evidence:' + e);
  }
  if (mismatches.length) return result('INCOMPATIBLE', ['SEMANTIC_REQUIREMENT_NOT_PRESERVED', ...new Set(mismatches.map(x => 'SEMANTIC_' + x.toUpperCase() + '_MISMATCH'))], established, required, [...new Set(mismatches)]);
  if (missing.length) return result('UNVERIFIABLE', ['SEMANTIC_PREMISE_UNESTABLISHED', ...new Set(missing.map(x => 'MISSING_' + x.toUpperCase()))], established, required);
  return result('COMPATIBLE', ['SEMANTIC_REQUIREMENT_ESTABLISHED'], established, required);
}
