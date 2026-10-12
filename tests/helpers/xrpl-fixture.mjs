// Hermetic synthetic XRPL observations. No network and no saved wallet secret.
// Oracle bytes are constructed independently of the adapter under test. These
// headers and inclusion assertions are NOT observations of an actual ledger.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { encode, decode, hashes } from 'xrpl';
import { buildCrystalEvidence } from '../../src/adapters/crystal.mjs';

export const TYPE_ASCII = 'urn:receiptos:xrpl-receipt-anchor-v0';
export const TYPE_HEX = '75726E3A726563656970746F733A7872706C2D726563656970742D616E63686F722D7630';
export const FORMAT_HEX = '6170706C69636174696F6E2F6F637465742D73747265616D';
export const DOMAIN = 'receiptos.xrpl-receipt-anchor-v0.claim';
export const PROFILE_ID = 'xrpl-receipt-anchor-v0';
export const ENDPOINT = 'wss://s.altnet.rippletest.net:51233';
export const clone = value => structuredClone(value);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const half = bytes => createHash('sha512').update(bytes).digest('hex').slice(0, 64).toUpperCase();
const capturedCarrier = decode(JSON.parse(readFileSync(new URL('../../reports/xrpl-poc/testnet-capture.json', import.meta.url), 'utf8')).observation.tx_blob);
// Reuse only existing PUBLIC signature-shaped fields in counterfactual codec
// fixtures. These changed carriers are not authorized transactions or live
// observations. No wallet/key generation or signing is needed to test this
// adapter's byte relations; signature verification is outside its contract.
export function syntheticCarrier(transaction) {
  const tx_blob = encode({ ...transaction, SigningPubKey: capturedCarrier.SigningPubKey, TxnSignature: capturedCarrier.TxnSignature });
  return { tx_blob, hash: independentTransactionHash(tx_blob) };
}

// Independent restricted-domain canonical oracle, not the pinned JCS package
// or any ReceiptOS canonicalization function. No general JCS claim is made.
export function independentCanonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Number.isSafeInteger(value) && !Object.is(value, -0)) return String(value);
  if (Array.isArray(value)) return '[' + value.map(independentCanonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + independentCanonical(value[key])).join(',') + '}';
  throw new TypeError('Outside independent fixture canonical domain');
}
export function independentClaimDigest(preimage) {
  return sha256(Buffer.concat([Buffer.from(DOMAIN, 'ascii'), Buffer.from([0]), Buffer.from(independentCanonical(preimage), 'utf8')]));
}
export function independentReceiptRoot(receipt) {
  const body = clone(receipt); delete body.anchor;
  return sha256(Buffer.from(independentCanonical(body), 'utf8'));
}
export function independentTransactionHash(binary) {
  return half(Buffer.concat([Buffer.from('54584E00', 'hex'), Buffer.from(binary, 'hex')]));
}
function integer(value, bytes) {
  return Buffer.from(BigInt(value).toString(16).padStart(bytes * 2, '0'), 'hex');
}
export function independentLedgerHash(header) {
  return half(Buffer.concat([
    Buffer.from('4C575200', 'hex'), integer(header.ledger_index, 4), integer(header.total_coins, 8),
    Buffer.from(header.parent_hash, 'hex'), Buffer.from(header.transaction_hash, 'hex'), Buffer.from(header.account_hash, 'hex'),
    integer(header.parent_close_time, 4), integer(header.close_time, 4), integer(header.close_time_resolution, 1), integer(header.close_flags, 1),
  ]));
}
function header(index, parent, txRoot = '9'.repeat(64)) {
  const value = { ledger_index: index, total_coins: '100000000000000000', parent_hash: parent,
    transaction_hash: txRoot, account_hash: '7'.repeat(64), parent_close_time: 800000000 + index - 1,
    close_time: 800000000 + index, close_time_resolution: 10, close_flags: 0 };
  return { ...value, ledger_hash: independentLedgerHash(value) };
}

