import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { evaluateXrplClaim } from '../src/adapters/xrpl-anchor.mjs';
import { compareClaimSurfaces } from '../src/core/claim-surface.mjs';

// The public transaction is replayed, never generated, signed or submitted.
// All expected statuses below are literal contract expectations; no captured
// A/B result or implementation-produced expectation is used as the oracle.
const captureBytes = readFileSync(new URL('../reports/xrpl-poc/testnet-capture.json', import.meta.url));
const capture = JSON.parse(captureBytes);
const policy = JSON.parse(readFileSync(new URL('../profiles/xrpl-poc-testnet-policy.json', import.meta.url), 'utf8'));
const TRANSACTION = '375AE7E0F1D1405E2356BD9ACB4EC0B59B9665E01CB1B10A95E4CDDE6AA98633';
const clone = value => structuredClone(value);
const fresh = () => ({
  input: { profile: capture.profile, receipt: clone(capture.receipt), claim_preimage: clone(capture.claim_preimage), observation: clone(capture.observation) },
  request: clone(capture.request_a),
  trust: {
    basis: 'ACCEPTED_CAPTURE_REPLAY', endpoint: policy.endpoint, network_id: policy.network_id,
    checkpoint: clone(policy.checkpoint), account: policy.account, transaction_hash: policy.transaction_hash,
    required_transaction_result: null,
    claim_context: { verification_time: policy.verification_time, established_assumptions: [], dependency_results: [], evidence_basis: ['receipt-root'] },
  },
});

test('XRPL context regression uses the unchanged public capture and original transaction', () => {
  assert.equal(createHash('sha256').update(captureBytes).digest('hex'), '7f7fa0ad162a5d619ff594e0aa562beb361fdd0d275821f7d1f0b2d54e7231ce');
  assert.equal(capture.observation.hash, TRANSACTION);
  assert.equal(policy.transaction_hash, TRANSACTION);
});

