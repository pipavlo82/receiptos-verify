import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import { evaluateSemantic } from '../src/adapters/semantic_abi.mjs';
import { evaluateGuarantees, descriptor as guaranteeDescriptor } from '../src/adapters/prf.mjs';
import { evaluateContinuity } from '../src/adapters/chronicle.mjs';

const clone = x => JSON.parse(JSON.stringify(x));
const semantic = () => ({ claim_type: 'artifact-digest', authority_class: 'INDEPENDENT_RECOMPUTATION', subject: 'synthetic:A', scope: { artifact_path: 'result.txt' }, valid_after: 0, valid_until: 100, assumptions: [], evidence_requirements: ['artifact', 'execution'] });
const semanticContext = () => ({ verification_time: 50, authority_class: 'INDEPENDENT_RECOMPUTATION', evidence_classes: ['artifact', 'execution'], established_assumptions: [], evidence_subject: 'synthetic:A' });
test('semantic product schema compiles strictly and rejects dual temporal fields', async () => {
  const schema = JSON.parse(await readFile(new URL('../schemas/semantic-contract.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv2020({strict:true}).compile(schema);
  const a = semantic(); assert.equal(validate(a), true);
  a.issued_at = 't:50'; assert.equal(validate(a), true);
  a.verification_time = 't:50'; assert.equal(validate(a), false);
});
test('neutral semantic positive is exact and independent evidence is present', () => {
  const a = semantic(), result = evaluateSemantic(a, clone(a), semanticContext());
  assert.equal(result.status, 'COMPATIBLE'); assert.equal(result.nativeResult.valid, true);
});
for (const [name, edit, expected, reason] of [
  ['claim', x => { x.claim_type = 'real-world-truth'; }, 'INCOMPATIBLE', 'SEMANTIC_CLAIM_TYPE_MISMATCH'],
  ['subject', x => { x.subject = 'synthetic:B'; }, 'INCOMPATIBLE', 'SEMANTIC_SUBJECT_MISMATCH'],
  ['scope', x => { x.scope.artifact_path = 'other.txt'; }, 'INCOMPATIBLE', 'SEMANTIC_SCOPE_MISMATCH'],
  ['time', x => { x.valid_until = 101; }, 'INCOMPATIBLE', 'SEMANTIC_TEMPORAL_BOUNDARY_MISMATCH'],
]) test(`semantic ${name} mismatch preserves paired positive`, () => {
  const a = semantic(), b = clone(a); edit(b);
  const r = evaluateSemantic(a, b, semanticContext()); assert.equal(r.status, expected); assert.ok(r.reasonCodes.includes(reason));
  assert.equal(evaluateSemantic(a, clone(a), semanticContext()).status, 'COMPATIBLE');
});
test('missing actual authority cannot be backfilled from producer label', () => {
  const c = semanticContext(); delete c.authority_class;
  assert.equal(evaluateSemantic(semantic(), semantic(), c).status, 'UNVERIFIABLE');
});
test('declared execution class does not replace observed execution', () => {
  const c = semanticContext(); c.evidence_classes = ['artifact'];
  assert.equal(evaluateSemantic(semantic(), semantic(), c).status, 'UNVERIFIABLE');
});
test('unestablished assumptions withhold semantics', () => {
  const a = semantic(); a.assumptions = ['bounded-input-complete'];
  assert.equal(evaluateSemantic(a, clone(a), semanticContext()).status, 'UNVERIFIABLE');
  const c = semanticContext(); c.established_assumptions = ['bounded-input-complete'];
  assert.equal(evaluateSemantic(a, clone(a), c).status, 'COMPATIBLE');
});
test('issued-at and verification-time are distinct native boundaries', () => {
  const a = semantic(), b = semantic(); a.issued_at = 't:50'; b.verification_time = 't:50';
  assert.equal(evaluateSemantic(a, b, semanticContext()).status, 'INCOMPATIBLE');
});
test('recomputation supports only exact recomputable semantic authority', () => {
  const a = semantic(), b = semantic(); b.authority_class = 'SEMANTIC_VERIFICATION';
  assert.equal(evaluateSemantic(a, b, semanticContext()).status, 'COMPATIBLE');
  b.claim_type = 'settled-in-production';
  assert.equal(evaluateSemantic(a, b, semanticContext()).status, 'INCOMPATIBLE');
});
test('unknown authority and vacuous evidence cannot establish semantic compatibility', () => {
  const a = semantic(), c = semanticContext(); a.authority_class = c.authority_class = 'UNSUPPORTED_AUTHORITY';
  assert.equal(evaluateSemantic(a, clone(a), c).status, 'UNVERIFIABLE');
  const b = semantic(); b.evidence_requirements = [];
  assert.equal(evaluateSemantic(b, clone(b), semanticContext()).status, 'UNVERIFIABLE');
  assert.equal(evaluateSemantic(semantic(), semantic(), null).status, 'UNVERIFIABLE');
  assert.equal(evaluateSemantic(semantic(), semantic(), semanticContext()).status, 'COMPATIBLE');
});

function guaranteeInputs() {
  const dep = { id: 'source-binding', subject: 'synthetic:A', scope: 'artifact:A', authority_class: 'INDEPENDENT_RECOMPUTATION', obligations: [{ id: 'exact-source', predicate: 'SOURCE_EQUALS', value: 'A' }], dependencies: [], assumptions: [], evidence_requirements: ['execution'] };
  const g = { id: 'price-preserved', subject: 'synthetic:A', scope: 'artifact:A', authority_class: 'INDEPENDENT_RECOMPUTATION', obligations: [{ id: 'exact-price', predicate: 'PRICE_EQUALS', value: 50 }], dependencies: ['source-binding'], assumptions: ['bounded-tuple'], evidence_requirements: ['execution'] };
  return { upstream: [g, dep], requested: [clone(g)], downstream: { guarantees: [clone(g), clone(dep)] }, context: { basis_accepted: true, accepted_basis_id: 'caller-bounded-tuple-v1', authority_class: 'INDEPENDENT_RECOMPUTATION', supported_guarantee_ids: [g.id, dep.id], obligation_results: { 'price-preserved': { 'exact-price': true }, 'source-binding': { 'exact-source': true } }, established_assumptions: ['bounded-tuple'], evidence_classes: ['execution'] } };
}
const guarantees = x => evaluateGuarantees(x.upstream, x.requested, x.downstream, x.context);
test('experimental PRF descriptor pins open PR14 rather than merged main', () => {
  assert.equal(guaranteeDescriptor.maturity, 'EXPERIMENTAL'); assert.equal(guaranteeDescriptor.sourceCommit, 'f525737069dc4cef7741f805d08a988912f4454f');
});
test('downstream exact guarantee and dependency obligations are preserved', () => { assert.equal(guarantees(guaranteeInputs()).status, 'PRESERVED'); });
for (const [name, edit, reason] of [
  ['dropped dependency', x => { x.downstream.guarantees[0].dependencies = []; x.downstream.guarantees.pop(); }, 'GUARANTEE_DEPENDENCY_DROPPED'],
  ['changed obligation', x => { x.downstream.guarantees[0].obligations[0].value = 100; }, 'DOWNSTREAM_OBLIGATION_NOT_PRESERVED'],
  ['refuted obligation', x => { x.context.obligation_results['price-preserved']['exact-price'] = false; }, 'BOUND_GUARANTEE_OBLIGATION_REFUTED'],
  ['refuted dependency', x => { x.context.obligation_results['source-binding']['exact-source'] = false; }, 'BOUND_GUARANTEE_OBLIGATION_REFUTED'],
  ['wrong subject', x => { x.downstream.guarantees[0].subject = 'synthetic:B'; }, 'GUARANTEE_SUBJECT_MISMATCH'],
]) test(`guarantee ${name} distinguishes paired preserved control`, () => {
  const input = guaranteeInputs(); edit(input); const r = guarantees(input);
  assert.equal(r.status, 'VIOLATED'); assert.ok(r.reasonCodes.includes(reason));
  assert.equal(guarantees(guaranteeInputs()).status, 'PRESERVED');
});
test('UNKNOWN dependency precedes a separate FALSE obligation', () => {
  const x = guaranteeInputs(); x.context.obligation_results['price-preserved']['exact-price'] = false; delete x.context.obligation_results['source-binding'];
  assert.equal(guarantees(x).status, 'UNVERIFIABLE');
});
test('producer dependency label does not supply separate accepted basis', () => {
  const x = guaranteeInputs(); delete x.context.basis_accepted; assert.equal(guarantees(x).status, 'UNVERIFIABLE');
});
test('circular dependency basis is not an established guarantee', () => {
  const x = guaranteeInputs(); x.upstream[1].dependencies = ['price-preserved']; x.downstream.guarantees[1].dependencies = ['price-preserved'];
  assert.equal(guarantees(x).status, 'UNVERIFIABLE');
});
test('requested obligation upgrade is not supplied by a broader producer label', () => {
  const x = guaranteeInputs(), extra = { id: 'unestablished-upgrade', predicate: 'REAL_WORLD_SETTLED', value: true };
  x.requested[0].obligations.push(extra); x.downstream.guarantees[0].obligations.push(clone(extra));
  x.context.obligation_results['price-preserved'][extra.id] = true;
  const r = guarantees(x); assert.equal(r.status, 'VIOLATED'); assert.ok(r.reasonCodes.includes('UPSTREAM_OBLIGATION_NOT_ESTABLISHED'));
});
test('extra dependency and duplicate obligation are not accepted as an exact contract', () => {
  const x = guaranteeInputs(); x.downstream.guarantees[0].dependencies.push('unsupported-extra');
  assert.equal(guarantees(x).status, 'VIOLATED');
  const y = guaranteeInputs(); y.upstream[0].obligations.push(clone(y.upstream[0].obligations[0]));
  assert.equal(guarantees(y).status, 'UNVERIFIABLE');
});
test('malformed independent guarantee premise fails closed without throwing', () => {
  const x = guaranteeInputs(); x.context.supported_guarantee_ids = {};
  assert.equal(guarantees(x).status, 'UNVERIFIABLE');
  assert.equal(evaluateGuarantees(x.upstream, x.requested, x.downstream, null).status, 'UNVERIFIABLE');
  const y = guaranteeInputs();
  for (const row of [...y.upstream, ...y.requested, ...y.downstream.guarantees]) row.authority_class = null;
  delete y.context.authority_class;
  assert.equal(guarantees(y).status, 'UNVERIFIABLE');
});
test('empty requested guarantees are explicitly NOT_REQUESTED', () => { assert.equal(evaluateGuarantees([], [], null).status, 'NOT_REQUESTED'); });

function historyInputs() {
  const first = { entry_id: 'synthetic-entry-A', sequence: 0, predecessor_ref: null, receipt_root: 'synthetic-root-A', proof_object_ref: 'synthetic-proof:A', subject: 'synthetic:subject', state: 'A' };
  const second = { entry_id: 'synthetic-entry-B', sequence: 1, predecessor_ref: first.entry_id, receipt_root: 'synthetic-root-B', proof_object_ref: 'synthetic-proof:B', subject: 'synthetic:subject', state: 'B' };
  return { history: { entries: [first, second] }, request: { mode: 'historical', entry_id: first.entry_id, subject: first.subject, state: first.state } };
}
test('later state is nonblocking for exact historical request', () => {
  const x = historyInputs(), r = evaluateContinuity(x.history, x.request);
  assert.equal(r.status, 'PRESERVED'); assert.ok(r.reasonCodes.includes('LATER_STATE_NONBLOCKING_FOR_HISTORICAL_CLAIM')); assert.equal(r.nativeResult.whole_envelope_binding, 'NOT_ESTABLISHED');
});
test('same old anchor cannot assert current state after later entry', () => {
  const x = historyInputs(); x.request.mode = 'current'; const r = evaluateContinuity(x.history, x.request);
  assert.equal(r.status, 'VIOLATED'); assert.ok(r.reasonCodes.includes('LATER_STATE_SUPERSEDES_CURRENT_CLAIM'));
});
for (const [name, edit, expected] of [
  ['predecessor', x => { x.history.entries[1].predecessor_ref = 'wrong'; }, 'VIOLATED'],
  ['sequence', x => { x.history.entries[1].sequence = 3; }, 'VIOLATED'],
  ['missing sequence', x => { delete x.history.entries[1].sequence; }, 'UNVERIFIABLE'],
  ['missing anchor', x => { x.request.entry_id = 'missing'; }, 'UNVERIFIABLE'],
  ['wrong reference', x => { x.request.proof_object_ref = 'other-proof'; }, 'VIOLATED'],
]) test(`history ${name} control is explicit`, () => {
  const x = historyInputs(); edit(x); assert.equal(evaluateContinuity(x.history, x.request).status, expected);
  const p = historyInputs(); assert.equal(evaluateContinuity(p.history, p.request).status, 'PRESERVED');
});
test('native identity conflict is retained separately from continuity', () => {
  const x = historyInputs(), copy = clone(x.history.entries[0]); copy.state = 'changed'; x.history.entries.push(copy);
  const r = evaluateContinuity(x.history, x.request); assert.equal(r.status, 'VIOLATED'); assert.equal(r.nativeResult.identity_classification, 'conflict');
});
test('idempotent duplicate is not another sequence step', () => {
  const x = historyInputs(); x.history.entries.splice(1, 0, clone(x.history.entries[0]));
  const r = evaluateContinuity(x.history, x.request); assert.equal(r.status, 'PRESERVED'); assert.equal(r.nativeResult.identity_classification, 'idempotent');
});
test('derived-entry equality cannot satisfy required whole-envelope binding', () => {
  const x = historyInputs(); x.request.require_whole_envelope_binding = true;
  assert.equal(evaluateContinuity(x.history, x.request).status, 'UNVERIFIABLE');
});
test('whole-envelope digest binds fields omitted from native derived entry', () => {
  const x = historyInputs(); x.history.observations = [{ original_extra: 'A', entry_id: 'synthetic-entry-A' }];
  x.request.require_whole_envelope_binding = true;
  // Independent vector projection writes each known field in literal lexical order.
  // This test does not call the adapter serializer or any product canonicalizer.
  const lexicalEnvelope = JSON.stringify({ entries: x.history.entries.map(e => ({entry_id:e.entry_id,predecessor_ref:e.predecessor_ref,proof_object_ref:e.proof_object_ref,receipt_root:e.receipt_root,sequence:e.sequence,state:e.state,subject:e.subject})), observations: [{entry_id:'synthetic-entry-A',original_extra:'A'}] });
  x.request.observation_envelope_digest = createHash('sha256').update(lexicalEnvelope).digest('hex');
  assert.equal(evaluateContinuity(x.history, x.request).status, 'PRESERVED');
  x.history.observations[0].original_extra = 'B';
  assert.equal(evaluateContinuity(x.history, x.request).status, 'VIOLATED');
  x.history.observations[0].original_extra = 'A'; x.history.omitted_by_native_projection = 'tampered';
  assert.equal(evaluateContinuity(x.history, x.request).status, 'VIOLATED');
});
test('relation reports are deterministic and do not mutate caller inputs', () => {
  const a = semantic(), c = semanticContext(), before = JSON.stringify([a, c]);
  assert.equal(JSON.stringify(evaluateSemantic(a, clone(a), c)), JSON.stringify(evaluateSemantic(a, clone(a), c)));
  assert.equal(JSON.stringify([a, c]), before);
  const g = guaranteeInputs(); assert.equal(JSON.stringify(guarantees(g)), JSON.stringify(guarantees(g)));
  const h = historyInputs(); assert.equal(JSON.stringify(evaluateContinuity(h.history, h.request)), JSON.stringify(evaluateContinuity(h.history, h.request)));
});
