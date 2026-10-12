import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { evaluateSemanticAbi, descriptor } from '../src/adapters/semantic-abi-v2.mjs';

const clone = value => structuredClone(value);
function surface() {
  return {
    claim: { id: 'claim:result', kind: 'relation', parameters: { operation: 'transfer' } },
    subject: { kind: 'artifact', id: 'synthetic:subject:A', version: '1', artifact_digest: 'a'.repeat(64) },
    scope: { action: 'transfer', target: 'synthetic:account:A' },
    authority: { id: 'synthetic:operator', class: 'INDEPENDENT_RECOMPUTATION' },
    policy: { id: 'synthetic:policy', version: '1' },
    version: '1',
    time: { not_before: 0, not_after: 100 },
    assumptions: [],
    dependencies: [{ id: 'synthetic:dependency', version: '1' }],
    evidence_requirements: ['execution'],
  };
}
function context() {
  return {
    verification_time: 50,
    established_assumptions: [],
    dependency_results: [{ id: 'synthetic:dependency', version: '1', status: 'SATISFIED' }],
    evidence_basis: ['execution'],
  };
}
function check(expected, observed, cx = context()) {
  return evaluateSemanticAbi({ expected, observed, context: cx });
}

test('v0.2 executes the pinned neutral linker and preserves exact native fields', () => {
  const s = surface(), r = check(s, clone(s));
  assert.equal(r.status, 'COMPATIBLE');
  assert.equal(r.nativeResult.manifest_validation.producer.valid, true);
  assert.equal(r.nativeResult.manifest_validation.consumer.valid, true);
  assert.equal(r.nativeResult.link.valid, true);
  assert.deepEqual(r.nativeResult.link.edge.consumer_requirement, r.nativeResult.link.edge.producer_claim);
  assert.equal(r.observedSemanticPair, 'PRESERVED');
  assert.equal(r.expectedSemanticPair, null);
  assert.equal(r.nativeResult.pair_evaluation, null);
  assert.deepEqual(r.requestedSurface, s);
  assert.deepEqual(r.evidenceSurface, s);
  assert.equal(descriptor.integrationMode, 'PINNED_SOURCE');
  assert.equal(descriptor.maturity, 'EXPERIMENTAL');
});

for (const [name, edit, reason, nativeValid] of [
  ['subject', s => { s.subject.id = 'synthetic:subject:B'; }, 'SUBJECT_MISMATCH', true],
  ['artifact', s => { s.subject.artifact_digest = 'b'.repeat(64); }, 'ARTIFACT_MISMATCH', true],
  ['authority identity', s => { s.authority.id = 'synthetic:other-authority'; }, 'AUTHORITY_MISMATCH', true],
  ['authority class', s => { s.authority.class = 'INFRASTRUCTURE_ATTESTATION'; }, 'AUTHORITY_MISMATCH', false],
  ['broader requested scope', s => { s.scope.target = '*'; }, 'SCOPE_MISMATCH', false],
  ['policy', s => { s.policy.id = 'synthetic:other-policy'; }, 'POLICY_MISMATCH', true],
  ['policy version', s => { s.policy.version = '2'; }, 'POLICY_MISMATCH', true],
  ['claim version', s => { s.version = '2'; }, 'VERSION_MISMATCH', true],
  ['claim', s => { s.claim.id = 'claim:other-result'; }, 'CLAIM_MISMATCH', false],
  ['time identity', s => { s.time.not_after = 101; }, 'TIME_MISMATCH', false],
]) test(`v0.2 native edge cannot override product ${name} mismatch`, () => {
  const observed = surface(), expected = clone(observed); edit(expected);
  const r = check(expected, observed);
  assert.equal(r.status, 'CONTRADICTED');
  assert.ok(r.reasonCodes.includes(reason), JSON.stringify(r.reasonCodes));
  assert.equal(r.nativeResult.link.valid, nativeValid);
  assert.equal(check(observed, clone(observed)).status, 'COMPATIBLE');
});

test('v0.2 missing dependency is not supplied by a producer declaration', () => {
  const s = surface(), cx = context(); cx.dependency_results = [];
  const r = check(s, clone(s), cx);
  assert.equal(r.status, 'INSUFFICIENT_EVIDENCE');
  assert.ok(r.reasonCodes.includes('DEPENDENCY_MISSING'));
  assert.equal(r.nativeResult.link.valid, true);
  assert.equal(check(s, clone(s)).status, 'COMPATIBLE');
});

