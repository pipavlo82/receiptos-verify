import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'reports/release-audit-v0.1/vectors-mutations');
const tails='vendor/rvr/conformance/rvr-v0/rvr-generic-sha256-equals-v0.profile.schema.json';
const rows=[];
for(const prefix of ['reports/tmp/release-rc-audit/vectors-mutations-base/reports/tmp/mutant-ignore-requested-subject','reports/tmp/release-rc-audit/vm/reports/tmp/mutant-count-crash-as-semantic-refutation','reports/tmp/vm2/reports/tmp/mutant-count-crash-as-semantic-refutation']){
 const f=path.join(root,prefix,tails),nodeBytes=await readFile(f);const argv=['-I','-B','-X','utf8','-c','from pathlib import Path; import sys; print(len(Path(sys.argv[1]).read_bytes()))',f];const run=spawnSync('python',argv,{encoding:'utf8',windowsHide:true});rows.push({path:f,path_length:f.length,node_read_bytes:nodeBytes.length,argv:['python',...argv],exit:run.status,stdout:run.stdout,stderr:run.stderr});
}
await writeFile(path.join(out,'windows-path-reproducer.json'),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows.map(r=>({length:r.path_length,nodeBytes:r.node_read_bytes,pythonExit:r.exit,stdout:r.stdout.trim()}))));
