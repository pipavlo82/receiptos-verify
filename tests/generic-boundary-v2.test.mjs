import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { baselineV2, trustlessV2, resignV2 } from '../tools/fixtures-v2.mjs';
import { fresh as independentV1 } from './helpers/independent-fixture.mjs';
import { verifyV2 } from '../src/core/verify-v2.mjs';
import { validateV2Schema } from '../src/core/admission-v2.mjs';

const clone = value => structuredClone(value);
const BASE = await baselineV2();
const POSITIVE = await verifyV2(BASE.request, BASE.bundle);
const check = pair => verifyV2(pair.request, pair.bundle);

test('v0.2 exact original A/A witness establishes all six mandatory layers', () => {
  assert.equal(POSITIVE.overall, 'VERIFIED');
  const expected = { INPUT: 'ADMITTED', CANONICALIZATION: 'VERIFIED', INTEGRITY: 'VERIFIED', AUTHENTICITY: 'VERIFIED', SUBJECT_BINDING: 'VERIFIED', RECOMPUTATION: 'REPRODUCED', EVIDENCE_SUFFICIENCY: 'SUFFICIENT', SEMANTIC_COMPATIBILITY: 'COMPATIBLE' };
  for (const [layer, status] of Object.entries(expected)) assert.equal(POSITIVE.layers[layer].status, status);
  assert.equal(POSITIVE.layers.RECOMPUTATION.semanticOutcome, 'VERIFIED');
  assert.equal(validateV2Schema('report', POSITIVE), true);
});

