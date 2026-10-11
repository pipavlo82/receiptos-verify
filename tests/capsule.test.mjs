import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canonicalize, parseStrict } from '../src/core/strict-json.mjs';
import { encodeCapsule, decodeCapsule, buildManifest, verifyInclusion } from '../src/core/capsule.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const copy = value => structuredClone(value);
const entries = [{ id: 'a', bytes: 'alpha' }, { id: 'b', bytes: 'beta' }, { id: 'c', bytes: 'gamma' }];
// Independent Python hashlib/json/struct reference, fixed before the JS tests.
// Domain = ASCII receiptos.verify.capsule-merkle.v1 + NUL; leaf/node/root
// tags 00/01/02; root additionally binds a 4-byte big-endian leaf count.
const roots = [
  '5a71c5fbed80e0542bb147adb040872d2ec2c18c0395d6d5024eba84846f0505',
  '44bec4c6a000cc98fef2a6f6bde8509b2e20091e7cac5efbfd7d9b5a34ff0104',
  'f1bffbb58dacc21f6d9caa02fe980e1816d274f0ffe8058bbf721d2f5064090c',
];
const request = { schema: 'receiptos.verify.request.v1', subject: { id: 'subject:A', version: '1' }, label: '\u00e9\u{1f9ea}', values: [3, 1, 2] };
const bundle = { schema: 'receiptos.verify.bundle.v1', statement: { subject: { id: 'subject:A', version: '1' } }, payload: { anchor: { declared: 'untrusted' } } };
const fixture = () => encodeCapsule(request, bundle);
const mutateContainer = fn => { const value = parseStrict(fixture().bytes); fn(value); return canonicalize(value); };
const code = expected => error => error.code === expected;
function rebuild(container) {
  const built = buildManifest(container.documents.map(x => ({ id: x.id, bytes: Buffer.from(x.bytes_base64, 'base64') })));
  container.manifest = built.manifest; container.manifest_merkle_root = built.merkleRoot;
  return canonicalize(container);
}

for (const count of [1, 2, 3]) test(`${count}-leaf Python golden root and every inclusion proof`, () => {
  const built = buildManifest(entries.slice(0, count));
  assert.equal(built.merkleRoot, roots[count - 1]);
  assert.equal(built.manifest.length, count);
  built.manifest.forEach((entry, index) => assert.equal(verifyInclusion(entry, built.proofs[index], roots[count - 1]), true));
});

test('manifest sorts input IDs, preserves exact bytes and rejects duplicate/empty IDs', () => {
  assert.equal(buildManifest([...entries].reverse()).merkleRoot, roots[2]);
  assert.deepEqual(buildManifest(entries).manifest.map(x => x.id), ['a', 'b', 'c']);
  assert.notEqual(buildManifest([{ id: 'a', bytes: 'alpha\n' }]).merkleRoot, roots[0]);
  assert.throws(() => buildManifest([entries[0], entries[0]]), code('CAPSULE_MANIFEST_ORDER'));
  assert.throws(() => buildManifest([]), code('CAPSULE_MANIFEST_MALFORMED'));
  assert.throws(() => buildManifest([{ id: '../a', bytes: '' }]), code('CAPSULE_MANIFEST_MALFORMED'));
});

test('proof rejects changed leaf ID/digest/size and a wrong expected root', () => {
  const built = buildManifest(entries);
  for (const changed of [{ id: 'other-subject' }, { digest: '0'.repeat(64) }, { size: 99 }]) {
    assert.equal(verifyInclusion({ ...built.manifest[0], ...changed }, built.proofs[0], built.merkleRoot), false);
  }
  assert.equal(verifyInclusion(built.manifest[0], built.proofs[0], roots[1]), false);
});

test('proof rejects changed index/count, sibling direction/hash, missing and extra nodes', () => {
  const { manifest, proofs, merkleRoot } = buildManifest(entries);
  const changes = [p => p.index = 1, p => p.leafCount = 4, p => p.siblings[0].side = 'left',
    p => p.siblings[0].hash = '0'.repeat(64), p => p.siblings.pop(), p => p.siblings.push(p.siblings[0]), p => p.extra = true];
  for (const change of changes) {
    const proof = copy(proofs[0]); change(proof);
    assert.equal(verifyInclusion(manifest[0], proof, merkleRoot), false);
  }
});

