import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { projectV2, SUCCESS_V2, REQUIRED_V2 } from '../src/projection/project-v2.mjs';

const table = JSON.parse(await readFile(new URL('../profiles/product-projection-v2.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
function positive() {
  const layers = Object.fromEntries(Object.entries(table.base_case.statuses).map(([name, status]) => [name, { status, reasonCodes: [], nativeResult: null }]));
  layers.RECOMPUTATION.semanticOutcome = 'VERIFIED';
  return layers;
}

test('v0.2 projection success mapping agrees with the independently specified table', () => {
  assert.deepEqual(SUCCESS_V2, table.success_statuses);
  assert.deepEqual(REQUIRED_V2, table.mandatory_layers);
  assert.equal(table.literal_cases.length, 46);
  assert.equal(projectV2(positive(), []).status, 'VERIFIED');
});

for (const vector of table.literal_cases) test(`v0.2 projection literal witness ${vector.id}`, () => {
  const layers = positive();
  for (const [name, patch] of Object.entries(vector.patches)) Object.assign(layers[name], clone(patch));
  assert.equal(projectV2(layers, vector.required, vector.supported).status, vector.expected);
  assert.equal(projectV2(positive(), []).status, 'VERIFIED');
});

for (const [name, edit] of [
  ['missing layer', layers => { delete layers.SUBJECT_BINDING; }],
  ['renamed layer', layers => { layers.WRONG_NAME = layers.SUBJECT_BINDING; delete layers.SUBJECT_BINDING; }],
  ['extra layer', layers => { layers.EXTRA = { status: 'VERIFIED', reasonCodes: [], nativeResult: null }; }],
  ['missing native result', layers => { delete layers.INTEGRITY.nativeResult; }],
  ['missing status', layers => { delete layers.INTEGRITY.status; }],
  ['string reason array', layers => { layers.AUTHENTICITY.reasonCodes = 'VERIFIED'; }],
  ['holey reason array', layers => { layers.AUTHENTICITY.reasonCodes = Array(1); }],
  ['unsupported native semantic outcome', layers => { layers.RECOMPUTATION.semanticOutcome = 'PASS'; }],
  ['Boolean native semantic outcome', layers => { layers.RECOMPUTATION.semanticOutcome = true; }],
  ['extra hidden member', layers => { Object.defineProperty(layers.AUTHENTICITY, 'hidden', { value: true }); }],
  ['symbol member', layers => { layers.AUTHENTICITY[Symbol('forged')] = true; }],
  ['status accessor', layers => { Object.defineProperty(layers.AUTHENTICITY, 'status', { enumerable: true, get() { throw new Error('getter must not run'); } }); }],
  ['semantic-outcome accessor', layers => { Object.defineProperty(layers.RECOMPUTATION, 'semanticOutcome', { enumerable: true, get() { throw new Error('getter must not run'); } }); }],
]) test(`v0.2 projection rejects malformed ${name}`, () => {
  const layers = positive(); edit(layers);
  const actual = projectV2(layers, []);
  assert.equal(actual.status, 'REJECTED_MALFORMED');
  assert.ok(actual.reasonCodes.includes('PROJECTION_INPUT_MALFORMED'));
  assert.equal(projectV2(positive(), []).status, 'VERIFIED');
});

test('v0.2 projection requires explicit known obligations and Boolean support flag', () => {
  for (const required of [null, {}, 'INTEGRITY', ['INPUT'], ['UNKNOWN'], [true]]) assert.equal(projectV2(positive(), required).status, 'REJECTED_MALFORMED');
  for (const supported of [null, 1, 'true', {}]) assert.equal(projectV2(positive(), [], supported).status, 'REJECTED_MALFORMED');
});

test('v0.2 projection rejects sparse obligations without throwing', () => {
  assert.equal(projectV2(positive(), Array(1)).status, 'REJECTED_MALFORMED');
});

test('v0.2 projection rejects accessor obligations without executing them', () => {
  let calls = 0;
  const required = [];
  Object.defineProperty(required, '0', { enumerable: true, get() { calls++; throw new Error('must not run'); } });
  required.length = 1;
  assert.equal(projectV2(positive(), required).status, 'REJECTED_MALFORMED');
  assert.equal(calls, 0);
});

test('v0.2 projection rejects duplicate obligations', () => {
  assert.equal(projectV2(positive(), ['INTEGRITY', 'INTEGRITY']).status, 'REJECTED_MALFORMED');
  assert.equal(projectV2(positive(), ['INTEGRITY']).status, 'VERIFIED');
});

test('v0.2 projection never treats an empty consumer obligation list as zero verification obligations', () => {
  const layers = positive();
  for (const name of ['INTEGRITY', 'AUTHENTICITY', 'SUBJECT_BINDING', 'RECOMPUTATION', 'EVIDENCE_SUFFICIENCY', 'SEMANTIC_COMPATIBILITY']) layers[name].status = 'NOT_RUN';
  assert.equal(projectV2(layers, []).status, 'INSUFFICIENT_EVIDENCE');
});

test('v0.2 projection refuses to promote absent native semantic outcome', () => {
  const layers = positive(); delete layers.RECOMPUTATION.semanticOutcome;
  layers.RECOMPUTATION.nativeResult = { verdict: 'PASS', runner: 'declared', exitCode: 0, package_present: true };
  assert.equal(projectV2(layers, []).status, 'INSUFFICIENT_EVIDENCE');
});

test('v0.2 projection preserves a crashed checker as unavailable computation', () => {
  const layers = positive();
  layers.RECOMPUTATION = { status: 'CANNOT_RECOMPUTE', reasonCodes: ['CHECKER_CRASH'], nativeResult: { exitCode: 1 }, semanticOutcome: 'UNVERIFIABLE' };
  assert.equal(projectV2(layers, []).status, 'CANNOT_RECOMPUTE');
  assert.notEqual(projectV2(layers, []).status, 'CONTRADICTED');
});

test('v0.2 projection keeps provider authentication NOT_ESTABLISHED insufficient when domain is required', () => {
  const layers = positive(); layers.DOMAIN_ADAPTERS = { status: 'NOT_ESTABLISHED', reasonCodes: ['PROVIDER_AUTHENTICATION_NOT_ESTABLISHED'], nativeResult: { packageValid: true } };
  assert.equal(projectV2(layers, ['DOMAIN_ADAPTERS']).status, 'INSUFFICIENT_EVIDENCE');
});

for (const [name, projection] of [
  ['null', null],
  ['array', []],
  ['unknown status', { status: 'PRESERVED', reasonCodes: [] }],
  ['Boolean status', { status: true, reasonCodes: [] }],
  ['missing status', { reasonCodes: [] }],
  ['missing reasons', { status: 'VERIFIED' }],
  ['extra field', { status: 'VERIFIED', reasonCodes: [], ignored: 'semantic condition' }],
  ['string reasons', { status: 'VERIFIED', reasonCodes: 'PRF_PASS' }],
  ['non-string reason', { status: 'VERIFIED', reasonCodes: [true] }],
  ['holey reasons', { status: 'VERIFIED', reasonCodes: Array(1) }],
]) test(`v0.2 projection rejects malformed nested PRF product projection: ${name}`, () => {
  const layers = positive();
  layers.GUARANTEE_PRESERVATION.status = 'PRESERVED';
  layers.GUARANTEE_PRESERVATION.productProjection = projection;
  const actual = projectV2(layers, ['GUARANTEE_PRESERVATION']);
  assert.equal(actual.status, 'REJECTED_MALFORMED');
  assert.deepEqual(actual.reasonCodes, ['PROJECTION_INPUT_MALFORMED']);
});

test('v0.2 projection preserves nested PRF reasons without altering transfer or native result', () => {
  const layers = positive();
  layers.GUARANTEE_PRESERVATION = {
    status: 'PRESERVED', reasonCodes: ['TRANSFER_PRESERVED'], nativeResult: { recomputed: { outcome: 'VIOLATED', reason: 'amount_mismatch' } },
    productProjection: { status: 'CONTRADICTED', reasonCodes: ['PRF_NATIVE_NEGATIVE'] },
  };
  const before = clone(layers), actual = projectV2(layers, ['GUARANTEE_PRESERVATION']);
  assert.equal(actual.status, 'CONTRADICTED');
  assert.deepEqual(actual.reasonCodes, ['TRANSFER_PRESERVED', 'PRF_NATIVE_NEGATIVE']);
  assert.deepEqual(layers, before);
});
