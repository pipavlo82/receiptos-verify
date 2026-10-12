import test from 'node:test';
import assert from 'node:assert/strict';
import { trustlessV2 } from '../tools/fixtures-v2.mjs';
import { verifyV2 } from '../src/core/verify-v2.mjs';

test('v0.2 locally rerun native scanner preserves the positive evidence-grade control', async () => {
  const pair = await trustlessV2();
  const report = await verifyV2(pair.request, pair.bundle);
  assert.equal(report.layers.RECOMPUTATION.evidenceGrade, 'REPRODUCED');
  assert.equal(report.layers.RECOMPUTATION.nativeResult.verdict, 'PASS');
  assert.equal(report.layers.RECOMPUTATION.nativeResult.semanticVerdict, 'NO_FINDING');
  assert.equal(report.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(report.layers.EVIDENCE_SUFFICIENCY.status, 'SUFFICIENT');
  assert.equal(report.overall, 'VERIFIED');
});

test('v0.2 wrapper replay cannot upgrade an authenticated opaque scanner assertion to local scan recomputation', async () => {
  const pair = await trustlessV2({ opaque: true });
  const report = await verifyV2(pair.request, pair.bundle);
  assert.equal(pair.request.policy.minimum_grade, 'LOCAL_RECOMPUTATION');
  assert.equal(report.layers.INTEGRITY.status, 'VERIFIED');
  assert.equal(report.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(report.layers.SUBJECT_BINDING.status, 'VERIFIED');
  assert.equal(report.layers.SEMANTIC_COMPATIBILITY.status, 'COMPATIBLE');
  assert.equal(report.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(report.layers.RECOMPUTATION.nativeResult.verdict, 'PASS');
  assert.equal(report.layers.RECOMPUTATION.nativeResult.semanticVerdict, 'NO_FINDING');
  assert.equal(report.layers.RECOMPUTATION.evidenceGrade, 'AUTHENTICATED_REPORT');
  assert.equal(report.layers.EVIDENCE_SUFFICIENCY.status, 'INSUFFICIENT');
  assert.equal(report.overall, 'INSUFFICIENT_EVIDENCE');
  assert.ok(report.reason_codes.includes('EVIDENCE_GRADE_NOT_ESTABLISHED'));
  assert.ok(report.reason_codes.includes('TRUSTLESS_SCANNER_EXECUTION_NOT_ESTABLISHED'));
});