test('v0.2 contradictory dependency is preserved separately from native compatible edge', () => {
  const s = surface(), cx = context(); cx.dependency_results[0].status = 'CONTRADICTED';
  const r = check(s, clone(s), cx);
  assert.equal(r.status, 'CONTRADICTED');
  assert.ok(r.reasonCodes.includes('DEPENDENCY_CONTRADICTED'));
  assert.equal(r.observedSemanticPair, 'PRESERVED');
  assert.equal(check(s, clone(s)).status, 'COMPATIBLE');
});

test('v0.2 accepted evidence basis is an independent premise', () => {
  const s = surface(), cx = context(); cx.evidence_basis = [];
  const r = check(s, clone(s), cx);
  assert.equal(r.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(r.nativeResult.link.valid, true);
  assert.equal(check(s, clone(s)).status, 'COMPATIBLE');
});

test('v0.2 equal artifact hash never overrides an incompatible semantic declaration', () => {
  const observed = surface(), expected = clone(observed); expected.scope.target = '*';
  assert.equal(expected.subject.artifact_digest, observed.subject.artifact_digest);
  const r = check(expected, observed);
  assert.equal(r.status, 'CONTRADICTED');
  assert.ok(r.reasonCodes.includes('SCOPE_MISMATCH'));
  assert.equal(r.nativeResult.link.error, 'TYPE_ERROR');
});

test('v0.2 pair-conformance PASS on an observed negative remains product contradiction', () => {
  const observed = surface(), expected = clone(observed); expected.scope.target = '*';
  const cx = { ...context(), expected_pair: 'VIOLATED', vector_id: 'detached-negative-scope-oracle' };
  const r = check(expected, observed, cx);
  assert.equal(r.expectedSemanticPair, 'VIOLATED');
  assert.equal(r.observedSemanticPair, 'VIOLATED');
  assert.equal(r.nativeResult.pair_evaluation.backend_conformance, 'PASS');
  assert.equal(r.status, 'CONTRADICTED');
  const wrongOracle = check(expected, observed, { ...cx, expected_pair: 'PRESERVED' });
  assert.equal(wrongOracle.nativeResult.pair_evaluation.backend_conformance, 'FAIL');
  assert.equal(wrongOracle.status, 'CONTRADICTED');
});

test('v0.2 native bounded recomputation coercion does not widen the product authority relation', () => {
  const observed = surface(), expected = clone(observed);
  expected.authority.class = 'SEMANTIC_VERIFICATION';
  const r = check(expected, observed);
  assert.equal(r.nativeResult.link.valid, true);
  assert.equal(r.observedSemanticPair, 'PRESERVED');
  assert.equal(r.status, 'CONTRADICTED');
  assert.ok(r.reasonCodes.includes('AUTHORITY_MISMATCH'));
});

test('v0.2 unsupported authority vocabulary is not an executable compatible declaration', () => {
  const s = surface(); s.authority.class = 'TRUST_ME';
  const r = check(s, clone(s));
  assert.notEqual(r.status, 'COMPATIBLE');
  assert.equal(r.nativeResult.link, null);
  assert.equal(r.observedSemanticPair, 'UNVERIFIABLE');
  assert.ok(r.reasonCodes.includes('SEMANTIC_ABI_AUTHORITY_UNSUPPORTED'));
});

test('v0.2 does not upgrade native validity with an unsupported pair oracle', () => {
  const s = surface();
  const r = check(s, clone(s), { ...context(), expected_pair: 'VERIFIED' });
  assert.equal(r.status, 'UNSUPPORTED');
  assert.equal(r.nativeResult.link.valid, true);
  assert.equal(r.nativeResult.pair_evaluation, null);
});

test('v0.2 vendored neutral runtime equals source-pinned bytes', async () => {
  const provenance = JSON.parse(await readFile(new URL('../provenance/v02-semantic-abi.json', import.meta.url), 'utf8'));
  assert.equal(provenance.sourceSHA, descriptor.sourceCommit);
  assert.equal(provenance.copiedFiles.length, 5);
  for (const file of provenance.copiedFiles) {
    const bytes = await readFile(new URL('../' + file.productPath, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.productPath);
  }
});
