import { readFile,writeFile,readdir } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { sha256 } from '../src/core/common.mjs';
const audit=new URL('../../../work/evidence/repos/',import.meta.url);
const rows=await Promise.all((await readdir(audit)).filter(p=>p.endsWith('.json')).map(async path=>JSON.parse(await readFile(new URL(path,audit),'utf8')))),results=[];
if(rows.length!==43) throw new Error('FROZEN_INVENTORY_COUNT_MISMATCH');
for(const repo of rows) {
  if(repo.error) throw new Error('Original frozen source unavailable: '+repo.full_name);
  let checked=0;const mismatches=[];
  for(let at=0;at<repo.snapshot_files.length;at+=32) {
    await Promise.all(repo.snapshot_files.slice(at,at+32).map(async file=>{
      const path=resolve(repo.snapshot_path,...file.path.split('/'));
      if(!path.startsWith(resolve(repo.snapshot_path)+'\\')) throw new Error('INVALID_FROZEN_SOURCE_PATH');
      try {const bytes=await readFile(path);if(bytes.length!==file.bytes||sha256(bytes)!==file.sha256)mismatches.push(file.path);checked++;}catch {mismatches.push(file.path);}
    }));
  }
  results.push({repository:repo.full_name,sourceSHA:repo.remote_head_sha,files:checked,mismatches});
}
const report={schema:'receiptos.verify.upstream-preservation.v1',scope:'All previously frozen public source snapshot files. No claim about unrelated live workstation worktrees.',repositories:results.length,files:results.reduce((n,r)=>n+r.files,0),mismatches:results.reduce((n,r)=>n+r.mismatches.length,0),results};
await writeFile(new URL('../reports/upstream-preservation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({repositories:report.repositories,files:report.files,mismatches:report.mismatches}));process.exitCode=report.mismatches?1:0;
