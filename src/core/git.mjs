import { createHash } from 'node:crypto';

const OBJECT_ID = /^[0-9a-f]{40}$/;
const COMPONENT = /^[A-Za-z0-9._-]+$/;
const MODES = new Map([
  ['40000', 'tree'],
  ['100644', 'blob'],
  ['100755', 'blob'],
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function malformed(message) {
  fail('GIT_OBJECT_MALFORMED', message);
}

function safeComponent(name) {
  return COMPONENT.test(name) && name !== '.' && name !== '..'
    && name.toLowerCase() !== '.git';
}

/** Hash the exact, uncompressed Git object, including its type/byte-length header. */
export function gitObjectId(type, bytes) {
  if (!['blob', 'tree', 'commit', 'tag'].includes(type) || !Buffer.isBuffer(bytes)) {
    malformed('Git object hashing requires a supported type and Buffer bytes');
  }
  return createHash('sha1')
    .update(Buffer.from(`${type} ${bytes.length}\0`, 'ascii'))
    .update(bytes)
    .digest('hex');
}

function commitRoot(bytes) {
  const separator = bytes.indexOf(Buffer.from('\n\n', 'ascii'));
  if (separator < 0) malformed('Commit is missing its header/message separator');
  const header = bytes.subarray(0, separator);
  if (header.includes(0) || header.includes(13)) {
    malformed('Commit headers contain NUL or CR bytes');
  }
  // latin1 preserves byte boundaries; only structural headers are interpreted.
  // A commit's author, signature and message are never treated as authenticated.
  const lines = header.toString('latin1').split('\n');
  if (!/^tree [0-9a-f]{40}$/.test(lines[0])) {
    malformed('The first commit header must be an exact SHA-1 tree identity');
  }
  const counts = new Map();
  let previousName;
  for (const line of lines) {
    if (line.startsWith(' ')) {
      if (!previousName || ['tree', 'parent', 'author', 'committer'].includes(previousName)) {
        malformed('Structural commit headers cannot have continuation lines');
      }
      continue;
    }
    const match = /^([A-Za-z][A-Za-z0-9-]*) (.+)$/.exec(line);
    if (!match) malformed('Malformed commit header');
    const [, name, value] = match;
    previousName = name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (['tree', 'parent'].includes(name) && !OBJECT_ID.test(value)) {
      malformed(`Invalid ${name} object identity in commit header`);
    }
    if (['tree', 'author', 'committer'].includes(name) && counts.get(name) > 1) {
      malformed(`Duplicate ${name} commit header`);
    }
  }
  if (counts.get('author') !== 1 || counts.get('committer') !== 1) {
    malformed('Commit must have one author and one committer header');
  }
  return lines[0].slice(5);
}

function parseTree(bytes) {
  const result = new Map();
  let offset = 0;
  let previousKey;
  while (offset < bytes.length) {
    const space = bytes.indexOf(32, offset);
    if (space < 0 || space - offset < 1 || space - offset > 6) {
      malformed('Malformed or truncated tree entry mode');
    }
    const modeBytes = bytes.subarray(offset, space);
    if (!modeBytes.every((byte) => byte >= 48 && byte <= 55)) {
      malformed('Tree mode is not canonical ASCII octal');
    }
    const mode = modeBytes.toString('ascii');
    const kind = MODES.get(mode);
    if (!kind) malformed('Unsupported tree mode; links and submodules are forbidden');
    const nul = bytes.indexOf(0, space + 1);
    if (nul < 0) malformed('Tree entry name is not NUL terminated');
    const nameBytes = bytes.subarray(space + 1, nul);
    if (!nameBytes.every((byte) => byte < 128)) malformed('Tree names must use safe ASCII');
    const name = nameBytes.toString('ascii');
    if (!safeComponent(name)) malformed('Tree entry contains an unsafe path component');
    if (result.has(name)) malformed(`Duplicate tree entry name: ${name}`);
    if (bytes.length - nul - 1 < 20) malformed('Truncated tree entry object identity');
    const oidBytes = bytes.subarray(nul + 1, nul + 21);
    if (oidBytes.every((byte) => byte === 0)) malformed('Tree entry has a null object identity');
    const oid = oidBytes.toString('hex');
    // Git compares directory names as though followed by '/', ordinary names
    // as though followed by NUL. A plain filename sort is not equivalent.
    const key = Buffer.concat([nameBytes, Buffer.from(kind === 'tree' ? '/' : '\0', 'ascii')]);
    if (previousKey && Buffer.compare(previousKey, key) >= 0) {
      malformed('Tree entries are not in canonical Git name order');
    }
    previousKey = key;
    result.set(name, { kind, oid });
    offset = nul + 21;
  }
  return result;
}

/**
 * Verify a SHA-1 commit -> root tree -> nested trees -> artifact blob closure.
 * Manifest IDs are labels; object IDs are computed independently from bytes.
 * This establishes membership, not remote acceptance or author authenticity.
 * Subject SHA-256/predicate checking belongs to the caller's digest adapter.
 */
export function verifyGitSubject(subject, entries) {
  if (!subject || subject.type !== 'git-artifact' || subject.objectFormat !== 'sha1'
      || !OBJECT_ID.test(subject.commit) || !OBJECT_ID.test(subject.tree)
      || !subject.artifact || typeof subject.artifact.path !== 'string') {
    malformed('Invalid SHA-1 Git artifact subject');
  }
  const components = subject.artifact.path.split('/');
  if (!components.every(safeComponent)) malformed('Artifact path must be a safe relative ASCII Git path');
  if (!Array.isArray(entries)) malformed('Git evidence entries must be an array');
  const ids = new Set();
  const commits = [];
  const artifacts = [];
  const trees = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string' || entry.id.length === 0
        || !Buffer.isBuffer(entry.bytes) || ids.has(entry.id)) {
      malformed('Invalid or duplicate evidence entry');
    }
    ids.add(entry.id);
    if (entry.role === 'git-commit') commits.push(entry.bytes);
    else if (entry.role === 'artifact') artifacts.push(entry.bytes);
    else if (entry.role === 'git-tree') {
      const oid = gitObjectId('tree', entry.bytes);
      if (trees.has(oid)) malformed('Duplicate or ambiguous tree object evidence');
      trees.set(oid, parseTree(entry.bytes));
    } else if (entry.role !== 'saved-result') {
      malformed('Unsupported Git evidence role');
    }
  }
  if (commits.length !== 1 || artifacts.length !== 1 || trees.size === 0) {
    malformed('Git closure requires one commit, one artifact and at least one tree');
  }
  const commit = gitObjectId('commit', commits[0]);
  if (commit !== subject.commit) {
    fail('GIT_OBJECT_IDENTITY_MISMATCH', 'Commit bytes do not match the subject commit');
  }
  const root = commitRoot(commits[0]);
  if (root !== subject.tree) {
    fail('GIT_OBJECT_IDENTITY_MISMATCH', 'Commit root tree does not match the subject tree');
  }
  const blob = gitObjectId('blob', artifacts[0]);
  let tree = root;
  for (let index = 0; index < components.length; index += 1) {
    const children = trees.get(tree);
    if (!children) {
      fail('GIT_ARTIFACT_MEMBERSHIP_MISMATCH', 'Missing referenced tree in the artifact path closure');
    }
    const child = children.get(components[index]);
    if (!child) {
      fail('GIT_ARTIFACT_MEMBERSHIP_MISMATCH', 'Artifact path is absent from its committed tree');
    }
    if (index < components.length - 1) {
      if (child.kind !== 'tree') {
        fail('GIT_ARTIFACT_MEMBERSHIP_MISMATCH', 'An intermediate artifact path component is not a tree');
      }
      tree = child.oid;
    } else if (child.kind !== 'blob' || child.oid !== blob) {
      fail('GIT_ARTIFACT_MEMBERSHIP_MISMATCH', 'Artifact bytes are not the regular file committed at this path');
    }
  }
  return { ok: true, commit, tree: root, blob, path: subject.artifact.path };
}
