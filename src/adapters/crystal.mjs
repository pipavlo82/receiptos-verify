import { runNative, parsedExecution } from './native/process.mjs';

export const descriptor = Object.freeze({
  profileId: 'crystal.handoff-receipt-root.v1',
  sourceRepository: 'https://github.com/pipavlo82/crystal-receipt',
  sourceCommit: '45b46bf7df3a60b32583291f577a36bf19d22f00',
  license: 'Apache-2.0', maturity: 'STABLE',
  capabilities: ['NATIVE_RECEIPT_ROOT_INTEGRITY'], requiredEvidence: ['native-crystal-evidence'],
  nativeVocabulary: { integrity: ['ok:true', 'ok:false'], fields: ['ok', 'receipt_root', 'recomputed_root'] },
});
const limitations = [
  'The native root excludes the entire top-level anchor and does not authenticate its metadata.',
  'Root equality does not establish claim correctness, signatures, Git membership or execution.',
  'This narrow adapter invokes native root verification, not a complete issuance or schema evaluator.',
];

export async function verifyIntegrity(nativeEvidence) {
  const execution = await runNative('crystal', { operation: 'verify', evidence: nativeEvidence });
  const parsed = parsedExecution(execution);
  const provenance = { ...descriptor, runtime: parsed?.runtime ?? null, functions: ['verifyHandoffReceiptRoot'] };
  if (!parsed) return { status: 'CANNOT_RECOMPUTE', reasonCodes: ['NATIVE_CRYSTAL_EXECUTION_UNAVAILABLE'], nativeResult: null, limitations, provenance, execution };
  if (!parsed.ok) return { status: 'REJECTED_MALFORMED', reasonCodes: ['NATIVE_CRYSTAL_INPUT_INVALID'], nativeResult: parsed.nativeError, limitations, provenance, execution };
  const nativeResult = parsed.value;
  if (!nativeResult || typeof nativeResult.ok !== 'boolean') return { status: 'CANNOT_RECOMPUTE', reasonCodes: ['NATIVE_CRYSTAL_INVALID_OUTPUT'], nativeResult, limitations, provenance, execution };
  return { status: nativeResult.ok ? 'VERIFIED' : (nativeResult.receipt_root ? 'REJECTED_MALFORMED' : 'INSUFFICIENT_EVIDENCE'),
    reasonCodes: [nativeResult.ok ? 'NATIVE_CRYSTAL_ROOT_MATCH' : (nativeResult.receipt_root ? 'RECEIPT_ROOT_MISMATCH' : 'NATIVE_CRYSTAL_ROOT_MISSING')],
    nativeResult, limitations, provenance, execution };
}

export async function buildCrystalEvidence(fields = {}) {
  const evidence = {
    schema: 'stealth.session.evidence.v1', session_id: 'synthetic-receiptos-verify', directory: 'local/synthetic',
    task: { title: 'Synthetic local artifact evidence' }, agent: { id: 'synthetic', runtime: 'local' },
    scope: { permission: null },
    authorization: { delegation_ref: null, delegator: null, agent_operator: null, target: 'local/synthetic', allowed_actions: [], authorization_valid_from: null, authorization_expiry: null, authorization_checked_at: 0, authorization_state_hash: 'synthetic', authorized_at_execution: null },
    execution: [], commands: [], changes: { files_changed: [], diff_sha256: null },
    metadata: { message_count: 0, diff_count: 0, generated_by: 'receiptos-verify-synthetic-fixture' },
    ...structuredClone(fields),
    anchor: { merkle_proof_status: 'not attached', merkle_root: null, merkle_leaf_index: null, merkle_proof: [], onchain_anchor_status: 'not anchored', network: 'local/off-chain', contract: null, tx_hash: null, verifier_status: 'not verified', ...fields.anchor },
  };
  const execution = await runNative('crystal', { operation: 'build', evidence });
  const parsed = parsedExecution(execution);
  if (!parsed?.ok || execution.exitCode !== 0) throw new Error(`Native Crystal fixture construction failed: ${execution.stderr}`);
  return parsed.value;
}
