#!/usr/bin/env node
// Explicit Testnet-only tooling. Nothing in the core verifier opens a network.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Wallet, decode, encode, hashes } from 'xrpl';
import { buildCrystalEvidence } from '../src/adapters/crystal.mjs';
import { deriveCommitment, evaluateXrplClaim } from '../src/adapters/xrpl-anchor.mjs';
import { canonicalize, parseStrict } from '../src/core/strict-json.mjs';

const ROOT = new URL('../', import.meta.url);
const CAPTURE = new URL('reports/xrpl-poc/testnet-capture.json', ROOT);
const POLICY = new URL('profiles/xrpl-poc-testnet-policy.json', ROOT);
const ENDPOINT = 'wss://s.altnet.rippletest.net:51233/';
const SECONDARY = 'wss://testnet.xrpl-labs.com/';
const PROFILE = 'xrpl-receipt-anchor-v0';
const SDK_VERSION = '5.3.0';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const require = (condition, code) => { if (!condition) fail(code); };

export function normalizeAutofilledCarrier(transaction) {
  // SDK 5.3.0 autofill creates NetworkID:undefined for networks <=1024.
  // Undefined is absent on the wire, rather than a forbidden NetworkID value.
  const carrier = Object.fromEntries(Object.entries(transaction).filter(([, value]) => value !== undefined));
  require(!Object.hasOwn(carrier, 'NetworkID') && !Object.hasOwn(carrier, 'TicketSequence'), 'UNSUPPORTED_TESTNET_CARRIER');
  require(Number.isSafeInteger(carrier.Sequence) && carrier.Sequence > 0
    && Number.isSafeInteger(carrier.LastLedgerSequence) && /^[0-9]+$/.test(carrier.Fee), 'AUTOFILL_FIELDS_INVALID');
  return carrier;
}

function publicHeader(ledger) {
  const fields = ['ledger_index','ledger_hash','total_coins','parent_hash','transaction_hash','account_hash',
    'parent_close_time','close_time','close_time_resolution','close_flags'];
  const header = Object.fromEntries(fields.map(name => [name, ledger[name]]));
  header.ledger_index = Number(header.ledger_index);
  require(Number.isSafeInteger(header.ledger_index) && header.ledger_index > 0, 'LEDGER_INDEX_INVALID');
  require(hashes.hashLedgerHeader(header).toUpperCase() === header.ledger_hash.toUpperCase(), 'RPC_LEDGER_HEADER_HASH_MISMATCH');
  return header;
}

async function ledgerAt(client, ledgerHash, transactions = false) {
  const { result } = await client.request({ command: 'ledger', ledger_hash: ledgerHash, transactions, expand: false });
  require(result.validated === true, 'RPC_LEDGER_NOT_VALIDATED');
  const header = publicHeader(result.ledger);
  if (transactions) {
    require(Array.isArray(result.ledger.transactions) && result.ledger.transactions.every(x => typeof x === 'string'), 'RPC_TRANSACTION_INVENTORY_MISSING');
    header.transactions = result.ledger.transactions;
  }
  return header;
}

function makeSurface() {
  const artifact = Buffer.from('ReceiptOS Verify XRPL Testnet synthetic claim A; no external execution assertion.\n');
  return {
    claim: { id: 'synthetic-commit-A', kind: 'SYNTHETIC_DECLARATION', parameters: { artifact_digest: sha(artifact) } },
    subject: { kind: 'synthetic-git-commit', id: 'receiptos-xrpl-poc', artifact_digest: sha(artifact), commit: 'a'.repeat(40), version: '1' },
    scope: { purpose: 'testnet-anchor-boundary-only', external_execution: false },
    authority: { id: 'synthetic-poc-declarant', class: 'SELF_DECLARED' },
    policy: { id: 'xrpl-testnet-poc', version: '0' }, version: '2',
    time: { not_before: 0, not_after: 9007199254740991 }, assumptions: [], dependencies: [],
    evidence_requirements: ['receipt-root'],
  };
}

export async function buildPocReceipt(networkBinding) {
  const surface = makeSurface();
  const preimage = {
    receipt_profile: 'crystal.handoff-receipt-root.v1', verification_profile: 'receiptos.verify.generic.v2',
    surface, network_binding: structuredClone(networkBinding),
  };
  const receipt = await buildCrystalEvidence({
    session_id: 'receiptos-xrpl-testnet-poc', task: { title: 'Synthetic declaration anchored to XRPL Testnet' },
    metadata: { message_count: 0, diff_count: 0, generated_by: 'receiptos-xrpl-poc', xrpl_claim_preimage: preimage },
  });
  const commitment = await deriveCommitment(receipt, preimage);
  require(commitment.integrity.status === 'VERIFIED', 'RECEIPT_ROOT_NOT_VERIFIED');
  const wrong = structuredClone(surface);
  wrong.claim.id = 'synthetic-commit-B'; wrong.subject.commit = 'b'.repeat(40);
  return { receipt, claim_preimage: preimage, request_a: surface, request_b: wrong, commitment };
}

