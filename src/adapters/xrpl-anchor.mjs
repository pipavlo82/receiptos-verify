/**
 * Experimental xrpl-receipt-anchor-v0 relation over an explicitly trusted RPC
 * observation or caller-accepted public capture. No network or wallet access.
 * Header hashes/ancestry and transaction bytes are checked; RPC membership is
 * not a portable consensus, validator-signature or SHAMap inclusion proof.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import jcs from 'canonicalize';
import { decode, encode, hashes, isValidClassicAddress } from 'xrpl';
import { canonicalize, equal, problem } from '../core/common.mjs';
import { compareClaimSurfaces } from '../core/claim-surface.mjs';
import { validateBindingContract } from '../core/binding-contract.mjs';
import { verifyIntegrity } from './crystal.mjs';

export const PROFILE = 'xrpl-receipt-anchor-v0';
export const MEMO_TYPE_HEX = '75726E3A726563656970746F733A7872706C2D726563656970742D616E63686F722D7630';
export const MEMO_FORMAT_HEX = '6170706C69636174696F6E2F6F637465742D73747265616D';
const DOMAIN = 'receiptos.xrpl-receipt-anchor-v0.claim';
const ROOT_PROFILE = 'crystal.handoff-receipt-root.v1';
const VERIFY_PROFILE = 'receiptos.verify.generic.v2';
const HEX_32 = /^[0-9a-fA-F]{64}$/;
const U32_MAX = 4294967295;
const ROOT = new URL('../../', import.meta.url);
const ajv = new Ajv2020({ strict: true, allErrors: true });
const surfaceSchema = JSON.parse(readFileSync(new URL('schemas/claim-surface.schema.json', ROOT), 'utf8'));
ajv.addSchema(surfaceSchema);
const validateSurface = ajv.getSchema(surfaceSchema.$id);
const validateDescriptor = ajv.compile(JSON.parse(readFileSync(new URL('docs/xrpl/xrpl-receipt-anchor-v0.schema.json', ROOT), 'utf8')));
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hex = value => typeof value === 'string' && /^(?:[0-9a-fA-F]{2})*$/.test(value);
const sameHash = (a, b) => typeof a === 'string' && typeof b === 'string' && HEX_32.test(a) && HEX_32.test(b) && a.toLowerCase() === b.toLowerCase();
const index = value => Number.isInteger(value) && value > 0 && value <= U32_MAX;
const LIMITATIONS = Object.freeze([
  'Experimental bounded anchor relation, not a global ReceiptOS VERIFIED result.',
  'RPC/capture trust is caller-selected; saved validated:true alone establishes nothing.',
  'Header identity/ancestry and RPC-reported membership are not a portable consensus or SHAMap inclusion proof.',
  'Ledger account authorization is not external/business authority or execution correctness.',
  'The pinned Crystal root excludes top-level anchor and is not whole-envelope identity.',
  'Ledger inclusion time is not execution time; replay is not a new live observation.',
]);

export const descriptor = Object.freeze({
  profileId: PROFILE, version: 0, maturity: 'EXPERIMENTAL',
  binding_contract: Object.freeze({ version: 1, required: Object.freeze(['receipt_root', 'claim', 'subject', 'submitting_account', 'transaction', 'network', 'ledger_checkpoint']) }),
  license: 'Apache-2.0',
  contractSource: { repository: 'https://github.com/pipavlo82/receiptos-verify',
    commit: '6b403702628f216933d4b30a130f74ac5c81171d',
    paths: ['docs/xrpl/RECEIPTOS_VERIFY_XRPL_NOTE.md', 'docs/xrpl/xrpl-receipt-anchor-v0.schema.json'],
    role: 'REVIEWED_DOCUMENTATION_CONTRACT' },
  capabilities: ['XRPL_SIGNED_BINARY_IDENTITY', 'TRUSTED_LEDGER_ANCHOR_RELATION', 'CALLER_CLAIM_COMPATIBILITY'],
  requiredEvidence: ['native-crystal-receipt', 'bound-claim-preimage', 'signed-transaction-bytes', 'validated-ledger-observation', 'caller-selected-trust'],
  nativeVocabulary: ['ANCHOR_MATCH', 'ANCHOR_MISMATCH', 'ANCHOR_NOT_ESTABLISHED', 'ANCHOR_MALFORMED', 'ANCHOR_UNSUPPORTED'],
  sdk: { package: 'xrpl', version: '5.3.0', license: 'ISC' },
  canonicalization: { package: 'canonicalize', version: '5.1.0', scope: 'portable-claim-commitment-only' },
});

function checkSurface(value) {
  canonicalize(value); // Existing product JSON domain: no nonfinite/unsafe numbers, accessors or invalid Unicode.
  if (!validateSurface(value) || value.time.not_after <= value.time.not_before
      || new Set(value.dependencies.map(item => item.id)).size !== value.dependencies.length) {
    throw problem('XRPL_CLAIM_SURFACE_MALFORMED', 'Claim surface fails the existing closed v2 admission contract.');
  }
}

function admitPreimage(preimage) {
  canonicalize(preimage);
  if (!record(preimage)) throw problem('XRPL_PREIMAGE_MALFORMED', 'Claim preimage must be a JSON object.');
  if (preimage.receipt_profile !== ROOT_PROFILE || preimage.verification_profile !== VERIFY_PROFILE) {
    throw problem('XRPL_PROFILE_UNSUPPORTED', 'Unsupported receipt or verification profile.');
  }
  checkSurface(preimage.surface);
  const dummy = {
    profile: PROFILE, receipt_root: '0'.repeat(64), claim_preimage: preimage,
    claim_digest: '0'.repeat(64), memo: { MemoType: MEMO_TYPE_HEX, MemoFormat: MEMO_FORMAT_HEX, MemoData: '0'.repeat(128) },
  };
  if (!validateDescriptor(dummy)) throw problem('XRPL_PREIMAGE_MALFORMED', 'Preimage fails the reviewed static descriptor schema.');
}

/** Independently derives R using the pinned Crystal verifier, and C using JCS.
 * The exact preimage is inside root-bound receipt metadata, not an anchor field.
 * Caller must parse external JSON with the existing strict parser first.
 */