test('three-leaf odd node uses its own hash and count-bound root', () => {
  const { manifest, proofs, merkleRoot } = buildManifest(entries);
  const odd = copy(proofs[2]);
  assert.equal(odd.siblings[0].side, 'right');
  odd.siblings[0].hash = proofs[0].siblings[0].hash;
  assert.equal(verifyInclusion(manifest[2], odd, merkleRoot), false);
  const changedCount = copy(proofs[2]); changedCount.leafCount = 4;
  assert.equal(verifyInclusion(manifest[2], changedCount, merkleRoot), false);
});

test('one-leaf proof rejects surplus sibling and impossible index', () => {
  const { manifest, proofs, merkleRoot } = buildManifest(entries.slice(0, 1));
  assert.deepEqual(proofs[0].siblings, []);
  assert.equal(verifyInclusion(manifest[0], { ...proofs[0], index: 1 }, merkleRoot), false);
  assert.equal(verifyInclusion(manifest[0], { ...proofs[0], siblings: [{ side: 'right', hash: merkleRoot }] }, merkleRoot), false);
});

test('capsule round trip preserves Unicode, array order and independently captured entire container', () => {
  const encoded = fixture();
  assert.equal(encoded.containerDigest, digest(encoded.bytes));
  assert.ok(encoded.bytes.equals(canonicalize(parseStrict(encoded.bytes))));
  const decoded = decodeCapsule(encoded.bytes, { containerDigest: encoded.containerDigest, requestDigest: digest(canonicalize(request)), subject: request.subject });
  assert.deepEqual(JSON.parse(JSON.stringify(decoded.request)), request);
  assert.deepEqual(JSON.parse(JSON.stringify(decoded.bundle)), bundle);
  assert.equal(decoded.packagingOnly, true);
  assert.equal(decoded.semanticAuthority, 'NOT_ESTABLISHED');
  assert.deepEqual(decoded.manifest.map(x => x.id), ['bundle.json', 'request.json']);
  decoded.manifest.forEach((entry, index) => assert.equal(verifyInclusion(entry, decoded.proofs[index], decoded.manifestMerkleRoot), true));
});

test('canonical key ordering produces deterministic capsules', () => {
  const a = fixture();
  const b = encodeCapsule({ values: request.values, label: request.label, subject: { version: '1', id: 'subject:A' }, schema: request.schema }, bundle);
  assert.ok(a.bytes.equals(b.bytes));
  assert.equal(a.containerDigest, b.containerDigest);
});

test('full-container capture binds fields outside native roots', () => {
  const original = fixture();
  const changedBundle = copy(bundle); changedBundle.payload.anchor.declared = 'different';
  const changed = encodeCapsule(request, changedBundle);
  assert.notEqual(changed.containerDigest, original.containerDigest);
  assert.throws(() => decodeCapsule(changed.bytes, { containerDigest: original.containerDigest }), code('CAPSULE_CONTAINER_DIGEST_MISMATCH'));
  assert.equal(decodeCapsule(changed.bytes).semanticAuthority, 'NOT_ESTABLISHED');
});

test('wrong independently selected subject and request digest are rejected', () => {
  const capsule = fixture();
  assert.throws(() => decodeCapsule(capsule.bytes, { subject: { ...request.subject, id: 'subject:B' } }), code('CAPSULE_SUBJECT_MISMATCH'));
  assert.throws(() => decodeCapsule(capsule.bytes, { requestDigest: '0'.repeat(64) }), code('CAPSULE_REQUEST_MISMATCH'));
});

test('packaging preserves request/bundle disagreement for later semantic verification', () => {
  const other = copy(bundle); other.statement.subject.id = 'subject:B';
  const decoded = decodeCapsule(encodeCapsule(request, other).bytes);
  assert.equal(decoded.request.subject.id, 'subject:A');
  assert.equal(decoded.bundle.statement.subject.id, 'subject:B');
  assert.equal(decoded.semanticAuthority, 'NOT_ESTABLISHED');
});

test('rejects noncanonical container whitespace/order and duplicate escaped JSON keys', () => {
  const capsule = fixture();
  assert.throws(() => decodeCapsule(Buffer.concat([capsule.bytes, Buffer.from('\n')])), code('CAPSULE_NONCANONICAL_CONTAINER'));
  assert.throws(() => decodeCapsule(JSON.stringify(parseStrict(capsule.bytes), null, 2)), code('CAPSULE_NONCANONICAL_CONTAINER'));
  assert.throws(() => decodeCapsule('{"schema":1,"sch\\u0065ma":2}'), code('DUPLICATE_JSON_KEY'));
});

