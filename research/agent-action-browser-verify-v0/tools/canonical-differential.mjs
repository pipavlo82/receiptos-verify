import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { research, support, bun } from '../lib/paths.mjs';
const out=resolve(process.argv[2]??resolve(support,'canonicalization/normal'));
mkdirSync(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const cases=JSON.parse(readFileSync(resolve(research,'fixtures/canonicalization.json'),'utf8'));
const commandReceipts=[],rows=[];
for(const [name,argv] of [['javascript',[bun,resolve(research,'tools/canonical-native.ts')]],
                        ['python',['python','-B','-X','utf8',...(process.env.PYTHONOPTIMIZE?['-O']:[]),resolve(research,'tools/canonical-kit.py')]]]) {
  const p=spawnSync(argv[0],argv.slice(1),{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,env:process.env});
  writeFileSync(resolve(out,name+'.stdout.txt'),p.stdout??'');writeFileSync(resolve(out,name+'.stderr.txt'),p.stderr??'');
  commandReceipts.push({name,argv,exit_code:p.status,stdout_sha256:hash(p.stdout??''),stderr_sha256:hash(p.stderr??'')});
  if(p.error||p.status!==0)throw new Error(`NATIVE_RUN_FAILED ${name}: ${p.error??p.stderr}`);
  const output=JSON.parse(p.stdout);
  if(output.lens_golden&&!output.lens_golden.ok)throw new Error('LENS_GOLDEN_FAILED');
  rows.push(...output.rows);
}
const failures=[];
for(const c of cases)for(const [engine,expected] of Object.entries(c.expected)) {
  const row=rows.find(r=>r.case_id===c.case_id&&r.engine===engine);
  const expectedHex=expected===null?null:Buffer.from(expected,'utf8').toString('hex');
  if(!row||row.status!==(expected===null?'REJECTED':'ACCEPTED')||row.canonical_hex!==expectedHex) failures.push({case_id:c.case_id,engine,expected_hex:expectedHex,observed:row});
  if(row?.receipt_root&&row.receipt_root!=='0x'+hash(Buffer.from(row.canonical_hex,'hex')))failures.push({case_id:c.case_id,engine,error:'ROOT_BYTES_INCOHERENT'});
}
const common=cases.filter(c=>c.compatible);
for(const c of common) {
  const matching=rows.filter(r=>r.case_id===c.case_id&&r.engine!=='host_content');
  if(matching.length!==4||matching.some(r=>r.status!=='ACCEPTED')||new Set(matching.map(r=>r.canonical_hex)).size!==1)failures.push({case_id:c.case_id,error:'COMMON_SUBSET_DIVERGED'});
}
const divergent=cases.filter(c=>new Set(rows.filter(r=>r.case_id===c.case_id&&r.engine!=='host_content').map(r=>r.status+':'+r.canonical_hex)).size>1).map(c=>c.case_id);
const result={schema:'agent-action.canonical-differential.v0',case_count:cases.length,expectations:cases.length*5,common_subset_cases:common.length,divergent_cases:divergent,failures,rows};
writeFileSync(resolve(out,'results.json'),JSON.stringify(result,null,2)+'\n');
writeFileSync(resolve(out,'commands.json'),JSON.stringify(commandReceipts,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,expectations:cases.length*5,common:common.length,divergences:divergent.length,failures,results_sha256:hash(readFileSync(resolve(out,'results.json')))}));
if(failures.length)process.exitCode=1;