export async function deriveCommitment(receipt, claimPreimage) {
  admitPreimage(claimPreimage);
  canonicalize(receipt);
  if (!record(receipt?.metadata?.xrpl_claim_preimage) || !equal(receipt.metadata.xrpl_claim_preimage, claimPreimage)) {
    throw problem('XRPL_RECEIPT_DECLARATION_MISMATCH', 'Receipt metadata does not bind the exact supplied claim preimage.');
  }
  const nativeIntegrity = await verifyIntegrity(receipt);
  // Preserve native result and semantic status while excluding process argv,
  // which contains machine paths and is not part of deterministic identity.
  const integrity = {
    status: nativeIntegrity.status, reasonCodes: nativeIntegrity.reasonCodes,
    nativeResult: nativeIntegrity.nativeResult, limitations: nativeIntegrity.limitations,
    provenance: nativeIntegrity.provenance,
  };
  if (integrity.status !== 'VERIFIED') {
    throw Object.assign(problem('XRPL_RECEIPT_INTEGRITY_UNESTABLISHED', 'Pinned native Crystal root verification did not establish integrity.'), { integrity });
  }
  const nativeRoot = integrity.nativeResult?.receipt_root;
  if (typeof nativeRoot !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(nativeRoot)) {
    throw Object.assign(problem('XRPL_RECEIPT_ROOT_MALFORMED', 'Native Crystal root does not use the supported 0x-prefixed SHA-256 representation.'), { integrity });
  }
  const receipt_root = nativeRoot.slice(2).toLowerCase();
  const claim_digest = createHash('sha256').update(Buffer.from(DOMAIN, 'ascii')).update(Buffer.from([0]))
    .update(Buffer.from(jcs(claimPreimage), 'utf8')).digest('hex');
  const memo = { MemoType: MEMO_TYPE_HEX, MemoFormat: MEMO_FORMAT_HEX, MemoData: `${receipt_root}${claim_digest}`.toUpperCase() };
  if (!validateDescriptor({ profile: PROFILE, receipt_root, claim_preimage: claimPreimage, claim_digest, memo })) {
    throw problem('XRPL_DESCRIPTOR_MALFORMED', 'Derived descriptor fails the reviewed schema.');
  }
  return { receipt_root, claim_digest, memo, integrity };
}

