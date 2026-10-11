import { canonicalize, parseStrict, sha256, problem } from './strict-json.mjs';
import { base64, HEX, keys } from './common.mjs';

export const CAPSULE_SCHEMA = 'receiptos.verify.capsule.v1';
export const PROOF_SCHEMA = 'receiptos.verify.capsule-inclusion.v1';
const CANON = 'receiptos.verify.canonical-json.v1';
const DOMAIN = Buffer.from('receiptos.verify.capsule-merkle.v1\0', 'ascii');
const MAX_LEAVES = 65535;
const isDigest = value => typeof value === 'string' && HEX.test(value);
const cloneJson = value => parseStrict(canonicalize(value));
const fail = (code, message) => { throw problem(code, message); };
const hash = (...parts) => sha256(Buffer.concat(parts));
const leafHash = entry => hash(DOMAIN, Buffer.from([0]), canonicalize(entry));
const nodeHash = (left, right) => hash(DOMAIN, Buffer.from([1]), Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
function rootHash(top, count) {
  const encodedCount = Buffer.alloc(4);
  encodedCount.writeUInt32BE(count);
  return hash(DOMAIN, Buffer.from([2]), encodedCount, Buffer.from(top, 'hex'));
}
function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/.test(id)
    && id.split('/').every(segment => segment && segment !== '.' && segment !== '..');
}
function checkEntry(entry) {
  keys(entry, ['id', 'digest', 'size']);
  if (!validId(entry.id) || !isDigest(entry.digest) || !Number.isSafeInteger(entry.size) || entry.size < 0) {
    fail('CAPSULE_MANIFEST_MALFORMED', 'Invalid manifest entry.');
  }
}
function checkManifest(manifest) {
  if (!Array.isArray(manifest) || !manifest.length || manifest.length > MAX_LEAVES) {
    fail('CAPSULE_MANIFEST_MALFORMED', 'A nonempty bounded manifest is required.');
  }
  let previous = null;
  for (const entry of manifest) {
    checkEntry(entry);
    if (previous !== null && entry.id <= previous) fail('CAPSULE_MANIFEST_ORDER', 'Manifest IDs must be unique and sorted.');
    previous = entry.id;
  }
}
function tree(manifest) {
  const levels = [manifest.map(leafHash)];
  while (levels.at(-1).length > 1) {
    const row = levels.at(-1), next = [];
    for (let i = 0; i < row.length; i += 2) next.push(nodeHash(row[i], row[i + 1] ?? row[i]));
    levels.push(next);
  }
  return levels;
}
function inclusion(levels, index) {
  const leafCount = levels[0].length, siblings = [];
  let cursor = index;
  for (const row of levels.slice(0, -1)) {
    const left = cursor % 2 === 1;
    siblings.push({ side: left ? 'left' : 'right', hash: row[left ? cursor - 1 : cursor + 1] ?? row[cursor] });
    cursor = Math.floor(cursor / 2);
  }
  return { schema: PROOF_SCHEMA, index, leafCount, siblings };
}