function trustFor(capture, policy, basis) {
  return {
    basis, endpoint: policy.endpoint, network_id: policy.network_id, checkpoint: policy.checkpoint,
    account: policy.account, transaction_hash: policy.transaction_hash, required_transaction_result: null,
    claim_context: { verification_time: policy.verification_time, established_assumptions: [], dependency_results: [], evidence_basis: ['receipt-root'] },
  };
}

function inputFor(capture) {
  return { profile: capture.profile, receipt: capture.receipt, claim_preimage: capture.claim_preimage, observation: capture.observation };
}

// Keep only public semantic output, never native process paths or a wallet.
function compact(result) {
  return {
    anchor_native: result.anchor_native, native_transaction_result: result.native_transaction_result,
    transaction_policy: result.transaction_policy, integrity: result.integrity,
    claim_relation: result.claim_relation.status, semantic_compatibility: result.claim_relation,
    overall: result.overall, reason_codes: result.product_reason_codes,
    binding_contract: result.binding_contract, binding_report: result.binding_report,
    binding_evidence: result.binding_evidence,
    limitations: result.limitations,
  };
}

export async function evaluatePair(capture, policy, basis) {
  const input = inputFor(capture), trust = trustFor(capture, policy, basis);
  const A = compact(await evaluateXrplClaim(input, capture.request_a, trust));
  const B = compact(await evaluateXrplClaim(input, capture.request_b, trust));
  return { profile: PROFILE, transaction_hash: capture.observation.hash, same_anchor: true, A, B,
    trust_basis: basis, boundary: 'Captured RPC evidence/replay is not an independent proof of XRPL consensus. ANCHOR_MATCH is not global VERIFIED.' };
}

function assertPair(pair) {
  require(pair.A.binding_contract?.status === 'VERIFIED' && pair.B.binding_contract?.status === 'VERIFIED', 'REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED');
  require(pair.A.anchor_native === 'ANCHOR_MATCH' && pair.B.anchor_native === 'ANCHOR_MATCH', 'ANCHOR_PAIR_FAILED');
  require(pair.A.claim_relation === 'COMPATIBLE' && pair.A.overall === 'CONTINUE_REQUIRED_LAYERS', 'CLAIM_A_FAILED');
  require(pair.B.claim_relation === 'CONTRADICTED' && pair.B.overall === 'CONTRADICTED', 'CLAIM_B_FAILED');
}

function assertPublicOnly(value) {
  const forbidden = /^(seed|secret|private.?key|master.?key|wallet|faucet.?credentials|password|token)$/i;
  const visit = x => {
    if (Array.isArray(x)) { x.forEach(visit); return; }
    if (x && typeof x === 'object') for (const [key, item] of Object.entries(x)) {
      require(!forbidden.test(key), 'PRIVATE_FIELD_CAPTURE_REJECTED'); visit(item);
    }
  };
  visit(value);
}