function txPolicy(required, native, established) {
  return required === null || required === undefined ? 'NOT_REQUESTED'
    : !established || native === null ? 'NOT_ESTABLISHED'
      : native === required ? 'SATISFIED' : 'UNSATISFIED';
}

function ledgerHeader(header) {
  if (!record(header) || !index(header.ledger_index) || !HEX_32.test(header.ledger_hash ?? '')
      || !['parent_hash', 'transaction_hash', 'account_hash'].every(key => HEX_32.test(header[key] ?? ''))
      || typeof header.total_coins !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(header.total_coins)
      || BigInt(header.total_coins) > 18446744073709551615n
      || !['parent_close_time', 'close_time'].every(key => Number.isInteger(header[key]) && header[key] >= 0 && header[key] <= U32_MAX)
      || !['close_time_resolution', 'close_flags'].every(key => Number.isInteger(header[key]) && header[key] >= 0 && header[key] <= 255)) {
    throw problem('XRPL_LEDGER_HEADER_MALFORMED', 'Missing or malformed bounded ledger-header fields.');
  }
  if (!sameHash(hashes.hashLedgerHeader(header), header.ledger_hash)) {
    throw problem('XRPL_LEDGER_HEADER_HASH_MISMATCH', 'Recomputed XRPL ledger header hash differs.');
  }
}

function decodeCarrier(observation) {
  if (!hex(observation.tx_blob) || observation.tx_blob.length < 2 || observation.tx_blob.length > 2 * 1024 * 1024) {
    throw problem('XRPL_TRANSACTION_BYTES_MALFORMED', 'Missing, malformed or excessive signed transaction bytes.');
  }
  const tx = decode(observation.tx_blob);
  if (encode(tx).toUpperCase() !== observation.tx_blob.toUpperCase()) {
    throw problem('XRPL_TRANSACTION_BYTES_MALFORMED', 'Transaction bytes do not round-trip through the pinned canonical codec.');
  }
  if (observation.tx_json !== undefined && !equal(tx, observation.tx_json)) {
    throw problem('XRPL_TRANSACTION_DECLARATIONS_CONFLICT', 'Supplied transaction JSON conflicts with signed binary bytes.');
  }
  const allowed = ['TransactionType', 'Account', 'Sequence', 'Fee', 'LastLedgerSequence', 'SigningPubKey', 'TxnSignature', 'Signers', 'Flags', 'SourceTag', 'Memos', 'NetworkID'];
  if (tx.TransactionType !== 'AccountSet' || Object.keys(tx).some(key => !allowed.includes(key))
      || !index(tx.Sequence) || ![undefined, 0, 2147483648].includes(tx.Flags)) {
    throw problem('XRPL_CARRIER_UNSUPPORTED', 'V0 accepts only standalone no-setting AccountSet with ordinary Sequence and supported canonical-signing flags.');
  }
  if (!isValidClassicAddress(tx.Account) || typeof tx.Fee !== 'string' || !/^[1-9][0-9]*$/.test(tx.Fee)
      || (tx.LastLedgerSequence !== undefined && !index(tx.LastLedgerSequence))) {
    throw problem('XRPL_TRANSACTION_MALFORMED', 'Malformed account, fee or ledger validity bound.');
  }
  const single = typeof tx.SigningPubKey === 'string' && tx.SigningPubKey.length > 0 && hex(tx.SigningPubKey)
    && typeof tx.TxnSignature === 'string' && tx.TxnSignature.length > 0 && hex(tx.TxnSignature);
  const multi = tx.SigningPubKey === '' && Array.isArray(tx.Signers) && tx.Signers.length > 0 && tx.TxnSignature === undefined;
  if ((!single && !multi) || (single && tx.Signers !== undefined)) {
    throw problem('XRPL_TRANSACTION_UNSIGNED', 'The accepted carrier requires signed bytes; signatures themselves are not independently verified by this adapter.');
  }
  return { tx, hash: hashes.hashSignedTx(observation.tx_blob) };
}

