import { writeFile } from 'node:fs/promises';
import { mutations } from '../mutations/catalog.mjs';
import { auditMutantsV1 } from './mutation-harness-v1.mjs';
const report = await auditMutantsV1(mutations);
for (const row of report.rows) console.log(row.id+': '+row.status);
await writeFile(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out')+1] : new URL('../reports/mutations.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.counts));
process.exitCode = report.passed ? 0 : 1;
