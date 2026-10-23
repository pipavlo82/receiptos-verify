import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, unlink, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkSources, writeSources, inventory } from '../../../tools/check-sources.mjs';

const host = fileURLToPath(new URL('../../../', import.meta.url));
const frozen = ['provenance/source-inventory-v1/source-lock.json', 'provenance/source-inventory-v1/check-sources.mjs'];
let root;
async function put(path, bytes) {
  const full = join(root, ...path.split('/'));
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, bytes);
}
const record = async () => JSON.parse(await readFile(join(root, 'source-lock.json'), 'utf8'));
const save = value => put('source-lock.json', JSON.stringify(value, null, 2) + '\n');

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'receiptos-current-inventory-'));
  for (const path of frozen) await put(path, await readFile(join(host, path)));
  await put('README.md', 'Current experimental tree\n');
  await put('.github/workflows/research.yml', 'name: research\n');
  await put('research/example/source-lock.json', '{"nested":true}\n');
  await put('research/example/SHA256SUMS', 'nested outer manifest\n');
  await put('research/example/reports/case.json', '{"nested_report":true}\n');
  await put('reports/frozen.json', '{"historical":true}\n');
  await writeSources(root);
});
afterEach(async () => rm(root, { recursive: true, force: true }));

test('current closure includes workflow, nested locks, outer manifest and nested reports', async () => {
  const actual = await checkSources(root);
  assert.equal(actual.status, 'PASS');
  const paths = (await record()).files.map(row => row.path);
  for (const path of ['.github/workflows/research.yml', 'research/example/source-lock.json', 'research/example/SHA256SUMS', 'research/example/reports/case.json', ...frozen]) assert.ok(paths.includes(path), path);
  assert.ok(!paths.includes('source-lock.json'));
  assert.ok(!paths.includes('reports/frozen.json'));
});

test('writer uses exact UTF-16 path order and verifier compares exact path maps', async () => {
  const lock = await record(), paths = lock.files.map(row => row.path);
  assert.deepEqual(paths, [...paths].sort());
  lock.files.reverse();
  await save(lock);
  assert.equal((await checkSources(root)).status, 'PASS');
});

test('extra current file cannot disappear into an ignored research subtree', async () => {
  await put('research/example/extra.json', '{}\n');
  await assert.rejects(checkSources(root), /SOURCE_CLOSURE_MISMATCH/);
});

test('missing current file fails closure', async () => {
  await unlink(join(root, 'README.md'));
  await assert.rejects(checkSources(root), /SOURCE_CLOSURE_MISMATCH/);
});

test('changed bytes fail even when byte length is unchanged', async () => {
  await put('README.md', 'Current experimental treE\n');
  await assert.rejects(checkSources(root), /SOURCE_CLOSURE_MISMATCH/);
});

test('byte count and digest are independently load-bearing', async () => {
  const original = await record();
  for (const [field, value] of [['bytes', 999], ['sha256', '0'.repeat(64)]]) {
    const lock = structuredClone(original);
    lock.files[0][field] = value;
    await save(lock);
    await assert.rejects(checkSources(root), /SOURCE_CLOSURE_MISMATCH/);
  }
});

test('duplicate inventory paths are rejected before comparison', async () => {
  const lock = await record();
  lock.files.push({ ...lock.files[0] });
  await save(lock);
  await assert.rejects(checkSources(root), /SOURCE_LOCK_DUPLICATE_PATH/);
});

test('duplicate JSON fields are rejected rather than taking first or last', async () => {
  const text = await readFile(join(root, 'source-lock.json'), 'utf8');
  await put('source-lock.json', text.replace('"schema":', '"schema":"ignored", "schema":'));
  await assert.rejects(checkSources(root), /Duplicate member schema/);
});

test('unsafe or non-exact relative paths are rejected', async () => {
  const original = await record();
  for (const path of ['../outside', '/absolute', 'C:/absolute', 'file:outside', 'https:outside', './README.md', 'research//file', 'research/../file', 'research\\file', 'research/\u0000file']) {
    const lock = structuredClone(original);
    lock.files[0].path = path;
    await save(lock);
    await assert.rejects(checkSources(root), /SOURCE_LOCK_ENTRY_INVALID/);
  }
});