function selectedMemo(tx) {
  const inventory = tx.Memos ?? [];
  if (!Array.isArray(inventory)) throw problem('XRPL_MEMOS_MALFORMED', 'Memos must be an array.');
  const matches = [], unrelated = [];
  for (const entry of inventory) {
    if (!record(entry) || !record(entry.Memo) || Object.keys(entry).some(key => key !== 'Memo')
        || Object.keys(entry.Memo).some(key => !['MemoType', 'MemoFormat', 'MemoData'].includes(key))
        || Object.values(entry.Memo).some(value => !hex(value))) {
      throw problem('XRPL_MEMOS_MALFORMED', 'Malformed Memo transport inventory.');
    }
    (entry.Memo.MemoType?.toUpperCase() === MEMO_TYPE_HEX ? matches : unrelated).push(structuredClone(entry));
  }
  // Conservative complete SDK serialization including the outer array field.
  if (encode({ Memos: inventory }).length / 2 > 1024) throw problem('XRPL_MEMOS_OVERSIZED', 'All serialized Memos exceed the bounded 1 KB carrier limit.');
  if (matches.length > 1) throw Object.assign(problem('XRPL_ANCHOR_MEMO_DUPLICATE', 'Multiple exact ReceiptOS Types; first/last selection is forbidden.'), { unrelated });
  if (matches.length === 0) return { memo: null, unrelated };
  const memo = matches[0].Memo;
  if (typeof memo.MemoFormat !== 'string' || typeof memo.MemoData !== 'string' || memo.MemoData.length !== 128) {
    throw Object.assign(problem('XRPL_ANCHOR_MEMO_MALFORMED', 'Selected anchor requires Format and exactly 64 data bytes.'), { unrelated });
  }
  if (memo.MemoFormat.toUpperCase() !== MEMO_FORMAT_HEX) {
    throw Object.assign(problem('XRPL_MEMO_FORMAT_UNSUPPORTED', 'Selected anchor Format is well formed but unsupported.'), { unrelated });
  }
  return { memo, unrelated };
}

/** Native anchor result over public evidence plus independently selected trust.
 * Missing trust never falls back to a saved flag, fixture expectation or PASS.
 */
