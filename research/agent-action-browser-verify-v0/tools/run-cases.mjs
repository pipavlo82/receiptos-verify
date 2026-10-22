import { readFileSync,mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyAgentAction,semanticReport } from '../lib/profile.mjs';
import { research,support } from '../lib/paths.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2),label=args.find(x=>!x.startsWith('--'))??'normal';
const selected=args.find(x=>x.startsWith('--cases='))?.slice(8).split(',');
const raw=readFileSync(resolve(research,'fixtures/actions.json'));
const cases=JSON.parse(raw).filter(c=>!selected||selected.includes(c.case_id));
if(!cases.length)throw new Error('NO_CASES_SELECTED');
const out=resolve(support,'actions',label);mkdirSync(out,{recursive:true});
const observations=[];
for(const c of cases){
  const result=await verifyAgentAction(c.caller,c.package);
  const input=JSON.stringify({caller:c.caller,package:c.package});
  writeFileSync(resolve(out,c.case_id+'.raw.json'),JSON.stringify(result,null,2)+'\n');
  const observation={case_id:c.case_id,expected:c.expected,input_sha256:hash(input),
    report:semanticReport(result),passed:result.status===c.expected.status&&result.reason===c.expected.reason};
  observations.push(observation);
  if(!observation.passed)console.error(JSON.stringify({case_id:c.case_id,expected:c.expected,actual:{status:result.status,reason:result.reason}}));
}
const semantic=JSON.stringify(observations,null,2)+'\n';
writeFileSync(resolve(out,'results.json'),semantic);
const summary={schema:'agent-action.test-summary.v0',cases:cases.length,passed:observations.filter(c=>c.passed).length,
  failed:observations.filter(c=>!c.passed).map(c=>c.case_id),fixture_sha256:hash(raw),semantic_sha256:hash(semantic)};
writeFileSync(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
process.exitCode=summary.failed.length?1:0;
