import { readFile, mkdir, cp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verify } from '../src/core/verify.mjs';
export const root=fileURLToPath(new URL('../',import.meta.url));
export async function readVector(id) {return JSON.parse(await readFile(new URL('../vectors/'+id+'.json',import.meta.url),'utf8'));}
export function discrepancies(vector,report) {
  const errors=[];
  if(report.overall!==vector.expected.overall) errors.push(`overall ${report.overall} != ${vector.expected.overall}`);
  for(const [layer,status] of Object.entries(vector.expected.layers)) if(report.layers?.[layer]?.status!==status) errors.push(`${layer} ${report.layers?.[layer]?.status} != ${status}`);
  for(const code of vector.expected.reason_codes) if(!report.reason_codes?.includes(code)) errors.push('missing reason '+code);
  return errors;
}
export async function isolatedCopy(label) {
  const folder=new URL('../reports/tmp/'+label+'/',import.meta.url);
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
  try {const report=JSON.parse(run.stdout);if(!report.schema||!report.layers||typeof report.overall!=='string') throw new Error();return {process_status:'COMPLETED',exit_code:run.status,report};}
  catch {return {process_status:'INVALID_OUTPUT',stdout:run.stdout,stderr:run.stderr};}
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
