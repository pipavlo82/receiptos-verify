import { createPrivateKey, createPublicKey, sign, createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Independent literal oracle: the native program computes the result; these
// expectations describe the two deliberately constructed one-document cases.
const expectedPositive = Object.freeze({ replay_bindings: 'valid', result_only_check: 'VALID', subject_bound_check: 'NO_FINDING', evidence_grade: 'REPRODUCED' });
const expectedNegative = Object.freeze({ replay_bindings: 'valid', result_only_check: 'VALID', subject_bound_check: 'CONTRADICTED', evidence_grade: 'REPRODUCED' });
const expectedAuthenticatedReport = Object.freeze({ replay_bindings: 'valid', result_only_check: 'VALID', subject_bound_check: 'NO_FINDING', evidence_grade: 'AUTHENTICATED_REPORT' });
const canon = (value) => value && typeof value === 'object' ? Array.isArray(value) ? `[${value.map(canon).join(',')}]`
  : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canon(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Builds fresh synthetic signed bytes, then captures an actual unchanged kit CLI artifact. */
export async function buildTrustlessEvidence(options = {}) {
  const negative = options.negative === true;
  const opaque = options.opaque === true;
  const seed = Buffer.from('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60', 'hex');
  const key = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), type: 'pkcs8', format: 'der' });
  const publicKey = createPublicKey(key).export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
  const doc = { id: 'receiptos-policy-001', content: `Transfer limit is 10000 USD per day.${negative ? ' poison' : ''}` };
  // Independent one-leaf Merkle construction (no native helper is used).
  const subject = `sha256:${hash(Buffer.concat([Buffer.from([0]), Buffer.from(doc.id), Buffer.from([0]), Buffer.from(doc.content)]))}`;
  const toy = { scanner_version: 'receiptos-demo-scan/0.1', pattern: 'poison' };
  const body = { rag_corpus: { merkle_root: subject, poisoning_scan: {
    result: 'clean', scanner_version: opaque ? 'opaque-scanner/1' : toy.scanner_version, subject_digest: subject, semantics: 'recordwise',
  } } };
  const input = { public_key_ed25519: publicKey, toy_scan: toy, corpus: [doc],
    manifest: { body, sig: sign(null, Buffer.from(`scan-subject-binding-v0\n${canon(body)}`), key).toString('hex') },
    decision: { corpus_root: subject, effective_dataset_digest: subject, query: 'transfer limit', k: 1,
      retrieved: [structuredClone(doc)], answer: '10000 USD', inclusion_proofs: [] } };
  const caseId = opaque ? negative ? 'receiptos_opaque_negative' : 'receiptos_opaque' : negative ? 'receiptos_negative' : 'receiptos_positive';
  const expectation = opaque ? expectedAuthenticatedReport : negative ? expectedNegative : expectedPositive;
  const vectors = { test_public_key_ed25519: publicKey, toy_scan: toy, cases: { [caseId]: {
    corpus: input.corpus, manifest: input.manifest, decision: input.decision, expect: expectation,
  } } };
  const directory = await mkdtemp(join(tmpdir(), 'receiptos-native-kit-fixture-'));
  let artifact;
  try {
    const path = join(directory, 'vectors.json');
    await writeFile(path, `${canon(vectors)}\n`, 'utf8');
    const checker = fileURLToPath(new URL('../../vendor/recompute-kit-v02/conformance/scan-subject-binding-v0/scan_check.py', import.meta.url));
    const run = spawnSync('python', ['-I', '-B', '-X', 'utf8', checker, path], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 15000 });
    if (run.error || run.status !== 0) throw new Error(`Native fixture construction did not reproduce the independent oracle: ${run.error?.message ?? run.stderr}`);
    artifact = JSON.parse(run.stdout);
    if (artifact.total !== 1 || artifact.reproduced !== 1) throw new Error('Native fixture returned an empty or unreproduced artifact');
  } finally { await rm(directory, { recursive: true, force: true }); }
  return { profile: 'scan_subject_binding.v0', source_pin: '1a37bcaf91918fd8a98f164d97d0fddbc28c6755', case_id: caseId, input, artifact };
}

export function trustlessClaimBinding(evidence) {
  const inputDigest = hash(Buffer.from(canon(evidence.input)));
  return { profile: evidence.profile, case_id: evidence.case_id, input_digest: inputDigest };
}
