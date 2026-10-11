import { mutationsV2 } from '../mutations/catalog-v2.mjs';
import { auditMutants } from './mutation-harness-v2.mjs';

const report = await auditMutants(mutationsV2);
for (const row of report.rows) console.log(`${row.id}: ${row.status}`);
console.log(JSON.stringify({ count: report.count, passed: report.passed, counts: report.counts }));
process.exitCode = report.passed ? 0 : 1;
