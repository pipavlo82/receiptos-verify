import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildQevMothEvidence, evaluateQevMoth } from '../src/adapters/qev_moth.mjs';
import { evaluateQev } from '../src/adapters/qev.mjs';
import { validateSourceManifest } from '../src/adapters/native/pins.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
let positive;
test.before(async () => { positive = await buildQevMothEvidence(); });

test('Moth sources are exact independently verified metadata/code, with no capture payload inventory', async () => {
  const manifest = JSON.parse(await readFile(new URL('../provenance/qev-moth-sources.json', import.meta.url)));
  const source = manifest.sources[0];
  validateSourceManifest('qev_moth', source);
  assert.equal(source.files.length, 50);
  assert.equal(source.capturedProviderBytesCopied, false);
  for (const file of source.files) {
    assert.equal(file.sourcePath.startsWith('fixtures/'), false);
    const bytes = await readFile(new URL(`../${file.vendoredPath}`, import.meta.url));
    assert.equal(hash(bytes), file.sha256);
    assert.equal(createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'), file.gitBlobSha1);
  }
  assert.equal(source.files.filter((f) => f.originalUpstream?.commit === '549a7e150ddc75df88dc90ee93f331fea7464567').length, 3);
  assert.equal(source.files.filter((f) => f.originalUpstream?.commit === '45b46bf7df3a60b32583291f577a36bf19d22f00').length, 12);
});

test('fresh synthetic native counts/RVR/ReceiptOS preserve requested 32 and delivered 0 without provider authority', async () => {
  const result = await evaluateQev(positive);
  assert.equal(positive.synthetic, true);
  assert.equal(result.status, 'UNVERIFIABLE');
  assert.equal(result.semanticOutcome, 'VERIFIED');
  assert.equal(result.recomputationStatus, 'REPRODUCED');
  assert.equal(result.requestedBytes, '32');
  assert.equal(result.deliveredBytes, '0');
  assert.equal(result.observation.delivery, 'EMPTY_BUDGET_LIMITED');
  assert.equal(result.observation.reportedGrade, 'hardware-insufficient-entropy');
  assert.equal(result.providerAuthentication, 'NOT_ESTABLISHED');
  assert.equal(result.nativeResult.rvr.canonicalResult.countsVerification.state, 'CONSISTENT');
  assert.equal(result.nativeResult.receiptOs.receiptOs.rootStatus, 'VERIFIED');
  assert.equal(result.nativeResult.receiptOs.receiptOs.anchor, 'NOT_CLAIMED');
  assert.match(result.receiptOsRoot, /^0x[0-9a-f]{64}$/);
  assert.equal(result.execution.exitCode, 0);
  assert.equal(JSON.parse(result.execution.stdout).value.rvr.verificationOutcome, 'VERIFIED');
  assert.equal(hash(Buffer.from(positive.portableExport.attachment.base64, 'base64')), positive.portableExport.attachment.sha256);
});

test('native counts contradiction with complete repinned evidence stays REFUTED plus REPRODUCED', async () => {
  const input = await buildQevMothEvidence({ refutedCounts: true });
  const result = await evaluateQevMoth(input);
  assert.equal(result.status, 'CONTRADICTED');
  assert.equal(result.semanticOutcome, 'REFUTED');
  assert.equal(result.recomputationStatus, 'REPRODUCED');
  assert.deepEqual(result.nativeResult.rvr.canonicalResult.issues.contradiction, ['COUNTS:COUNT_TOTAL']);
});

test('declared missing decisive member reproduces UNVERIFIABLE without fabricated arithmetic', async () => {
  const input = await buildQevMothEvidence({ missingMember: true });
  const result = await evaluateQevMoth(input);
  assert.equal(result.status, 'UNVERIFIABLE');
  assert.equal(result.semanticOutcome, 'UNVERIFIABLE');
  assert.equal(result.recomputationStatus, 'REPRODUCED');
  assert.equal(result.observation, null);
});

test('changed candidate evidence diverges from a saved native positive', async () => {
  const input = await buildQevMothEvidence({ candidateMissingMember: true });
  const result = await evaluateQevMoth(input);
  assert.equal(result.status, 'CONTRADICTED');
  assert.equal(result.semanticOutcome, 'UNVERIFIABLE');
  assert.equal(result.recomputationStatus, 'DIVERGED');
  assert.equal(result.nativeResult.receiptOs.rvr.verificationOutcome, 'VERIFIED');
});

test('independent requested claim mismatch is preserved as a native binding rejection', async () => {
  const input = structuredClone(positive);
  input.expectedClaim.captureClaim.jobId = 'different-synthetic-request';
  const result = await evaluateQevMoth(input);
  assert.equal(result.status, 'CONTRADICTED');
  assert.deepEqual(result.reasonCodes, ['INDEPENDENT_CLAIM_MISMATCH']);
  assert.equal(result.nativeResult.type, 'Rejected');
});

test('portable anchor and separately supplied native bundle cannot drift', async () => {
  const anchor = structuredClone(positive);
  anchor.portableExport.nativeReceiptOs.evidence.anchor.tx_hash = 'invented-anchor';
  const rejected = await evaluateQevMoth(anchor);
  assert.equal(rejected.status, 'REJECTED_MALFORMED');
  assert.deepEqual(rejected.reasonCodes, ['ENVELOPE_PROJECTION_OR_ANCHOR']);
  const other = await buildQevMothEvidence({ missingMember: true });
  other.portableExport = positive.portableExport;
  const binding = await evaluateQevMoth(other);
  assert.equal(binding.status, 'REJECTED_MALFORMED');
  assert.deepEqual(binding.reasonCodes, ['PORTABLE_BUNDLE_BINDING']);
});

test('committed PRESENT bytes missing are a replay barrier and synthetic wrapper is mandatory', async () => {
  const missing = structuredClone(positive);
  delete missing.bundle.payloadsBase64['request.body.json'];
  const barrier = await evaluateQevMoth(missing);
  assert.equal(barrier.status, 'CANNOT_RECOMPUTE');
  assert.match(barrier.reasonCodes[0], /^COMMITTED_PRESENT_UNAVAILABLE:/);
  const unmarked = structuredClone(positive); delete unmarked.synthetic;
  const rejected = await evaluateQevMoth(unmarked);
  assert.equal(rejected.status, 'REJECTED_MALFORMED');
  assert.deepEqual(rejected.reasonCodes, ['SYNTHETIC_WRAPPER_REQUIRED']);
});

test('own native invocations clean temporary payloads and create no bytecode in an isolated product copy', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const copies = join(root, 'work', 'test-runs');
  await mkdir(copies, { recursive: true });
  const isolated = await mkdtemp(join(copies, 'qev-cleanup-'));
  // Only this test can invoke this unique copy's fixed runner/temp directory.
  // Other suites may concurrently use the primary product's native-temp tree.
  assert.equal(dirname(isolated), copies);
  try {
    const source = JSON.parse(await readFile(join(root, 'provenance/qev-moth-sources.json'))).sources[0];
    const paths = [
      ...source.files.map((file) => file.vendoredPath),
      'provenance/qev-moth-sources.json', 'src/adapters/qev_moth.mjs',
      'src/adapters/native/process.mjs', 'src/adapters/native/pins.mjs',
      'src/adapters/native/qev-moth-bridge.py', 'src/adapters/native/qev-moth-fixture.py',
    ];
    await Promise.all(paths.map(async (path) => {
      const destination = join(isolated, path);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(join(root, path), destination);
    }));
    const native = await import(pathToFileURL(join(isolated, 'src/adapters/qev_moth.mjs')).href);
    const input = await native.buildQevMothEvidence();
    const result = await native.evaluateQevMoth(input);
    assert.equal(result.status, 'UNVERIFIABLE');
    assert.equal(result.semanticOutcome, 'VERIFIED');
    assert.equal(result.recomputationStatus, 'REPRODUCED');
    assert.ok(result.execution.argv.includes(join(isolated, 'src/adapters/native/qev-moth-bridge.py')));
    assert.deepEqual(await readdir(join(isolated, 'work/native-temp')), []);
    for (const path of ['vendor/qev_moth/qev', 'vendor/qev_moth/vendor/rvr-v0', 'src/adapters/native']) {
      assert.equal((await readdir(join(isolated, path))).includes('__pycache__'), false);
    }
  } finally {
    // Checked absolute child of this new repository's test-runs directory.
    assert.equal(dirname(isolated), copies);
    await rm(isolated, { recursive: true, force: true });
  }
});
