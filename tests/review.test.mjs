import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verify } from '../src/core/verify.mjs';
import { project } from '../src/projection/project.mjs';
import { readVector } from '../tools/corpus.mjs';
import { seal } from '../tools/fixtures.mjs';

// Independently authored attack controls. Existing public synthetic bytes are
// inputs, never outcome oracles. No product, bridge or vendor file is rewritten.
const clone = x => structuredClone(x);
const root = fileURLToPath(new URL('../', import.meta.url));
const processUrl = new URL('../src/adapters/native/process.mjs', import.meta.url).href;
const verifyUrl = new URL('../src/core/verify.mjs', import.meta.url).href;
const canonical = x => x === null || typeof x !== 'object' ? JSON.stringify(x)
  : Array.isArray(x) ? '[' + x.map(canonical).join(',') + ']'
  : '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
const sha = x => createHash('sha256').update(canonical(x)).digest('hex');

let nativeFixturePromise;
async function nativeFixture() {
  if (!nativeFixturePromise) nativeFixturePromise = (async () => {
    const pair = await readVector('V01');
    const report = await verify(pair.request, pair.bundle);
    assert.equal(report.overall, 'VERIFIED', 'real native paired positive must work');
    const native = report.layers.RECOMPUTATION;
    return { pair, output: { ok: true, value: clone(native.nativeResult), canonicalResult: clone(native.nativeCanonicalResult), profileDigest: native.provenance.verificationProfileDigest, runtime: 'synthetic review process output' } };
  })();
  return clone(await nativeFixturePromise);
}

function withNativeOutput(pair, output, exitCode = 0) {
  const execution = { status: 'COMPLETED', exitCode, signal: null, stdout: typeof output === 'string' ? output : JSON.stringify(output), stderr: '', truncated: false };
  // A separate process receives an ephemeral module loader, replacing only the
  // RVR process return value. Crystal and all host/projection code stay actual.
  const mockSource = `import {runNative as actual,parsedExecution} from ${JSON.stringify(processUrl + '?review-original')};
export {parsedExecution};
export async function runNative(name,input){return name==='rvr'?${JSON.stringify(execution)}:actual(name,input);}`;
  const loader = `export async function load(url,context,nextLoad){if(url===${JSON.stringify(processUrl)})return {format:'module',source:${JSON.stringify(mockSource)},shortCircuit:true};return nextLoad(url,context);}`;
  const child = `import {register} from 'node:module';import {readFileSync} from 'node:fs';
register(${JSON.stringify('data:text/javascript;base64,' + Buffer.from(loader).toString('base64'))},import.meta.url);
const {verify}=await import(${JSON.stringify(verifyUrl)});const p=JSON.parse(readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(await verify(p.request,p.bundle)));`;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', child], { cwd: root, input: JSON.stringify(pair), encoding: 'utf8', timeout: 15000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  assert.equal(run.status, 0, 'host process must produce a structured report: ' + (run.stderr ?? '').slice(-2000));
  return JSON.parse(run.stdout);
}

for (const malformed of [{}, 42, false]) test(`malformed non-array required_layers ${JSON.stringify(malformed)} returns structured rejection`, async () => {
  const p = await readVector('V01'); p.request.policy.required_layers = malformed;
  const r = await verify(p.request, p.bundle);
  assert.equal(r.overall, 'REJECTED_MALFORMED');
  assert.equal(r.layers.INPUT.status, 'REJECTED_MALFORMED');
});

test('unknown caller-required obligation is rejected rather than silently omitted', async () => {
  const p = await readVector('V01'); p.request.policy.required_layers = ['PRODUCER_CHOSEN_SUCCESS'];
  const r = await verify(p.request, p.bundle); assert.equal(r.overall, 'REJECTED_MALFORMED');
});

for (const id of ['artifact', 'native-result']) test(`committed unavailable ${id} prevents native execution`, async () => {
  const p = await readVector('V01'); p.bundle.evidence.find(e => e.id === id).bytes_base64 = null;
  const r = await verify(p.request, p.bundle);
  assert.equal(r.overall, 'CANNOT_RECOMPUTE');
  assert.equal(r.layers.RECOMPUTATION.status, 'CANNOT_RECOMPUTE');
  assert.equal(r.layers.RECOMPUTATION.execution.status, 'NOT_RUN');
  assert.equal(r.layers.SEMANTIC_COMPATIBILITY.status, 'UNVERIFIABLE');
  assert.ok(r.reason_codes.includes('COMMITTED_EVIDENCE_UNAVAILABLE'));
});

