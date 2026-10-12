import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,createPrivateKey,sign} from 'node:crypto';
import {evaluateInterpollV2} from './repo/src/adapters/interpoll-v2.mjs';
import {evaluatePrfV2} from './repo/src/adapters/prf-v2.mjs';
import {verifyV2} from './repo/src/core/verify-v2.mjs';
const canon=x=>x!==null&&typeof x==='object'?Array.isArray(x)?`[${x.map(canon).join(',')}]`:`{${Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')}}`:JSON.stringify(x);
const hash=x=>createHash('sha256').update(x).digest('hex');
const dir=new URL('./requirement-admission/',import.meta.url);await mkdir(dir,{recursive:true});
const read=async id=>JSON.parse(await readFile(new URL('./cases/'+id+'.json',import.meta.url),'utf8'));
const cases=[];
const ip=(await read('D7_interpoll_exact')).input;
const pp=(await read('D9_prf_preserved')).input;
for(const [id,pair,edit]of[
 ['interpoll_unknown_fresh_requirement',ip,p=>p.request.adapter_requirement.require_fresh_admission=true],
 ['interpoll_unknown_server_requirement',ip,p=>p.request.adapter_requirement.required_evidence_basis='INTERPOLL_SERVER_ATTESTATION'],
 ['interpoll_null_outcome',ip,p=>p.request.adapter_requirement.required_outcome=null],
 ['prf_unknown_policy_requirement',pp,p=>p.request.guarantee_requirement.required_policy_version='unsupported-v999'],
 ['prf_unknown_evidence_requirement',pp,p=>p.request.guarantee_requirement.required_evidence_basis='AUTHENTICATED_CHAIN_SETTLEMENT'],
 ['prf_null_known_requirement',pp,p=>p.request.guarantee_requirement.required_guarantee=null],
 ['orphan_interpoll_requirement_on_rvr',pp,p=>{p.request.requested_guarantees=[];delete p.request.guarantee_requirement;p.request.adapter_requirement={required_outcome:'EXECUTION_OBSERVED',requested_action:ip.request.adapter_requirement.requested_action,authority:ip.request.adapter_requirement.authority};}],
 ['orphan_prf_requirement_without_guarantee',pp,p=>p.request.requested_guarantees=[]]
 ]){
 const input=structuredClone(pair);edit(input);const output=await verifyV2(input.request,input.bundle);const result={id,input,output,expected:'An unsupported or malformed semantic requirement must not be silently accepted as established.',candidateSource:{sha:'4888a0584369a91075eb2bdbd9a2ff6b99c46588',files:{'src/adapters/interpoll-v2.mjs':hash(await readFile(new URL('./repo/src/adapters/interpoll-v2.mjs',import.meta.url))),'src/adapters/prf-v2.mjs':hash(await readFile(new URL('./repo/src/adapters/prf-v2.mjs',import.meta.url)))}},observed:output.overall};
 await writeFile(new URL(id+'.json',dir),JSON.stringify(result,null,2)+'\n');cases.push({id,overall:output.overall,reasons:output.reason_codes});
}
await writeFile(new URL('summary.json',dir),JSON.stringify({createdAt:new Date().toISOString(),cases},null,2)+'\n');console.log(JSON.stringify(cases));