// Original product tree: sorted manifest entries, domain-separated leaf/node/root
// hashes, odd-node duplication and an explicit count-bound root. No chain anchor
// or native Crystal capsule/Merkle wire conformance is asserted.
export function buildManifest(entries) {
  if (!Array.isArray(entries) || !entries.length || entries.length > MAX_LEAVES) {
    fail('CAPSULE_MANIFEST_MALFORMED', 'A nonempty bounded entry list is required.');
  }
  const manifest = entries.map(entry => {
    keys(entry, ['id', 'bytes']);
    if (![null, Object.prototype].includes(Object.getPrototypeOf(entry)) || Object.getOwnPropertySymbols(entry).length
      || Object.getOwnPropertyNames(entry).length !== 2) fail('CAPSULE_MANIFEST_MALFORMED', 'Entries must have plain enumerable data fields.');
    const id = Object.getOwnPropertyDescriptor(entry, 'id'), data = Object.getOwnPropertyDescriptor(entry, 'bytes');
    if (![id, data].every(field => field && Object.hasOwn(field, 'value') && field.enumerable)) {
      fail('CAPSULE_MANIFEST_MALFORMED', 'Entry accessors are not admitted.');
    }
    if (!validId(id.value)) fail('CAPSULE_MANIFEST_MALFORMED', 'Entry IDs must be safe strings.');
    if (!(Buffer.isBuffer(data.value) || typeof data.value === 'string')) fail('CAPSULE_BYTES_REQUIRED', 'Entry bytes must be text or a Buffer.');
    const bytes = Buffer.from(data.value);
    return { id: id.value, digest: sha256(bytes), size: bytes.length };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  // Copy the admitted manifest into the restricted canonical JSON domain.
  const safe = cloneJson(manifest);
  checkManifest(safe);
  const levels = tree(safe);
  return { manifest: safe, merkleRoot: rootHash(levels.at(-1)[0], safe.length), proofs: safe.map((_, index) => inclusion(levels, index)) };
}

export function verifyInclusion(entry, proof, expectedRoot) {
  try {
    entry = cloneJson(entry); proof = cloneJson(proof);
    checkEntry(entry);
    keys(proof, ['schema', 'index', 'leafCount', 'siblings']);
    if (proof.schema !== PROOF_SCHEMA || !isDigest(expectedRoot)
      || !Number.isSafeInteger(proof.leafCount) || proof.leafCount < 1 || proof.leafCount > MAX_LEAVES
      || !Number.isSafeInteger(proof.index) || proof.index < 0 || proof.index >= proof.leafCount || !Array.isArray(proof.siblings)) return false;
    let current = leafHash(entry), cursor = proof.index, width = proof.leafCount, step = 0;
    while (width > 1) {
      const sibling = proof.siblings[step++];
      keys(sibling, ['side', 'hash']);
      if (!isDigest(sibling.hash) || sibling.side !== (cursor % 2 ? 'left' : 'right')) return false;
      if (cursor % 2 === 0 && cursor + 1 >= width && sibling.hash !== current) return false;
      current = sibling.side === 'left' ? nodeHash(sibling.hash, current) : nodeHash(current, sibling.hash);
      cursor = Math.floor(cursor / 2); width = Math.ceil(width / 2);
    }
    return step === proof.siblings.length && rootHash(current, proof.leafCount) === expectedRoot;
  } catch { return false; }
}

function document(value, schema) {
  const bytes = canonicalize(value), parsed = parseStrict(bytes);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.schema !== schema) {
    fail('CAPSULE_DOCUMENT_SCHEMA', 'Unexpected product document schema.');
  }
  return { bytes, parsed };
}

// The returned digest is external to the container, avoiding a self-hash. Its
// expected value must come from the consumer's separate capture/trust channel.
export function encodeCapsule(request, bundle) {
  const documents = [
    { id: 'bundle.json', ...document(bundle, 'receiptos.verify.bundle.v1') },
    { id: 'request.json', ...document(request, 'receiptos.verify.request.v1') },
  ];
  const built = buildManifest(documents.map(({ id, bytes }) => ({ id, bytes })));
  const bytes = canonicalize({ schema: CAPSULE_SCHEMA, canonicalization_profile: CANON,
    documents: documents.map(({ id, bytes }) => ({ id, bytes_base64: bytes.toString('base64') })),
    manifest: built.manifest, manifest_merkle_root: built.merkleRoot });
  return { bytes, containerDigest: sha256(bytes), manifestMerkleRoot: built.merkleRoot };
}

export function decodeCapsule(input, expected = {}) {
  const parsed = parseStrict(input), bytes = Buffer.from(input);
  if (!canonicalize(parsed).equals(bytes)) fail('CAPSULE_NONCANONICAL_CONTAINER', 'The entire capsule must be canonical bytes.');
  expected = cloneJson(expected);
  keys(expected, [], ['containerDigest', 'requestDigest', 'subject']);
  for (const field of ['containerDigest', 'requestDigest']) {
    if (Object.hasOwn(expected, field) && !isDigest(expected[field])) fail('CAPSULE_EXPECTATION_MALFORMED', 'Expected digests must be lowercase SHA256.');
  }
  const containerDigest = sha256(bytes);
  if (expected.containerDigest && expected.containerDigest !== containerDigest) fail('CAPSULE_CONTAINER_DIGEST_MISMATCH', 'Container differs from the independently captured digest.');
  keys(parsed, ['schema', 'canonicalization_profile', 'documents', 'manifest', 'manifest_merkle_root']);
  if (parsed.schema !== CAPSULE_SCHEMA || parsed.canonicalization_profile !== CANON || !Array.isArray(parsed.documents)
    || parsed.documents.length !== 2 || !isDigest(parsed.manifest_merkle_root)) fail('CAPSULE_SCHEMA_MISMATCH', 'Unexpected capsule shape.');
  checkManifest(parsed.manifest);
  if (parsed.manifest.length !== 2) fail('CAPSULE_SCHEMA_MISMATCH', 'Exactly request.json and bundle.json are required.');
  const contents = {}, entries = [];
  for (let i = 0; i < 2; i++) {
    const item = parsed.documents[i], id = ['bundle.json', 'request.json'][i];
    keys(item, ['id', 'bytes_base64']);
    if (item.id !== id || parsed.manifest[i].id !== id) fail('CAPSULE_DOCUMENT_ORDER', 'Document IDs must be unique and sorted.');
    const raw = base64(item.bytes_base64), value = parseStrict(raw);
    if (!canonicalize(value).equals(raw)) fail('CAPSULE_DOCUMENT_NONCANONICAL', 'Embedded product documents must be canonical.');
    document(value, id === 'request.json' ? 'receiptos.verify.request.v1' : 'receiptos.verify.bundle.v1');
    if (sha256(raw) !== parsed.manifest[i].digest || raw.length !== parsed.manifest[i].size) fail('CAPSULE_DOCUMENT_DIGEST_MISMATCH', 'Embedded bytes do not match the complete manifest.');
    contents[id] = value; entries.push({ id, bytes: raw });
  }
  const built = buildManifest(entries);
  if (built.merkleRoot !== parsed.manifest_merkle_root) fail('CAPSULE_MERKLE_ROOT_MISMATCH', 'Manifest Merkle root differs.');
  const request = contents['request.json'], bundle = contents['bundle.json'];
  if (expected.requestDigest && sha256(canonicalize(request)) !== expected.requestDigest) fail('CAPSULE_REQUEST_MISMATCH', 'Requested document differs from the independently selected request digest.');
  if (Object.hasOwn(expected, 'subject') && !canonicalize(request.subject).equals(canonicalize(expected.subject))) {
    fail('CAPSULE_SUBJECT_MISMATCH', 'Capsule request subject differs from the independently selected subject.');
  }
  return { request, bundle, containerDigest, manifestMerkleRoot: built.merkleRoot, manifest: built.manifest, proofs: built.proofs,
    packagingOnly: true, semanticAuthority: 'NOT_ESTABLISHED' };
}