test('rejects duplicate or unsorted document and manifest IDs', () => {
  assert.throws(() => decodeCapsule(mutateContainer(c => c.documents[1].id = c.documents[0].id)), code('CAPSULE_DOCUMENT_ORDER'));
  assert.throws(() => decodeCapsule(mutateContainer(c => c.documents.reverse())), code('CAPSULE_DOCUMENT_ORDER'));
  assert.throws(() => decodeCapsule(mutateContainer(c => c.manifest[1].id = c.manifest[0].id)), code('CAPSULE_MANIFEST_ORDER'));
  assert.throws(() => decodeCapsule(mutateContainer(c => c.manifest.reverse())), code('CAPSULE_MANIFEST_ORDER'));
});

test('rejects embedded byte tampering even when the JSON remains valid', () => {
  const bytes = mutateContainer(c => {
    const changed = copy(request); changed.label = 'changed';
    c.documents[1].bytes_base64 = canonicalize(changed).toString('base64');
  });
  assert.throws(() => decodeCapsule(bytes), code('CAPSULE_DOCUMENT_DIGEST_MISMATCH'));
});

test('rejects a noncanonical embedded document even after manifest/root are recomputed', () => {
  const container = parseStrict(fixture().bytes);
  container.documents[1].bytes_base64 = Buffer.from(JSON.stringify(request, null, 2)).toString('base64');
  assert.throws(() => decodeCapsule(rebuild(container)), code('CAPSULE_DOCUMENT_NONCANONICAL'));
});

test('rejects mismatched Merkle root, unknown container fields and malformed base64', () => {
  assert.throws(() => decodeCapsule(mutateContainer(c => c.manifest_merkle_root = '0'.repeat(64))), code('CAPSULE_MERKLE_ROOT_MISMATCH'));
  assert.throws(() => decodeCapsule(mutateContainer(c => c.extra = true)), code('SCHEMA_MISMATCH'));
  assert.throws(() => decodeCapsule(mutateContainer(c => c.documents[0].bytes_base64 = '%%%=')), code('INVALID_BASE64'));
});

test('document schemas and external expectations are explicit', () => {
  assert.throws(() => encodeCapsule({ ...request, schema: 'native-crystal' }, bundle), code('CAPSULE_DOCUMENT_SCHEMA'));
  assert.throws(() => encodeCapsule(request, { ...bundle, schema: 'native-rvr' }), code('CAPSULE_DOCUMENT_SCHEMA'));
  assert.throws(() => decodeCapsule(fixture().bytes, { containerDigest: 'wrong' }), code('CAPSULE_EXPECTATION_MALFORMED'));
  assert.throws(() => decodeCapsule(fixture().bytes, { assertedAuthority: true }), code('SCHEMA_MISMATCH'));
  assert.throws(() => decodeCapsule(fixture().bytes, { containerDigest: [fixture().containerDigest] }), code('CAPSULE_EXPECTATION_MALFORMED'));
});

test('manifest admission never executes JS accessors and hashes require string fields', () => {
  let observed = false;
  const entry = { id: 'a', get bytes() { observed = true; return 'alpha'; } };
  assert.throws(() => buildManifest([entry]), code('CAPSULE_MANIFEST_MALFORMED'));
  assert.equal(observed, false);
  const built = buildManifest(entries.slice(0, 1));
  assert.equal(verifyInclusion({ ...built.manifest[0], digest: [built.manifest[0].digest] }, built.proofs[0], built.merkleRoot), false);
});

test('object IDs and external expectation accessors are rejected without coercion or execution', () => {
  let invoked = false;
  const id = { [Symbol.toPrimitive]() { invoked = true; return 'a'; } };
  assert.throws(() => buildManifest([{ id, bytes: 'alpha' }, entries[1]]), code('CAPSULE_MANIFEST_MALFORMED'));
  const expected = { get containerDigest() { invoked = true; return fixture().containerDigest; } };
  assert.throws(() => decodeCapsule(fixture().bytes, expected), code('NON_JSON_VALUE'));
  assert.equal(invoked, false);
});
