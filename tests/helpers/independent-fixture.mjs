// Independent audit-only fixture generator. No candidate executable code imports.
import { createHash, generateKeyPairSync, sign, verify as cryptoVerify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const candidate = resolve(here, '../..');
// Independent canonical oracle for the restricted JSON domain. Inputs below
// use safe ASCII member names, scalar strings, booleans, null and safe integers.
function canon(v) {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0)) return String(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  throw new Error('Outside independent canonical domain');
}
const bytes = v => Buffer.from(canon(v), 'utf8');
const sha = v => createHash('sha256').update(v).digest('hex');
const hash = v => sha(bytes(v));
const gitHash = (kind, v) => createHash('sha1').update(Buffer.from(kind + ' ' + v.length + '\0')).update(v).digest('hex');
const clone = v => structuredClone(v);
const required = ['INTEGRITY', 'AUTHENTICITY', 'SUBJECT_BINDING', 'RECOMPUTATION', 'EVIDENCE_SUFFICIENCY', 'SEMANTIC_COMPATIBILITY'];
const pin = '9dd36e882dd372f264b77b179130948aa5adcbde';
const profile = JSON.parse(await readFile(resolve(candidate, 'vendor/rvr/conformance/rvr-v0/verification-profile.json'), 'utf8'));
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const spki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const signatureBytes = s => Buffer.concat([Buffer.from('receiptos.verify.statement.v1\0', 'ascii'), Buffer.from(hash(s), 'hex')]);
export function signBundle(b) {
  b.statement.payload_digest = hash(b.payload);
  b.signature_base64 = sign(null, signatureBytes(b.statement), privateKey).toString('base64');
  if (!cryptoVerify(null, signatureBytes(b.statement), publicKey, Buffer.from(b.signature_base64, 'base64'))) throw new Error('Independent signature control failed');
  return b;
}
function nativeCase(artifact, expected, unavailable = false) {
  const claim = { schema: 'rvr.claim.sha256-equals.v0', operation: 'SHA256_EQUALS', evidenceMember: 'artifact', expectedDigest: expected };
  const member = unavailable ? { id: 'artifact', status: 'UNAVAILABLE', reasonCode: 'rvr.v0.evidence_unavailable' }
    : { id: 'artifact', status: 'PRESENT', mediaType: 'application/octet-stream', byteLength: String(artifact.length), digest: sha(artifact) };
  return { claim, evidenceSet: { schema: 'rvr.evidence-set.v0', members: [member] }, payloadsBase64: unavailable ? {} : { artifact: artifact.toString('base64') } };
}
function nativeBundle(c, observed) {
  const outcome = observed === null ? 'UNVERIFIABLE' : observed === c.claim.expectedDigest ? 'VERIFIED' : 'REFUTED';
  const reasonCode = { VERIFIED: 'rvr.v0.digest_match', REFUTED: 'rvr.v0.digest_mismatch', UNVERIFIABLE: 'rvr.v0.required_evidence_unavailable' }[outcome];
  const canonicalResult = { schema: 'rvr.canonical-result.v0', outcome, reasonCode, evaluation: { operation: 'SHA256_EQUALS', evidenceMember: 'artifact', expectedDigest: c.claim.expectedDigest, observedDigest: observed } };
  return { receipt: { claimDigest: hash(c.claim), evidenceSetDigest: hash(c.evidenceSet), verificationProfileDigest: hash(profile), outcome, reasonCode, resultDigest: hash(canonicalResult) },
    ...clone(c), verificationProfile: clone(profile), canonicalResult };
}
export function fresh(id = 'audit-A', message = 'Independent A\n', artifactText = 'Audit own artifact\n', expectedOverride) {
  const artifact = Buffer.from(artifactText, 'utf8');
  const digest = sha(artifact), blob = gitHash('blob', artifact);
  const tree = Buffer.concat([Buffer.from('100644 artifact.txt\0', 'ascii'), Buffer.from(blob, 'hex')]);
  const treeId = gitHash('tree', tree);
  const commit = Buffer.from('tree ' + treeId + '\nauthor Release Auditor <synthetic@example.invalid> 1791676800 +0000\ncommitter Release Auditor <synthetic@example.invalid> 1791676800 +0000\n\n' + message, 'utf8');
  const subject = { kind: 'git-artifact', id, artifact_digest: digest, commit: gitHash('commit', commit), tree: treeId, artifact_path: 'artifact.txt', version: 'audit.v1' };
  const semantic = { claim_type: 'SHA256_EQUALS', authority_class: 'INDEPENDENT_RECOMPUTATION', subject: id, scope: 'artifact.txt', valid_after: 0, valid_until: 2000000000, assumptions: [], evidence_requirements: ['artifact', 'execution'] };
  const request = { schema: 'receiptos.verify.request.v1', verification_profile: 'receiptos.verify.git-artifact.v1', claim: { kind: 'SHA256_EQUALS', expected_digest: expectedOverride ?? digest }, subject,
    policy: { id: 'audit-policy', version: 'audit.v1', trusted_keys: [{ id: 'audit-ed25519', spki_base64: spki }], required_layers: [], minimum_grade: 'LOCAL_RECOMPUTATION', verification_time: 1791676800 }, evidence: [], semantic_requirement: clone(semantic), requested_guarantees: [] };
  const c = nativeCase(artifact, request.claim.expected_digest), originalBundle = nativeBundle(c, digest);
  // Crystal has a separate native root contract; author this shape directly.
  const crystalBody = { schema: 'stealth.session.evidence.v1', session_id: 'independent-release-audit', directory: 'audit/synthetic', task: { title: 'Independent artifact audit' }, agent: { id: 'audit', runtime: 'local' }, scope: { permission: null }, execution: [], commands: [], changes: { files_changed: [], diff_sha256: null }, metadata: { generated_by: 'independent-auditor' } };
  const crystal = { ...crystalBody, anchor: { receipt_root: '0x' + hash(crystalBody), network: 'local/off-chain', onchain_anchor_status: 'not anchored' } };
  const payload = { crystal, rvr: { originalBundle, candidateCase: clone(c) }, relations: { guarantee: null, continuity: null, domain: null,
    execution: { package_present: true, runner_declared: true, executed: true, subject_digest: hash(subject), executable_pin: pin, evidence_grade: 'LOCAL_RECOMPUTATION' } } };
  const raw = [{ id: 'artifact', role: 'artifact', bytes: artifact }, { id: 'commit', role: 'git-commit', bytes: commit }, { id: 'tree', role: 'git-tree', bytes: tree }, { id: 'result', role: 'native-result', bytes: bytes(originalBundle.canonicalResult) }];
  const statement = { schema: 'receiptos.verify.statement.v1', verification_profile: request.verification_profile, subject: clone(subject), claim: clone(request.claim), policy: { id: request.policy.id, version: request.policy.version, digest: hash(request.policy) }, semantic_contract: clone(semantic), asserted_result: expectedOverride && expectedOverride !== digest ? 'FAIL' : 'PASS',
    evidence_manifest: raw.map(r => ({ id: r.id, role: r.role, digest: sha(r.bytes), size: r.bytes.length })), payload_digest: hash(payload), crypto: { provider: 'ed25519', key_id: 'audit-ed25519' } };
  const bundle = signBundle({ schema: 'receiptos.verify.bundle.v1', canonicalization_profile: 'receiptos.verify.canonical-json.v1', statement, signature_base64: '', evidence: raw.map(r => ({ id: r.id, bytes_base64: r.bytes.toString('base64') })), payload });
  return { request, bundle };
}
