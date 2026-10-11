// Release audit only: independent requests/oracles; frozen verifier is the SUT.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const candidate = resolve(process.argv[2]);
process.env.RECEIPTOS_AUDIT_CANDIDATE = candidate;
const { fresh, signBundle } = await import('./semantics/fresh-fixture.mjs');
const { verify } = await import(pathToFileURL(resolve(candidate, 'src/core/verify.mjs')));
const out = new URL('./root/', import.meta.url); await mkdir(out, { recursive: true });
const clone = x => structuredClone(x);
const hash = x => createHash('sha256').update(x).digest('hex');
const canonical = x => x === null || typeof x !== 'object' ? JSON.stringify(x) : Array.isArray(x) ? '[' + x.map(canonical).join(',') + ']' : '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
const chash = x => hash(Buffer.from(canonical(x)));
const cases = [], demos = [];
async function test(id, request, bundle, expected, reason, demo = false, verifier = verify) {
  let report, error;
  try { report = await verifier(request, bundle); } catch (e) { error = String(e.stack); }
  const pass = !!report && report.overall === expected && (!reason || report.reason_codes.includes(reason));
  const row = { id, expected, reason: reason ?? null, actual: report?.overall ?? null, passed: pass, error, report };
  cases.push(row); if (demo) demos.push(row); return report;
}
const pair = fresh('root-audit-A', 'Independent release demonstration\n', 'Fresh audit artifact 2026-10-11\n');
await test('D01-authentic-A-request-A', pair.request, pair.bundle, 'VERIFIED', null, true);
let p = clone(pair); p.request.subject.commit = 'b'.repeat(40);
await test('D02-same-A-request-B', p.request, p.bundle, 'CONTRADICTED', 'COMMIT_MISMATCH', true);
p = clone(pair); p.bundle.payload.crystal.anchor.receipt_root = '0x' + '0'.repeat(64); signBundle(p.bundle);
await test('D03-tampered-root', p.request, p.bundle, 'REJECTED_MALFORMED', 'RECEIPT_ROOT_MISMATCH', true);
p = fresh('root-audit-negative', 'Negative replay\n', 'Fresh negative bytes\n', '0'.repeat(64));
await test('D04-reproduced-native-negative', p.request, p.bundle, 'CONTRADICTED', 'NATIVE_NEGATIVE_RESULT', true);
p = clone(pair); p.bundle.statement.evidence_manifest = []; p.bundle.evidence = []; signBundle(p.bundle);
await test('D05-empty-evidence', p.request, p.bundle, 'INSUFFICIENT_EVIDENCE', 'EVIDENCE_MISSING', true);
const crashPath = process.argv[3];
if (crashPath) {
  const broken = await import(pathToFileURL(resolve(crashPath, 'src/core/verify.mjs')));
  await test('D06-checker-crash', pair.request, pair.bundle, 'CANNOT_RECOMPUTE', 'NATIVE_RVR_EXECUTION_UNAVAILABLE', true, broken.verify);
}
for (const field of ['scope', 'authority_class']) {
  p = clone(pair); p.request.semantic_requirement[field] = field === 'scope' ? 'other-artifact.txt' : 'CRYPTOGRAPHIC_VERIFICATION';
  await test('D07-semantic-' + field, p.request, p.bundle, 'CONTRADICTED', field === 'scope' ? 'SEMANTIC_SCOPE_MISMATCH' : 'SEMANTIC_AUTHORITY_CLASS_MISMATCH', true);
}
const { schnorr } = await import(pathToFileURL(resolve(candidate, 'node_modules/@noble/curves/secp256k1.js')));
const secret = createHash('sha256').update('PUBLIC SYNTHETIC AUDIT INTERPOLL KEY').digest();
function action(value) {
  const a = { version: 1, namespace: 'v1', kind: 'reaction', actor: Buffer.from(schnorr.getPublicKey(secret)).toString('hex'), targetType: 'post', targetId: 'audit-post', value, createdAt: 1791676800, nonce: '5a'.repeat(16) };
  a.id = hash(Buffer.from(JSON.stringify(['interpoll.public-engagement.v1', 1, a.namespace, a.kind, a.actor, a.targetType, a.targetId, a.value, a.createdAt, a.nonce])));
  a.signature = Buffer.from(schnorr.sign(Buffer.from(a.id, 'hex'), secret, new Uint8Array(32))).toString('hex'); return a;
}
p = clone(pair); const a = action('up');
p.request.domain_profile = 'interpoll'; p.request.domain_requirement = { authorized_action: a, expected_authority: { actor: a.actor, namespace: a.namespace, targetType: a.targetType, targetId: a.targetId } };
p.bundle.payload.relations.domain = { authorized_action: a, accepted_action: clone(a), attempts: [{ action: clone(a), status: 'accepted' }, { action: clone(a), status: 'duplicate' }], committed_evidence: true }; signBundle(p.bundle);
await test('D08-positive-exact-retry', p.request, p.bundle, 'VERIFIED', null, true);
p.bundle.payload.relations.domain.attempts[1].action = action('down'); signBundle(p.bundle);
await test('D08-materially-changed-retry', p.request, p.bundle, 'CONTRADICTED', 'RETRY_AUTHORIZED_ACTION_CHANGED', true);
const { buildQevMothEvidence } = await import(pathToFileURL(resolve(candidate, 'src/adapters/qev_moth.mjs')));
const q = await buildQevMothEvidence();
p = clone(pair); p.request.domain_profile = 'qev'; p.request.domain_requirement = { expectedClaim: clone(q.expectedClaim) }; p.bundle.payload.relations.domain = q; signBundle(p.bundle);
await test('D09-portable-QEV-provider-unestablished', p.request, p.bundle, 'INSUFFICIENT_EVIDENCE', 'PROVIDER_AUTHENTICATION_NOT_ESTABLISHED', true);
p = clone(pair);
const g = { id: 'audit-guarantee', subject: pair.request.subject.id, scope: 'artifact', authority_class: 'INDEPENDENT_RECOMPUTATION', obligations: [{ id: 'relation', predicate: 'EXACT_RELATION', value: 'A' }], dependencies: [], assumptions: [], evidence_requirements: ['execution'] };
p.request.requested_guarantees = [clone(g)]; p.request.guarantee_context = { basis_accepted: true, accepted_basis_id: 'audit-detached-basis', supported_guarantee_ids: [g.id], obligation_results: { [g.id]: { relation: true } }, established_assumptions: [] };
p.bundle.payload.relations.guarantee = { upstream: [clone(g)], downstream: { guarantees: [clone(g)] } }; signBundle(p.bundle);
await test('D10-positive-preserved-guarantee', p.request, p.bundle, 'VERIFIED', null, true);
p.bundle.payload.relations.guarantee.downstream.guarantees[0].obligations[0].value = 'B'; signBundle(p.bundle);
await test('D10-downstream-relation-changed', p.request, p.bundle, 'CONTRADICTED', 'DOWNSTREAM_OBLIGATION_NOT_PRESERVED', true);
// Malformed oracle is independently selected: admission or missing premise must never certify.
for (const value of ['', 'null', '[]', '{}', '1', 'true', '"text"', '{', '{"x":NaN}', '{"x":Infinity}', '{"x":1e999}', '{"x":-0}', '{"x":9007199254740992}', '{"x":1e-999}', '{"subject":{},"subject":{}}']) {
  await test('M-raw-' + value.slice(0, 35), value, pair.bundle, 'REJECTED_MALFORMED');
}
for (const which of ['request', 'bundle']) for (const value of [null, [], {}, 1, true]) {
  await test('M-root-' + which + '-' + JSON.stringify(value), which === 'request' ? value : pair.request, which === 'bundle' ? value : pair.bundle, 'REJECTED_MALFORMED');
}
for (const [label, edit] of [
  ['missing-subject', x => { delete x.request.subject; }], ['null-subject', x => { x.request.subject = null; }],
  ['extra-root', x => { x.request.unexpected = true; }], ['bad-hash', x => { x.request.subject.artifact_digest = 'z'.repeat(64); }],
  ['uppercase-hash', x => { x.request.subject.artifact_digest = x.request.subject.artifact_digest.toUpperCase(); }],
  ['huge-id', x => { x.request.subject.id = 'x'.repeat(65536); }], ['null-commit', x => { x.request.subject.commit = null; }],
  ['overflow-time', x => { x.request.policy.verification_time = Number.MAX_SAFE_INTEGER + 1; }],
  ['nan-time', x => { x.request.policy.verification_time = NaN; }], ['infinite-time', x => { x.request.policy.verification_time = Infinity; }],
  ['negative-zero-time', x => { x.request.policy.verification_time = -0; }],
  ['duplicate-evidence', x => { x.bundle.evidence.push(clone(x.bundle.evidence[0])); }],
  ['conflicting-evidence', x => { x.bundle.evidence.push({ ...clone(x.bundle.evidence[0]), bytes_base64: 'AAAA' }); }],
]) { p = clone(pair); edit(p); await test('M-' + label, p.request, p.bundle, 'REJECTED_MALFORMED'); }
await test('M-invalid-UTF8', Buffer.from([0xff, 0xfe]), pair.bundle, 'REJECTED_MALFORMED', 'INVALID_UTF8');
for (const path of ['../outside', '/absolute', 'C:/secret', 'file:///secret', 'https://example.invalid/artifact', 'data:text/plain,secret', '..\\outside']) {
  p = clone(pair); p.request.subject.artifact_path = path;
  const report = await verify(p.request, p.bundle);
  cases.push({ id: 'M-path-' + path, expected: 'NOT_VERIFIED_NO_FILE_OR_URL_RESOLUTION', actual: report.overall, passed: report.overall !== 'VERIFIED', report });
}
p = clone(pair); p.request.verification_profile = 'unknown.v999'; await test('M-unknown-profile', p.request, p.bundle, 'UNSUPPORTED_PROFILE');
p = clone(pair); p.request.domain_profile = '../../evil'; await test('M-unknown-adapter', p.request, p.bundle, 'UNSUPPORTED_PROFILE');
p = clone(pair); p.bundle.evidence = []; signBundle(p.bundle); await test('M-missing-all-committed-bytes', p.request, p.bundle, 'CANNOT_RECOMPUTE');
// A browser file.text() silently repairs invalid UTF-8; compare the exact byte intake.
const unicode = fresh('audit-\ufffd', 'UTF8 admission audit\n', 'UTF8 artifact\n');
const text = JSON.stringify(unicode.request), utf = Buffer.from(text), index = utf.indexOf(Buffer.from('\ufffd'));
const invalid = Buffer.concat([utf.subarray(0, index), Buffer.from([0xff]), utf.subarray(index + 3)]);
const direct = await verify(invalid, unicode.bundle), repaired = await verify(new TextDecoder().decode(invalid), unicode.bundle);
const utf8 = { direct: direct.overall, browser_style_replacement: repaired.overall, direct_reason: direct.reason_codes, same_decoded_request: new TextDecoder().decode(invalid) === text };
await writeFile(new URL('utf8-request-invalid.json', out), invalid);
await writeFile(new URL('utf8-request-valid.json', out), text + '\n');
await writeFile(new URL('utf8-bundle.json', out), JSON.stringify(unicode.bundle) + '\n');
await writeFile(new URL('utf8-boundary.json', out), JSON.stringify(utf8, null, 2) + '\n');
await writeFile(new URL('independent-request.json', out), JSON.stringify(pair.request) + '\n');
await writeFile(new URL('independent-bundle.json', out), JSON.stringify(pair.bundle) + '\n');
await writeFile(new URL('demos.json', out), JSON.stringify({ fixture_oracle: 'Own Git/SHA256/Crystal/RVR/Ed25519 construction; independent fixed expected relations. Advanced QEV native construction uses pinned public builder, with provider boundary independently expected unestablished.', rows: demos }, null, 2) + '\n');
await writeFile(new URL('malformed.json', out), JSON.stringify({ cases, count: cases.length, passed: cases.filter(x => x.passed).length, failed: cases.filter(x => !x.passed).map(x => ({ id: x.id, actual: x.actual, expected: x.expected })) }, null, 2) + '\n');
console.log(JSON.stringify({ count: cases.length, passed: cases.filter(x => x.passed).length, failures: cases.filter(x => !x.passed).map(x => ({ id: x.id, expected: x.expected, actual: x.actual })), utf8 }));
process.exitCode = cases.every(x => x.passed) ? 0 : 1;
