import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceCost } from '../src/analytics/cost.mjs';
import { inspectEvidence } from '../src/core/evidence.mjs';
import { digest, sha256 } from '../src/core/common.mjs';

function inspectedSizes(sizes) {
  const payload = {};
  return inspectEvidence({
    statement: {
      evidence_manifest: sizes.map((size, index) => ({ id: `member-${index}`, role: 'observation', digest: '0'.repeat(64), size })),
      payload_digest: digest(payload),
    },
    evidence: sizes.map((_, index) => ({ id: `member-${index}`, bytes_base64: null })),
    payload,
  });
}

test('sum at the safe integer boundary retains numeric compatibility', () => {
  const result = evidenceCost(inspectedSizes([Number.MAX_SAFE_INTEGER - 1, 1]));
  assert.equal(result.committed_bytes, Number.MAX_SAFE_INTEGER);
  assert.equal(result.available_bytes, 0);
  assert.deepEqual(result.byte_count_encoding, { committed_bytes: 'SAFE_INTEGER', available_bytes: 'SAFE_INTEGER' });
  assert.equal(result.establishes_security_guarantee, false);
});

test('individually admitted safe sizes overflow into exact JSON-safe decimal strings', () => {
  for (const [extra, expected] of [[1, '9007199254740992'], [2, '9007199254740993']]) {
    const inspected = inspectedSizes([Number.MAX_SAFE_INTEGER, extra]);
    assert.deepEqual(inspected.missing, ['member-0', 'member-1']);
    const result = evidenceCost(inspected);
    assert.equal(result.committed_bytes, expected);
    assert.equal(result.byte_count_encoding.committed_bytes, 'DECIMAL_STRING');
    assert.equal(result.available_bytes, 0);
    assert.equal(JSON.parse(JSON.stringify(result)).committed_bytes, expected);
    assert.equal(result.establishes_security_guarantee, false);
  }
});

test('available-byte totals use the same exact representation without allocating enormous buffers', () => {
  const result = evidenceCost({ manifest: [], entries: [{ bytes: { length: Number.MAX_SAFE_INTEGER } }, { bytes: { length: 2 } }] });
  assert.equal(result.available_bytes, '9007199254740993');
  assert.equal(result.byte_count_encoding.available_bytes, 'DECIMAL_STRING');
  assert.equal(JSON.parse(JSON.stringify(result)).available_bytes, '9007199254740993');
});

test('ordinary incomplete inventory separates committed and available bytes from process success', () => {
  const bytes = Buffer.from('abc');
  const payload = {};
  const inspected = inspectEvidence({
    statement: {
      evidence_manifest: [
        { id: 'present', role: 'observation', digest: sha256(bytes), size: 3 },
        { id: 'unavailable', role: 'observation', digest: '0'.repeat(64), size: 5 },
        { id: 'absent', role: 'observation', digest: '0'.repeat(64), size: 7 },
      ], payload_digest: digest(payload),
    },
    evidence: [{ id: 'present', bytes_base64: bytes.toString('base64') }, { id: 'unavailable', bytes_base64: null }],
    payload,
  });
  const result = evidenceCost(inspected, [{ status: 'COMPLETED', exitCode: 0 }, { status: 'COMPLETED', exitCode: 7 }, { status: 'CRASH' }, null]);
  assert.deepEqual(inspected.missing, ['unavailable', 'absent']);
  assert.equal(result.committed_bytes, 15);
  assert.equal(result.available_bytes, 3);
  assert.equal(result.committed_members, 3);
  assert.equal(result.native_processes_completed, 2);
  assert.equal(result.establishes_security_guarantee, false);
});

test('empty analytics inventory stays zero and establishes no security guarantee', () => {
  const result = evidenceCost({ manifest: [], entries: [] });
  assert.equal(result.committed_bytes, 0);
  assert.equal(result.available_bytes, 0);
  assert.equal(result.committed_members, 0);
  assert.equal(result.native_processes_completed, 0);
  assert.equal(result.establishes_security_guarantee, false);
});
