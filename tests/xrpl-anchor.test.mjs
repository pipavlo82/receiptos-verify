import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client, decode, hashes, Wallet } from 'xrpl';
import { normalizeAutofilledCarrier } from '../tools/xrpl-poc.mjs';
import { deriveCommitment, evaluateXrplAnchor, evaluateXrplClaim, MEMO_TYPE_HEX, MEMO_FORMAT_HEX, PROFILE } from '../src/adapters/xrpl-anchor.mjs';
import { buildXrplFixture, clone, TYPE_ASCII, TYPE_HEX, FORMAT_HEX, PROFILE_ID,
  independentCanonical, independentClaimDigest, independentReceiptRoot, independentTransactionHash, independentLedgerHash } from './helpers/xrpl-fixture.mjs';

// No expected field is read from an executable adapter or fixture annotation.
// Literal outcomes below are detached witnesses of specified relations. The
// synthetic signed bytes and headers are not live XRPL/consensus evidence.
const fixture = buildXrplFixture();
async function current() {
  const f = await fixture;
  return { f, input: clone(f.input), trust: clone(f.trust) };
}
async function withMemos(memos, native = 'tesSUCCESS', fields = {}) {
  const state = await current();
  state.input.observation = state.f.observationFor(memos, native, fields);
  state.trust.transaction_hash = state.input.observation.hash;
  return state;
}
const anchor = state => evaluateXrplAnchor(state.input, state.trust);
const unrelatedA = { Memo: { MemoType: Buffer.from('urn:example:unrelated', 'ascii').toString('hex').toUpperCase(), MemoData: '010203' } };
const unrelatedB = { Memo: { MemoData: '040506', MemoFormat: Buffer.from('text/plain').toString('hex').toUpperCase() } };

test('XRPL profile exposes the exact reviewed version and 36-byte URI bytes', () => {
  assert.equal(PROFILE, PROFILE_ID);
  assert.equal(MEMO_TYPE_HEX, TYPE_HEX);
  assert.equal(MEMO_FORMAT_HEX, FORMAT_HEX);
  assert.equal(Buffer.byteLength(TYPE_ASCII, 'ascii'), 36);
  assert.equal(Buffer.from(TYPE_HEX, 'hex').toString('ascii'), TYPE_ASCII);
});

test('XRPL pinned JCS commitment matches the independently published documentation digest', async () => {
  const example = JSON.parse(await readFile(new URL('../docs/xrpl/examples/matching-claim.json', import.meta.url), 'utf8'));
  assert.equal(independentClaimDigest(example.anchor.claim_preimage), '4502e5ed22b9edb46fbdc15e77c58959772a8c461c82b02fa96c8ee2259dd24e');
});

test('XRPL derives native-verified fresh Crystal R and independent domain-separated C', async () => {
  const f = await fixture;
  const actual = await deriveCommitment(f.receipt, f.preimage);
  assert.equal(actual.receipt_root, independentReceiptRoot(f.receipt));
  assert.equal(f.receipt.anchor.receipt_root, '0x' + f.root);
  assert.equal(actual.claim_digest, independentClaimDigest(f.preimage));
  assert.equal(actual.memo.MemoData, (f.root + f.digest).toUpperCase());
  assert.equal(Buffer.from(actual.memo.MemoData, 'hex').length, 64);
  assert.equal(actual.integrity.status, 'VERIFIED');
});

test('XRPL commitment is invariant under JSON member insertion ordering', async () => {
  const f = await fixture;
  const reverse = value => Array.isArray(value) ? value.map(reverse) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverse(item)])) : value;
  const actual = await deriveCommitment(f.receipt, reverse(f.preimage));
  assert.equal(actual.claim_digest, f.digest);
  assert.equal(actual.receipt_root, f.root);
});

test('XRPL signed binary and synthetic ledger hashes agree with detached SHA-512Half oracles', async () => {
  const f = await fixture;
  assert.equal(independentTransactionHash(f.input.observation.tx_blob), f.input.observation.hash);
  assert.equal(hashes.hashSignedTx(f.input.observation.tx_blob), f.input.observation.hash);
  for (const header of f.input.observation.history) {
    assert.equal(independentLedgerHash(header), header.ledger_hash);
    assert.equal(hashes.hashLedgerHeader(header), header.ledger_hash);
  }
  assert.equal(decode(f.input.observation.tx_blob).Account, f.trust.account);
  assert.equal(decode(f.input.observation.tx_blob).TransactionType, 'AccountSet');
});

