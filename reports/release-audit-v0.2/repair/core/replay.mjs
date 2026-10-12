import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const repo=resolve(process.argv[2]),out=resolve(process.argv[3]);await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=['schemas/request-v2.schema.json','src/core/admission-v2.mjs','tests/requirement-admission-release.test.mjs'];
const source=await Promise.all(sourceFiles.map(async path=>({path,sha256:sha(await readFile(resolve(repo,path)))})));
const {verify}=await import(pathToFileURL(resolve(repo,'src/core/verify.mjs')));
const parse=v=>v.encoding==='base64'?Buffer.from(v.bytes,'base64'):v.encoding==='utf8'?v.text:v.value;
const root=resolve(repo,'reports/release-audit-v0.2');
const cases=[];
for(const id of ['continuity-binding-true','continuity-binding-false','continuity-binding-_true_','continuity-binding-1','continuity-binding-__','continuity-binding-null','continuity-unknown-option','continuity-unknown-policy','continuity-malformed-mode','continuity-null-entry','continuity-missing-state','continuity-null-digest','continuity-malformed-digest','continuity-wrong-ref-type']){
 const path=resolve(root,'core/results/'+id+'.json'),record=JSON.parse(await readFile(path,'utf8'));
 const expected=['continuity-binding-true','continuity-missing-state'].includes(id)?'INSUFFICIENT_EVIDENCE':id==='continuity-binding-false'?'VERIFIED':'REJECTED_MALFORMED';
 cases.push({id,path,record,pair:record.pair,expected});
}
for(const id of ['interpoll_unknown_fresh_requirement','interpoll_unknown_server_requirement','interpoll_null_outcome','prf_unknown_policy_requirement','prf_unknown_evidence_requirement','prf_null_known_requirement','orphan_interpoll_requirement_on_rvr','orphan_prf_requirement_without_guarantee']){
 const path=resolve(root,'domains/requirement-admission/'+id+'.json'),record=JSON.parse(await readFile(path,'utf8'));
 cases.push({id,path,record,pair:record.input,expected:id.startsWith('orphan_')?'VERIFIED':'REJECTED_MALFORMED'});
}
for(const id of ['D1','D2','D12','D14','A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12','A13','A14','A15']){
 const path=resolve(root,'core/results/'+id+'.json'),record=JSON.parse(await readFile(path,'utf8'));
 cases.push({id,path,record,pair:{request:parse(record.input.request),bundle:parse(record.input.bundle)},expected:record.oracle.overall});
}
const results=[];
for(const c of cases){
 const actual=await verify(c.pair.request,c.pair.bundle),before=c.record.actual??c.record.output;
 const receipt={id:c.id,sourceBeforePath:c.path,sourceBeforeSha256:sha(await readFile(c.path)),input:c.pair,inputSha256:sha(Buffer.from(JSON.stringify(c.pair))),expected:c.expected,before:before??null,after:actual,passed:actual.overall===c.expected};
 await writeFile(resolve(out,c.id+'.json'),JSON.stringify(receipt,null,2)+'\n');
 results.push({id:c.id,before:before?.overall??null,after:actual.overall,expected:c.expected,passed:receipt.passed});
}
const afterSource=await Promise.all(sourceFiles.map(async path=>({path,sha256:sha(await readFile(resolve(repo,path)))})));
const summary={testedHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),testedSourceIdentity:source,sourceUnchangedDuringReplay:JSON.stringify(source)===JSON.stringify(afterSource),generatedAt:new Date().toISOString(),total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed),results};
await writeFile(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