for (const [dimension, edit, expected, reason] of [
  ['claim identity', request => { request.claim.id = 'claim:B'; }, 'CONTRADICTED', 'CLAIM_MISMATCH'],
  ['claim predicate', request => { request.claim.parameters.expected_digest = '0'.repeat(64); }, 'CONTRADICTED', 'CLAIM_MISMATCH'],
  ['subject identity', request => { request.subject.id = 'subject:B'; }, 'CONTRADICTED', 'SUBJECT_MISMATCH'],
  ['same artifact wrong commit', request => { request.subject.commit = 'b'.repeat(40); }, 'CONTRADICTED', 'SUBJECT_MISMATCH'],
  ['same commit wrong artifact', request => { request.subject.artifact_digest = 'b'.repeat(64); }, 'CONTRADICTED', 'ARTIFACT_MISMATCH'],
  ['artifact tree', request => { request.subject.tree = 'b'.repeat(40); }, 'CONTRADICTED', 'ARTIFACT_MISMATCH'],
  ['artifact path', request => { request.subject.artifact_path = 'other.txt'; }, 'CONTRADICTED', 'ARTIFACT_MISMATCH'],
  ['subject version', request => { request.subject.version = '2'; }, 'CONTRADICTED', 'VERSION_MISMATCH'],
  ['authority identity', request => { request.authority.id = 'other-authority'; }, 'CONTRADICTED', 'AUTHORITY_MISMATCH'],
  ['authority class', request => { request.authority.class = 'INFRASTRUCTURE_ATTESTATION'; }, 'CONTRADICTED', 'AUTHORITY_MISMATCH'],
  ['requested broader scope', request => { request.scope = { artifact_path: '*' }; }, 'CONTRADICTED', 'SCOPE_MISMATCH'],
  ['policy identity', request => { request.policy.id = 'policy:B'; }, 'CONTRADICTED', 'POLICY_MISMATCH'],
  ['policy version', request => { request.policy.version = '3'; }, 'CONTRADICTED', 'POLICY_MISMATCH'],
  ['claim version', request => { request.version = '3'; }, 'CONTRADICTED', 'VERSION_MISMATCH'],
  ['time surface', request => { request.time.not_after = 101; }, 'CONTRADICTED', 'TIME_MISMATCH'],
  ['time upper endpoint is excluded', request => { request.policy.verification_time = 100; }, 'CONTRADICTED', 'TIME_MISMATCH'],
  ['assumption unestablished', request => { request.assumptions = ['independent-premise']; }, 'INSUFFICIENT_EVIDENCE', 'ASSUMPTION_UNESTABLISHED'],
  ['dependency missing', request => { request.dependencies = [{ id: 'independent-input', version: '1' }]; }, 'INSUFFICIENT_EVIDENCE', 'DEPENDENCY_MISSING'],
  ['dependency contradicted', request => { request.dependencies = [{ id: 'independent-input', version: '1' }]; request.policy.dependency_results = [{ id: 'independent-input', version: '1', status: 'CONTRADICTED' }]; }, 'CONTRADICTED', 'DEPENDENCY_CONTRADICTED'],
]) test(`v0.2 caller-selected ${dimension} remains independent of authenticated native PASS`, async () => {
  const pair = clone(BASE); edit(pair.request);
  const observed = await check(pair);
  assert.equal(observed.layers.INTEGRITY.status, 'VERIFIED');
  assert.equal(observed.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(observed.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.deepEqual(observed.layers.RECOMPUTATION.nativeResult, POSITIVE.layers.RECOMPUTATION.nativeResult);
  assert.deepEqual(observed.layers.RECOMPUTATION.nativeCanonicalResult, POSITIVE.layers.RECOMPUTATION.nativeCanonicalResult);
  assert.equal(observed.overall, expected);
  assert.ok(observed.reason_codes.includes(reason), JSON.stringify(observed.reason_codes));
  assert.equal(POSITIVE.overall, 'VERIFIED');
  assert.equal(validateV2Schema('report', observed), true);
});

test('v0.2 independent authority acceptance is required even with exact valid signature', async () => {
  const pair = clone(BASE); pair.request.policy.accepted_authorities = [];
  const observed = await check(pair);
  assert.equal(observed.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(observed.overall, 'CONTRADICTED');
  assert.ok(observed.reason_codes.includes('AUTHORITY_MISMATCH'));
});

test('v0.2 an absent trusted signer cannot authenticate the statement', async () => {
  const pair = clone(BASE); pair.request.policy.trusted_keys = [];
  const observed = await check(pair);
  assert.equal(observed.layers.AUTHENTICITY.status, 'NOT_ESTABLISHED');
  assert.equal(observed.overall, 'INSUFFICIENT_EVIDENCE');
});

test('v0.2 explanation never calls subject-mismatched evidence authenticated when signer is untrusted', async () => {
  const pair = clone(BASE); pair.request.policy.trusted_keys = []; pair.request.subject.id = 'untrusted-subject:B';
  const observed = await check(pair);
  assert.equal(observed.layers.AUTHENTICITY.status, 'NOT_ESTABLISHED');
  assert.equal(observed.overall, 'CONTRADICTED');
  assert.doesNotMatch(observed.explanation, /^Authenticated evidence/i);
});

test('v0.2 correctly reproduced negative native RVR evidence remains contradicted', async () => {
  const pair = await baselineV2({ negative: true });
  const observed = await check(pair);
  assert.equal(observed.layers.INTEGRITY.status, 'VERIFIED');
  assert.equal(observed.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(observed.layers.SUBJECT_BINDING.status, 'VERIFIED');
  assert.equal(observed.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(observed.layers.RECOMPUTATION.semanticOutcome, 'REFUTED');
  assert.equal(observed.overall, 'CONTRADICTED');
  assert.ok(observed.reason_codes.includes('NATIVE_NEGATIVE_RESULT'));
});

test('v0.2 empty evidence cannot certify a supplied native PASS payload', async () => {
  const pair = clone(BASE); pair.bundle.statement.evidence_manifest = []; pair.bundle.evidence = []; resignV2(pair);
  const observed = await check(pair);
  assert.equal(observed.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(observed.overall, 'INSUFFICIENT_EVIDENCE');
  assert.equal(observed.layers.EVIDENCE_SUFFICIENCY.status, 'INSUFFICIENT');
});

test('v0.2 missing committed attachment is unavailable recomputation, not contradiction', async () => {
  const pair = clone(BASE); pair.bundle.evidence = pair.bundle.evidence.filter(item => item.id !== 'adapter-input');
  const observed = await check(pair);
  assert.equal(observed.layers.RECOMPUTATION.status, 'CANNOT_RECOMPUTE');
  assert.equal(observed.overall, 'CANNOT_RECOMPUTE');
});

test('v0.2 null committed attachment stays unavailable evidence', async () => {
  const pair = clone(BASE); pair.bundle.evidence.find(item => item.id === 'adapter-input').bytes_base64 = null;
  const observed = await check(pair);
  assert.equal(observed.layers.RECOMPUTATION.status, 'CANNOT_RECOMPUTE');
  assert.equal(observed.overall, 'CANNOT_RECOMPUTE');
});

test('v0.2 unknown generic profile is unsupported after native observation is preserved', async () => {
  const pair = clone(BASE); pair.request.verification_profile = 'receiptos.verify.generic.v99';
  const observed = await check(pair);
  assert.equal(observed.overall, 'UNSUPPORTED_PROFILE');
  assert.deepEqual(observed.layers.RECOMPUTATION.nativeResult, POSITIVE.layers.RECOMPUTATION.nativeResult);
});

test('v0.2 unknown semantic profile cannot inherit native success', async () => {
  const pair = clone(BASE); pair.request.semantic_profile = 'receiptos.verify.semantic-abi.v99';
  const observed = await check(pair);
  assert.equal(observed.overall, 'UNSUPPORTED_PROFILE');
});

test('v0.2 unknown adapter stays unsupported rather than manufactured success', async () => {
  const pair = clone(BASE); pair.request.adapter = pair.bundle.statement.adapter = 'future-adapter'; resignV2(pair);
  const observed = await check(pair);
  assert.equal(observed.overall, 'UNSUPPORTED_PROFILE');
  assert.equal(observed.layers.RECOMPUTATION.status, 'UNSUPPORTED');
});

for (const [name, edit] of [
  ['null requested subject', pair => { pair.request.subject = null; }],
  ['absent requested subject', pair => { delete pair.request.subject; }],
  ['conflicting dependency policy', pair => { pair.request.policy.dependency_results = [{ id: 'd', version: '1', status: 'CONTRADICTED' }, { id: 'd', version: '1', status: 'SATISFIED' }]; }],
  ['duplicate authority identities', pair => { pair.request.policy.accepted_authorities.push({ id: 'synthetic-demo', class: 'CRYPTOGRAPHIC_VERIFICATION' }); }],
  ['duplicate evidence', pair => { pair.bundle.evidence.push(clone(pair.bundle.evidence[0])); }],
  ['unknown extra request field', pair => { pair.request.overall = 'VERIFIED'; }],
]) test(`v0.2 malformed ${name} never reaches semantic acceptance`, async () => {
  const pair = clone(BASE); edit(pair);
  const observed = await check(pair);
  assert.equal(observed.overall, 'REJECTED_MALFORMED');
  assert.equal(observed.layers.INPUT.status, 'REJECTED_MALFORMED');
  assert.equal(observed.layers.RECOMPUTATION.status, 'NOT_RUN');
});

test('v0.2 invalid UTF-8 and duplicate raw JSON members are rejected', async () => {
  for (const request of [Buffer.from([0xff]), '{"subject":{},"subject":{}}', 'null', '[]', '{}']) {
    const observed = await verifyV2(request, BASE.bundle);
    assert.equal(observed.overall, 'REJECTED_MALFORMED');
  }
});

test('v0.2 same native Trustless PASS survives unchanged under incompatible requested claim', async () => {
  const pair = await trustlessV2();
  const compatible = await check(pair);
  assert.equal(compatible.overall, 'VERIFIED');
  assert.equal(compatible.layers.RECOMPUTATION.nativeResult.verdict, 'PASS');
  assert.equal(compatible.layers.RECOMPUTATION.nativeResult.semanticVerdict, 'NO_FINDING');
  pair.request.claim.id = 'unestablished:poisoning-absent';
  const incompatible = await check(pair);
  assert.equal(incompatible.overall, 'CONTRADICTED');
  assert.ok(incompatible.reason_codes.includes('CLAIM_MISMATCH'));
  assert.deepEqual(incompatible.layers.RECOMPUTATION.nativeResult, compatible.layers.RECOMPUTATION.nativeResult);
});

test('v0.2 Trustless runner PASS on correctly reproduced negative stays negative', async () => {
  const pair = await trustlessV2({ negative: true });
  const observed = await check(pair);
  assert.equal(observed.layers.RECOMPUTATION.nativeResult.verdict, 'PASS');
  assert.equal(observed.layers.RECOMPUTATION.nativeResult.semanticVerdict, 'CONTRADICTED');
  assert.equal(observed.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(observed.overall, 'CONTRADICTED');
});

// Fresh source-independent v0.1 evidence is migrated with a separate canonical
// encoder, hash calculation, v0.2 surface construction and signature framing.
// The expected product verdicts below remain detached literal oracles.
function independentlyConvertedV2() {
  const old = independentV1('independent-v2-A');
  const canon = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value)
    ? '[' + value.map(canon).join(',') + ']'
    : '{' + Object.keys(value).sort().map(name => JSON.stringify(name) + ':' + canon(value[name])).join(',') + '}';
  const bytes = value => Buffer.from(canon(value));
  const sha = value => createHash('sha256').update(value).digest('hex');
  // Synthetic test-only seed. This key has no deployed authority.
  const key = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.alloc(32, 47)]), format: 'der', type: 'pkcs8' });
  const authority = { id: 'independent-v2-key', class: 'INDEPENDENT_RECOMPUTATION' };
  const policy = { id: 'independent-v2-policy', version: '2' };
  const surface = { claim: { id: 'independent-v2-predicate', kind: 'SHA256_EQUALS', parameters: { expected_digest: old.request.claim.expected_digest } }, subject: clone(old.request.subject), scope: { evidence_member: 'artifact' }, authority, policy, version: '2', time: { not_before: 0, not_after: 2000000000 }, assumptions: [], dependencies: [], evidence_requirements: ['artifact', 'adapter-input', 'execution'] };
  const request = { schema: 'receiptos.verify.request.v2', verification_profile: 'receiptos.verify.generic.v2', adapter: 'rvr', ...clone(surface), policy: { ...policy, trusted_keys: [{ id: authority.id, spki_base64: createPublicKey(key).export({ format: 'der', type: 'spki' }).toString('base64') }], required_layers: [], minimum_grade: 'LOCAL_RECOMPUTATION', verification_time: 1791676800, established_assumptions: [], dependency_results: [], accepted_authorities: [clone(authority)] }, evidence: [], requested_guarantees: [] };
  const payload = { crystal: old.bundle.payload.crystal, adapter: old.bundle.payload.rvr, guarantees: null, continuity: null };
  const adapterBytes = bytes(payload.adapter);
  const statement = { schema: 'receiptos.verify.statement.v2', verification_profile: request.verification_profile, surface: clone(surface), adapter: 'rvr', asserted_result: 'PASS', evidence_manifest: [...old.bundle.statement.evidence_manifest, { id: 'adapter-input', role: 'adapter-input', digest: sha(adapterBytes), size: adapterBytes.length }], payload_digest: sha(bytes(payload)), crypto: { provider: 'ed25519', key_id: authority.id } };
  const signingBytes = Buffer.concat([Buffer.from('receiptos.verify.statement.v2\0'), Buffer.from(sha(bytes(statement)), 'hex')]);
  const bundle = { schema: 'receiptos.verify.bundle.v2', canonicalization_profile: 'receiptos.verify.canonical-json.v1', statement, signature_base64: sign(null, signingBytes, key).toString('base64'), evidence: [...clone(old.bundle.evidence), { id: 'adapter-input', bytes_base64: adapterBytes.toString('base64') }], payload };
  return { request, bundle };
}

test('v0.2 detached canonical/signature/native fixture establishes A and rejects B', async () => {
  const pair = independentlyConvertedV2();
  const positive = await check(pair);
  assert.equal(positive.overall, 'VERIFIED', JSON.stringify(positive.reason_codes));
  assert.equal(positive.layers.AUTHENTICITY.status, 'VERIFIED');
  pair.request.subject.commit = 'b'.repeat(40);
  const negative = await check(pair);
  assert.equal(negative.overall, 'CONTRADICTED');
  assert.equal(negative.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(negative.layers.SUBJECT_BINDING.status, 'CONTRADICTED');
  assert.deepEqual(negative.layers.RECOMPUTATION.nativeResult, positive.layers.RECOMPUTATION.nativeResult);
});