test('XRPL SDK autofill undefined NetworkID is absent on wire and normalized before carrier admission', async () => {
  const f = await fixture;
  const client = new Client('wss://s.altnet.rippletest.net:51233/');
  client.request = async () => { throw new Error('Hermetic autofill test forbids network access'); };
  const transaction = { TransactionType: 'AccountSet', Account: f.trust.account,
    Sequence: 1, Fee: '12', LastLedgerSequence: 520, Memos: [{ Memo: f.memo }] };
  const filled = await client.autofill(transaction);
  assert.equal(Object.hasOwn(filled, 'NetworkID'), true, 'Pinned SDK creates this own property');
  assert.equal(filled.NetworkID, undefined);
  const normalized = normalizeAutofilledCarrier(filled);
  assert.equal(Object.hasOwn(normalized, 'NetworkID'), false);
  assert.equal(Object.hasOwn(filled, 'NetworkID'), true, 'Normalization does not mutate SDK output');
  const wallet = Wallet.generate();
  const publicSigned = wallet.sign({ ...normalized, Account: wallet.classicAddress });
  assert.equal(Object.hasOwn(decode(publicSigned.tx_blob), 'NetworkID'), false);
  assert.throws(() => normalizeAutofilledCarrier({ ...filled, NetworkID: 1 }), /UNSUPPORTED_TESTNET_CARRIER/);
});

test('XRPL exact accepted anchor has MATCH, never global VERIFIED by itself', async () => {
  const result = await anchor(await current());
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.native_transaction_result, 'tesSUCCESS');
  assert.equal(result.transaction_policy, 'NOT_REQUESTED');
  assert.equal(result.integrity.status, 'VERIFIED');
  assert.notEqual(result.overall, 'VERIFIED');
});

test('XRPL matching caller A permits required layers, without claiming semantic completion', async () => {
  const state = await current();
  const result = await evaluateXrplClaim(state.input, state.f.requestA, state.trust);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.claim_relation.status, 'COMPATIBLE');
  assert.equal(result.overall, 'CONTINUE_REQUIRED_LAYERS');
});

test('XRPL SAME signed anchor A cannot establish changed claim identity and commit B', async () => {
  const state = await current();
  const before = independentCanonical(state.input);
  const result = await evaluateXrplClaim(state.input, state.f.requestB, state.trust);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.integrity.status, 'VERIFIED');
  assert.equal(result.claim_relation.status, 'CONTRADICTED');
  assert.equal(result.overall, 'CONTRADICTED');
  assert.ok(result.claim_relation.reasonCodes.includes('CLAIM_MISMATCH'));
  assert.ok(result.claim_relation.reasonCodes.includes('SUBJECT_MISMATCH'));
  assert.equal(independentCanonical(state.input), before, 'B must not change the preserved A evidence');
});

test('XRPL validated tec keeps MATCH and preserves the native effect result', async () => {
  const f = await fixture;
  const state = await withMemos([{ Memo: f.memo }], 'tecNO_PERMISSION');
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.native_transaction_result, 'tecNO_PERMISSION');
  assert.equal(result.transaction_policy, 'NOT_REQUESTED');
});

test('XRPL separately required tesSUCCESS fails policy without erasing established tec anchor', async () => {
  const f = await fixture;
  const state = await withMemos([{ Memo: f.memo }], 'tecNO_PERMISSION');
  state.trust.required_transaction_result = 'tesSUCCESS';
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.native_transaction_result, 'tecNO_PERMISSION');
  assert.equal(result.transaction_policy, 'UNSATISFIED');
});

test('XRPL tesSUCCESS satisfies optional effect policy without promoting MATCH to VERIFIED', async () => {
  const state = await current(); state.trust.required_transaction_result = 'tesSUCCESS';
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.transaction_policy, 'SATISFIED');
  assert.notEqual(result.overall, 'VERIFIED');
});

for (const [name, edit] of [
  ['wrong receipt root', memo => { memo.MemoData = '0'.repeat(64) + memo.MemoData.slice(64); }],
  ['wrong claim digest', memo => { memo.MemoData = memo.MemoData.slice(0, 64) + '0'.repeat(64); }],
]) test('XRPL negative: ' + name + ' is a commitment mismatch', async () => {
  const f = await fixture, memo = clone(f.memo); edit(memo);
  const result = await anchor(await withMemos([{ Memo: memo }]));
  assert.equal(result.anchor_native, 'ANCHOR_MISMATCH');
});