export async function evaluateXrplAnchor(input, trust) {
  const observation = record(input?.observation) ? input.observation : {};
  let native = typeof observation.meta?.TransactionResult === 'string' ? observation.meta.TransactionResult : null;
  let derived = null, unrelated = [], observationEstablished = false;
  const bindings = {}, bindingEvidence = {};
  const bind = (id, expected, observed) => {
    const refs = [id + '.expected', id + '.observed'];
    bindingEvidence[refs[0]] = expected;
    bindingEvidence[refs[1]] = observed;
    bindings[id] = { status: 'VERIFIED', relation: 'EXACT', expected, observed, evidence: refs };
  };
  const finish = (anchor_native, reason_codes, extra = {}) => {
    const binding_report = { version: 1, profileId: PROFILE, bindings };
    const binding_contract = validateBindingContract(descriptor, binding_report, bindingEvidence);
    const adapter_anchor_native = anchor_native;
    if (anchor_native === 'ANCHOR_MATCH' && binding_contract.status !== 'VERIFIED') {
      anchor_native = binding_contract.status === 'CONTRADICTED' ? 'ANCHOR_MISMATCH'
        : binding_contract.status === 'REJECTED_MALFORMED' ? 'ANCHOR_MALFORMED'
          : binding_contract.status === 'UNSUPPORTED_PROFILE' ? 'ANCHOR_UNSUPPORTED' : 'ANCHOR_NOT_ESTABLISHED';
      reason_codes = [...reason_codes, ...binding_contract.reasonCodes];
    }
    return {
    profile: PROFILE, anchor_native, native_transaction_result: native,
    transaction_policy: txPolicy(trust?.required_transaction_result, native, observationEstablished), reason_codes,
    integrity: derived?.integrity ?? null, unrelated_memos: unrelated,
    commitment: derived ? { receipt_root: derived.receipt_root, claim_digest: derived.claim_digest, memo: derived.memo } : null,
    trust_basis: trust?.basis ?? null, limitations: [...LIMITATIONS], ...extra,
    adapter_anchor_native, binding_report, binding_evidence: bindingEvidence, binding_contract,
  }; };
  try {
    canonicalize(input);
    if (!record(input) || input.profile !== PROFILE) return finish('ANCHOR_UNSUPPORTED', ['XRPL_PROFILE_UNSUPPORTED']);
    derived = await deriveCommitment(input.receipt, input.claim_preimage);
    if (!record(trust) || !['TRUSTED_RPC_OBSERVATION', 'ACCEPTED_CAPTURE_REPLAY'].includes(trust.basis)) {
      return finish('ANCHOR_NOT_ESTABLISHED', ['XRPL_TRUST_BASIS_NOT_ESTABLISHED']);
    }
    canonicalize(trust);
    if (typeof trust.endpoint !== 'string' || !trust.endpoint || !Number.isInteger(trust.network_id)
        || trust.network_id < 0 || trust.network_id > U32_MAX || !record(trust.checkpoint)
        || !index(trust.checkpoint.ledger_index) || !HEX_32.test(trust.checkpoint.ledger_hash ?? '')
        || !isValidClassicAddress(trust.account ?? '') || !HEX_32.test(trust.transaction_hash ?? '')) {
      return finish('ANCHOR_NOT_ESTABLISHED', ['XRPL_CALLER_TRUST_INCOMPLETE']);
    }
    if (trust.required_transaction_result !== undefined && trust.required_transaction_result !== null && trust.required_transaction_result !== 'tesSUCCESS') {
      return finish('ANCHOR_UNSUPPORTED', ['XRPL_TRANSACTION_POLICY_UNSUPPORTED']);
    }
    if (observation.validated !== true) {
      return finish(typeof observation.validated === 'boolean' || observation.validated === undefined ? 'ANCHOR_NOT_ESTABLISHED' : 'ANCHOR_MALFORMED', ['XRPL_VALIDATED_OBSERVATION_NOT_ESTABLISHED']);
    }
    if (observation.endpoint === undefined || observation.network_id === undefined) return finish('ANCHOR_NOT_ESTABLISHED', ['XRPL_OBSERVATION_NETWORK_UNESTABLISHED']);
    const binding = input.claim_preimage.network_binding;
    if (observation.endpoint !== trust.endpoint || observation.network_id !== trust.network_id || binding.network_id !== trust.network_id
        || binding.trusted_checkpoint.ledger_index !== trust.checkpoint.ledger_index
        || !sameHash(binding.trusted_checkpoint.ledger_hash, trust.checkpoint.ledger_hash)) {
      return finish('ANCHOR_MISMATCH', ['XRPL_NETWORK_CHECKPOINT_MISMATCH']);
    }
    const { tx, hash } = decodeCarrier(observation);
    if (!sameHash(hash, observation.hash) || !sameHash(hash, trust.transaction_hash)) return finish('ANCHOR_MISMATCH', ['XRPL_TRANSACTION_HASH_MISMATCH']);
    if (tx.Account !== trust.account) return finish('ANCHOR_MISMATCH', ['XRPL_ACCOUNT_MISMATCH']);
    if ((trust.network_id <= 1024 && Object.hasOwn(tx, 'NetworkID')) || (trust.network_id >= 1025 && tx.NetworkID !== trust.network_id)) {
      return finish('ANCHOR_MISMATCH', ['XRPL_TRANSACTION_NETWORK_MISMATCH']);
    }
    if (observation.meta_blob !== undefined) {
      if (!hex(observation.meta_blob) || !observation.meta_blob.length) throw problem('XRPL_METADATA_MALFORMED', 'Invalid binary metadata.');
      const binaryMeta = decode(observation.meta_blob);
      if (binaryMeta.TransactionResult !== native) throw problem('XRPL_METADATA_CONFLICT', 'Binary/JSON native transaction results conflict.');
    }
    if (observation.meta !== undefined && (!record(observation.meta)
        || (Object.hasOwn(observation.meta, 'TransactionResult') && typeof observation.meta.TransactionResult !== 'string'))) {
      return finish('ANCHOR_MALFORMED', ['XRPL_METADATA_MALFORMED']);
    }
    if (native !== null && native !== 'tesSUCCESS' && !/^tec[A-Z0-9_]+$/.test(native)) {
      return finish('ANCHOR_MALFORMED', ['XRPL_VALIDATED_RESULT_CLASS_CONFLICT']);
    }
    const selection = selectedMemo(tx);
    unrelated = selection.unrelated;
    if (!selection.memo) return finish('ANCHOR_NOT_ESTABLISHED', ['XRPL_ANCHOR_MEMO_ABSENT']);
    if (selection.memo.MemoData.toUpperCase() !== derived.memo.MemoData) return finish('ANCHOR_MISMATCH', ['XRPL_COMMITMENT_MISMATCH']);
    if (!index(observation.ledger_index) || !HEX_32.test(observation.ledger_hash ?? '')) throw problem('XRPL_LEDGER_REFERENCE_MALFORMED', 'Malformed anchor ledger reference.');
    if (!record(observation.ledger) || !Array.isArray(observation.history) || observation.history.length === 0) {
      return finish('ANCHOR_NOT_ESTABLISHED', ['XRPL_LEDGER_HISTORY_NOT_ESTABLISHED']);
    }
    if (observation.history.length > 2048) return finish('ANCHOR_UNSUPPORTED', ['XRPL_HISTORY_WINDOW_UNSUPPORTED']);
    ledgerHeader(observation.ledger);
    if (observation.ledger.ledger_index !== observation.ledger_index || !sameHash(observation.ledger.ledger_hash, observation.ledger_hash)
        || observation.ledger_index < trust.checkpoint.ledger_index) return finish('ANCHOR_MISMATCH', ['XRPL_LEDGER_REFERENCE_MISMATCH']);
    if (!Array.isArray(observation.ledger.transactions)) return finish('ANCHOR_NOT_ESTABLISHED', ['XRPL_RPC_MEMBERSHIP_NOT_ESTABLISHED']);
    if (observation.ledger.transactions.some(value => typeof value !== 'string' || !HEX_32.test(value))) throw problem('XRPL_LEDGER_MEMBERSHIP_MALFORMED', 'Expected RPC-reported transaction hashes.');
    const occurrences = observation.ledger.transactions.filter(value => sameHash(value, hash)).length;
    if (occurrences > 1) throw problem('XRPL_LEDGER_MEMBERSHIP_MALFORMED', 'Duplicate transaction identity in ledger observation.');
    if (occurrences === 0) return finish('ANCHOR_MISMATCH', ['XRPL_RPC_MEMBERSHIP_MISMATCH']);
    for (let i = 0; i < observation.history.length; i++) {
      const header = observation.history[i];
      ledgerHeader(header);
      if (header.ledger_index !== trust.checkpoint.ledger_index + i) return finish('ANCHOR_MISMATCH', ['XRPL_HISTORY_SEQUENCE_MISMATCH']);
      if (i === 0 && !sameHash(header.ledger_hash, trust.checkpoint.ledger_hash)) return finish('ANCHOR_MISMATCH', ['XRPL_CHECKPOINT_MISMATCH']);
      if (i > 0 && !sameHash(header.parent_hash, observation.history[i - 1].ledger_hash)) return finish('ANCHOR_MISMATCH', ['XRPL_HISTORY_PARENT_MISMATCH']);
    }
    const last = observation.history.at(-1);
    if (last.ledger_index !== observation.ledger_index || !sameHash(last.ledger_hash, observation.ledger_hash)) return finish('ANCHOR_MISMATCH', ['XRPL_HISTORY_ANCHOR_MISMATCH']);
    if (tx.LastLedgerSequence !== undefined && observation.ledger_index > tx.LastLedgerSequence) return finish('ANCHOR_MALFORMED', ['XRPL_LEDGER_VALIDITY_CONFLICT']);
    // Native algorithms remain local. Core separately checks every declared
    // obligation and recomputes these exact relations against their evidence.
    const checkpoint = value => ({ ledger_index: value.ledger_index, ledger_hash: value.ledger_hash.toLowerCase() });
    bind('receipt_root', derived.receipt_root, selection.memo.MemoData.slice(0, 64).toLowerCase()); // XRPL_BINDING receipt_root
    bind('claim', { digest: derived.claim_digest, preimage: input.receipt.metadata.xrpl_claim_preimage },
      { digest: selection.memo.MemoData.slice(64).toLowerCase(), preimage: input.claim_preimage }); // XRPL_BINDING claim
    bind('subject', input.receipt.metadata.xrpl_claim_preimage.surface.subject, input.claim_preimage.surface.subject); // XRPL_BINDING subject
    bind('submitting_account', trust.account, tx.Account); // XRPL_BINDING submitting_account
    bind('transaction', { selected: trust.transaction_hash.toLowerCase(), observed: observation.hash.toLowerCase() },
      { selected: hash.toLowerCase(), observed: hash.toLowerCase() }); // XRPL_BINDING transaction
    bind('network', { endpoint: trust.endpoint, observed: trust.network_id, committed: trust.network_id, transaction: trust.network_id <= 1024 ? null : trust.network_id },
      { endpoint: observation.endpoint, observed: observation.network_id, committed: binding.network_id, transaction: tx.NetworkID ?? null }); // XRPL_BINDING network
    bind('ledger_checkpoint', { checkpoint: checkpoint(trust.checkpoint), first: checkpoint(trust.checkpoint),
      last: { ledger_index: observation.ledger_index, ledger_hash: observation.ledger_hash.toLowerCase() }, validated: true, membership_count: 1 },
      { checkpoint: checkpoint(binding.trusted_checkpoint), first: checkpoint(observation.history[0]),
        last: checkpoint(last), validated: observation.validated, membership_count: occurrences }); // XRPL_BINDING ledger_checkpoint
    observationEstablished = true;
    return finish('ANCHOR_MATCH', ['XRPL_EXACT_ANCHOR_ON_ACCEPTED_HISTORY'], {
      transaction_hash: hash, account: tx.Account, network_id: trust.network_id,
      ledger_index: observation.ledger_index, ledger_hash: observation.ledger_hash,
      selected_memo: structuredClone(selection.memo),
    });
  } catch (error) {
    if (error.unrelated) unrelated = error.unrelated;
    const code = error.code ?? 'XRPL_INPUT_MALFORMED';
    const status = ['XRPL_PROFILE_UNSUPPORTED', 'XRPL_CARRIER_UNSUPPORTED', 'XRPL_MEMO_FORMAT_UNSUPPORTED'].includes(code) ? 'ANCHOR_UNSUPPORTED'
      : code === 'XRPL_RECEIPT_INTEGRITY_UNESTABLISHED' && error.integrity?.status === 'CANNOT_RECOMPUTE' ? 'ANCHOR_NOT_ESTABLISHED'
        : code === 'XRPL_RECEIPT_DECLARATION_MISMATCH' || code === 'XRPL_LEDGER_HEADER_HASH_MISMATCH' ? 'ANCHOR_MISMATCH' : 'ANCHOR_MALFORMED';
    return finish(status, [code], error.integrity ? { integrity: error.integrity } : {});
  }
}