test('absent caller trust precedes a separate committed-byte replay barrier', async () => {
  const p = await readVector('V01'); p.request.policy.trusted_keys = [];
  p.bundle.evidence.find(e => e.id === 'artifact').bytes_base64 = null; seal(p);
  const r = await verify(p.request, p.bundle);
  assert.equal(r.layers.AUTHENTICITY.status, 'NOT_ESTABLISHED');
  assert.equal(r.layers.RECOMPUTATION.status, 'CANNOT_RECOMPUTE');
  assert.equal(r.overall, 'INSUFFICIENT_EVIDENCE');
});

test('unaccepted detached guarantee basis precedes a separate committed-byte replay barrier', async () => {
  const p = await readVector('V12'); p.request.guarantee_context.basis_accepted = false;
  p.bundle.evidence.find(e => e.id === 'artifact').bytes_base64 = null;
  const r = await verify(p.request, p.bundle);
  assert.equal(r.layers.GUARANTEE_PRESERVATION.status, 'UNVERIFIABLE');
  assert.ok(r.layers.GUARANTEE_PRESERVATION.reasonCodes.includes('DEPENDENCY_BASIS_NOT_SEPARATELY_ACCEPTED'));
  assert.equal(r.layers.RECOMPUTATION.status, 'CANNOT_RECOMPUTE');
  assert.equal(r.overall, 'INSUFFICIENT_EVIDENCE');
});

for (const [layer, reason] of [['EVIDENCE_SUFFICIENCY', 'EVIDENCE_GRADE_NOT_ESTABLISHED'], ['GUARANTEE_PRESERVATION', 'DEPENDENCY_BASIS_NOT_SEPARATELY_ACCEPTED']]) test(`independent ${reason} premise precedes a runtime barrier`, () => {
  const layers = { AUTHENTICITY: { status: 'VERIFIED', reasonCodes: [] }, RECOMPUTATION: { status: 'CANNOT_RECOMPUTE', reasonCodes: ['CHECKER_UNAVAILABLE'] }, [layer]: { status: layer === 'EVIDENCE_SUFFICIENCY' ? 'INSUFFICIENT' : 'UNVERIFIABLE', reasonCodes: [reason] } };
  assert.equal(project(layers, ['AUTHENTICITY', 'RECOMPUTATION', layer]).status, 'INSUFFICIENT_EVIDENCE');
});

test('native-output injection has a complete paired positive control', async () => {
  const {pair, output} = await nativeFixture();
  assert.equal(withNativeOutput(pair, output).overall, 'VERIFIED');
});

for (const [name, edit] of [
  ['missing fresh canonical result', output => { delete output.canonicalResult; }],
  ['unbound canonical result digest', output => { output.value.canonicalResultDigest = '0'.repeat(64); }],
  ['false evaluation-performed flag', output => { output.value.evaluationPerformed = false; }],
  ['wrong native profile identity', output => { output.profileDigest = '0'.repeat(64); }],
  ['inconsistent native semantic result', output => { output.canonicalResult.outcome = 'REFUTED'; output.canonicalResult.reasonCode = 'rvr.v0.digest_mismatch'; output.value.canonicalResultDigest = sha(output.canonicalResult); }],
]) test(`structured native positive with ${name} cannot establish verification`, async () => {
  const {pair, output} = await nativeFixture(); edit(output);
  const r = withNativeOutput(pair, output);
  assert.equal(r.layers.RECOMPUTATION.status, 'CANNOT_RECOMPUTE');
  assert.equal(r.overall, 'CANNOT_RECOMPUTE');
});

test('valid-looking stdout with nonzero checker exit is a replay barrier', async () => {
  const {pair, output} = await nativeFixture(); const r = withNativeOutput(pair, output, 7);
  assert.equal(r.layers.RECOMPUTATION.status, 'CANNOT_RECOMPUTE'); assert.equal(r.overall, 'CANNOT_RECOMPUTE');
});

test('malformed checker stdout is a replay barrier and never a predicate refutation', async () => {
  const {pair} = await nativeFixture(); const r = withNativeOutput(pair, '{"ok":true');
  assert.equal(r.layers.RECOMPUTATION.status, 'CANNOT_RECOMPUTE'); assert.equal(r.overall, 'CANNOT_RECOMPUTE');
  assert.ok(!r.reason_codes.includes('NATIVE_NEGATIVE_RESULT'));
});