test('XRPL negative: independently accepted account mismatch cannot be hidden by a valid signature', async () => {
  const state = await current(); state.trust.account = Wallet.generate().classicAddress;
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_MISMATCH');
});

for (const [name, edit] of [
  ['different selected network', s => { s.trust.network_id = 2; }],
  ['different observed network', s => { s.input.observation.network_id = 2; }],
  ['different selected checkpoint hash', s => { s.trust.checkpoint.ledger_hash = '0'.repeat(64); }],
  ['different selected checkpoint index', s => { s.trust.checkpoint.ledger_index = 499; }],
]) test('XRPL negative: ' + name + ' is not the committed network/checkpoint', async () => {
  const state = await current(); edit(state);
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_MISMATCH');
});

test('XRPL negative: zero ReceiptOS anchor Memos is NOT_ESTABLISHED', async () => {
  const result = await anchor(await withMemos([]));
  assert.equal(result.anchor_native, 'ANCHOR_NOT_ESTABLISHED');
});

test('XRPL negative: only unrelated Memos is NOT_ESTABLISHED and preserves their bytes', async () => {
  const result = await anchor(await withMemos([unrelatedA, unrelatedB]));
  assert.equal(result.anchor_native, 'ANCHOR_NOT_ESTABLISHED');
  assert.deepEqual(result.unrelated_memos, [unrelatedA, unrelatedB]);
});

for (const [name, order] of [
  ['before', (f) => [unrelatedA, { Memo: f.memo }]],
  ['after', (f) => [{ Memo: f.memo }, unrelatedA]],
  ['both sides', (f) => [unrelatedA, { Memo: f.memo }, unrelatedB]],
  ['reordered', (f) => [unrelatedB, { Memo: f.memo }, unrelatedA]],
]) test('XRPL positive control: unrelated Memo ' + name + ' does not become MALFORMED', async () => {
  const f = await fixture, memos = order(f), result = await anchor(await withMemos(memos));
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.deepEqual(result.unrelated_memos, memos.filter(item => item.Memo.MemoType !== TYPE_HEX));
});

test('XRPL negative: two identical matching anchor Memos reject first/last selection', async () => {
  const f = await fixture;
  assert.equal((await anchor(await withMemos([{ Memo: f.memo }, { Memo: f.memo }]))).anchor_native, 'ANCHOR_MALFORMED');
});

test('XRPL negative: conflicting matching anchor Memos reject both possible orders', async () => {
  const f = await fixture, other = clone(f.memo); other.MemoData = '0'.repeat(128);
  for (const memos of [[{ Memo: f.memo }, { Memo: other }], [{ Memo: other }, { Memo: f.memo }]]) {
    assert.equal((await anchor(await withMemos(memos))).anchor_native, 'ANCHOR_MALFORMED');
  }
});

test('XRPL negative: short binary MemoData is MALFORMED rather than a commitment mismatch', async () => {
  const f = await fixture, memo = clone(f.memo); memo.MemoData = '00';
  assert.equal((await anchor(await withMemos([{ Memo: memo }]))).anchor_native, 'ANCHOR_MALFORMED');
});

test('XRPL negative: matching Type with missing Format is MALFORMED', async () => {
  const f = await fixture, memo = clone(f.memo); delete memo.MemoFormat;
  assert.equal((await anchor(await withMemos([{ Memo: memo }]))).anchor_native, 'ANCHOR_MALFORMED');
});

test('XRPL negative: well-formed unsupported matching Format is UNSUPPORTED', async () => {
  const f = await fixture, memo = clone(f.memo); memo.MemoFormat = Buffer.from('text/plain').toString('hex').toUpperCase();
  assert.equal((await anchor(await withMemos([{ Memo: memo }]))).anchor_native, 'ANCHOR_UNSUPPORTED');
});

test('XRPL negative: a future Type is unrelated to exact v0 selection', async () => {
  const f = await fixture, memo = clone(f.memo); memo.MemoType = Buffer.from('urn:receiptos:xrpl-receipt-anchor-v1').toString('hex').toUpperCase();
  const result = await anchor(await withMemos([{ Memo: memo }]));
  assert.equal(result.anchor_native, 'ANCHOR_NOT_ESTABLISHED');
  assert.deepEqual(result.unrelated_memos, [{ Memo: memo }]);
});

test('XRPL positive control: lowercase hex is the same decoded MemoType/Data', async () => {
  const f = await fixture, memo = Object.fromEntries(Object.entries(f.memo).map(([key, value]) => [key, value.toLowerCase()]));
  assert.equal((await anchor(await withMemos([{ Memo: memo }]))).anchor_native, 'ANCHOR_MATCH');
});

