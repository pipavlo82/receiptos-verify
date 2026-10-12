import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateKey, sign, createHash } from 'node:crypto';
import { evaluateTrustless, projectTrustlessExecution, descriptor } from '../src/adapters/trustless.mjs';
import { buildTrustlessEvidence, trustlessClaimBinding } from './helpers/trustless-v02-fixture.mjs';

const positive = await buildTrustlessEvidence();
const negative = await buildTrustlessEvidence({ negative: true });
const canon = (value) => value && typeof value === 'object' ? Array.isArray(value) ? `[${value.map(canon).join(',')}]`
  : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canon(value[key])}`).join(',')}}` : JSON.stringify(value);
function resign(fixture) {
  const seed = Buffer.from('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60', 'hex');
  const key = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), type: 'pkcs8', format: 'der' });
  fixture.input.manifest.sig = sign(null, Buffer.from(`scan-subject-binding-v0\n${canon(fixture.input.manifest.body)}`), key).toString('hex');
}

test('Trustless current-main source pin and scope are explicit', () => {
  assert.equal(descriptor.maturity, 'EXPERIMENTAL');
  assert.equal(descriptor.sourceMaturity, 'STABLE');
  assert.equal(descriptor.sourceState, 'PUBLIC_MAIN');
  assert.equal(descriptor.sourceCommit, '1a37bcaf91918fd8a98f164d97d0fddbc28c6755');
  assert.equal(descriptor.nativeProfileId, 'scan_subject_binding.v0');
});
test('Trustless actual native positive preserves suite PASS, native NO_FINDING, and replay separately', async () => {
  const value = await evaluateTrustless(positive);
  assert.equal(value.status, 'REPRODUCED');
  assert.equal(value.semanticOutcome, 'VERIFIED');
  assert.equal(value.recomputationStatus, 'REPRODUCED');
  assert.equal(value.nativeResult.verdict, 'PASS');
  assert.equal(value.nativeResult.semanticVerdict, 'NO_FINDING');
  assert.equal(value.nativeResult.evidenceGrade, 'REPRODUCED');
  assert.equal(value.nativeResult.contractMode, null);
  assert.equal(value.nativeResult.runnerContractInterpretation, 'MAIN_SELF_GRADING');
  assert.equal(value.execution.status, 'COMPLETED');
  assert.match(value.nativeResult.vectorCorpusIdentity, /^[0-9a-f]{64}$/);
  assert.deepEqual(value.nativeResult.savedArtifact, positive.artifact);
  assert.equal(value.nativeBinding.inputDigest, trustlessClaimBinding(positive).input_digest);
  assert.equal(value.nativeBinding.caseId, positive.case_id);
  assert.equal(value.observedArtifactDigest, trustlessClaimBinding(positive).input_digest);
});
test('Trustless genuine native PASS reproduces a semantic contradiction without upgrading it', async () => {
  const value = await evaluateTrustless(negative);
  assert.equal(value.nativeResult.verdict, 'PASS');
  assert.equal(value.nativeResult.semanticVerdict, 'CONTRADICTED');
  assert.equal(value.semanticOutcome, 'REFUTED');
  assert.equal(value.recomputationStatus, 'REPRODUCED');
  assert.ok(value.reasonCodes.includes('TRUSTLESS_NATIVE_CONTRADICTION'));
});
test('Trustless mismatch against saved result is DIVERGED, not a rewritten native semantic result', async () => {
  const input = structuredClone(negative);
  input.artifact.results[0].result = structuredClone(positive.artifact.results[0].result);
  const value = await evaluateTrustless(input);
  assert.equal(value.nativeResult.verdict, 'SUITE');
  assert.equal(value.nativeResult.semanticVerdict, 'CONTRADICTED');
  assert.equal(value.semanticOutcome, 'REFUTED');
  assert.equal(value.recomputationStatus, 'DIVERGED');
});
test('Trustless saved positive expected fields cannot serve as semantic oracle for negative bytes', async () => {
  const input = structuredClone(negative);
  input.artifact.results[0].result.subject_bound_check = 'NO_FINDING';
  const value = await evaluateTrustless(input);
  assert.equal(value.nativeResult.result.subject_bound_check, 'CONTRADICTED');
  assert.equal(value.semanticOutcome, 'REFUTED');
  assert.equal(value.recomputationStatus, 'DIVERGED');
});
test('Trustless valid signed assertion from opaque scanner is not a reproduced scanner execution', async () => {
  const input = structuredClone(positive);
  input.input.manifest.body.rag_corpus.poisoning_scan.scanner_version = 'opaque-scanner/1';
  resign(input);
  input.artifact.results[0].result.evidence_grade = 'AUTHENTICATED_REPORT';
  const value = await evaluateTrustless(input);
  assert.equal(value.nativeResult.verdict, 'PASS');
  assert.equal(value.semanticOutcome, 'VERIFIED');
  assert.equal(value.evidenceGrade, 'AUTHENTICATED_REPORT');
  assert.equal(value.recomputationStatus, 'REPRODUCED');
  assert.ok(value.reasonCodes.includes('TRUSTLESS_SCANNER_EXECUTION_NOT_ESTABLISHED'));
});
test('Trustless invalid manifest signature cannot establish a bound scan', async () => {
  const input = structuredClone(positive);
  input.input.manifest.sig = `${input.input.manifest.sig.startsWith('00') ? '01' : '00'}${input.input.manifest.sig.slice(2)}`;
  const value = await evaluateTrustless(input);
  assert.equal(value.nativeResult.semanticVerdict, 'CANNOT_ESTABLISH');
  assert.equal(value.evidenceGrade, null);
  assert.equal(value.semanticOutcome, 'REFUTED');
  assert.ok(value.nativeResult.replayFailures.includes('signature'));
});
test('Trustless missing scan subject does not inherit an evidence grade', async () => {
  const input = structuredClone(positive);
  delete input.input.manifest.body.rag_corpus.poisoning_scan.subject_digest;
  resign(input);
  const value = await evaluateTrustless(input);
  assert.equal(value.nativeResult.semanticVerdict, 'CANNOT_ESTABLISH');
  assert.equal(value.evidenceGrade, null);
  assert.equal(value.semanticOutcome, 'UNVERIFIABLE');
});
test('Trustless native rejected-binding control can reproduce without establishing a positive scan', async () => {
  const input = structuredClone(positive);
  input.input.manifest.sig = `${input.input.manifest.sig.startsWith('00') ? '01' : '00'}${input.input.manifest.sig.slice(2)}`;
  input.artifact.results[0].result = { replay_bindings: 'FAIL', result_only_check: 'VALID', subject_bound_check: 'CANNOT_ESTABLISH', evidence_grade: null, replay_failures: ['signature'] };
  const value = await evaluateTrustless(input);
  assert.equal(value.nativeResult.verdict, 'PASS');
  assert.equal(value.semanticOutcome, 'REFUTED');
  assert.equal(value.recomputationStatus, 'REPRODUCED');
});
test('Trustless empty corpus cannot reach native conformance success', async () => {
  const input = structuredClone(positive); input.input.corpus = [];
  const value = await evaluateTrustless(input);
  assert.equal(value.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(value.semanticOutcome, 'UNVERIFIABLE');
  assert.equal(value.nativeResult, null);
});
test('Trustless empty or duplicate saved artifacts are rejected', async () => {
  const empty = structuredClone(positive); empty.artifact.results = []; empty.artifact.total = 0; empty.artifact.reproduced = 0;
  assert.equal((await evaluateTrustless(empty)).status, 'REJECTED_MALFORMED');
  const duplicate = structuredClone(positive); duplicate.artifact.results.push(structuredClone(duplicate.artifact.results[0])); duplicate.artifact.total = 2; duplicate.artifact.reproduced = 2;
  assert.equal((await evaluateTrustless(duplicate)).status, 'REJECTED_MALFORMED');
});
test('Trustless unknown profile and open PR source pins are explicitly unsupported', async () => {
  const unknown = structuredClone(positive); unknown.profile = 'arbitrary-profile';
  assert.equal((await evaluateTrustless(unknown)).status, 'UNSUPPORTED');
  const pr = structuredClone(positive); pr.source_pin = '197c6d26e68f85a117dd12a94924a7f959edaef4';
  assert.equal((await evaluateTrustless(pr)).status, 'UNSUPPORTED');
});
test('Trustless parser fault is unavailable rather than refutation or success', async () => {
  const input = structuredClone(positive); input.input.decision.query = null;
  const value = await evaluateTrustless(input);
  assert.equal(value.status, 'CANNOT_RECOMPUTE');
  assert.equal(value.semanticOutcome, 'UNVERIFIABLE');
  assert.equal(value.recomputationStatus, 'CANNOT_RECOMPUTE');
});
test('Trustless crash, exit 0 alone, missing output, and DRIFT do not become semantic success', () => {
  for (const execution of [{ status: 'CRASH', exitCode: 1 }, { status: 'COMPLETED', exitCode: 0 }, { status: 'UNAVAILABLE', exitCode: null }]) {
    const value = projectTrustlessExecution(execution, null, {});
    assert.equal(value.semanticOutcome, 'UNVERIFIABLE');
    assert.equal(value.recomputationStatus, 'CANNOT_RECOMPUTE');
  }
  const drift = projectTrustlessExecution({ status: 'COMPLETED', exitCode: 0 }, { ok: true, runner_result: { kind: 'DRIFT' } }, {});
  assert.equal(drift.semanticOutcome, 'UNVERIFIABLE');
  assert.equal(drift.status, 'CANNOT_RECOMPUTE');
});
test('Trustless package-present and runner-declared declarations are not executable evidence', async () => {
  for (const input of [{ package_present: true }, { runner_declared: true }, { exitCode: 0 }]) {
    assert.equal((await evaluateTrustless(input)).status, 'REJECTED_MALFORMED');
  }
});
test('Trustless malformed or empty successful native report cannot establish verification', async () => {
  const value = await evaluateTrustless(positive);
  const parsed = JSON.parse(value.execution.stdout);
  for (const mutate of [
    (p) => { p.native_artifact.results = []; p.native_artifact.total = 0; p.native_artifact.reproduced = 0; },
    (p) => { p.native_artifact.results[0].result.subject_bound_check = 'CONTRADICTED'; },
    (p) => { p.native_exit_code = 1; },
    (p) => { p.runner_result.verdict = true; },
    (p) => { p.computed_corpus_digest = null; },
    (p) => { p.native_result.evidence_grade = 'PRODUCTION_CONFORMANCE'; },
  ]) {
    const damaged = structuredClone(parsed); mutate(damaged);
    const result = projectTrustlessExecution(value.execution, damaged, positive.artifact.results[0].result);
    assert.equal(result.semanticOutcome, 'UNVERIFIABLE');
    assert.equal(result.status, 'CANNOT_RECOMPUTE');
  }
});
test('Trustless optional generic contradiction is preserved while native output remains unchanged', async () => {
  const compatibility = { status: 'CONTRADICTED', reasonCodes: ['SCOPE_MISMATCH'] };
  const value = await evaluateTrustless(positive, { compatibility });
  assert.deepEqual(value.semanticCompatibility, compatibility);
  assert.equal(value.nativeResult.verdict, 'PASS');
  assert.equal(value.status, 'REPRODUCED');
  assert.notEqual(value.status, 'VERIFIED');
});
test('Trustless repeated native deterministic artifacts are byte equivalent', async () => {
  const a = await evaluateTrustless(positive); const b = await evaluateTrustless(positive);
  assert.deepEqual(a.nativeResult, b.nativeResult);
  assert.deepEqual(a.nativeBinding, b.nativeBinding);
  assert.equal(a.execution.stdoutSha256, b.execution.stdoutSha256);
  assert.equal(createHash('sha256').update(canon(a.nativeResult)).digest('hex'), createHash('sha256').update(canon(b.nativeResult)).digest('hex'));
});
