import test from 'node:test';
import assert from 'node:assert/strict';
import { admitV2, validateV2Schema } from '../src/core/admission-v2.mjs';
import { parseStrict } from '../src/core/strict-json.mjs';

const clone = value => structuredClone(value);
const LAYERS = ['INPUT', 'CANONICALIZATION', 'INTEGRITY', 'AUTHENTICITY', 'SUBJECT_BINDING', 'RECOMPUTATION', 'EVIDENCE_SUFFICIENCY', 'SEMANTIC_COMPATIBILITY', 'GUARANTEE_PRESERVATION', 'CONTINUITY', 'DOMAIN_ADAPTERS', 'PRODUCT_PROJECTION', 'EXPLAINABLE_REPORT', 'PROVENANCE'];
const digest = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
function surface() {
  return {
    claim: { id: 'synthetic:claim', kind: 'relation', parameters: { operation: 'echo' } },
    subject: { kind: 'saved-observation', id: 'synthetic:subject', version: '1', artifact_digest: digest },
    scope: { operation: 'echo' },
    authority: { id: 'synthetic:key', class: 'INDEPENDENT_RECOMPUTATION' },
    policy: { id: 'synthetic:policy', version: '1' }, version: '1',
    time: { not_before: 0, not_after: 100 }, assumptions: [],
    dependencies: [{ id: 'synthetic:input', version: '1' }], evidence_requirements: ['artifact', 'execution'],
  };
}
function fixture() {
  const s = surface();
  return {
    request: {
      schema: 'receiptos.verify.request.v2', verification_profile: 'receiptos.verify.generic.v2', adapter: 'rvr', ...clone(s),
      policy: { ...s.policy, trusted_keys: [{ id: 'synthetic:key', spki_base64: 'AA==' }], required_layers: [], minimum_grade: 'LOCAL_RECOMPUTATION', verification_time: 50, established_assumptions: [], dependency_results: [{ id: 'synthetic:input', version: '1', status: 'SATISFIED' }], accepted_authorities: [clone(s.authority)] },
      evidence: ['artifact'], requested_guarantees: [],
    },
    bundle: {
      schema: 'receiptos.verify.bundle.v2', canonicalization_profile: 'receiptos.verify.canonical-json.v1',
      statement: { schema: 'receiptos.verify.statement.v2', verification_profile: 'receiptos.verify.generic.v2', surface: clone(s), adapter: 'rvr', asserted_result: 'PASS', evidence_manifest: [{ id: 'artifact', role: 'artifact', digest, size: 5 }], payload_digest: 'a'.repeat(64), crypto: { provider: 'ed25519', key_id: 'synthetic:key' } },
      signature_base64: '', evidence: [{ id: 'artifact', bytes_base64: 'aGVsbG8=' }],
      payload: { crystal: {}, adapter: {}, guarantees: null, continuity: null },
    },
  };
}
function rejects(edit, code) {
  const f = fixture(); edit(f);
  assert.throws(() => admitV2(f.request, f.bundle), error => typeof error.code === 'string' && (!code || error.code === code));
  const positive = fixture(); assert.equal(admitV2(positive.request, positive.bundle), true);
}

test('v0.2 admission accepts generic shape without asserting integrity or authenticity', () => {
  const f = fixture();
  assert.equal(admitV2(f.request, f.bundle), true);
  assert.equal(validateV2Schema('surface', f.bundle.statement.surface), true);
  // Empty signature and a structurally encoded non-key remain authenticity-layer
  // concerns; shape admission is deliberately not a product success verdict.
  assert.equal(f.bundle.signature_base64, '');
});

for (const field of ['claim', 'subject', 'scope', 'authority', 'policy', 'version', 'time', 'assumptions', 'dependencies', 'evidence_requirements']) {
  test(`v0.2 admission requires request ${field}`, () => rejects(f => { delete f.request[field]; }, 'SCHEMA_MISMATCH'));
  test(`v0.2 admission requires signed evidence ${field}`, () => rejects(f => { delete f.bundle.statement.surface[field]; }, 'SCHEMA_MISMATCH'));
}

