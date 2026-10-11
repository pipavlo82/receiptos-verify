import {readFile,writeFile} from 'node:fs/promises';
import {createHash,createPublicKey,verify} from 'node:crypto';
import path from 'node:path';
// Independent, bounded ASCII-fixture oracle: no ReceiptOS helpers, fixtures,
// adapters, expected-result tables or vendor evaluators are imported here.
const [root,out]=process.argv.slice(2);
const hash=(b,a='sha256')=>createHash(a).update(b).digest('hex');
const canon=v=>Array.isArray(v)?'['+v.map(canon).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}':JSON.stringify(v);
const eq=(a,b)=>canon(a)===canon(b);
// Standalone BIP340 verification arithmetic, independent of @noble/curves.
const P=(1n<<256n)-(1n<<32n)-977n,N=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const G=[BigInt('0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),BigInt('0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8')];
const mod=x=>(x%P+P)%P;
function pow(x,n){let y=1n;for(x=mod(x);n;n>>=1n,x=mod(x*x))if(n&1n)y=mod(y*x);return y;}
function add(a,b){if(!a)return b;if(!b)return a;if(a[0]===b[0]&&mod(a[1]+b[1])===0n)return null;const slope=a[0]===b[0]?mod(3n*a[0]*a[0]*pow(2n*a[1],P-2n)):mod((b[1]-a[1])*pow(b[0]-a[0],P-2n));const x=mod(slope*slope-a[0]-b[0]);return [x,mod(slope*(a[0]-x)-a[1])];}
function mul(n,a){let r=null;for(;n;n>>=1n,a=add(a,a))if(n&1n)r=add(r,a);return r;}
function bip340(a){try{const sig=Buffer.from(a.signature,'hex'),key=Buffer.from(a.actor,'hex'),msg=Buffer.from(a.id,'hex');const x=BigInt('0x'+a.actor),r=BigInt('0x'+sig.subarray(0,32).toString('hex')),s=BigInt('0x'+sig.subarray(32).toString('hex'));if(x>=P||r>=P||s>=N)return false;let y=pow(mod(x*x*x+7n),(P+1n)/4n);if(mod(y*y)!==mod(x*x*x+7n))return false;if(y&1n)y=P-y;const tag=Buffer.from(hash('BIP0340/challenge'),'hex'),e=BigInt('0x'+hash(Buffer.concat([tag,tag,sig.subarray(0,32),key,msg])))%N;const R=add(mul(s,G),mul((N-e)%N,[x,y]));return !!R&&R[0]===r&&(R[1]&1n)===0n;}catch{return false;}}
const rows=[];
for(let n=1;n<=30;n++){
 const id='V'+String(n).padStart(2,'0'),v=JSON.parse(await readFile(path.join(root,'vectors',id+'.json'),'utf8')),r=v.request,b=v.bundle,s=b.statement;
 const supplied=Object.fromEntries(b.evidence.map(e=>[e.id,e.bytes_base64===null?null:Buffer.from(e.bytes_base64,'base64')]));
 const nativeBytes=Buffer.from(b.payload.rvr.candidateCase.payloadsBase64.artifact,'base64');
 const cr={...b.payload.crystal};delete cr.anchor;const crystalRoot='0x'+hash(canon(cr));
 const trusted=r.policy.trusted_keys.find(k=>k.id===s.crypto.key_id);
 let signature=null;if(trusted)signature=verify(null,Buffer.concat([Buffer.from('receiptos.verify.statement.v1\0'),Buffer.from(hash(canon(s)),'hex')]),createPublicKey({key:Buffer.from(trusted.spki_base64,'base64'),format:'der',type:'spki'}),Buffer.from(b.signature_base64,'base64'));
 const git={};for(const [key,type]of [['commit','commit'],['tree','tree']])if(supplied[key])git[key]=hash(Buffer.concat([Buffer.from(type+' '+supplied[key].length+'\0'),supplied[key]]),'sha1');git.blob=hash(Buffer.concat([Buffer.from('blob '+nativeBytes.length+'\0'),nativeBytes]),'sha1');
 const o={id,crystal_root:crystalRoot,crystal_match:crystalRoot.toLowerCase()===b.payload.crystal.anchor.receipt_root.toLowerCase(),signature_valid:signature,signer_trusted:!!trusted,artifact_digest:hash(nativeBytes),generic_predicate:hash(nativeBytes)===r.claim.expected_digest?'VERIFIED':'REFUTED',git,subject_mismatches:Object.keys(r.subject).filter(k=>!eq(r.subject[k],s.subject[k])),policy_version_match:r.policy.version===s.policy.version,policy_digest_match:hash(canon(r.policy))===s.policy.digest,absent_roles:['artifact','git-commit','git-tree','native-result'].filter(role=>!s.evidence_manifest.some(e=>e.role===role)),missing_bytes:s.evidence_manifest.filter(e=>!supplied[e.id]).map(e=>e.id),manifest_bytes_match:s.evidence_manifest.filter(e=>supplied[e.id]).every(e=>hash(supplied[e.id])===e.digest&&supplied[e.id].length===e.size),payload_digest_match:hash(canon(b.payload))===s.payload_digest,semantic_scope_equal:eq(r.semantic_requirement.scope,s.semantic_contract.scope),semantic_authority_equal:r.semantic_requirement.authority_class===s.semantic_contract.authority_class,execution_report:b.payload.relations.execution};
 const g=b.payload.relations.guarantee;if(g)o.guarantee={declared_basis:r.guarantee_context,requested_dependencies:r.requested_guarantees[0].dependencies,upstream_dependencies:g.upstream[0].dependencies,downstream_dependencies:g.downstream.guarantees[0].dependencies,downstream_guarantee_ids:g.downstream.guarantees.map(x=>x.id)};
 const h=b.payload.relations.continuity;if(h)o.continuity={mode:r.continuity_request.mode,selected:h.entries.find(e=>e.entry_id===r.continuity_request.entry_id),later:h.entries.filter(e=>e.sequence>h.entries.find(x=>x.entry_id===r.continuity_request.entry_id).sequence)};
 const d=b.payload.relations.domain;
 if(r.domain_profile==='interpoll')o.action={all_exact:[d.accepted_action,...d.attempts.map(a=>a.action)].every(a=>eq(a,r.domain_requirement.authorized_action)),authority_mismatches:Object.entries(r.domain_requirement.expected_authority).filter(([k,value])=>r.domain_requirement.authorized_action[k]!==value).map(([k])=>k),action_ids:[d.authorized_action,...d.attempts.map(x=>x.action)].map(a=>({id:a.id,id_matches:hash(JSON.stringify(['interpoll.public-engagement.v1',1,a.namespace,a.kind,a.actor,a.targetType,a.targetId,a.value,a.createdAt,a.nonce]))===a.id,bip340_valid:bip340(a),value:a.value}))};
 if(r.domain_profile==='stochastic'){const bytes=Buffer.from(d.stream_base64,'base64');o.stochastic={stream_digest_match:hash(bytes)===d.stream_digest,selected:d.candidates[bytes[d.cursor]%d.candidates.length],provenance_evidence_present:false};}
 if(r.domain_profile==='qev'&&d.profile!=='rvr-qev-moth-counts-v0'){const lines=d.package.raw.data.trimEnd().split('\n');o.qev={shots:lines.length,weighted_sum:lines.reduce((a,x)=>a+parseInt(x,2),0),parity_ones:lines.filter(x=>[...x].filter(c=>c==='1').length%2).length,raw_hash_match:hash(d.package.raw.data)===d.package.raw.sha256,provider_evidence:d.package.provider_evidence};}
 if(d?.profile==='rvr-qev-moth-counts-v0'){
  const payloads=d.candidateCase.payloadsBase64,manifest=JSON.parse(Buffer.from(payloads['manifest.json'],'base64')),output=JSON.parse(Buffer.from(payloads[manifest.roles.result],'base64')).result.output;
  o.moth={requested_job:r.domain_requirement.expectedClaim.captureClaim.jobId,saved_job:d.candidateCase.claim.captureClaim.jobId,counts_total:Object.values(output.raw.counts).reduce((a,x)=>a+x,0),declared_shots:output.provenance.shots,widths:[...new Set(Object.keys(output.raw.counts).map(k=>k.length))],requested_bytes:output.random.requested_bytes,delivered_bytes:output.random.bytes,provider_authentication_evidence:false,all_member_hashes_match:d.candidateCase.evidenceSet.members.every(m=>hash(Buffer.from(payloads[m.id],'base64'))===m.digest)};
 }
 // Independent fixture-specific obligation evaluation. Expected literals are
 // never read: derive the projection from independently observed premises.
 let product='VERIFIED';
 const domainContradiction=o.action&&(o.action.authority_mismatches.length||!o.action.all_exact)||o.moth&&(o.moth.requested_job!==o.moth.saved_job||o.moth.counts_total!==o.moth.declared_shots);
 const guaranteeContradiction=o.guarantee&&(!eq(o.guarantee.upstream_dependencies,o.guarantee.downstream_dependencies)||o.guarantee.requested_dependencies.some(k=>!o.guarantee.downstream_guarantee_ids.includes(k)));
 const continuityContradiction=o.continuity?.mode==='current'&&o.continuity.later.length;
 if(!o.crystal_match||b.canonicalization_profile!=='receiptos.verify.canonical-json.v1')product='REJECTED_MALFORMED';
 else if(r.verification_profile!=='receiptos.verify.git-artifact.v1')product='UNSUPPORTED_PROFILE';
 else if(o.subject_mismatches.length||!o.policy_digest_match||!o.policy_version_match||!o.semantic_scope_equal||!o.semantic_authority_equal||domainContradiction||guaranteeContradiction||continuityContradiction||o.generic_predicate==='REFUTED')product='CONTRADICTED';
 else if(!o.signer_trusted||o.absent_roles.length||o.execution_report.evidence_grade!=='LOCAL_RECOMPUTATION')product='INSUFFICIENT_EVIDENCE';
 else if(o.missing_bytes.length||v.execution_setup?.fault==='crash-rvr')product='CANNOT_RECOMPUTE';
 else if(o.execution_report.executed!==true||r.domain_profile==='qev'||r.domain_profile==='stochastic')product='INSUFFICIENT_EVIDENCE';
 o.independently_derived_product=product;
 const actual=JSON.parse(await readFile(path.join(out,id+'.report.json'),'utf8'));o.actual_product=actual.overall;o.independent_projection_matches=actual.overall===product;
 rows.push(o);
}
await writeFile(path.join(out,'independent-oracle.json'),JSON.stringify({method:'Independent bounded ASCII-fixture calculations with Node crypto and standalone BIP340 BigInt verification; no product or vendor evaluator/helper imports. Caller PRF premises remain assumptions.',rows},null,2)+'\n');
console.log(JSON.stringify({vectors:rows.length,signatureValid:rows.filter(x=>x.signature_valid).length,untrusted:rows.filter(x=>!x.signer_trusted).map(x=>x.id),crystalMismatch:rows.filter(x=>!x.crystal_match).map(x=>x.id),genericNegative:rows.filter(x=>x.generic_predicate==='REFUTED').map(x=>x.id),moth:rows.filter(x=>x.moth).map(x=>({id:x.id,...x.moth}))}));