for (const [name, trust] of [['absent', undefined], ['null', null], ['empty', {}], ['self-declared capture object', { basis: 'validated:true' }]]) {
  test('XRPL negative: saved validated flag with ' + name + ' trust cannot establish observation', async () => {
    const state = await current();
    assert.equal((await evaluateXrplAnchor(state.input, trust)).anchor_native, 'ANCHOR_NOT_ESTABLISHED');
  });
}

test('XRPL negative: unvalidated observation is NOT_ESTABLISHED even with a matching signed anchor', async () => {
  const state = await current(); state.input.observation.validated = false;
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_NOT_ESTABLISHED');
});

for (const [name, edit] of [
  ['native PASS', s => { s.input.observation.meta.TransactionResult = 'PASS'; }],
  ['validated tem-class', s => { s.input.observation.meta.TransactionResult = 'temMALFORMED'; }],
  ['validated ter-class', s => { s.input.observation.meta.TransactionResult = 'terRETRY'; }],
  ['validated flag string', s => { s.input.observation.validated = 'true'; }],
]) test('XRPL negative: ' + name + ' cannot be treated as validated tes/tec evidence', async () => {
  const state = await current(); edit(state);
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_MALFORMED');
});

test('XRPL missing native metadata does not erase an independently accepted exact anchor', async () => {
  const state = await current(); delete state.input.observation.meta;
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.native_transaction_result, null);
});

test('XRPL missing native metadata leaves separately required effect policy NOT_ESTABLISHED', async () => {
  const state = await current(); delete state.input.observation.meta; state.trust.required_transaction_result = 'tesSUCCESS';
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.transaction_policy, 'NOT_ESTABLISHED');
});

test('XRPL untrusted tec observation cannot establish even a separately requested effect policy', async () => {
  const state = await current(); state.input.observation.meta.TransactionResult = 'tecNO_PERMISSION';
  state.trust.basis = 'SAVED_BOOLEAN'; state.trust.required_transaction_result = 'tesSUCCESS';
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_NOT_ESTABLISHED');
  assert.equal(result.native_transaction_result, 'tecNO_PERMISSION');
  assert.equal(result.transaction_policy, 'NOT_ESTABLISHED');
});

for (const [name, meta] of [['nonobject metadata', 'tesSUCCESS'], ['nonstr native result', { TransactionResult: true }]]) {
  test('XRPL negative: ' + name + ' is MALFORMED rather than omitted native evidence', async () => {
    const state = await current(); state.input.observation.meta = meta;
    assert.equal((await anchor(state)).anchor_native, 'ANCHOR_MALFORMED');
  });
}

test('XRPL malformed anchor is not masked by an independently contradicted caller claim', async () => {
  const f = await fixture, memo = clone(f.memo); memo.MemoData = '00';
  const state = await withMemos([{ Memo: memo }]);
  const result = await evaluateXrplClaim(state.input, f.requestB, state.trust);
  assert.equal(result.anchor_native, 'ANCHOR_MALFORMED');
  assert.equal(result.claim_relation.status, 'CONTRADICTED');
  assert.equal(result.overall, 'REJECTED_MALFORMED');
});

test('XRPL negative: altered signed binary cannot inherit the captured transaction identity', async () => {
  const state = await current();
  state.input.observation.tx_blob = state.input.observation.tx_blob.slice(0, -2) + (state.input.observation.tx_blob.endsWith('00') ? '01' : '00');
  const result = await anchor(state);
  assert.notEqual(result.anchor_native, 'ANCHOR_MATCH');
  assert.ok(['ANCHOR_MISMATCH', 'ANCHOR_MALFORMED'].includes(result.anchor_native));
});

for (const [name, edit] of [
  ['wrong captured transaction hash', s => { s.input.observation.hash = '0'.repeat(64); }],
  ['wrong selected transaction hash', s => { s.trust.transaction_hash = '0'.repeat(64); }],
  ['wrong ledger-header hash', s => { s.input.observation.ledger.ledger_hash = '0'.repeat(64); }],
  ['altered ledger-header close time', s => { s.input.observation.ledger.close_time++; }],
  ['wrong enclosing ledger index', s => { s.input.observation.ledger_index++; }],
  ['missing transaction membership', s => { s.input.observation.ledger.transactions = []; }],
]) test('XRPL negative: ' + name + ' cannot establish the claimed relation', async () => {
  const state = await current(); edit(state);
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_MISMATCH');
});

