#!/usr/bin/env node
/**
 * Offline documentation-contract validator for the proposed XRPL note.
 *
 * Run: node tools/validate-xrpl-note.mjs
 * Requires the repository's existing npm dependencies (npm ci).
 *
 * This is NOT a ReceiptOS runtime adapter. It imports no product runtime, makes
 * no network requests, and validates no signatures, actual transactions, XRPL
 * serialization, consensus, ledger history or portable inclusion proofs.
 * Boolean observation inputs are explicitly assumed synthetic premises.
 *
 * Canonical commitment recomputation is restricted to printable ASCII strings
 * and safe integers used by these fixtures. It is NOT generic JCS conformance.
 * The schema proves shape; separate computations check the finite relations.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';

const ROOT = new URL('../', import.meta.url);
const PROFILE = 'xrpl-receipt-anchor-v0';
const TYPE_ASCII = 'urn:receiptos:xrpl-receipt-anchor-v0';
const TYPE_HEX = '75726E3A726563656970746F733A7872706C2D726563656970742D616E63686F722D7630';
const FORMAT_ASCII = 'application/octet-stream';
const DOMAIN_ASCII = 'receiptos.xrpl-receipt-anchor-v0.claim';
const EXPECTED_C = '4502e5ed22b9edb46fbdc15e77c58959772a8c461c82b02fa96c8ee2259dd24e';
const TYPE = Buffer.from(TYPE_ASCII, 'ascii');
const FORMAT = Buffer.from(FORMAT_ASCII, 'ascii');
const checks = [];
let classificationCases = 0;

function check(id, condition, detail = undefined) {
  checks.push({ id, passed: condition === true, ...(detail === undefined ? {} : { detail }) });
}

function rejects(operation) {
  try { operation(); return false; } catch { return true; }
}

function readJson(path) {
  const bytes = readFileSync(new URL(path, ROOT));
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function asciiString(value) {
  if (!/^[\x20-\x7e]*$/.test(value)) throw new Error('Outside printable-ASCII fixture canonicalization subset');
  return JSON.stringify(value);
}

// RFC 8785's relevant rules for this explicitly restricted fixture subset:
// lexically sorted ASCII member names, ordinary JSON string encoding, preserved
// array order, no whitespace, and safe-integer ECMAScript number serialization.
function fixtureCanonical(value) {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return asciiString(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error('Outside safe-integer fixture subset');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(fixtureCanonical).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${asciiString(key)}:${fixtureCanonical(value[key])}`).join(',')}}`;
  }
  throw new Error('Outside JSON fixture subset');
}

function commitment(preimage) {
  return createHash('sha256')
    .update(Buffer.from(DOMAIN_ASCII, 'ascii'))
    .update(Buffer.from([0]))
    .update(Buffer.from(fixtureCanonical(preimage), 'utf8'))
    .digest('hex');
}

function decodeHex(value) {
  if (typeof value !== 'string' || !/^(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new Error('Invalid even-length hex encoding');
  }
  return Buffer.from(value, 'hex');
}

// Independent finite claim-transfer oracle, not an invocation of the product's
// compatibility code. These two examples use exact equality for every declared
// dimension. It makes no execution-success/failure assertion about requested B.
function claimTransfer(requested, declared) {
  const dimensions = [
    ['claim', 'CLAIM_MISMATCH'], ['subject', 'SUBJECT_MISMATCH'],
    ['scope', 'SCOPE_MISMATCH'], ['authority', 'AUTHORITY_MISMATCH'],
    ['policy', 'POLICY_MISMATCH'], ['version', 'VERSION_MISMATCH'],
    ['time', 'TIME_MISMATCH'], ['assumptions', 'ASSUMPTION_UNESTABLISHED'],
    ['dependencies', 'DEPENDENCY_MISSING'], ['evidence_requirements', 'EVIDENCE_BASIS_MISMATCH'],
  ];
  const reasons = dimensions.filter(([field]) =>
    fixtureCanonical(requested[field]) !== fixtureCanonical(declared[field])).map(([, reason]) => reason);
  return {
    claim_subject_compatibility: reasons.length ? 'CONTRADICTED' : 'COMPATIBLE',
    overall: reasons.length ? 'CONTRADICTED' : 'CONTINUE_REQUIRED_LAYERS',
    reason_codes: reasons,
  };
}

// Finite documentation relation only. The expected payload argument is computed
// from fixture root + independently recomputed C, never from a case's expected
// fields or anchor-controls.expected_memo. All cases supply assumed premises.
function anchorRelation(input, expectedPayload) {
  const native = input.native_transaction_result;
  const effectPolicy = input.required_transaction_result === null ? 'NOT_REQUESTED'
    : input.assumed_trusted_history !== true || input.validated !== true || native === null
      ? 'NOT_ESTABLISHED'
      : native === input.required_transaction_result ? 'SATISFIED' : 'UNSATISFIED';
  const unrelated = [];
  const result = anchor_native => ({
    anchor_native,
    native_transaction_result: native,
    transaction_policy: effectPolicy,
    unrelated_memos: unrelated,
  });

  if (input.requested_profile !== PROFILE) return result('ANCHOR_UNSUPPORTED');
  if (typeof input.validated !== 'boolean' || !Array.isArray(input.Memos)
      || typeof input.assumed_trusted_history !== 'boolean'
      || typeof input.account_matches_policy !== 'boolean') return result('ANCHOR_MALFORMED');
  // tes/tec may appear in validated ledgers; other native result classes are a
  // contradictory purported validated observation. Missing effect metadata alone
  // does not erase inclusion independently established under the stated premise.
  if (input.validated && native !== null
      && (typeof native !== 'string' || !/^(?:tesSUCCESS|tec[A-Z0-9_]+)$/.test(native))) {
    return result('ANCHOR_MALFORMED');
  }

  const selected = [];
  for (const wrapper of input.Memos) {
    if (!wrapper || typeof wrapper !== 'object' || Array.isArray(wrapper)
        || Object.keys(wrapper).length !== 1 || !Object.hasOwn(wrapper, 'Memo')) return result('ANCHOR_MALFORMED');
    const memo = wrapper.Memo;
    if (!memo || typeof memo !== 'object' || Array.isArray(memo) || Object.keys(memo).length === 0) return result('ANCHOR_MALFORMED');
    try {
      for (const field of Object.keys(memo)) {
        if (!['MemoType', 'MemoFormat', 'MemoData'].includes(field)) return result('ANCHOR_MALFORMED');
        decodeHex(memo[field]);
      }
    } catch { return result('ANCHOR_MALFORMED'); }
    if (Object.hasOwn(memo, 'MemoType') && decodeHex(memo.MemoType).equals(TYPE)) selected.push(memo);
    else unrelated.push(structuredClone(wrapper));
  }
  // Inspect the entire inventory before making any selection. No first/last
  // candidate, prefix match, or Memo ordering has selection authority.
  if (selected.length > 1) return result('ANCHOR_MALFORMED');
  if (selected.length === 0) return result('ANCHOR_NOT_ESTABLISHED');
  const memo = selected[0]; // Unique exact decoded-Type candidate, not first-match selection.
  if (!Object.hasOwn(memo, 'MemoFormat') || !Object.hasOwn(memo, 'MemoData')
      || decodeHex(memo.MemoData).length !== 64) return result('ANCHOR_MALFORMED');
  if (!decodeHex(memo.MemoFormat).equals(FORMAT)) return result('ANCHOR_UNSUPPORTED');
  if (!input.validated || !input.assumed_trusted_history) return result('ANCHOR_NOT_ESTABLISHED');
  if (!input.account_matches_policy || !decodeHex(memo.MemoData).equals(expectedPayload)) return result('ANCHOR_MISMATCH');
  return result('ANCHOR_MATCH');
}

function main() {
  const schema = readJson('docs/xrpl/xrpl-receipt-anchor-v0.schema.json');
  const surfaceSchema = readJson('schemas/claim-surface.schema.json');
  const corpus = readJson('docs/xrpl/examples/anchor-controls.json');
  classificationCases = Array.isArray(corpus.controls) ? corpus.controls.length : 0;
  const examples = ['matching-claim', 'wrong-claim'].map(id => ({ id, value: readJson(`docs/xrpl/examples/${id}.json`) }));
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  ajv.addSchema(surfaceSchema);
  const admit = ajv.compile(schema);
  const admitSurface = ajv.getSchema('urn:receiptos:verify:claim-surface:v2');

  check('type-ascii-exact', TYPE.toString('ascii') === TYPE_ASCII && /^[\x00-\x7f]+$/.test(TYPE_ASCII));
  check('type-length-36', TYPE.length === 36);
  check('type-exact-hex', TYPE.toString('hex').toUpperCase() === TYPE_HEX);
  check('format-length-24', FORMAT.length === 24);
  check('schema-type-const', schema.properties.memo.properties.MemoType.const === TYPE_HEX);
  check('schema-format-const', schema.properties.memo.properties.MemoFormat.const === FORMAT.toString('hex').toUpperCase());
  check('schema-proposed-documentation-only', /PROPOSED/.test(schema.title) && /Documentation-only/.test(schema.description));
  check('corpus-synthetic-not-live', corpus.fixture_kind === 'SYNTHETIC_DOCUMENTATION_CLASSIFICATION_CONTROLS_NOT_EXECUTED_ON_XRPL'
    && /assumed independently established premises/.test(corpus.warning));
  check('corpus-nonempty-exact-36', Array.isArray(corpus.controls) && corpus.controls.length === 36);
  check('corpus-unique-complete-case-ids', new Set(corpus.controls.map(x => x.id)).size === 36
    && corpus.controls.every((x, i) => x.id.startsWith(`C${String(i + 1).padStart(2, '0')}_`)));

  const anchor = examples[0].value.anchor;
  const C = commitment(anchor.claim_preimage);
  const payload = Buffer.concat([decodeHex(anchor.receipt_root), decodeHex(C)]);
  check('independent-reference-claim-digest', C === EXPECTED_C);
  check('computed-payload-64', payload.length === 64);
  check('corpus-expected-memo-derived', isDeepStrictEqual(corpus.expected_memo, {
    MemoType: TYPE_HEX, MemoFormat: FORMAT.toString('hex').toUpperCase(), MemoData: payload.toString('hex').toUpperCase(),
  }));

  for (const { id, value } of examples) {
    check(`${id}:synthetic-not-live`, value.fixture_kind === 'SYNTHETIC_ARCHITECTURE_EXAMPLE_NOT_EXECUTED'
      && /No signed transaction, actual ledger observation/.test(value.warning));
    check(`${id}:descriptor-schema`, admit(value.anchor), structuredClone(admit.errors));
    check(`${id}:requested-surface-schema`, admitSurface(value.requested_surface), structuredClone(admitSurface.errors));
    const derivedC = commitment(value.anchor.claim_preimage);
    check(`${id}:claim-digest-recomputed`, derivedC === value.anchor.claim_digest && derivedC === EXPECTED_C);
    check(`${id}:root-32`, decodeHex(value.anchor.receipt_root).length === 32);
    check(`${id}:memo-type-exact`, decodeHex(value.anchor.memo.MemoType).equals(TYPE));
    check(`${id}:memo-format-exact`, decodeHex(value.anchor.memo.MemoFormat).equals(FORMAT));
    check(`${id}:memo-data-R32-C32`, decodeHex(value.anchor.memo.MemoData).equals(
      Buffer.concat([decodeHex(value.anchor.receipt_root), decodeHex(derivedC)])));
    check(`${id}:carrier-uses-descriptor-memo`, isDeepStrictEqual(value.observation_placeholders.Memos, [{ Memo: value.anchor.memo }]));
    const transfer = claimTransfer(value.requested_surface, value.anchor.claim_preimage.surface);
    const expected = value.expected_under_stated_premises;
    check(`${id}:independent-transfer`, isDeepStrictEqual(transfer, {
      claim_subject_compatibility: expected.claim_subject_compatibility, overall: expected.overall, reason_codes: expected.reason_codes,
    }));
    check(`${id}:literal-transfer-outcome`, transfer.overall === (id === 'matching-claim' ? 'CONTINUE_REQUIRED_LAYERS' : 'CONTRADICTED'));
    const observed = anchorRelation({
      requested_profile: value.anchor.profile, assumed_trusted_history: true, validated: true,
      account_matches_policy: true,
      native_transaction_result: value.observation_placeholders.illustrative_native_transaction_result,
      required_transaction_result: value.separate_transaction_policy.required_result,
      Memos: value.observation_placeholders.Memos,
    }, payload);
    check(`${id}:separate-anchor-native-policy`, isDeepStrictEqual(observed, {
      anchor_native: expected.anchor_native, native_transaction_result: expected.native_transaction_result,
      transaction_policy: expected.transaction_policy, unrelated_memos: [],
    }));
  }
  check('same-anchor-for-A-and-B', isDeepStrictEqual(examples[0].value.anchor, examples[1].value.anchor));
  const wrong = examples[1].value;
  check('B-differs-in-claim-and-commit', wrong.requested_surface.claim.id === 'synthetic-commit-B'
    && wrong.anchor.claim_preimage.surface.claim.id === 'synthetic-commit-A'
    && wrong.requested_surface.subject.commit !== wrong.anchor.claim_preimage.surface.subject.commit);
  check('same-artifact-does-not-establish-B', wrong.requested_surface.subject.artifact_digest === wrong.anchor.claim_preimage.surface.subject.artifact_digest
    && claimTransfer(wrong.requested_surface, wrong.anchor.claim_preimage.surface).overall === 'CONTRADICTED');
  check('no-execution-inference-for-B', /does not prove that B executed or failed/.test(
    readFileSync(new URL('docs/xrpl/RECEIPTOS_VERIFY_XRPL_NOTE.md', ROOT), 'utf8')));

  for (const control of corpus.controls) {
    const actual = anchorRelation(control.input, payload);
    check(`case:${control.id}`, isDeepStrictEqual(actual, control.expected), { actual, expected: control.expected });
  }

  const base = structuredClone(corpus.controls[0].input);
  for (const native of ['tesSUCCESS', 'tecNO_PERMISSION']) {
    const actual = anchorRelation({ ...base, native_transaction_result: native }, payload);
    check(`explicit-inclusion:${native}`, actual.anchor_native === 'ANCHOR_MATCH' && actual.native_transaction_result === native);
  }
  const tecPolicy = anchorRelation({ ...base, native_transaction_result: 'tecNO_PERMISSION', required_transaction_result: 'tesSUCCESS' }, payload);
  check('tec-policy-does-not-erase-inclusion', tecPolicy.anchor_native === 'ANCHOR_MATCH'
    && tecPolicy.native_transaction_result === 'tecNO_PERMISSION' && tecPolicy.transaction_policy === 'UNSATISFIED');

  const multiple = corpus.controls.find(x => x.id === 'C07_two_unrelated').input;
  for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
    const Memos = order.map(i => multiple.Memos[i]);
    const actual = anchorRelation({ ...multiple, Memos }, payload);
    const expectedUnrelated = Memos.filter(x => !Object.hasOwn(x.Memo, 'MemoType') || !decodeHex(x.Memo.MemoType).equals(TYPE));
    check(`memo-order:${order.join('')}`, actual.anchor_native === 'ANCHOR_MATCH'
      && isDeepStrictEqual(actual.unrelated_memos, expectedUnrelated));
  }
  const exact = structuredClone(base.Memos[0]);
  const conflicting = structuredClone(exact);
  conflicting.Memo.MemoData = `${'00'.repeat(32)}${C}`;
  for (const [id, Memos] of [['exact-first', [exact, conflicting]], ['exact-last', [conflicting, exact]]]) {
    check(`reject-first-last:${id}`, anchorRelation({ ...base, Memos }, payload).anchor_native === 'ANCHOR_MALFORMED');
  }

  for (const [id, mutate] of [
    ['wrong-payload-length', x => { x.memo.MemoData = '00'; }],
    ['odd-hex', x => { x.memo.MemoData = x.memo.MemoData.slice(1); }],
    ['unknown-profile', x => { x.profile = 'xrpl-receipt-anchor-v1'; }],
    ['unknown-root-profile', x => { x.claim_preimage.receipt_profile = 'unknown'; }],
    ['extra-preimage-field', x => { x.claim_preimage.extra = true; }],
    ['null-subject', x => { x.claim_preimage.surface.subject = null; }],
    ['missing-policy', x => { delete x.claim_preimage.surface.policy; }],
    ['network-overflow', x => { x.claim_preimage.network_binding.network_id = 4294967296; }],
    ['malformed-root', x => { x.receipt_root = '0x123'; }],
  ]) {
    const changed = structuredClone(anchor); mutate(changed);
    check(`schema-reject:${id}`, !admit(changed));
  }
  const inconsistent = structuredClone(anchor); inconsistent.claim_digest = 'f'.repeat(64);
  check('schema-shape-is-not-hash-proof', admit(inconsistent));
  check('computed-relation-detects-wrong-C', commitment(inconsistent.claim_preimage) !== inconsistent.claim_digest);

  for (const [id, mutate] of [
    ['claim', x => { x.surface.claim.id += '-other'; }],
    ['subject', x => { x.surface.subject.id += '-other'; }],
    ['artifact', x => { x.surface.subject.artifact_digest = 'c'.repeat(64); }],
    ['commit', x => { x.surface.subject.commit = 'c'.repeat(40); }],
    ['authority', x => { x.surface.authority.id += '-other'; }],
    ['scope', x => { x.surface.scope.extra = true; }],
    ['policy', x => { x.surface.policy.id += '-other'; }],
    ['version', x => { x.surface.version = '2'; }],
    ['time', x => { x.surface.time.not_after -= 1; }],
    ['assumption', x => { x.surface.assumptions.push('other'); }],
    ['dependency', x => { x.surface.dependencies.push({ id: 'other', version: '1' }); }],
    ['evidence-basis', x => { x.surface.evidence_requirements.push('other'); }],
    ['verification-profile', x => { x.verification_profile += '-other'; }],
    ['root-profile', x => { x.receipt_profile += '-other'; }],
    ['network', x => { x.network_binding.network_id = 1; }],
    ['checkpoint', x => { x.network_binding.trusted_checkpoint.ledger_hash = 'f'.repeat(64); }],
  ]) {
    const changed = structuredClone(anchor.claim_preimage); mutate(changed);
    check(`commitment-binds:${id}`, commitment(changed) !== C);
  }
  const reversed = Object.fromEntries(Object.entries(anchor.claim_preimage).reverse());
  check('canonical-object-member-order-independent', commitment(reversed) === C);
  check('canonical-array-order-preserved', fixtureCanonical(['a', 'b']) !== fixtureCanonical(['b', 'a']));
  for (const [id, value] of [['unicode', '\u00e9'], ['fraction', 0.5], ['unsafe-integer', 9007199254740992], ['nonfinite', Infinity], ['minus-zero', -0]]) {
    check(`reject-outside-fixture-canonicalization:${id}`, rejects(() => fixtureCanonical(value)));
  }
  check('hex-decoder-rejects-odd', rejects(() => decodeHex('0')));
  check('hex-decoder-rejects-nonhex', rejects(() => decodeHex('GG')));

  // The finite model must derive a wrong byte relation, not trust case.expected.
  const tampered = structuredClone(base);
  tampered.Memos[0].Memo.MemoData = '00'.repeat(64);
  check('negative-control-tampered-payload', anchorRelation(tampered, payload).anchor_native === 'ANCHOR_MISMATCH');
  check('negative-control-untrusted-tec', anchorRelation({ ...base, assumed_trusted_history: false,
    native_transaction_result: 'tecNO_PERMISSION' }, payload).anchor_native === 'ANCHOR_NOT_ESTABLISHED');
}

try { main(); } catch (error) {
  check('validator-execution', false, `${error.name}: ${error.message}`);
}
const failed = checks.filter(check => !check.passed);
console.log(JSON.stringify({
  status: failed.length ? 'FAIL' : 'PASS',
  kind: 'DOCUMENTATION_CONTRACT_VALIDATION_NOT_XRPL_INTEGRATION',
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  classification_cases: classificationCases,
  memo_type_ascii: TYPE_ASCII,
  memo_type_bytes: TYPE.length,
  memo_type_hex: TYPE_HEX,
  claim_digest: EXPECTED_C,
  limitations: 'Offline finite synthetic documentation relations only. No live transaction, signature, consensus/history/inclusion proof, XRPL codec, product runtime or generic JCS conformance is validated.',
  ...(failed.length ? { failures: failed } : {}),
}));
if (failed.length) process.exitCode = 1;