for (const [name, edit, code] of [
  ['duplicate request dependency', f => { f.request.dependencies.push({ id: 'synthetic:input', version: '2' }); }, 'DEPENDENCY_ID_DUPLICATE'],
  ['duplicate evidence dependency', f => { f.bundle.statement.surface.dependencies.push({ id: 'synthetic:input', version: '2' }); }, 'DEPENDENCY_ID_DUPLICATE'],
  ['conflicting dependency premises', f => { f.request.policy.dependency_results.push({ id: 'synthetic:input', version: '1', status: 'CONTRADICTED' }); }, 'DEPENDENCY_RESULT_ID_DUPLICATE'],
  ['reversed conflicting dependency premises', f => { f.request.policy.dependency_results.unshift({ id: 'synthetic:input', version: '1', status: 'CONTRADICTED' }); }, 'DEPENDENCY_RESULT_ID_DUPLICATE'],
  ['duplicate dependency premise versions', f => { f.request.policy.dependency_results.push({ id: 'synthetic:input', version: '2', status: 'SATISFIED' }); }, 'DEPENDENCY_RESULT_ID_DUPLICATE'],
  ['duplicate trust key IDs', f => { f.request.policy.trusted_keys.push({ id: 'synthetic:key', spki_base64: 'AQ==' }); }, 'TRUST_KEY_ID_DUPLICATE'],
  ['duplicate accepted authority IDs', f => { f.request.policy.accepted_authorities.push({ id: 'synthetic:key', class: 'INFRASTRUCTURE_ATTESTATION' }); }, 'AUTHORITY_ID_DUPLICATE'],
  ['duplicate manifest IDs', f => { f.bundle.statement.evidence_manifest.push({ id: 'artifact', role: 'other', digest, size: 5 }); }, 'DUPLICATE_EVIDENCE'],
  ['duplicate attachment IDs', f => { f.bundle.evidence.push({ id: 'artifact', bytes_base64: 'AQ==' }); }, 'DUPLICATE_EVIDENCE'],
  ['duplicate singular evidence role', f => { f.bundle.statement.evidence_manifest.push({ id: 'other', role: 'artifact', digest, size: 5 }); }, 'AMBIGUOUS_EVIDENCE_ROLE'],
  ['duplicate guarantee identity', f => { f.request.requested_guarantees = [{ id: 'same', version: '1' }, { id: 'same', version: '2' }]; }, 'GUARANTEE_ID_DUPLICATE'],
  ['duplicate requested evidence IDs', f => { f.request.evidence.push('artifact'); }, 'SCHEMA_MISMATCH'],
  ['duplicate assumptions', f => { f.request.assumptions = ['premise', 'premise']; }, 'SCHEMA_MISMATCH'],
  ['duplicate evidence requirements', f => { f.request.evidence_requirements.push('artifact'); }, 'SCHEMA_MISMATCH'],
  ['empty evidence requirements', f => { f.request.evidence_requirements = []; }, 'SCHEMA_MISMATCH'],
  ['unknown extra request field', f => { f.request.expected_verdict = 'VERIFIED'; }, 'SCHEMA_MISMATCH'],
  ['unknown extra statement field', f => { f.bundle.statement.subject = clone(f.bundle.statement.surface.subject); }, 'SCHEMA_MISMATCH'],
  ['unsafe timestamp', f => { f.request.time.not_after = Number.MAX_SAFE_INTEGER + 1; }, 'UNSAFE_JSON_NUMBER'],
  ['empty time interval', f => { f.request.time.not_after = 0; }, 'TIME_INTERVAL_MALFORMED'],
  ['reversed evidence time interval', f => { f.bundle.statement.surface.time = { not_before: 2, not_after: 1 }; }, 'TIME_INTERVAL_MALFORMED'],
  ['negative timestamp', f => { f.request.time.not_before = -1; }, 'SCHEMA_MISMATCH'],
  ['malformed artifact hash', f => { f.request.subject.artifact_digest = 'abc'; }, 'SCHEMA_MISMATCH'],
  ['uppercase artifact hash', f => { f.request.subject.artifact_digest = 'A'.repeat(64); }, 'SCHEMA_MISMATCH'],
  ['malformed commit', f => { f.request.subject.commit = 'a'.repeat(39); }, 'SCHEMA_MISMATCH'],
  ['noncanonical base64 padding bits', f => { f.bundle.signature_base64 = 'AB=='; }, 'INVALID_BASE64'],
  ['malformed base64 attachment', f => { f.bundle.evidence[0].bytes_base64 = '*'; }, 'SCHEMA_MISMATCH'],
  ['metadata layer consumer obligation', f => { f.request.policy.required_layers = ['PROVENANCE']; }, 'SCHEMA_MISMATCH'],
  ['unknown consumer layer', f => { f.request.policy.required_layers = ['CERTIFIED']; }, 'SCHEMA_MISMATCH'],
  ['overlong subject identifier', f => { f.request.subject.id = 'x'.repeat(1025); }, 'SCHEMA_MISMATCH'],
  ['NaN parameter', f => { f.request.claim.parameters.value = NaN; }, 'UNSAFE_JSON_NUMBER'],
  ['Infinity parameter', f => { f.request.claim.parameters.value = Infinity; }, 'UNSAFE_JSON_NUMBER'],
  ['negative zero parameter', f => { f.request.claim.parameters.value = -0; }, 'UNSAFE_JSON_NUMBER'],
  ['accessor input', f => { Object.defineProperty(f.request.subject, 'id', { enumerable: true, get() { throw new Error('must not run'); } }); }, 'NON_JSON_VALUE'],
  ['sparse dependency array', f => { f.request.dependencies.length = 2; }, 'NON_JSON_VALUE'],
]) test(`v0.2 admission rejects ${name}`, () => rejects(edit, code));

