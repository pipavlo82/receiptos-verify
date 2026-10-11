import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { descriptor as crystalDescriptor, buildCrystalEvidence, verifyIntegrity } from '../src/adapters/crystal.mjs';
import { descriptor as rvrDescriptor, buildRvrEvidence, recompute } from '../src/adapters/rvr.mjs';
import { parsedExecution } from '../src/adapters/native/process.mjs';
import { validateSourceManifest } from '../src/adapters/native/pins.mjs';

const sha = (data) => createHash('sha256').update(data).digest('hex');
const artifact = Buffer.from('synthetic native RVR artifact\n');
const encoded = artifact.toString('base64');
const expected = sha(artifact);
const wrong = '0'.repeat(64);

test('vendored source bytes match independently recorded pinned Git blob and SHA-256 identities', async () => {
  const record = JSON.parse(await readFile(new URL('../provenance/native-sources.json', import.meta.url), 'utf8'));
  assert.equal(record.sources.length, 2);
  for (const source of record.sources) {
    assert.equal(source.license, 'Apache-2.0');
    for (const file of source.files) {
      const bytes = await readFile(new URL(`../${file.vendoredPath}`, import.meta.url));
      assert.equal(sha(bytes), file.sha256, file.sourcePath);
      assert.equal(createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'), file.gitBlobSha1, file.sourcePath);
    }
  }
});

test('Crystal invokes exact native root functions and captures real process output', async () => {
  const evidence = await buildCrystalEvidence({ task: { title: 'Synthetic-only evidence' } });
  const result = await verifyIntegrity(evidence);
  assert.equal(result.status, 'VERIFIED');
  assert.deepEqual(result.nativeResult, { ok: true, receipt_root: evidence.anchor.receipt_root, recomputed_root: evidence.anchor.receipt_root });
  assert.equal(result.provenance.sourceCommit, crystalDescriptor.sourceCommit);
  assert.equal(result.execution.exitCode, 0);
  assert.equal(result.execution.stdoutSha256, sha(result.execution.stdout));
  assert.equal(result.execution.stderrSha256, sha(result.execution.stderr));
  assert.match(result.provenance.runtime, /^Bun /);
});

test('Crystal covered-byte tamper fails while excluded anchor changes remain native-valid', async () => {
  const evidence = await buildCrystalEvidence();
  const changed = structuredClone(evidence); changed.task.title = 'changed';
  assert.equal((await verifyIntegrity(changed)).status, 'REJECTED_MALFORMED');
  const anchorOnly = structuredClone(evidence); anchorOnly.anchor.tx_hash = 'unverified-decorative-value';
  const result = await verifyIntegrity(anchorOnly);
  assert.equal(result.nativeResult.ok, true);
  assert.match(result.limitations.join(' '), /excludes the entire top-level anchor/);
});

test('Crystal missing root is insufficient, not a fabricated native positive', async () => {
  const evidence = await buildCrystalEvidence(); delete evidence.anchor.receipt_root;
  const result = await verifyIntegrity(evidence);
  assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
  assert.deepEqual(result.nativeResult, { ok: false, receipt_root: null, recomputed_root: null });
});

test('RVR native make_bundle and recompute preserve VERIFIED and REPRODUCED', async () => {
  const input = await buildRvrEvidence(encoded, expected);
  assert.equal(input.originalBundle.claim.schema, 'rvr.claim.sha256-equals.v0');
  assert.equal(input.originalBundle.receipt.verificationProfileDigest, '51f79442e96339ca45e9e6cc0c8232833efbee20e7480df00987dbc97da72948');
  const result = await recompute(input);
  assert.equal(result.status, 'VERIFIED');
  assert.equal(result.nativeResult.verificationOutcome, 'VERIFIED');
  assert.equal(result.nativeResult.recomputationStatus, 'REPRODUCED');
  assert.equal(result.observedArtifactDigest, expected);
  assert.equal(result.semanticOutcome, 'VERIFIED');
  assert.equal(result.provenance.sourceCommit, rvrDescriptor.sourceCommit);
  assert.equal(result.execution.exitCode, 0);
  assert.equal(result.execution.stdoutSha256, sha(result.execution.stdout));
  assert.match(result.provenance.runtime, /^Python /);
});

test('RVR successfully reproduced negative remains REFUTED and product-negative', async () => {
  const result = await recompute(await buildRvrEvidence(encoded, wrong));
  assert.equal(result.nativeResult.verificationOutcome, 'REFUTED');
  assert.equal(result.nativeResult.recomputationStatus, 'REPRODUCED');
  assert.equal(result.status, 'CONTRADICTED');
  assert.equal(result.observedArtifactDigest, expected);
});

test('RVR native DIVERGED control refutes a self-consistent saved positive', async () => {
  const input = await buildRvrEvidence(encoded, wrong, { savedOutcome: 'VERIFIED' });
  assert.equal(input.originalBundle.receipt.outcome, 'VERIFIED');
  const result = await recompute(input);
  assert.equal(result.nativeResult.verificationOutcome, 'REFUTED');
  assert.equal(result.nativeResult.recomputationStatus, 'DIVERGED');
  assert.equal(result.status, 'CONTRADICTED');
  assert.equal(result.nativeCanonicalResult.outcome, 'REFUTED');
  assert.equal(result.savedCanonicalResult.outcome, 'VERIFIED');
});

test('RVR declared UNAVAILABLE can REPRODUCE UNVERIFIABLE without semantic success', async () => {
  const result = await recompute(await buildRvrEvidence(encoded, expected, { unavailable: true }));
  assert.equal(result.nativeResult.verificationOutcome, 'UNVERIFIABLE');
  assert.equal(result.nativeResult.recomputationStatus, 'REPRODUCED');
  assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.observedArtifactDigest, null);
});

