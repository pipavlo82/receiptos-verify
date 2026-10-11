import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { buildQevEvidence, evaluateQev } from '../src/adapters/qev.mjs';

test('QEV selected files and nested original Semantic ABI identities remain exact', async () => {
  const sources = JSON.parse(await readFile(new URL('../provenance/qev-sources.json', import.meta.url), 'utf8'));
  for (const file of sources.sources[0].files) {
    const bytes = await readFile(new URL(`../${file.vendoredPath}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), file.gitBlobSha1);
    if (file.originalSource) assert.equal(file.originalSource.independentlyGitBlobVerified, true);
  }
});

test('fresh synthetic counts recompute, while provider authentication remains unestablished', async () => {
  const evidence = await buildQevEvidence();
  assert.equal(evidence.package.raw.data, '00\n11\n01\n10\n');
  const result = await evaluateQev(evidence);
  assert.equal(result.status, 'UNVERIFIABLE');
  assert.ok(result.reasonCodes.includes('PROVIDER_AUTHENTICATION_NOT_ESTABLISHED'));
  assert.equal(result.nativeResult.provider_authenticity, 'NOT_ESTABLISHED');
  assert.equal(result.nativeResult.integrity, 'SATISFIED');
  assert.equal(result.nativeResult.request_binding, 'SATISFIED');
  assert.equal(result.nativeResult.deterministic_verification, 'SATISFIED');
  assert.equal(result.nativeResult.claim_support, 'ESTABLISHED_OVER_SUPPLIED_BYTES');
  assert.deepEqual(result.nativeResult.recomputed, { counts: { '00': 1, '01': 1, '10': 1, '11': 1 }, result: { shots: 4, weighted_sum: 6, parity_ones: 2 } });
  assert.equal(result.nativeResult.native_link.status, 'EXECUTED');
  assert.equal(result.execution.exitCode, 0);
});

test('a supplied QPU label cannot authenticate execution', async () => {
  const result = await evaluateQev(await buildQevEvidence({ claimed_execution: 'QPU' }));
  assert.equal(result.nativeResult.supplied_claims.execution, 'QPU');
  assert.equal(result.nativeResult.physical.AUTHENTIC_QPU_EXECUTION, 'NOT_ESTABLISHED');
  assert.equal(result.status, 'UNVERIFIABLE');
});

test('repinned wrong counts are refuted by native postprocessing', async () => {
  const result = await evaluateQev(await buildQevEvidence({ counts: { '00': 4 } }));
  assert.equal(result.nativeResult.integrity, 'SATISFIED');
  assert.equal(result.nativeResult.deterministic_verification, 'REFUTED');
  assert.ok(result.nativeResult.reasons.includes('COUNTS_MISMATCH'));
  assert.equal(result.status, 'CONTRADICTED');
});

test('independently selected request mismatch remains a native binding refutation', async () => {
  const evidence = await buildQevEvidence(); evidence.request.job = 'another-job';
  const result = await evaluateQev(evidence);
  assert.equal(result.nativeResult.request_binding, 'REFUTED');
  assert.equal(result.status, 'CONTRADICTED');
});

test('missing raw observations cannot establish finite postprocessing', async () => {
  const result = await evaluateQev(await buildQevEvidence({ raw_missing: true }));
  assert.equal(result.nativeResult.deterministic_verification, 'CANNOT_ESTABLISH');
  assert.ok(result.nativeResult.reasons.includes('RAW_MISSING'));
  assert.equal(result.status, 'UNVERIFIABLE');
});

test('unsupported physical elevation and malformed native inputs remain separate', async () => {
  const unsupported = await evaluateQev(await buildQevEvidence({ desired_claim: 'AUTHENTIC_QPU_EXECUTION' }));
  assert.equal(unsupported.nativeResult.input_status, 'UNSUPPORTED');
  assert.equal(unsupported.status, 'UNSUPPORTED');
  const malformed = await buildQevEvidence(); malformed.request.width = true;
  const result = await evaluateQev(malformed);
  assert.equal(result.nativeResult.input_status, 'INVALID');
  assert.equal(result.status, 'REJECTED_MALFORMED');
});