for (const [name, edit] of [
  ['subject', s => { s.subject.id = 'hermetic:other-subject'; }],
  ['artifact', s => { s.subject.artifact_digest = 'd'.repeat(64); }],
  ['authority', s => { s.authority.id = 'other-authority'; }],
  ['scope', s => { s.scope.evidence_member = 'all-artifacts'; }],
  ['policy', s => { s.policy.version = '2'; }],
  ['version', s => { s.version = '2'; }],
]) test('XRPL generic claim boundary: same anchor with wrong ' + name + ' remains MATCH but contradicts transfer', async () => {
  const state = await current(), requested = clone(state.f.requestA); edit(requested);
  const result = await evaluateXrplClaim(state.input, requested, state.trust);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.claim_relation.status, 'CONTRADICTED');
  assert.equal(result.overall, 'CONTRADICTED');
});

test('XRPL insufficient consumer evidence basis does not become global VERIFIED', async () => {
  const state = await current(); state.trust.claim_context.evidence_basis = [];
  const result = await evaluateXrplClaim(state.input, state.f.requestA, state.trust);
  assert.equal(result.anchor_native, 'ANCHOR_MATCH');
  assert.equal(result.claim_relation.status, 'INSUFFICIENT_EVIDENCE');
  assert.notEqual(result.overall, 'VERIFIED');
  assert.notEqual(result.overall, 'CONTINUE_REQUIRED_LAYERS');
});

test('XRPL deterministic repeated evaluation preserves identical portable output bytes', async () => {
  const state = await current();
  const a = await evaluateXrplClaim(state.input, state.f.requestA, state.trust);
  const b = await evaluateXrplClaim(state.input, state.f.requestA, state.trust);
  assert.equal(independentCanonical(a), independentCanonical(b));
});

test('XRPL negative: covered receipt tamper fails native integrity instead of accepting its old R', async () => {
  const state = await current(); state.input.receipt.task.title = 'Tampered after root commitment';
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MALFORMED');
  assert.equal(result.integrity.status, 'REJECTED_MALFORMED');
  assert.ok(result.reason_codes.includes('XRPL_RECEIPT_INTEGRITY_UNESTABLISHED'));
});

test('XRPL negative: supplied declaration must equal the actual root-bound metadata', async () => {
  const state = await current(); state.input.claim_preimage.surface.claim.id = 'substituted-declaration';
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MISMATCH');
  assert.ok(result.reason_codes.includes('XRPL_RECEIPT_DECLARATION_MISMATCH'));
});

test('XRPL negative: absent root-bound declaration cannot be replaced by a valid-looking preimage', async () => {
  const state = await current(); delete state.input.receipt.metadata.xrpl_claim_preimage;
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_MISMATCH');
});

for (const [name, edit] of [
  ['extra preimage member', p => { p.unknown = 'not-in-contract'; }],
  ['missing subject', p => { delete p.surface.subject; }],
  ['null subject', p => { p.surface.subject = null; }],
  ['extra surface field', p => { p.surface.unknown = true; }],
  ['malformed artifact digest', p => { p.surface.subject.artifact_digest = 'xyz'; }],
  ['unsafe integer', p => { p.surface.claim.parameters.count = Number.MAX_SAFE_INTEGER + 1; }],
  ['nonfinite numeric member', p => { p.surface.claim.parameters.count = NaN; }],
  ['unpaired Unicode surrogate', p => { p.surface.subject.id = '\ud800'; }],
  ['invalid time interval', p => { p.surface.time.not_after = 0; }],
  ['duplicate dependency identity', p => { p.surface.dependencies = [{ id: 'a', version: '1' }, { id: 'a', version: '2' }]; }],
  ['out-of-range network', p => { p.network_binding.network_id = 4294967296; }],
  ['uppercase checkpoint in normalized descriptor', p => { p.network_binding.trusted_checkpoint.ledger_hash = p.network_binding.trusted_checkpoint.ledger_hash.toUpperCase(); }],
]) test('XRPL schema admission rejects ' + name + ' before deriving any anchor', async () => {
  const f = await fixture, preimage = clone(f.preimage); edit(preimage);
  await assert.rejects(deriveCommitment(f.receipt, preimage));
});

