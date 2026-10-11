import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=new URL('../v02-audit-final/',import.meta.url);
const {verifyV2}=await import(new URL('src/core/verify-v2.mjs',repo));
const {evaluateInterpollV2}=await import(new URL('src/adapters/interpoll-v2.mjs',repo));
const {evaluatePrfV2}=await import(new URL('src/adapters/prf-v2.mjs',repo));
const canon=x=>x!==null&&typeof x==='object'?Array.isArray(x)?`[${x.map(canon).join(',')}]`:`{${Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')}}`:JSON.stringify(x);
const hash=x=>createHash('sha256').update(x).digest('hex');
const files=['src/adapters/interpoll-v2.mjs','src/adapters/prf-v2.mjs','schemas/request-v2.schema.json','src/core/admission-v2.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async path=>[path,hash(await readFile(new URL(path,repo)))])));
const sourceHead=spawnSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(repo),encoding:'utf8'}).stdout.trim();
const rows=[];
for(const id of ['interpoll_unknown_fresh_requirement','interpoll_unknown_server_requirement','interpoll_null_outcome','prf_unknown_policy_requirement','prf_unknown_evidence_requirement']){
 const beforePath=new URL('../audit02-domains/requirement-admission/'+id+'.json',import.meta.url);
 const beforeBytes=await readFile(beforePath),before=JSON.parse(beforeBytes);
 const input=before.input;
 const composed=await verifyV2(input.request,input.bundle);
 const direct=input.request.adapter==='interpoll'?evaluateInterpollV2(input.bundle.payload.adapter,input.request.adapter_requirement):evaluatePrfV2(input.bundle.payload.guarantees,input.request.guarantee_requirement);
 const actual={id,sourceHead,sourceHashes,input,inputSha256:hash(canon(input)),frozenBeforeFileSha256:hash(beforeBytes),frozenBeforeOverall:before.output.overall,composed,direct,assessment:composed.overall==='REJECTED_MALFORMED'&&direct.status==='REJECTED_MALFORMED'?'PASS':'FAIL'};
 await writeFile(new URL(id+'.json',import.meta.url),JSON.stringify(actual,null,2)+'\n');rows.push({id,before:before.output.overall,composed:composed.overall,direct:direct.status,assessment:actual.assessment});
}
for(const [id,kind]of [['D7_interpoll_exact','POSITIVE_CONTROL'],['D9_prf_preserved','POSITIVE_CONTROL'],['orphan_interpoll_requirement_on_rvr','INACTIVE_CONTEXT_INFO'],['orphan_prf_requirement_without_guarantee','INACTIVE_CONTEXT_INFO']]){
 const path=kind==='INACTIVE_CONTEXT_INFO'?'requirement-admission/':'cases/';
 const bytes=await readFile(new URL('../audit02-domains/'+path+id+'.json',import.meta.url));const before=JSON.parse(bytes),input=before.input;
 const output=await verifyV2(input.request,input.bundle);const value={id,kind,sourceHead,sourceHashes,input,frozenBeforeFileSha256:hash(bytes),output,expected:'VERIFIED',assessment:output.overall==='VERIFIED'?'PASS':'FAIL'};
 await writeFile(new URL(id+'.json',import.meta.url),JSON.stringify(value,null,2)+'\n');rows.push({id,kind,overall:output.overall,assessment:value.assessment});
}
const summary={createdAt:new Date().toISOString(),frozenCandidate:'4888a0584369a91075eb2bdbd9a2ff6b99c46588',findingsCheckpoint:'dde5419f453969ae33b9e88b3151dba3e370f196',sourceHead,sourceHashes,activeAttackCount:5,positiveControlCount:2,inactiveInfoControlCount:2,rows};
await writeFile(new URL('active-context-summary.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