for (const [name, requested, supplied, status, reason] of [
  ['A/A exact identities', ['A'], ['A'], 'COMPATIBLE', null],
  ['A/AB distinct identities', ['A'], ['AB'], 'INSUFFICIENT_EVIDENCE', 'ASSUMPTION_UNESTABLISHED'],
  ['AB/A distinct identities', ['AB'], ['A'], 'INSUFFICIENT_EVIDENCE', 'ASSUMPTION_UNESTABLISHED'],
  ['A/raw string AB permanent cold-review witness', ['A'], 'AB', 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['A/raw string A is not an array', ['A'], 'A', 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['A/null context', ['A'], null, 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['A/empty identity', ['A'], [''], 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['A/nested array', ['A'], [['A']], 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['A/duplicate identities', ['A'], ['A', 'A'], 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['A/case mismatch', ['A'], ['a'], 'INSUFFICIENT_EVIDENCE', 'ASSUMPTION_UNESTABLISHED'],
  ['A/prefix mismatch', ['A'], ['prefix-A'], 'INSUFFICIENT_EVIDENCE', 'ASSUMPTION_UNESTABLISHED'],
  ['A/suffix mismatch', ['A'], ['A-suffix'], 'INSUFFICIENT_EVIDENCE', 'ASSUMPTION_UNESTABLISHED'],
  ['A/whitespace mismatch', ['A'], [' A '], 'INSUFFICIENT_EVIDENCE', 'ASSUMPTION_UNESTABLISHED'],
  ['A/missing premise', ['A'], [], 'INSUFFICIENT_EVIDENCE', 'ASSUMPTION_UNESTABLISHED'],
]) test(`XRPL direct API assumption ${name}`, async () => {
  const state = fresh();
  state.request.assumptions = requested;
  state.trust.claim_context.established_assumptions = supplied;
  const actual = await evaluateXrplClaim(state.input, state.request, state.trust);
  assert.equal(actual.anchor_native, 'ANCHOR_MATCH');
  assert.equal(actual.transaction_hash, TRANSACTION);
  assert.equal(actual.claim_relation.status, status);
  assert.equal(actual.overall, status === 'COMPATIBLE' ? 'CONTINUE_REQUIRED_LAYERS' : 'INSUFFICIENT_EVIDENCE');
  if (reason) assert.ok(actual.claim_relation.reasonCodes.includes(reason), JSON.stringify(actual.claim_relation));
});

for (const [name, supplied, status, reason] of [
  ['exact basis', ['receipt-root'], 'COMPATIBLE', null],
  ['raw string is not an array', 'receipt-root', 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['null basis', null, 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['empty identity', [''], 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['nested array', [['receipt-root']], 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['duplicate identities', ['receipt-root', 'receipt-root'], 'INSUFFICIENT_EVIDENCE', 'CLAIM_SURFACE_MALFORMED'],
  ['case mismatch', ['RECEIPT-ROOT'], 'INSUFFICIENT_EVIDENCE', 'EVIDENCE_BASIS_UNESTABLISHED'],
  ['prefix mismatch', ['prefix-receipt-root'], 'INSUFFICIENT_EVIDENCE', 'EVIDENCE_BASIS_UNESTABLISHED'],
  ['suffix mismatch', ['receipt-root-suffix'], 'INSUFFICIENT_EVIDENCE', 'EVIDENCE_BASIS_UNESTABLISHED'],
  ['missing evidence basis', [], 'INSUFFICIENT_EVIDENCE', 'EVIDENCE_BASIS_UNESTABLISHED'],
]) test(`XRPL direct API evidence basis ${name}`, async () => {
  const state = fresh(); state.trust.claim_context.evidence_basis = supplied;
  const actual = await evaluateXrplClaim(state.input, state.request, state.trust);
  assert.equal(actual.anchor_native, 'ANCHOR_MATCH');
  assert.equal(actual.transaction_hash, TRANSACTION);
  assert.equal(actual.claim_relation.status, status);
  assert.equal(actual.overall, status === 'COMPATIBLE' ? 'CONTINUE_REQUIRED_LAYERS' : 'INSUFFICIENT_EVIDENCE');
  if (reason) assert.ok(actual.claim_relation.reasonCodes.includes(reason), JSON.stringify(actual.claim_relation));
});

for (const [name, value] of [
  ['raw string', 'A'], ['null', null], ['empty identity', ['']], ['nested array', [['A']]],
  ['duplicate', ['A', 'A']], ['number', [1]],
]) test(`XRPL direct API rejects requested assumption ${name}`, async () => {
  const state = fresh(); state.request.assumptions = value;
  state.trust.claim_context.established_assumptions = ['A'];
  const actual = await evaluateXrplClaim(state.input, state.request, state.trust);
  assert.equal(actual.anchor_native, 'ANCHOR_MATCH');
  assert.equal(actual.overall, 'REJECTED_MALFORMED');
});

const invalidLists = [
  ['string', 'AB'], ['null', null], ['empty string', ['']], ['nested', [['A']]],
  ['duplicate', ['A', 'A']], ['number', [1]], ['too many', Array.from({ length: 65 }, (_, i) => `A${i}`)],
  ['too long', ['A'.repeat(1025)]],
];
for (const field of ['assumptions', 'evidence_requirements']) {
  for (const side of ['requested', 'evidence']) {
    test(`claim relation rejects malformed ${side}.${field} without an outer schema`, () => {
      for (const [name, value] of invalidLists) {
        const requested = clone(capture.request_a), evidence = clone(capture.request_a);
        (side === 'requested' ? requested : evidence)[field] = value;
        const actual = compareClaimSurfaces(requested, evidence, { verification_time: 1, established_assumptions: ['A'], evidence_basis: ['receipt-root', 'A'] });
        assert.equal(actual.status, 'INSUFFICIENT_EVIDENCE', name);
        assert.ok(actual.reasonCodes.includes('CLAIM_SURFACE_MALFORMED'), name);
      }
    });
  }
}

for (const field of ['established_assumptions', 'evidence_basis']) test(`claim relation rejects malformed context.${field}`, () => {
  for (const [name, value] of invalidLists) {
    const context = { verification_time: 1, established_assumptions: [], evidence_basis: ['receipt-root'], [field]: value };
    const actual = compareClaimSurfaces(capture.request_a, capture.request_a, context);
    assert.equal(actual.status, 'INSUFFICIENT_EVIDENCE', name);
    assert.ok(actual.reasonCodes.includes('CLAIM_SURFACE_MALFORMED'), name);
  }
});

for (const side of ['requested', 'evidence']) test(`claim relation rejects empty ${side}.evidence_requirements`, () => {
  const requested = clone(capture.request_a), evidence = clone(capture.request_a);
  (side === 'requested' ? requested : evidence).evidence_requirements = [];
  const actual = compareClaimSurfaces(requested, evidence, { verification_time: 1, evidence_basis: ['receipt-root'] });
  assert.equal(actual.status, 'INSUFFICIENT_EVIDENCE');
  assert.ok(actual.reasonCodes.includes('CLAIM_SURFACE_MALFORMED'));
});

test('claim relation permits absent context identity lists as empty premises, without treating null as absent', () => {
  const requested = clone(capture.request_a), evidence = clone(capture.request_a);
  const actual = compareClaimSurfaces(requested, evidence, { verification_time: 1 });
  assert.equal(actual.dimensions.assumptions.status, 'COMPATIBLE');
  assert.equal(actual.dimensions.evidence_basis.status, 'INSUFFICIENT_EVIDENCE');
  assert.ok(!actual.reasonCodes.includes('CLAIM_SURFACE_MALFORMED'));
});

for (const [required, supplied, expected] of [
  ['A', ['A'], 'COMPATIBLE'], ['A', ['AB'], 'INSUFFICIENT_EVIDENCE'], ['AB', ['A'], 'INSUFFICIENT_EVIDENCE'],
  ['A', 'AB', 'INSUFFICIENT_EVIDENCE'], ['A', ['a'], 'INSUFFICIENT_EVIDENCE'],
]) test(`claim relation evidence requirement ${required}/${JSON.stringify(supplied)} is exact`, () => {
  const requested = clone(capture.request_a), evidence = clone(capture.request_a);
  requested.evidence_requirements = [required]; evidence.evidence_requirements = [required];
  const actual = compareClaimSurfaces(requested, evidence, { verification_time: 1, evidence_basis: supplied });
  assert.equal(actual.status, expected);
  if (!Array.isArray(supplied)) assert.ok(actual.reasonCodes.includes('CLAIM_SURFACE_MALFORMED'));
});
