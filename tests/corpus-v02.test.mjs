import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { validateReportV2, discrepanciesV2, isolatedRunV2, vectorPathV2 } from '../tools/corpus-v2.mjs';

function report() {
  const statuses = { INPUT:'ADMITTED',CANONICALIZATION:'VERIFIED',INTEGRITY:'VERIFIED',AUTHENTICITY:'VERIFIED',SUBJECT_BINDING:'VERIFIED',
    RECOMPUTATION:'REPRODUCED',EVIDENCE_SUFFICIENCY:'SUFFICIENT',SEMANTIC_COMPATIBILITY:'COMPATIBLE',GUARANTEE_PRESERVATION:'NOT_REQUESTED',
    CONTINUITY:'NOT_REQUESTED',DOMAIN_ADAPTERS:'NOT_REQUESTED',PRODUCT_PROJECTION:'VERIFIED',EXPLAINABLE_REPORT:'GENERATED',PROVENANCE:'RECORDED' };
  return { schema:'receiptos.verify.report.v2',projection_version:'receiptos.verify.projection.v2',overall:'VERIFIED',reason_codes:[],
    explanation:'Detached synthetic mutation process-boundary control.',required_layers:['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'],
    layers:Object.fromEntries(Object.entries(statuses).map(([name,status])=>[name,{status,reasonCodes:[],nativeResult:null}])),boundaries:[] };
}

test('v0.2 isolated witness process rejects malformed output and distinguishes crash', async (t) => {
  const folder = new URL('../reports/tmp/v02-harness-negative-controls/', import.meta.url);
  await mkdir(new URL('tools/', folder), { recursive:true });
  t.after(() => rm(folder, { recursive:true,force:true }));
  const execute = async (value) => { await writeFile(new URL('tools/verify-vector-v2.mjs',folder), `process.stdout.write(${JSON.stringify(JSON.stringify(value))});\n`); return isolatedRunV2(folder,'G01'); };
  assert.equal((await execute(report())).process_status,'COMPLETED');
  for (const damage of [
    (r)=>{r.schema='WRONG';}, (r)=>{r.overall='WRONG';}, (r)=>{r.layers.SEMANTIC_COMPATIBILITY.status='WRONG';},
    (r)=>{delete r.layers.AUTHENTICITY;}, (r)=>{r.layers.PRODUCT_PROJECTION.status='CONTRADICTED';},
    (r)=>{r.required_layers=[];}, (r)=>{r.reason_codes=[3];}, (r)=>{r.layers.RECOMPUTATION.semanticOutcome='WRONG';},
    (r)=>{r.required_layers=['INTEGRITY','INTEGRITY'];}, (r)=>{r.required_layers=['IMPOSTOR'];},
  ]) {
    const value=report();damage(value);const run=await execute(value);
    assert.equal(run.process_status,'INVALID_OUTPUT');assert.equal(run.report,undefined);
  }
  await writeFile(new URL('tools/verify-vector-v2.mjs',folder),'process.exit(7);\n');
  const crash=isolatedRunV2(folder,'G01');assert.equal(crash.process_status,'CRASH');assert.equal(crash.exit_code,7);
  await writeFile(new URL('tools/verify-vector-v2.mjs',folder),'process.stdout.write(\'{"schema":"one","schema":"two"}\');\n');
  assert.equal(isolatedRunV2(folder,'G01').process_status,'INVALID_OUTPUT');
});

test('v0.2 wrong semantic verdict remains a semantic witness rather than invalid output', () => {
  const mutant=report();mutant.layers.SEMANTIC_COMPATIBILITY.status='CONTRADICTED';
  validateReportV2(mutant);
  const vector={expected:{overall:'CONTRADICTED',layers:{SEMANTIC_COMPATIBILITY:'CONTRADICTED'},reason_codes:[]}};
  assert.deepEqual(discrepanciesV2(vector,mutant),['overall VERIFIED != CONTRADICTED']);
  const malformed=report();malformed.layers.SEMANTIC_COMPATIBILITY.status='UNKNOWN';
  assert.match(discrepanciesV2(vector,malformed)[0],/^invalid report:/);
});

test('v0.2 witness references remain confined to the new corpus', () => {
  assert.match(vectorPathV2('G01'),/G01\.json$/);
  assert.match(vectorPathV2('I08'),/I08\.json$/);
  assert.match(vectorPathV2('vectors/v0.2/G01.json'),/G01\.json$/);
  for (const path of ['../../package.json','../V01.json','vectors/V01.json','G01.json\0','https://example.org/a.json']) assert.throws(()=>vectorPathV2(path));
});