export async function runLive() {
  // Fixed official Testnet endpoint and network ID. No user-provided URL/seed.
  const client = new Client(ENDPOINT, { connectionTimeout: 15000, timeout: 20000 });
  let wallet;
  let submittedHash = null;
  try {
    await client.connect();
    const initial = (await client.request({ command: 'server_info' })).result.info;
    require(initial.network_id === 1, 'REFUSE_NON_TESTNET_NETWORK');
    wallet = Wallet.generate(); // The secret exists only in this process.
    await client.fundWallet(wallet, { faucetHost: 'faucet.altnet.rippletest.net', faucetPath: '/accounts', faucetProtocol: 'https' });
    const serverInfo = (await client.request({ command: 'server_info' })).result.info;
    require(serverInfo.network_id === 1, 'REFUSE_NON_TESTNET_NETWORK');
    const checkpointHeader = await ledgerAt(client, serverInfo.validated_ledger.hash);
    const checkpoint = { ledger_index: checkpointHeader.ledger_index, ledger_hash: checkpointHeader.ledger_hash.toLowerCase() };
    const built = await buildPocReceipt({ network_id: serverInfo.network_id, trusted_checkpoint: checkpoint });
    const transaction = normalizeAutofilledCarrier(await client.autofill({ TransactionType: 'AccountSet', Account: wallet.classicAddress, Memos: [{ Memo: built.commitment.memo }] }));
    const signed = wallet.sign(transaction);
    submittedHash = signed.hash;
    require(hashes.hashSignedTx(signed.tx_blob) === submittedHash, 'SIGNED_TX_ID_MISMATCH');
    // Never serialize wallet, signed secret state, faucet response or exceptions.
    await client.submitAndWait(signed.tx_blob);
    wallet = undefined;
    const fetched = (await client.request({ command: 'tx', transaction: submittedHash, binary: false })).result;
    const binary = (await client.request({ command: 'tx', transaction: submittedHash, binary: true })).result;
    require(fetched.validated === true && binary.validated === true, 'TX_NOT_VALIDATED');
    const txBlob = binary.tx_blob ?? binary.tx;
    require(typeof txBlob === 'string' && hashes.hashSignedTx(txBlob) === submittedHash, 'FETCHED_TX_ID_MISMATCH');
    require(encode(fetched.tx_json) === txBlob, 'FETCHED_JSON_BINARY_DISAGREEMENT');
    require(fetched.hash === submittedHash && binary.hash === submittedHash
      && fetched.ledger_hash === binary.ledger_hash && fetched.ledger_index === binary.ledger_index, 'FETCHED_IDENTITIES_DISAGREE');
    const ledger = await ledgerAt(client, fetched.ledger_hash, true);
    require(ledger.transactions.includes(submittedHash), 'TX_NOT_IN_RPC_LEDGER_INVENTORY');
    const history = [ledger];
    while (history[0].ledger_index > checkpoint.ledger_index) {
      require(history.length <= 64, 'CHECKPOINT_HISTORY_BOUND_EXCEEDED');
      history.unshift(await ledgerAt(client, history[0].parent_hash));
    }
    require(history[0].ledger_hash.toLowerCase() === checkpoint.ledger_hash, 'CHECKPOINT_ANCESTRY_MISMATCH');
    const capture = {
      schema: 'receiptos.xrpl.testnet-capture.v0', profile: PROFILE, capture_timestamp: new Date().toISOString(),
      sdk: { name: 'xrpl', version: SDK_VERSION },
      network: { name: 'XRPL Testnet', network_id: serverInfo.network_id, endpoint: ENDPOINT,
        server_build_version: serverInfo.build_version, server_state: serverInfo.server_state, checkpoint },
      account: transaction.Account, expected_R: built.commitment.receipt_root, expected_C: built.commitment.claim_digest,
      receipt: built.receipt, claim_preimage: built.claim_preimage, request_a: built.request_a, request_b: built.request_b,
      observation: {
        endpoint: ENDPOINT, network_id: serverInfo.network_id, validated: fetched.validated,
        hash: fetched.hash, ledger_index: fetched.ledger_index, ledger_hash: fetched.ledger_hash,
        tx_blob: txBlob, tx_json: decode(txBlob), meta: { TransactionResult: fetched.meta.TransactionResult },
        ...(typeof binary.meta_blob === 'string' ? { meta_blob: binary.meta_blob } : {}), ledger, history,
      },
      trust_boundary: 'TLS public Testnet RPC observation and selected checkpoint; header/transaction identities and reported membership checked. No independent validator consensus or transaction-Merkle proof.',
    };
    // Public secondary lookup corroborates the same tx/ledger, not consensus.
    const secondary = new Client(SECONDARY, { connectionTimeout: 15000, timeout: 20000 });
    try {
      await secondary.connect();
      const info = (await secondary.request({ command: 'server_info' })).result.info;
      require(info.network_id === 1, 'SECONDARY_NOT_TESTNET');
      const other = (await secondary.request({ command: 'tx', transaction: submittedHash, binary: true })).result;
      require(other.validated === true && other.hash === fetched.hash && other.ledger_hash === fetched.ledger_hash
        && (other.tx_blob ?? other.tx) === txBlob, 'SECONDARY_OBSERVATION_DISAGREEMENT');
      capture.secondary_observation = { endpoint: SECONDARY, network_id: info.network_id, validated: true,
        hash: other.hash, ledger_index: other.ledger_index, ledger_hash: other.ledger_hash, transaction_bytes_match: true };
    } catch (error) {
      if (['SECONDARY_NOT_TESTNET', 'SECONDARY_OBSERVATION_DISAGREEMENT'].includes(error.code)) throw error;
      capture.secondary_observation = { endpoint: SECONDARY, status: 'NOT_ESTABLISHED', reason_code: 'SECONDARY_RPC_UNAVAILABLE' };
    } finally { if (secondary.isConnected()) await secondary.disconnect(); }
    const policy = {
      schema: 'receiptos.xrpl.poc-trust-policy.v0', profile: PROFILE, accepted_basis: 'ACCEPTED_CAPTURE_REPLAY',
      endpoint: ENDPOINT, network_id: 1, checkpoint, account: capture.account, transaction_hash: submittedHash,
      verification_time: 1, capture_sha256: null,
      boundary: 'Explicit caller acceptance of this pinned public RPC capture; not independent consensus authentication.',
    };
    const pair = await evaluatePair(capture, policy, 'TRUSTED_RPC_OBSERVATION');
    assertPair(pair);
    capture.result_a = pair.A; capture.result_b = pair.B;
    assertPublicOnly(capture);
    const bytes = Buffer.from(JSON.stringify(capture, null, 2) + '\n');
    policy.capture_sha256 = sha(bytes);
    await mkdir(new URL('reports/xrpl-poc/', ROOT), { recursive: true });
    await writeFile(CAPTURE, bytes);
    await writeFile(POLICY, JSON.stringify(policy, null, 2) + '\n');
    return pair;
  } catch (error) {
    // The only contextual error identity emitted is the public tx hash.
    throw Object.assign(new Error('Testnet PoC did not complete; no wallet secret was persisted.'),
      { code: error.code ?? 'XRPL_POC_FAILURE', public_transaction_hash: submittedHash });
  } finally {
    wallet = undefined;
    if (client.isConnected()) await client.disconnect();
  }
}

