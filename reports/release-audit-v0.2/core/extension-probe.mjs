import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {fresh,resign,sha,bytes} from './independent-input.mjs';
const repo=resolve(process.argv[2]),out=resolve(process.argv[3]);await mkdir(out,{recursive:true});
const {verify}=await import(pathToFileURL(resolve(repo,'src/core/verify.mjs')));
const base=await fresh(repo),cases=[];
for(const value of [true,false,'true',1,{},null]){
 const p=structuredClone(base);
 p.request.continuity_request={mode:'historical',entry_id:'audit-entry',subject:{id:'independent-history-subject'},state:{digest:'a'.repeat(64)},require_whole_envelope_binding:value};
 p.bundle.payload.continuity={entries:[{entry_id:'audit-entry',proof_object_ref:'audit-proof',receipt_root:'audit-root',sequence:0,predecessor_ref:null,subject:{id:'independent-history-subject'},state:{digest:'a'.repeat(64)}}]};resign(p);
 cases.push({id:'continuity-binding-'+JSON.stringify(value).replace(/[^a-z0-9]/gi,'_'),pair:p,expected:typeof value==='boolean'?(value?'INSUFFICIENT_EVIDENCE':'VERIFIED'):'NOT_VERIFIED'});
}
for(const [id,change] of [
 ['unknown-option',r=>r.require_whole_envelop_binding=true],
 ['unknown-policy',r=>r.policy_version='unsupported-continuity.v99'],
 ['malformed-mode',r=>r.mode={current:true}],
 ['null-entry',r=>r.entry_id=null],
 ['missing-state',r=>delete r.state],
 ['null-digest',r=>r.observation_envelope_digest=null],
 ['malformed-digest',r=>r.observation_envelope_digest='not-a-digest'],
 ['wrong-ref-type',r=>r.proof_object_ref=true],
 ]){
 const p=structuredClone(base);p.request.continuity_request={mode:'historical',entry_id:'audit-entry',subject:{id:'independent-history-subject'},state:{digest:'a'.repeat(64)}};
 p.bundle.payload.continuity={entries:[{entry_id:'audit-entry',proof_object_ref:'audit-proof',receipt_root:'audit-root',sequence:0,predecessor_ref:null,subject:{id:'independent-history-subject'},state:{digest:'a'.repeat(64)}}]};change(p.request.continuity_request);resign(p);
 cases.push({id:'continuity-'+id,pair:p,expected:'NOT_VERIFIED'});
}
for(const kind of ['git-artifact','unsupported-git-artifact','opaque-artifact']){
 const p=structuredClone(base);p.request.subject.kind=kind;p.bundle.statement.surface.subject.kind=kind;
 p.request.subject.commit='e'.repeat(40);p.bundle.statement.surface.subject.commit='e'.repeat(40);
 p.bundle.statement.evidence_manifest=p.bundle.statement.evidence_manifest.filter(e=>!e.role.startsWith('git-'));p.bundle.evidence=p.bundle.evidence.filter(e=>!['commit','tree'].includes(e.id));resign(p);
 cases.push({id:'git-kind-'+kind,pair:p,expected:'INVESTIGATE'});
}
const results=[];
for(const c of cases){const actual=await verify(c.pair.request,c.pair.bundle);const r={...c,actual,inputSha256:sha(bytes(c.pair))};await writeFile(resolve(out,c.id+'.json'),JSON.stringify(r,null,2)+'\n');results.push({id:c.id,expected:c.expected,actual:actual.overall,continuity:actual.layers.CONTINUITY,reason:actual.reason_codes});}
await writeFile(resolve(out,'extension-summary.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