/** Product composition preserves the native anchor result even for request B.
 * An exact compatible anchor only permits the remaining required layers.
 */
export async function evaluateXrplClaim(input, requestedSurface, trust) {
  const anchor = await evaluateXrplAnchor(input, trust);
  // A separate core check precedes product projection; adapter-name agreement
  // and a native MATCH do not substitute for binding completeness.
  const binding_contract = validateBindingContract(descriptor, anchor.binding_report, anchor.binding_evidence);
  let claim_relation, requestMalformed = false;
  try {
    checkSurface(requestedSurface);
    checkSurface(input?.claim_preimage?.surface);
    claim_relation = compareClaimSurfaces(requestedSurface, input.claim_preimage.surface, trust?.claim_context ?? {});
  } catch (error) {
    requestMalformed = true;
    claim_relation = { status: 'INSUFFICIENT_EVIDENCE', reasonCodes: [error.code ?? 'XRPL_REQUEST_MALFORMED'] };
  }
  const needsBinding = anchor.adapter_anchor_native === 'ANCHOR_MATCH' || anchor.anchor_native === 'ANCHOR_MATCH';
  const contractFailure = needsBinding && binding_contract.status !== 'VERIFIED';
  const overall = anchor.anchor_native === 'ANCHOR_MALFORMED' || requestMalformed || contractFailure && binding_contract.status === 'REJECTED_MALFORMED' ? 'REJECTED_MALFORMED'
    : claim_relation.status === 'CONTRADICTED' || anchor.anchor_native === 'ANCHOR_MISMATCH' ? 'CONTRADICTED'
      : anchor.anchor_native === 'ANCHOR_UNSUPPORTED' ? 'UNSUPPORTED_PROFILE'
        : contractFailure && binding_contract.status === 'CONTRADICTED' ? 'CONTRADICTED'
          : contractFailure && binding_contract.status === 'UNSUPPORTED_PROFILE' ? 'UNSUPPORTED_PROFILE'
        : contractFailure || anchor.anchor_native !== 'ANCHOR_MATCH' || claim_relation.status !== 'COMPATIBLE' ? 'INSUFFICIENT_EVIDENCE'
          : anchor.transaction_policy === 'UNSATISFIED' ? 'CONTRADICTED'
            : anchor.transaction_policy === 'NOT_ESTABLISHED' ? 'INSUFFICIENT_EVIDENCE' : 'CONTINUE_REQUIRED_LAYERS';
  return { ...anchor, binding_contract, claim_relation, overall, product_reason_codes: [...new Set([
    ...anchor.reason_codes, ...claim_relation.reasonCodes,
    ...(contractFailure ? binding_contract.reasonCodes : []),
    ...(anchor.transaction_policy === 'UNSATISFIED' ? ['XRPL_TRANSACTION_POLICY_UNSATISFIED'] : []),
    ...(anchor.transaction_policy === 'NOT_ESTABLISHED' ? ['XRPL_TRANSACTION_POLICY_NOT_ESTABLISHED'] : []),
  ])] };
}
