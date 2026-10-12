import { readFile, writeFile } from 'node:fs/promises';
import { readVector, runVector, discrepancies } from './corpus.mjs';
const index=JSON.parse(await readFile(new URL('../vectors/index.json',import.meta.url),'utf8'));
if(!index.vectors.length) throw new Error('EMPTY_CORPUS');
const rows=[];
for(const entry of index.vectors) {const vector=await readVector(entry.id);const report=await runVector(vector);rows.push({id:entry.id,expected:vector.expected,observed:{overall:report.overall,layers:Object.fromEntries(Object.entries(report.layers).map(([k,v])=>[k,v.status])),reason_codes:report.reason_codes},errors:discrepancies(vector,report)});}
const output={schema:'receiptos.verify.corpus-report.v1',count:rows.length,passed:rows.filter(r=>!r.errors.length).length,failed:rows.filter(r=>r.errors.length).length,rows};
await writeFile(process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:new URL('../reports/vectors.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({count:output.count,passed:output.passed,failed:output.failed,failures:rows.filter(r=>r.errors.length).map(r=>({id:r.id,errors:r.errors}))}));
process.exitCode=output.failed?1:0;
