import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gitObjectId, verifyGitSubject } from '../src/core/git.mjs';

// No repository is created. hash-object reads stdin and, without -w, writes
// neither an object database nor any other fixture files in this directory.
const temporaryDirectory = mkdtempSync(join(fileURLToPath(new URL('../reports/tmp/', import.meta.url)), 'receiptos-verify-git-'));
after(() => {
  assert.deepEqual(readdirSync(temporaryDirectory), []);
  rmdirSync(temporaryDirectory);
});

function cliId(type, bytes) {
  const result = spawnSync('git', ['hash-object', '--stdin', '-t', type], {
    cwd: temporaryDirectory,
    input: bytes,
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const id = result.stdout.trim();
  assert.match(id, /^[0-9a-f]{40}$/);
  return id;
}

function treeEntry(mode, name, oid) {
  return Buffer.concat([Buffer.from(`${mode} ${name}\0`, 'utf8'), Buffer.from(oid, 'hex')]);
}

function commitBytes(tree, extra = '') {
  return Buffer.from(`tree ${tree}\nauthor Synthetic <synthetic@example.invalid> 0 +0000\ncommitter Synthetic <synthetic@example.invalid> 0 +0000\n${extra}\nfixture\n`, 'utf8');
}

function fixture({ nested = false, executable = false } = {}) {
  const artifact = Buffer.from('hello\n', 'utf8');
  const blob = cliId('blob', artifact);
  const leaf = treeEntry(executable ? '100755' : '100644', 'result.txt', blob);
  const leafId = cliId('tree', leaf);
  const root = nested ? treeEntry('40000', 'docs', leafId) : leaf;
  const tree = cliId('tree', root);
  const commit = commitBytes(tree);
  const subject = {
    type: 'git-artifact', repository: 'demo:receiptos-verify', objectFormat: 'sha1',
    commit: cliId('commit', commit), tree,
    artifact: { path: nested ? 'docs/result.txt' : 'result.txt', sha256: createHash('sha256').update(artifact).digest('hex') },
  };
  const entries = [
    { id: 'commit', role: 'git-commit', bytes: commit },
    { id: 'root', role: 'git-tree', bytes: root },
    ...(nested ? [{ id: 'leaf', role: 'git-tree', bytes: leaf }] : []),
    { id: 'artifact', role: 'artifact', bytes: artifact },
    { id: 'saved', role: 'saved-result', bytes: Buffer.from('{}') },
  ];
  return { subject, entries, blob };
}

const flat = fixture();
const nested = fixture({ nested: true });

function expectCode(fn, code) {
  assert.throws(fn, (error) => error instanceof Error && error.code === code);
}

// Make malformed test objects addressable without asking Git to approve their
// structure. Identity bytes are still checked against the production hasher;
// the positive object fixtures above are independently addressed by Git CLI.
function withTree(bytes) {
  const tree = gitObjectId('tree', bytes);
  const commit = commitBytes(tree);
  return {
    subject: { ...flat.subject, tree, commit: gitObjectId('commit', commit) },
    entries: [
      { id: 'commit', role: 'git-commit', bytes: commit },
      { id: 'root', role: 'git-tree', bytes },
      flat.entries.find((entry) => entry.role === 'artifact'),
    ],
  };
}

test('known Git blob vectors include the object header and byte length', () => {
  assert.equal(gitObjectId('blob', Buffer.alloc(0)), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  assert.equal(gitObjectId('blob', Buffer.from('hello\n')), 'ce013625030ba8dba906f756967f9e9ca394464a');
  for (const bytes of [Buffer.from('caf\u00e9\n'), Buffer.from([0, 255, 128, 10])]) {
    assert.equal(gitObjectId('blob', bytes), cliId('blob', bytes));
  }
});

test('commit, tree and blob identities agree with independent Git CLI fixtures', () => {
  for (const entry of nested.entries.filter((entry) => entry.role !== 'saved-result')) {
    const type = { 'git-commit': 'commit', 'git-tree': 'tree', artifact: 'blob' }[entry.role];
    assert.equal(gitObjectId(type, entry.bytes), cliId(type, entry.bytes));
  }
});

test('flat regular file closure returns independently computed identities', () => {
  assert.deepEqual(verifyGitSubject(flat.subject, flat.entries), {
    ok: true, commit: flat.subject.commit, tree: flat.subject.tree,
    blob: flat.blob, path: 'result.txt',
  });
});

test('nested directory closure and executable regular files verify', () => {
  assert.equal(verifyGitSubject(nested.subject, [...nested.entries].reverse()).blob, nested.blob);
  const executable = fixture({ nested: true, executable: true });
  assert.equal(verifyGitSubject(executable.subject, executable.entries).ok, true);
});

test('wrong declared commit and root tree identities are rejected', () => {
  for (const key of ['commit', 'tree']) {
    expectCode(() => verifyGitSubject({ ...flat.subject, [key]: '1'.repeat(40) }, flat.entries), 'GIT_OBJECT_IDENTITY_MISMATCH');
  }
});

test('changed artifact bytes cannot borrow the original file membership', () => {
  const entries = flat.entries.map((entry) => entry.role === 'artifact' ? { ...entry, bytes: Buffer.from('different\n') } : entry);
  expectCode(() => verifyGitSubject(flat.subject, entries), 'GIT_ARTIFACT_MEMBERSHIP_MISMATCH');
});

test('wrong path and exact-case mismatch cannot select another file', () => {
  for (const path of ['missing.txt', 'Result.txt', 'result.txt/child']) {
    expectCode(() => verifyGitSubject({ ...flat.subject, artifact: { ...flat.subject.artifact, path } }, flat.entries), 'GIT_ARTIFACT_MEMBERSHIP_MISMATCH');
  }
});

test('missing or substituted intermediate/root tree rejects incomplete closure', () => {
  const missingLeaf = nested.entries.filter((entry) => entry.id !== 'leaf');
  expectCode(() => verifyGitSubject(nested.subject, missingLeaf), 'GIT_ARTIFACT_MEMBERSHIP_MISMATCH');
  const substituted = nested.entries.map((entry) => entry.id === 'root' ? { ...entry, bytes: flat.entries.find((item) => item.id === 'root').bytes } : entry).filter((entry) => entry.id !== 'leaf');
  expectCode(() => verifyGitSubject(nested.subject, substituted), 'GIT_ARTIFACT_MEMBERSHIP_MISMATCH');
  expectCode(() => verifyGitSubject({ ...nested.subject, artifact: { ...nested.subject.artifact, path: 'docs' } }, nested.entries), 'GIT_ARTIFACT_MEMBERSHIP_MISMATCH');
});

test('duplicate tree objects and duplicate evidence IDs are rejected', () => {
  const root = flat.entries.find((entry) => entry.id === 'root');
  expectCode(() => verifyGitSubject(flat.subject, [...flat.entries, { ...root, id: 'copy' }]), 'GIT_OBJECT_MALFORMED');
  expectCode(() => verifyGitSubject(flat.subject, [...flat.entries, { ...root }]), 'GIT_OBJECT_MALFORMED');
});

test('duplicate names reject file/file and file/directory ambiguity', () => {
  for (const secondMode of ['100644', '40000']) {
    const f = withTree(Buffer.concat([treeEntry('100644', 'result.txt', flat.blob), treeEntry(secondMode, 'result.txt', flat.blob)]));
    expectCode(() => verifyGitSubject(f.subject, f.entries), 'GIT_OBJECT_MALFORMED');
  }
});

test('canonical Git ordering treats directory suffix as slash, not NUL', () => {
  const leaf = nested.entries.find((entry) => entry.id === 'leaf');
  const root = Buffer.concat([
    treeEntry('100644', 'docs.txt', flat.blob),
    treeEntry('40000', 'docs', gitObjectId('tree', leaf.bytes)),
  ]);
  const f = withTree(root);
  f.subject.artifact = { ...f.subject.artifact, path: 'docs/result.txt' };
  f.entries.push(leaf);
  assert.equal(verifyGitSubject(f.subject, f.entries).ok, true);
  const outOfOrder = withTree(Buffer.concat([
    treeEntry('40000', 'docs', gitObjectId('tree', leaf.bytes)),
    treeEntry('100644', 'docs.txt', flat.blob),
  ]));
  expectCode(() => verifyGitSubject(outOfOrder.subject, outOfOrder.entries), 'GIT_OBJECT_MALFORMED');
});

test('duplicate and conflicting commit tree headers are malformed even when addressed exactly', () => {
  for (const tree of [flat.subject.tree, '1'.repeat(40)]) {
    const bytes = commitBytes(flat.subject.tree, `tree ${tree}\n`);
    const entries = flat.entries.map((entry) => entry.role === 'git-commit' ? { ...entry, bytes } : entry);
    expectCode(() => verifyGitSubject({ ...flat.subject, commit: gitObjectId('commit', bytes) }, entries), 'GIT_OBJECT_MALFORMED');
  }
});

test('commit header structure rejects truncation, continuations and missing structural headers', () => {
  const cases = [
    Buffer.from(`tree ${flat.subject.tree}\n`),
    Buffer.from(`tree ${flat.subject.tree}\n extra\nauthor x\ncommitter y\n\nmessage`),
    Buffer.from(`tree ${flat.subject.tree}\r\nauthor x\ncommitter y\n\nmessage`),
    Buffer.from(`tree ${flat.subject.tree}\n\nmessage`),
    Buffer.from(`tree ${flat.subject.tree}\nauthor x\ncommitter y\nauthor z\n\nmessage`),
  ];
  for (const bytes of cases) {
    const entries = flat.entries.map((entry) => entry.role === 'git-commit' ? { ...entry, bytes } : entry);
    expectCode(() => verifyGitSubject({ ...flat.subject, commit: gitObjectId('commit', bytes) }, entries), 'GIT_OBJECT_MALFORMED');
  }
});

test('opaque multiline signature headers and message tree text do not change root binding', () => {
  const bytes = Buffer.from(`tree ${flat.subject.tree}\nauthor x\ncommitter y\ngpgsig opaque\n continuation\n\ntree ${'1'.repeat(40)}\n`);
  const entries = flat.entries.map((entry) => entry.role === 'git-commit' ? { ...entry, bytes } : entry);
  assert.equal(verifyGitSubject({ ...flat.subject, commit: gitObjectId('commit', bytes) }, entries).ok, true);
});

test('truncated tree modes, names and binary object identities are rejected', () => {
  const valid = treeEntry('100644', 'result.txt', flat.blob);
  const cases = [Buffer.from('100644'), Buffer.from('100644 result.txt'), valid.subarray(0, valid.length - 1), Buffer.concat([valid, Buffer.from([1])]), treeEntry('100644', 'result.txt', '0'.repeat(40))];
  for (const bytes of cases) {
    const f = withTree(bytes);
    expectCode(() => verifyGitSubject(f.subject, f.entries), 'GIT_OBJECT_MALFORMED');
  }
});

test('symlinks, submodules and noncanonical modes are rejected, including unused trees', () => {
  for (const mode of ['120000', '160000', '040000', '100664', '100600', 'abc']) {
    const f = withTree(treeEntry(mode, 'result.txt', flat.blob));
    expectCode(() => verifyGitSubject(f.subject, f.entries), 'GIT_OBJECT_MALFORMED');
  }
  const extra = { id: 'unused', role: 'git-tree', bytes: treeEntry('120000', 'link', flat.blob) };
  expectCode(() => verifyGitSubject(flat.subject, [...flat.entries, extra]), 'GIT_OBJECT_MALFORMED');
});

test('unsafe subject paths and unsafe tree entry names are rejected', () => {
  for (const path of ['', '.', '..', '/result.txt', '../result.txt', 'docs//result.txt', 'docs/./result.txt', 'docs/../result.txt', 'docs\\result.txt', 'C:/result.txt', '.git/result.txt', '.GIT/result.txt', 'caf\u00e9.txt', 'a b.txt', 'result.txt/']) {
    expectCode(() => verifyGitSubject({ ...flat.subject, artifact: { ...flat.subject.artifact, path } }, flat.entries), 'GIT_OBJECT_MALFORMED');
  }
  for (const name of ['', '.', '..', '.git', '.GIT', 'a/b', 'a\\b', 'caf\u00e9', 'a b']) {
    const f = withTree(treeEntry('100644', name, flat.blob));
    expectCode(() => verifyGitSubject(f.subject, f.entries), 'GIT_OBJECT_MALFORMED');
  }
});

test('malformed API arguments and missing or repeated required roles fail closed', () => {
  expectCode(() => gitObjectId('unknown', Buffer.alloc(0)), 'GIT_OBJECT_MALFORMED');
  expectCode(() => gitObjectId('blob', 'hello'), 'GIT_OBJECT_MALFORMED');
  for (const subject of [null, { ...flat.subject, objectFormat: 'sha256' }, { ...flat.subject, commit: flat.subject.commit.toUpperCase() }]) {
    expectCode(() => verifyGitSubject(subject, flat.entries), 'GIT_OBJECT_MALFORMED');
  }
  expectCode(() => verifyGitSubject(flat.subject, null), 'GIT_OBJECT_MALFORMED');
  for (const role of ['git-commit', 'git-tree', 'artifact']) {
    expectCode(() => verifyGitSubject(flat.subject, flat.entries.filter((entry) => entry.role !== role)), 'GIT_OBJECT_MALFORMED');
  }
  const artifact = flat.entries.find((entry) => entry.role === 'artifact');
  expectCode(() => verifyGitSubject(flat.subject, [...flat.entries, { ...artifact, id: 'artifact-copy' }]), 'GIT_OBJECT_MALFORMED');
});
