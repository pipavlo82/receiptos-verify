import test from 'node:test';
import assert from 'node:assert/strict';
import { auditMutants, checkerOutputInvalid } from '../tools/mutation-harness-v2.mjs';

const verify = 'export async function verifyV2(requestInput,bundleInput) {';
const mutant = (id, file, from, to) => ({ id, positive: 'G01', witness: 'G03', patches: [{ file, changes: [[from, to]] }] });
const options = { writeReport: false, label: 'negative-control' };

test('v0.2 empty mutation inventory is a failing gate', async () => {
  await assert.rejects(auditMutants([], options), /ZERO_MUTANTS/);
});
test('v0.2 unapplied mutation and exact no-op cannot count as kills', async () => {
  const report = await auditMutants([
    mutant('UNAPPLIED', 'src/core/verify-v2.mjs', 'NONEXISTENT_REQUIRED_SOURCE_LOCATION', 'any'),
    mutant('NOOP', 'src/core/verify-v2.mjs', verify, verify),
  ], options);
  assert.equal(report.passed, false); assert.equal(report.counts.KILLED, 0);
  assert.equal(report.counts.NOT_APPLIED, 2);
  assert.ok(report.rows.every((row) => row.applied === false));
});
test('v0.2 actual crashing mutant is CRASHED rather than a semantic kill', async () => {
  const report = await auditMutants([mutant('CRASH', 'src/core/verify-v2.mjs', verify, `${verify}\n  process.exit(7);`)], options);
  assert.equal(report.passed, false); assert.equal(report.counts.KILLED, 0); assert.equal(report.counts.CRASHED, 1);
  assert.equal(report.rows[0].applied, true); assert.equal(report.rows[0].positive_process_status, 'CRASH');
});
test('v0.2 malformed output is INVALID_OUTPUT rather than a semantic kill', async () => {
  const report = await auditMutants([mutant('MALFORMED', 'src/core/verify-v2.mjs', verify, `${verify}\n  return null;`)], options);
  assert.equal(report.passed, false); assert.equal(report.counts.KILLED, 0); assert.equal(report.counts.INVALID_OUTPUT, 1);
  assert.equal(report.rows[0].applied, true); assert.equal(report.rows[0].positive_process_status, 'INVALID_OUTPUT');
});
test('v0.2 damaged but well-formed positive control prevents a semantic kill', async () => {
  const report = await auditMutants([mutant('POSITIVE_BROKEN', 'src/projection/project-v2.mjs',
    "return result('VERIFIED',reasons);", "return result('CONTRADICTED',['BROKEN_POSITIVE_CONTROL']);")], options);
  assert.equal(report.passed, false); assert.equal(report.counts.KILLED, 0); assert.equal(report.counts.CONTROL_BROKEN, 1);
  assert.equal(report.rows[0].applied, true); assert.equal(report.rows[0].positive_process_status, 'COMPLETED');
  assert.equal(report.rows[0].positive_preserved, false);
});
test('v0.2 native checker crash inside a structured host report is never a semantic kill',async()=>{
  const from='        payload = json.loads(sys.stdin.buffer.read().decode("utf-8", "strict"))';
  const to=from+'\n        if "poison" in payload["input"]["corpus"][0]["content"]: sys.exit(7)';
  const report=await auditMutants([{id:'INNER_CHECKER_CRASH',positive:'G24',witness:'G12',patches:[{file:'src/adapters/native/trustless-bridge.py',changes:[[from,to]]}]}],options);
  assert.equal(report.passed,false);assert.equal(report.counts.KILLED,0);assert.equal(report.counts.CRASHED,1);
  assert.equal(report.rows[0].positive_preserved,true);assert.equal(report.rows[0].witness_process_status,'COMPLETED');
  assert.equal(report.rows[0].mutant_projection,'CANNOT_RECOMPUTE');assert.equal(report.rows[0].checker_execution_failed,true);
});

test('v0.2 malformed native output with exit zero inside a valid host report is not a semantic kill',async()=>{
  const from='        payload = json.loads(sys.stdin.buffer.read().decode("utf-8", "strict"))';
  const to=from+'\n        if "poison" in payload["input"]["corpus"][0]["content"]: sys.stdout.write("null\\n"); sys.exit(0)';
  const report=await auditMutants([{id:'INNER_NATIVE_NULL',positive:'G24',witness:'G12',patches:[{file:'src/adapters/native/trustless-bridge.py',changes:[[from,to]]}]}],options);
  assert.equal(report.passed,false);assert.equal(report.counts.KILLED,0);assert.equal(report.counts.INVALID_OUTPUT,1);
  assert.equal(report.rows[0].applied,true);assert.equal(report.rows[0].positive_preserved,true);
  assert.equal(report.rows[0].witness_process_status,'COMPLETED');assert.equal(report.rows[0].witness_exit_code,0);
  assert.equal(report.rows[0].mutant_projection,'CANNOT_RECOMPUTE');assert.equal(report.rows[0].checker_execution_failed,false);
  assert.equal(report.rows[0].checker_output_invalid,true);
});

test('v0.2 native semantic NOT_VALID is distinct from invalid checker output',()=>{
  assert.equal(checkerOutputInvalid({RECOMPUTATION:{status:'REPRODUCED',semanticOutcome:'REFUTED',
    reasonCodes:['TRUSTLESS_NATIVE_NOT_VALID'],nativeResult:{semanticVerdict:'NOT_VALID'}}}),false);
  assert.equal(checkerOutputInvalid({RECOMPUTATION:{status:'CANNOT_RECOMPUTE',semanticOutcome:'UNVERIFIABLE',
    reasonCodes:['TRUSTLESS_NATIVE_OUTPUT_INVALID'],nativeResult:null}}),true);
});
