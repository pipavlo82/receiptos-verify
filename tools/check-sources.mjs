import { readdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStrict } from '../src/core/strict-json.mjs';

const productRoot = fileURLToPath(new URL('../', import.meta.url));
export const SCHEMA = 'receiptos.verify.source-lock.v2';
export const POLICY = 'receiptos.verify.source-inventory-policy.v2';
export const SCOPE = 'Current repository regular files, including research, nested locks and workflows; only root source-lock.json, root reports/, and .git/node_modules/.cache trees are excluded. Historical reports are checked separately by the pinned preservation inventory.';
const excludedTrees = new Set(['.git', 'node_modules', '.cache']);
const binaryFiles = new Set([
  'research/agent-action-browser-verify-v0/evidence/browser/desktop-positive.png',
  'research/agent-action-browser-verify-v0/evidence/browser/mobile-positive.png',
  'research/agent-action-browser-verify-v0/evidence/browser/untrusted-checkpoint.png',
]);
const snapshots = Object.freeze({
  'provenance/source-inventory-v1/source-lock.json': '938820d6a5608fcb34eda832289c539802f51577f6f6e8eb72cd4b11559a9511',
  'provenance/source-inventory-v1/check-sources.mjs': 'c6cb62c308762ba4d3722dc14de74c0898a700c7f65f174deeb68354b0b00fe6',
});
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const require = (condition, reason) => { if (!condition) throw new Error(reason); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export const exactPath = path => typeof path === 'string' && !!path && !/[\\\x00-\x1f\x7f]/.test(path) && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path) && !path.split('/').some(part => ['', '.', '..'].includes(part));

async function regularBytes(root, path) {
  const full = join(root, ...path.split('/')), info = await lstat(full);
  require(info.isFile() && !info.isSymbolicLink(), 'SOURCE_NOT_REGULAR:' + path);
  return readFile(full);
}

async function preserveSnapshots(root) {
  for (const [path, expected] of Object.entries(snapshots)) {
    require(sha256(await regularBytes(root, path)) === expected, 'HISTORICAL_INVENTORY_SNAPSHOT_CHANGED:' + path);
  }
}

export async function inventory(root = productRoot) {
  root = resolve(root);
  const files = [];
  async function walk(folder, prefix = '') {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = prefix + entry.name;
      if (excludedTrees.has(entry.name) || path === 'source-lock.json' || path === 'reports') continue;
      require(exactPath(path), 'UNSAFE_SOURCE_PATH:' + path);
      const full = join(folder, entry.name), info = await lstat(full);
      require(!info.isSymbolicLink(), 'SYMLINK_NOT_IN_LOCK_CONTRACT:' + path);
      if (info.isDirectory()) await walk(full, path + '/');
      else {
        require(info.isFile(), 'SOURCE_NOT_REGULAR:' + path);
        const bytes = await readFile(full);
        if (binaryFiles.has(path)) {
          require(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'BINARY_SIGNATURE_MISMATCH:' + path);
        } else if (!path.startsWith('vendor/')) {
          require(!bytes.includes(13) && !bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])), 'LF_OR_BOM_VIOLATION:' + path);
          try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
          catch { throw new Error('INVALID_SOURCE_UTF8:' + path); }
        }
        files.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
      }
    }
  }
  await walk(root);
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function fileMap(record) {
  require(exactKeys(record, ['schema', 'policy', 'scope', 'files']) && record.schema === SCHEMA && record.policy === POLICY && record.scope === SCOPE && Array.isArray(record.files) && record.files.length > 0, 'SOURCE_LOCK_METADATA_INVALID');
  const result = new Map();
  for (const row of record.files) {
    require(exactKeys(row, ['path', 'bytes', 'sha256']) && exactPath(row.path) && row.path !== 'source-lock.json' && Number.isSafeInteger(row.bytes) && row.bytes >= 0 && typeof row.sha256 === 'string' && /^[0-9a-f]{64}$/.test(row.sha256), 'SOURCE_LOCK_ENTRY_INVALID');
    require(!result.has(row.path), 'SOURCE_LOCK_DUPLICATE_PATH:' + row.path);
    result.set(row.path, row);
  }
  return result;
}

export async function checkSources(root = productRoot) {
  root = resolve(root);
  await preserveSnapshots(root);
  const bytes = await regularBytes(root, 'source-lock.json');
  const locked = fileMap(parseStrict(bytes));
  const files = await inventory(root);
  require(locked.size === files.length && files.every(row => {
    const expected = locked.get(row.path);
    return expected && expected.bytes === row.bytes && expected.sha256 === row.sha256;
  }), 'SOURCE_CLOSURE_MISMATCH');
  return { status: 'PASS', schema: SCHEMA, policy: POLICY, files: files.length, sourceLockDigest: sha256(bytes), historicalSnapshots: Object.keys(snapshots).length };
}

export async function writeSources(root = productRoot) {
  root = resolve(root);
  await preserveSnapshots(root);
  const files = await inventory(root);
  const record = { schema: SCHEMA, policy: POLICY, scope: SCOPE, files };
  fileMap(record);
  await writeFile(join(root, 'source-lock.json'), JSON.stringify(record, null, 2) + '\n');
  return { locked: files.length, schema: SCHEMA, policy: POLICY };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    require(!args.length || (args.length === 1 && args[0] === '--write'), 'UNSUPPORTED_SOURCE_CHECK_ARGUMENT');
    console.log(JSON.stringify(args.length ? await writeSources() : await checkSources()));
  } catch (error) {
    console.error(JSON.stringify({ status: 'FAIL', reason: error.code ?? error.message }));
    process.exitCode = 1;
  }
}