test('invalid metadata, empty closure and malformed rows cannot certify a tree', async () => {
  const original = await record();
  const changes = [
    lock => { lock.schema = 'receiptos.verify.source-lock.v1'; },
    lock => { lock.policy = 'ignore-research'; },
    lock => { lock.scope = 'anything'; },
    lock => { lock.extra = true; },
    lock => { lock.files = []; },
    lock => { lock.files[0].bytes = -1; },
    lock => { lock.files[0].bytes = 1.5; },
    lock => { lock.files[0].sha256 = lock.files[0].sha256.toUpperCase(); },
    lock => { lock.files[0].extra = true; },
  ];
  for (const change of changes) {
    const lock = structuredClone(original);
    change(lock);
    await save(lock);
    await assert.rejects(checkSources(root), error => error.code === 'UNSAFE_JSON_NUMBER' || /SOURCE_LOCK_(METADATA|ENTRY)_INVALID/.test(error.message));
  }
});

test('nested source lock bytes are actually checked', async () => {
  await put('research/example/source-lock.json', '{"nested":false}\n');
  await assert.rejects(checkSources(root), /SOURCE_CLOSURE_MISMATCH/);
});

test('root reports exclusion is exact, not a basename exclusion at every depth', async () => {
  await put('reports/frozen.json', 'Excluded from CURRENT closure; separate history check required.\n');
  assert.equal((await checkSources(root)).status, 'PASS');
  await put('research/example/reports/case.json', '{}\n');
  await assert.rejects(checkSources(root), /SOURCE_CLOSURE_MISMATCH/);
});