test('RVR committed PRESENT payload unavailable is a native replay barrier', async () => {
  const input = await buildRvrEvidence(encoded, expected); delete input.candidateCase.payloadsBase64.artifact;
  const result = await recompute(input);
  assert.equal(result.status, 'CANNOT_RECOMPUTE');
  assert.equal(result.nativeResult.recomputationStatus, 'CANNOT_RECOMPUTE');
  assert.equal(result.nativeResult.evaluationPerformed, false);
  assert.equal(result.semanticOutcome, null);
});

test('RVR malformed evidence and producer-chosen profile cannot execute different semantics', async () => {
  const input = await buildRvrEvidence(encoded, expected);
  input.candidateCase.payloadsBase64.artifact = Buffer.from('tampered').toString('base64');
  const malformed = await recompute(input);
  assert.equal(malformed.status, 'REJECTED_MALFORMED');
  assert.equal(malformed.nativeResult.type, 'GateRejection');
  const different = await buildRvrEvidence(encoded, expected);
  different.originalBundle.verificationProfile.verificationSpecification.path = '../../outside';
  const result = await recompute(different);
  assert.equal(result.status, 'REJECTED_MALFORMED');
  assert.equal(result.nativeResult.reasonCode, 'rvr.gate.identity_mismatch');
  assert.equal(result.execution.exitCode, 0);
});

test('nonzero process code cannot supply semantic output even with valid positive JSON', () => {
  assert.equal(parsedExecution({ status: 'COMPLETED', exitCode: 1, stdout: '{"ok":true,"value":{"verificationOutcome":"VERIFIED"}}' }), null);
});

test('native source inventories cannot be empty, incomplete, duplicated or repinned', async () => {
  const source = JSON.parse(await readFile(new URL('../provenance/native-sources.json', import.meta.url), 'utf8')).sources.find((s) => s.adapter === 'rvr');
  assert.equal(validateSourceManifest('rvr', source), source);
  for (const mutation of [
    (s) => { s.files = []; },
    (s) => { s.files.pop(); },
    (s) => { s.files[1] = structuredClone(s.files[0]); },
    (s) => { s.files[0].sha256 = '0'.repeat(64); },
    (s) => { s.sourceCommit = '1'.repeat(40); },
  ]) {
    const changed = structuredClone(source); mutation(changed);
    assert.throws(() => validateSourceManifest('rvr', changed), /Native source/);
  }
});

test('native process imports create no Python bytecode in the vendor tree', async () => {
  await recompute(await buildRvrEvidence(encoded, expected));
  const names = await readdir(new URL('../vendor/rvr/conformance/rvr-v0/', import.meta.url));
  assert.equal(names.includes('__pycache__'), false);
});