export async function buildXrplFixture() {
  const account = capturedCarrier.Account;
  const checkpoint = header(500, '6'.repeat(64));
  const intermediate = header(501, checkpoint.ledger_hash);
  const finalHeader = header(502, intermediate.ledger_hash);
  const surface = {
    claim: { id: 'hermetic-claim-A', kind: 'SHA256_EQUALS', parameters: { expected_digest: 'b'.repeat(64) } },
    subject: { kind: 'git-artifact', id: 'hermetic:artifact', version: '1', artifact_digest: 'b'.repeat(64), commit: 'a'.repeat(40) },
    scope: { evidence_member: 'artifact' }, authority: { id: 'hermetic-local-author', class: 'INDEPENDENT_RECOMPUTATION' },
    policy: { id: 'hermetic-caller-policy', version: '1' }, version: '1', time: { not_before: 0, not_after: 2000000000 },
    assumptions: [], dependencies: [], evidence_requirements: ['artifact', 'execution'],
  };
  const preimage = { receipt_profile: 'crystal.handoff-receipt-root.v1', verification_profile: 'receiptos.verify.generic.v2',
    surface, network_binding: { network_id: 1, trusted_checkpoint: { ledger_index: checkpoint.ledger_index, ledger_hash: checkpoint.ledger_hash.toLowerCase() } } };
  const receipt = await buildCrystalEvidence({ session_id: 'xrpl-hermetic-only',
    metadata: { fixture_kind: 'SYNTHETIC_HERMETIC_NOT_LIVE', xrpl_claim_preimage: clone(preimage) } });
  const root = independentReceiptRoot(receipt), digest = independentClaimDigest(preimage);
  const memo = { MemoType: TYPE_HEX, MemoFormat: FORMAT_HEX, MemoData: (root + digest).toUpperCase() };
  function observationFor(memos = [{ Memo: memo }], result = 'tesSUCCESS', transactionFields = {}) {
    const transaction = { TransactionType: 'AccountSet', Account: account, Sequence: 1, Fee: '12',
      LastLedgerSequence: 520, Flags: 0x80000000, Memos: clone(memos), ...transactionFields };
    const signed = syntheticCarrier(transaction);
    const observation = { validated: true, hash: independentTransactionHash(signed.tx_blob), ledger_index: finalHeader.ledger_index,
      ledger_hash: finalHeader.ledger_hash, tx_blob: signed.tx_blob, meta: { TransactionResult: result },
      ledger: { ...clone(finalHeader), transactions: [signed.hash] },
      history: [clone(checkpoint), clone(intermediate), clone(finalHeader)], endpoint: ENDPOINT, network_id: 1 };
    if (signed.hash !== observation.hash || hashes.hashSignedTx(signed.tx_blob) !== observation.hash) throw new Error('Independent transaction hash control failed');
    if (hashes.hashLedgerHeader(finalHeader) !== finalHeader.ledger_hash) throw new Error('Independent ledger-header hash control failed');
    return observation;
  }
  const observation = observationFor();
  const trust = { basis: 'TRUSTED_RPC_OBSERVATION', endpoint: ENDPOINT, network_id: 1,
    checkpoint: clone(preimage.network_binding.trusted_checkpoint), account,
    transaction_hash: observation.hash, required_transaction_result: null,
    claim_context: { verification_time: 1791763200, established_assumptions: [], dependency_results: [], evidence_basis: ['artifact', 'execution'] } };
  const requestB = clone(surface); requestB.claim.id = 'hermetic-claim-B'; requestB.subject.commit = 'c'.repeat(40);
  return { root, digest, memo, receipt, preimage, requestA: clone(surface), requestB,
    input: { profile: PROFILE_ID, receipt, claim_preimage: preimage, observation }, trust,
    observationFor, transaction: decode(observation.tx_blob) };
}
