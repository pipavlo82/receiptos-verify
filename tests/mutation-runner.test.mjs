import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { isolatedRun, validateReport, discrepancies, isolatedCopy } from '../tools/corpus.mjs';

function validReport() {
  const statuses={INPUT:'ADMITTED',CANONICALIZATION:'VERIFIED',INTEGRITY:'VERIFIED',AUTHENTICITY:'VERIFIED',SUBJECT_BINDING:'VERIFIED',RECOMPUTATION:'REPRODUCED',EVIDENCE_SUFFICIENCY:'SUFFICIENT',SEMANTIC_COMPATIBILITY:'COMPATIBLE',GUARANTEE_PRESERVATION:'NOT_REQUESTED',CONTINUITY:'NOT_REQUESTED',DOMAIN_ADAPTERS:'NOT_REQUESTED',PRODUCT_PROJECTION:'VERIFIED',EXPLAINABLE_REPORT:'GENERATED',PROVENANCE:'RECORDED'};
  return {schema:'receiptos.verify.report.v1',projection_version:'receiptos.verify.projection.v1',overall:'VERIFIED',reason_codes:[],explanation:'Synthetic process-boundary control.',required_layers:['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'],layers:Object.fromEntries(Object.entries(statuses).map(([k,status])=>[k,{status,reasonCodes:[],nativeResult:null}])),boundaries:[]};
}

test('mutation witness process rejects malformed and incoherent structured output',async t=>{
  const folder=new URL('../reports/tmp/mutation-output-regression/',import.meta.url);
  await mkdir(new URL('tools/',folder),{recursive:true});
  t.after(()=>rm(folder,{recursive:true,force:true}));
  const execute=async value=>{await writeFile(new URL('tools/verify-vector.mjs',folder),'process.stdout.write('+JSON.stringify(JSON.stringify(value))+');\n');return isolatedRun(folder,'unused');};
  assert.equal((await execute(validReport())).process_status,'COMPLETED');
  const cases=[
    r=>{r.schema='BANANA';},
    r=>{r.overall='BANANA';r.layers.PRODUCT_PROJECTION.status='BANANA';},
    r=>{r.overall='CONTRADICTED';},
    r=>{r.layers.PRODUCT_PROJECTION.reasonCodes=['NATIVE_NEGATIVE_RESULT'];},
    r=>{delete r.overall;},
    r=>{delete r.layers.INTEGRITY;},
    r=>{r.layers.IMPOSTOR=r.layers.INTEGRITY;delete r.layers.INTEGRITY;},
    r=>{r.layers.INTEGRITY.status='BANANA';},
    r=>{r.required_layers=['INTEGRITY','INTEGRITY'];},
    r=>{r.required_layers=['IMPOSTOR'];},
    r=>{r.explanation=17;},
    r=>{r.reason_codes=[17];},
  ];
  for(const damage of cases){const report=validReport();damage(report);const run=await execute(report);assert.equal(run.process_status,'INVALID_OUTPUT');assert.equal(run.report,undefined);}
  await writeFile(new URL('tools/verify-vector.mjs',folder),'process.exit(9);\n');
  const crash=isolatedRun(folder,'unused');assert.equal(crash.process_status,'CRASH');assert.equal(crash.exit_code,9);
});

test('literal-vector comparison rejects malformed report even when overall matches',()=>{
  const report=validReport();report.schema='BANANA';
  assert.match(discrepancies({expected:{overall:'VERIFIED',layers:{},reason_codes:[]}},report)[0],/^invalid report:/);
  assert.throws(()=>validateReport(report));
});

test('isolation folder names stay short for long mutant descriptions',async()=>{
  const folder=await isolatedCopy('mutant-count-crash-as-semantic-refutation');
  assert.match(folder.pathname,/\/i-[0-9a-f]{12}\/$/);
  const other=await isolatedCopy('mutant-count-crash-as-semantic-refutation-different');
  assert.notEqual(folder.href,other.href);
});