for (const path of ['../secret', './artifact', 'path/../artifact', '/absolute', 'C:/secret', 'file://secret', 'https://example.test/data', 'path\\artifact', 'path//artifact', 'path/%2e%2e/artifact']) {
  test(`v0.2 admission rejects unsafe artifact path ${path}`, () => rejects(f => { f.request.subject.artifact_path = path; }));
}

test('v0.2 admission allows bounded unknown adapters/profiles for explicit unsupported projection', () => {
  const f = fixture();
  f.request.adapter = f.bundle.statement.adapter = 'future-adapter';
  f.request.verification_profile = f.bundle.statement.verification_profile = 'future-profile';
  f.request.semantic_profile = 'future-semantic-profile';
  assert.equal(admitV2(f.request, f.bundle), true);
});

test('v0.2 admission preserves unavailable/null and empty evidence for insufficiency layers', () => {
  const f = fixture(); f.bundle.evidence[0].bytes_base64 = null;
  assert.equal(admitV2(f.request, f.bundle), true);
  f.bundle.evidence = []; f.bundle.statement.evidence_manifest = []; f.request.evidence = [];
  assert.equal(admitV2(f.request, f.bundle), true);
});

test('v0.2 identifiers preserve exact legal Unicode without normalization aliases', () => {
  const f = fixture(); f.request.subject.id = 'subject:é'; f.bundle.statement.surface.subject.id = 'subject:e\u0301';
  assert.equal(admitV2(f.request, f.bundle), true);
  assert.notEqual(f.request.subject.id, f.bundle.statement.surface.subject.id);
});

test('v0.2 raw JSON duplicate semantic members are refused before admission', () => {
  assert.throws(() => parseStrict('{"subject":{"id":"A","id":"B"}}'), { code: 'DUPLICATE_JSON_KEY' });
  assert.throws(() => parseStrict('{"authority":{},"\\u0061uthority":{}}'), { code: 'DUPLICATE_JSON_KEY' });
});

test('v0.2 report schema requires exact named fourteen-layer inventory and finite overall status', () => {
  const report = { schema: 'receiptos.verify.report.v2', projection_version: 'receiptos.verify.projection.v2', overall: 'INSUFFICIENT_EVIDENCE', reason_codes: [], explanation: 'Synthetic admission only.', required_layers: ['INTEGRITY'], layers: Object.fromEntries(LAYERS.map(name => [name, { status: 'NOT_RUN', reasonCodes: [], nativeResult: null }])), boundaries: ['Integrity is not semantic authority.'] };
  assert.equal(validateV2Schema('report', report), true);
  const absent = clone(report); delete absent.layers.SUBJECT_BINDING;
  assert.throws(() => validateV2Schema('report', absent), { code: 'SCHEMA_MISMATCH' });
  const renamed = clone(report); renamed.layers.WRONG_NAME = renamed.layers.SUBJECT_BINDING; delete renamed.layers.SUBJECT_BINDING;
  assert.throws(() => validateV2Schema('report', renamed), { code: 'SCHEMA_MISMATCH' });
  const overclaim = clone(report); overclaim.overall = 'CERTIFIED';
  assert.throws(() => validateV2Schema('report', overclaim), { code: 'SCHEMA_MISMATCH' });
  const extra = clone(report); extra.certified = true;
  assert.throws(() => validateV2Schema('report', extra), { code: 'SCHEMA_MISMATCH' });
});

test('v0.2 admission fails closed for wrong root types and unsupported schema validator names', () => {
  const f = fixture();
  for (const value of [null, [], {}, 0, false, '']) assert.throws(() => admitV2(value, f.bundle), { code: 'SCHEMA_MISMATCH' });
  for (const value of [null, [], {}, 0, false, '']) assert.throws(() => admitV2(f.request, value), { code: 'SCHEMA_MISMATCH' });
  assert.throws(() => validateV2Schema('constructor', f.request), { code: 'SCHEMA_VALIDATOR_UNSUPPORTED' });
});