for (const [name, edit] of [
  ['unknown XRPL profile version', s => { s.input.profile = 'xrpl-receipt-anchor-v1'; }],
  ['unknown receipt-root profile', s => { s.input.claim_preimage.receipt_profile = 'crystal.handoff-receipt-root.v99'; }],
  ['unknown semantic profile', s => { s.input.claim_preimage.verification_profile = 'receiptos.verify.generic.v99'; }],
  ['unsupported effect requirement', s => { s.trust.required_transaction_result = 'tecNO_PERMISSION'; }],
]) test('XRPL unknown capability: ' + name + ' is UNSUPPORTED rather than MATCH', async () => {
  const state = await current(); edit(state);
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_UNSUPPORTED');
});

for (const [name, edit] of [
  ['missing ledger history', s => { delete s.input.observation.history; }],
  ['empty ledger history', s => { s.input.observation.history = []; }],
  ['missing ledger observation', s => { delete s.input.observation.ledger; }],
  ['missing membership observation', s => { delete s.input.observation.ledger.transactions; }],
  ['missing endpoint identity', s => { delete s.input.observation.endpoint; }],
]) test('XRPL unavailable evidence: ' + name + ' is NOT_ESTABLISHED', async () => {
  const state = await current(); edit(state);
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_NOT_ESTABLISHED');
});

test('XRPL negative: skipped history header cannot establish checkpoint ancestry', async () => {
  const state = await current(); state.input.observation.history.splice(1, 1);
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MISMATCH');
  assert.ok(result.reason_codes.includes('XRPL_HISTORY_SEQUENCE_MISMATCH'));
});

test('XRPL negative: individually rehashed but disconnected header does not establish ancestry', async () => {
  const state = await current(), h = state.input.observation.history[1];
  h.parent_hash = '5'.repeat(64); h.ledger_hash = independentLedgerHash(h);
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MISMATCH');
  assert.ok(result.reason_codes.includes('XRPL_HISTORY_PARENT_MISMATCH'));
});

test('XRPL negative: duplicate transaction membership is MALFORMED, not extra evidence', async () => {
  const state = await current(); state.input.observation.ledger.transactions.push(state.input.observation.hash);
  assert.equal((await anchor(state)).anchor_native, 'ANCHOR_MALFORMED');
});

test('XRPL negative: conflicting JSON transaction declaration cannot override signed bytes', async () => {
  const state = await current(); state.input.observation.tx_json = decode(state.input.observation.tx_blob);
  state.input.observation.tx_json.Memos = [];
  const result = await anchor(state);
  assert.equal(result.anchor_native, 'ANCHOR_MALFORMED');
  assert.ok(result.reason_codes.includes('XRPL_TRANSACTION_DECLARATIONS_CONFLICT'));
});

for (const [name, fields] of [
  ['account-setting flag', { SetFlag: 8 }],
  ['different transaction type', { TransactionType: 'AccountDelete', Destination: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh' }],
]) test('XRPL carrier boundary rejects ' + name + ' as UNSUPPORTED', async () => {
  const f = await fixture;
  assert.equal((await anchor(await withMemos([{ Memo: f.memo }], 'tesSUCCESS', fields))).anchor_native, 'ANCHOR_UNSUPPORTED');
});

test('XRPL negative: an anchor outside its signed LastLedgerSequence is inconsistent evidence', async () => {
  const f = await fixture;
  const result = await anchor(await withMemos([{ Memo: f.memo }], 'tesSUCCESS', { LastLedgerSequence: 501 }));
  assert.equal(result.anchor_native, 'ANCHOR_MALFORMED');
  assert.ok(result.reason_codes.includes('XRPL_LEDGER_VALIDITY_CONFLICT'));
});

test('XRPL negative: aggregate serialized unrelated Memo bytes share the 1 KB bound', async () => {
  const f = await fixture, large = { Memo: { MemoData: '00'.repeat(1024) } };
  const result = await anchor(await withMemos([{ Memo: f.memo }, large]));
  assert.equal(result.anchor_native, 'ANCHOR_MALFORMED');
  assert.ok(result.reason_codes.includes('XRPL_MEMOS_OVERSIZED'));
});

test('XRPL synthetic fixture exposes no wallet secret or private credential', async () => {
  const f = await fixture;
  const publicFixture = { input: f.input, trust: f.trust, requestA: f.requestA, requestB: f.requestB };
  const keys = [];
  const visit = value => { if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) { keys.push(key); visit(item); } };
  visit(publicFixture);
  for (const forbidden of ['seed', 'privateKey', 'private_key', 'secret', 'faucet_credentials']) assert.equal(keys.includes(forbidden), false);
  assert.equal(publicFixture.input.receipt.metadata.fixture_kind, 'SYNTHETIC_HERMETIC_NOT_LIVE');
});
