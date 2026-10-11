import { readFile, mkdir, cp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verify, LAYER_NAMES } from '../src/core/verify.mjs';
import { validateSchema } from '../src/core/schemas.mjs';
import { sha256 } from '../src/core/common.mjs';
export const root=fileURLToPath(new URL('../',import.meta.url));
export async function readVector(id) {return JSON.parse(await readFile(new URL('../vectors/'+id+'.json',import.meta.url),'utf8'));}
const verdicts=['VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE','REJECTED_MALFORMED','UNSUPPORTED_PROFILE'];
const layerStatuses={
  INPUT:['ADMITTED','REJECTED_MALFORMED'],CANONICALIZATION:['VERIFIED'],
  INTEGRITY:['VERIFIED','REJECTED_MALFORMED','CANNOT_RECOMPUTE','INSUFFICIENT_EVIDENCE'],
  AUTHENTICITY:['VERIFIED','CONTRADICTED','NOT_ESTABLISHED'],SUBJECT_BINDING:['VERIFIED','CONTRADICTED'],
  RECOMPUTATION:['REPRODUCED','DIVERGED','CANNOT_RECOMPUTE','CONTRADICTED','REJECTED_MALFORMED'],
  EVIDENCE_SUFFICIENCY:['SUFFICIENT','INSUFFICIENT'],SEMANTIC_COMPATIBILITY:['COMPATIBLE','INCOMPATIBLE','UNVERIFIABLE'],
  GUARANTEE_PRESERVATION:['PRESERVED','VIOLATED','UNVERIFIABLE','NOT_REQUESTED'],
  CONTINUITY:['PRESERVED','VERIFIED','VIOLATED','UNVERIFIABLE','NOT_REQUESTED'],
  DOMAIN_ADAPTERS:['VERIFIED','PRESERVED','VIOLATED','CONTRADICTED','REJECTED_MALFORMED','CANNOT_RECOMPUTE','UNVERIFIABLE','NOT_ESTABLISHED','UNSUPPORTED','NOT_REQUESTED','INSUFFICIENT_EVIDENCE'],
  PRODUCT_PROJECTION:verdicts,EXPLAINABLE_REPORT:['GENERATED'],PROVENANCE:['RECORDED'],
};
export function validateReport(report) {
  validateSchema('report',report);
  const names=Object.keys(report.layers);
  if(names.length!==LAYER_NAMES.length||LAYER_NAMES.some(k=>!Object.hasOwn(report.layers,k))
    ||names.some(k=>!layerStatuses[k]||!['NOT_RUN',...layerStatuses[k]].includes(report.layers[k].status))) throw new Error('Invalid report layer identity or status');
  if(!report.required_layers.length||new Set(report.required_layers).size!==report.required_layers.length
    ||report.required_layers.some(k=>!LAYER_NAMES.includes(k))) throw new Error('Invalid report required layers');
  if(report.layers.PRODUCT_PROJECTION.status!==report.overall
    ||JSON.stringify(report.layers.PRODUCT_PROJECTION.reasonCodes)!==JSON.stringify(report.reason_codes)) throw new Error('Incoherent report projection');
  return report;
}
export function discrepancies(vector,report) {
  const errors=[];
  try {validateReport(report);} catch(error) {return ['invalid report: '+error.message];}
  if(report.overall!==vector.expected.overall) errors.push(`overall ${report.overall} != ${vector.expected.overall}`);
  for(const [layer,status] of Object.entries(vector.expected.layers)) if(report.layers?.[layer]?.status!==status) errors.push(`${layer} ${report.layers?.[layer]?.status} != ${status}`);
  for(const code of vector.expected.reason_codes) if(!report.reason_codes?.includes(code)) errors.push('missing reason '+code);
  return errors;
}
export async function isolatedCopy(label) {
  // Keep native dependency paths below Windows limits even in audit checkouts.
  const folder=new URL('../reports/tmp/i-'+sha256(label).slice(0,12)+'/',import.meta.url);
  await mkdir(folder,{recursive:true});
  for(const name of ['src','vendor','provenance','vectors','schemas']) await cp(new URL('../'+name,import.meta.url),new URL(name,folder),{recursive:true});
  await mkdir(new URL('tools/',folder),{recursive:true});
  await cp(new URL('./verify-vector.mjs',import.meta.url),new URL('tools/verify-vector.mjs',folder));
  await writeFile(new URL('package.json',folder),'{"type":"module","private":true}\n');
  return folder;
}
export function isolatedRun(folder,id) {
  const run=spawnSync(process.execPath,[fileURLToPath(new URL('tools/verify-vector.mjs',folder)),fileURLToPath(new URL('vectors/'+id+'.json',folder))],{cwd:fileURLToPath(folder),encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,windowsHide:true});
  if(run.status!==0||run.signal||run.error) return {process_status:'CRASH',exit_code:run.status,stderr:run.stderr??String(run.error)};
  try {const report=validateReport(JSON.parse(run.stdout));return {process_status:'COMPLETED',exit_code:run.status,report};}
  catch(error) {return {process_status:'INVALID_OUTPUT',stdout:run.stdout,stderr:run.stderr,error:error.message};}
}
export async function runVector(vector) {
  if(vector.execution_setup?.fault==='crash-rvr') {
    const folder=await isolatedCopy('crash-control');
    await writeFile(new URL('src/adapters/native/rvr-bridge.py',folder),'import sys\nsys.stderr.write("Synthetic checker crash control\\n")\nsys.exit(7)\n');
    const run=isolatedRun(folder,vector.id);
    if(!run.report) throw new Error('Crash control host failed: '+JSON.stringify(run));
    return run.report;
  }
  return verify(vector.request,vector.bundle);
}
