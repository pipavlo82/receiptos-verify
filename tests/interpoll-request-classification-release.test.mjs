import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verifyV2 } from '../src/core/verify-v2.mjs';

const load = async id => JSON.parse(await readFile(new URL(`../vectors/v0.2/${id}.json`, import.meta.url), 'utf8'));

test('typed request for another Interpoll action reaches the signed-intent relation', async () => {
  const { request, bundle } = await load('I03');
  assert.equal(request.adapter_requirement.requested_action.kind, 'other-kind');
  const actual = await verifyV2(request, bundle);
  assert.equal(actual.layers.INPUT.status, 'ADMITTED');
  assert.equal(actual.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(actual.layers.RECOMPUTATION.nativeResult.signature, 'VALID');
  assert.equal(actual.layers.RECOMPUTATION.semanticOutcome, 'REFUTED');
  assert.equal(actual.layers.DOMAIN_ADAPTERS.status, 'CONTRADICTED');
  assert.equal(actual.overall, 'CONTRADICTED');
  assert.ok(actual.reason_codes.includes('SIGNED_INTENT_REQUEST_MISMATCH'));
});

test('typed unsupported Interpoll authority reaches the authority policy relation', async () => {
  const { request, bundle } = await load('I08');
  assert.equal(request.adapter_requirement.authority.namespace, 'unsupported');
  const actual = await verifyV2(request, bundle);
  assert.equal(actual.layers.INPUT.status, 'ADMITTED');
  assert.equal(actual.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(actual.layers.RECOMPUTATION.nativeResult.signature, 'VALID');
  assert.equal(actual.layers.RECOMPUTATION.semanticOutcome, 'UNVERIFIABLE');
  assert.equal(actual.layers.DOMAIN_ADAPTERS.status, 'UNSUPPORTED_PROFILE');
  assert.equal(actual.overall, 'UNSUPPORTED_PROFILE');
  assert.ok(actual.reason_codes.includes('ACTION_AUTHORITY_UNSUPPORTED'));
});

for (const [name, change] of [
  ['null requested action kind', r => { r.adapter_requirement.requested_action.kind = null; }],
  ['null authority namespace', r => { r.adapter_requirement.authority.namespace = null; }],
]) {
  test(`${name} remains malformed rather than an untyped semantic request`, async () => {
    const { request, bundle } = await load('I01'); change(request);
    const actual = await verifyV2(request, bundle);
    assert.equal(actual.overall, 'REJECTED_MALFORMED');
    assert.equal(actual.layers.INPUT.status, 'REJECTED_MALFORMED');
    assert.equal(actual.layers.RECOMPUTATION.status, 'NOT_RUN');
  });
}