test('only three declared PNG paths use binary admission', async () => {
  const path = 'research/agent-action-browser-verify-v0/evidence/browser/desktop-positive.png';
  await put(path, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
  await writeSources(root);
  assert.equal((await checkSources(root)).status, 'PASS');
  await put(path, 'wrong signature\n');
  await assert.rejects(writeSources(root), /BINARY_SIGNATURE_MISMATCH/);
  await unlink(join(root, path));
  await put('research/example/arbitrary.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await assert.rejects(writeSources(root), /LF_OR_BOM_VIOLATION/);
});

test('LF, BOM and UTF-8 checks run before the writer can reseal bad text', async () => {
  const before = await readFile(join(root, 'source-lock.json'));
  for (const bytes of [Buffer.from('CRLF\r\n'), Buffer.from([239, 187, 191, 65, 10]), Buffer.from([255, 10])]) {
    await put('README.md', bytes);
    await assert.rejects(writeSources(root), /LF_OR_BOM_VIOLATION|INVALID_SOURCE_UTF8/);
    assert.deepEqual(await readFile(join(root, 'source-lock.json')), before);
  }
});

test('non-excluded symlink fails closed', async context => {
  try { await symlink(join(root, 'README.md'), join(root, 'linked.md')); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { context.skip('symlink creation unavailable'); return; }
    throw error;
  }
  await assert.rejects(checkSources(root), /SYMLINK_NOT_IN_LOCK_CONTRACT/);
});

test('both original v1 snapshots are pinned independently of a current reseal', async () => {
  for (const path of frozen) {
    const original = await readFile(join(root, path));
    await put(path, Buffer.concat([original, Buffer.from('\n')]));
    await assert.rejects(checkSources(root), /HISTORICAL_INVENTORY_SNAPSHOT_CHANGED/);
    await assert.rejects(writeSources(root), /HISTORICAL_INVENTORY_SNAPSHOT_CHANGED/);
    await put(path, original);
  }
});

test('installed dependencies and cache exclusions are explicit', async () => {
  for (const path of ['node_modules/package/compiled.bin', '.cache/generated.bin', 'research/example/node_modules/dependency.bin']) await put(path, Buffer.from([255, 13]));
  assert.equal((await checkSources(root)).status, 'PASS');
  const paths = (await inventory(root)).map(row => row.path);
  assert.ok(!paths.some(path => /node_modules|\.cache/.test(path)));
});

test('history policy preserves reports and cannot add metadata exceptions through data', async () => {
  const python = process.env.PYTHON_EXECUTABLE ?? (process.platform === 'win32' ? 'python' : 'python3');
  const script = `
import hashlib, importlib.util, json, pathlib, sys
host=pathlib.Path(sys.argv[1]); scratch=pathlib.Path(sys.argv[2])
spec=importlib.util.spec_from_file_location('preservation',host/'research/agent-action-browser-verify-v0/tools/check-preservation.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
assert set(m.VERSIONED_METADATA)=={'source-lock.json','tools/check-sources.mjs'}
assert len(m.read_baseline((host/'research/agent-action-browser-verify-v0/evidence/baseline-file-inventory.json').read_bytes()))==2156
try: m.read_baseline(b'{}')
except ValueError as e: assert 'HISTORICAL_BASELINE_INVENTORY_CHANGED' in str(e)
else: raise AssertionError('modified baseline accepted')
baseline={path:row[1] for path,row in m.VERSIONED_METADATA.items()}
report=scratch/'reports/frozen.json'; original=report.read_bytes()
baseline['reports/frozen.json']=hashlib.sha256(original).hexdigest()
(scratch/'tools').mkdir(exist_ok=True)
(scratch/'tools/check-sources.mjs').write_text('new versioned checker\\n',encoding='utf-8',newline='\\n')
counts={}
assert m.verify_history(scratch,baseline,counts)==[]
assert counts['historical_files_unchanged']==1
report.write_bytes(b'changed historical report\\n')
assert m.verify_history(scratch,baseline,counts)==['HISTORICAL_FILE_CHANGED:reports/frozen.json']
assert counts['historical_files_unchanged']==0
report.write_bytes(original)
for path,(snapshot,frozen) in m.VERSIONED_METADATA.items():
 p=scratch/snapshot; old=p.read_bytes(); p.write_bytes(old+b'\\n')
 assert 'HISTORICAL_METADATA_SNAPSHOT_CHANGED:'+path in m.verify_history(scratch,baseline)
 p.write_bytes(old)
 p=scratch/path; old=p.read_bytes(); p.unlink()
 assert 'CURRENT_METADATA_NOT_REGULAR:'+path in m.verify_history(scratch,baseline)
 p.write_bytes(old)
 changed=dict(baseline); changed[path]='0'*64
 assert 'HISTORICAL_METADATA_BASELINE_CHANGED:'+path in m.verify_history(scratch,changed)
 changed=dict(baseline); del changed[path]
 assert 'HISTORICAL_METADATA_BASELINE_MISSING:'+path in m.verify_history(scratch,changed)
assert m.verify_history(scratch,baseline)==[]
print(json.dumps({'status':'PASS','baseline_entries':2156,'metadata_exceptions':2,'report_tamper_rejected':True,'both_snapshot_and_metadata_controls':True}))
`;
  const result = spawnSync(python, ['-B', '-c', script, host, root], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'PASS');
});

test('identical historical bytes behind a redirected reports parent are rejected', async context => {
  const outside = await mkdtemp(join(tmpdir(), 'receiptos-report-parent-'));
  try {
    await put('tools/check-sources.mjs', 'new versioned checker\n');
    await writeSources(root);
    await writeFile(join(outside, 'frozen.json'), '{"historical":true}\n');
    await rm(join(root, 'reports'), { recursive: true });
    try { await symlink(outside, join(root, 'reports'), process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { context.skip('directory link creation unavailable'); return; }
      throw error;
    }
    const python = process.env.PYTHON_EXECUTABLE ?? (process.platform === 'win32' ? 'python' : 'python3');
    const script = `
import hashlib, importlib.util, pathlib, sys
host=pathlib.Path(sys.argv[1]); scratch=pathlib.Path(sys.argv[2])
spec=importlib.util.spec_from_file_location('preservation',host/'research/agent-action-browser-verify-v0/tools/check-preservation.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
baseline={path:row[1] for path,row in m.VERSIONED_METADATA.items()}
baseline['reports/frozen.json']=hashlib.sha256((scratch/'reports/frozen.json').read_bytes()).hexdigest()
assert not m.regular_inside(scratch,'reports/frozen.json')
assert m.verify_history(scratch,baseline)==['HISTORICAL_FILE_CHANGED:reports/frozen.json']
print('PARENT_LINK_REJECTED')
`;
    const result = spawnSync(python, ['-B', '-c', script, host, root], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout.trim(), 'PARENT_LINK_REJECTED');
    // Current source closure deliberately excludes root reports; history is the
    // load-bearing independent check for this redirect.
    assert.equal((await checkSources(root)).status, 'PASS');
  } finally {
    await rm(join(root, 'reports'), { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
