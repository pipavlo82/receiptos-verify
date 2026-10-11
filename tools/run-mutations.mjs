import { readFile, writeFile } from 'node:fs/promises';
import { mutations } from '../mutations/catalog.mjs';
import { readVector, runVector, discrepancies, isolatedCopy, isolatedRun } from './corpus.mjs';
import { sha256 } from '../src/core/common.mjs';
if(!mutations.length) throw new Error('ZERO_MUTANTS');
const rows=[];
for(const m of mutations) {
  const folder=await isolatedCopy('mutant-'+m.id);
  const path=new URL(m.file,folder);const original=await readFile(path,'utf8');let edited=original;let applied=true;
  for(const [from,to] of m.changes) {if(edited.split(from).length!==2){applied=false;break;}edited=edited.replace(from,to);}
  const record={id:m.id,source_file:m.file,original_sha256:sha256(original),mutant_sha256:sha256(edited),applied:applied&&original!==edited,positive:m.positive,witness:m.witness};
  if(!record.applied) {rows.push({...record,status:'NOT_APPLIED'});continue;}
  await writeFile(path,edited);
  const positiveVector=await readVector(m.positive),witnessVector=await readVector(m.witness);
  const baselinePositive=await runVector(positiveVector),baselineWitness=await runVector(witnessVector);
  record.baseline_controls_valid=discrepancies(positiveVector,baselinePositive).length===0&&discrepancies(witnessVector,baselineWitness).length===0;
  const positive=isolatedRun(folder,m.positive);
  record.positive_process_status=positive.process_status;
  record.positive_preserved=!!positive.report&&discrepancies(positiveVector,positive.report).length===0;
  if(m.fault==='crash-rvr') await writeFile(new URL('src/adapters/native/rvr-bridge.py',folder),'import sys\nsys.stderr.write("Synthetic checker crash control\\n")\nsys.exit(7)\n');
  const witness=isolatedRun(folder,m.witness);
  record.witness_process_status=witness.process_status;
  record.baseline_projection=baselineWitness.overall;
  record.mutant_projection=witness.report?.overall??null;
  record.witness_reasons=witness.report?.reason_codes??[];
  record.status=!record.baseline_controls_valid?'INVALID_BASELINE'
    :[positive,witness].some(run=>run.process_status==='INVALID_OUTPUT')?'INVALID_OUTPUT'
    :[positive,witness].some(run=>run.process_status!=='COMPLETED')?'CRASHED'
    :!record.positive_preserved?'CONTROL_BROKEN'
    :witness.report.overall!==baselineWitness.overall?'KILLED':'SURVIVED';
  rows.push(record);console.log(m.id+': '+record.status);
}
const counts=Object.fromEntries(['KILLED','SURVIVED','CRASHED','INVALID_OUTPUT','NOT_APPLIED','CONTROL_BROKEN','INVALID_BASELINE'].map(k=>[k,rows.filter(r=>r.status===k).length]));
const report={schema:'receiptos.verify.mutation-report.v1',method:'Applied source change + preserved positive + structured semantic distinguishing witness. Checker crash is never itself a kill.',count:rows.length,counts,rows};
await writeFile(new URL('../reports/mutations.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(counts));
process.exitCode=counts.KILLED===mutations.length?0:1;