export async function replay(captureFile = CAPTURE, policyFile = POLICY, requested = null) {
  const bytes = await readFile(captureFile), capture = parseStrict(bytes), policy = parseStrict(await readFile(policyFile));
  require(policy.schema === 'receiptos.xrpl.poc-trust-policy.v0' && policy.accepted_basis === 'ACCEPTED_CAPTURE_REPLAY', 'CAPTURE_TRUST_POLICY_NOT_ACCEPTED');
  require(policy.capture_sha256 === sha(bytes), 'PINNED_CAPTURE_DIGEST_MISMATCH');
  require(capture.schema === 'receiptos.xrpl.testnet-capture.v0' && capture.sdk.version === SDK_VERSION
    && capture.network.network_id === 1 && policy.network_id === 1, 'CAPTURE_PROFILE_NETWORK_UNSUPPORTED');
  assertPublicOnly(capture);
  const derived = await deriveCommitment(capture.receipt, capture.claim_preimage);
  require(derived.receipt_root === capture.expected_R && derived.claim_digest === capture.expected_C, 'CAPTURE_COMMITMENT_MISMATCH');
  if (requested !== null) return compact(await evaluateXrplClaim(inputFor(capture), requested, trustFor(capture, policy, 'ACCEPTED_CAPTURE_REPLAY')));
  const pair = await evaluatePair(capture, policy, 'ACCEPTED_CAPTURE_REPLAY');
  assertPair(pair);
  // Preserve the original observed capture byte-for-byte. Added binding output
  // is freshly derived, while all previously saved semantic fields must agree.
  const originalFields = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['binding_contract', 'binding_report', 'binding_evidence'].includes(key)));
  require(canonicalize(originalFields(pair.A)).equals(canonicalize(capture.result_a)) && canonicalize(originalFields(pair.B)).equals(canonicalize(capture.result_b)), 'CAPTURE_REPLAY_OUTPUT_DIVERGED');
  return pair;
}

function text(result) {
  const single = (label, r) => `${label}\nXRPL anchor: ${r.anchor_native}\nClaim binding: ${r.claim_relation}\nResult: ${r.overall}\n`;
  return result.A ? `${single('Claim A', result.A)}\n${single('Claim B (same transaction)', result.B)}` : single('Caller-selected claim', result);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command = 'replay', ...args] = process.argv.slice(2);
  try {
    const supported = ['live','replay','verify'];
    require(supported.includes(command), 'USAGE_LIVE_REPLAY_OR_VERIFY_REQUEST_JSON');
    const file = args.find(x => !x.startsWith('--'));
    const result = command === 'live' ? await runLive() : command === 'verify'
      ? await replay(CAPTURE, POLICY, parseStrict(await readFile(file ?? fail('REQUEST_PATH_REQUIRED')))) : await replay();
    process.stdout.write(args.includes('--json') ? JSON.stringify(result, null, 2) + '\n' : text(result));
    if (result.overall === 'CONTRADICTED') process.exitCode = 2;
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: 'ERROR', code: error.code ?? 'XRPL_POC_FAILURE',
      ...(error.public_transaction_hash ? { public_transaction_hash: error.public_transaction_hash } : {}) }) + '\n');
    process.exitCode = 1;
  }
}
