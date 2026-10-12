import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Independent restricted-domain encoder, not imported from the audited product.
export function canon(v) {
  if (v===null || typeof v==='boolean' || typeof v==='string') return JSON.stringify(v);
  if (typeof v==='number' && Number.isSafeInteger(v) && !Object.is(v,-0)) return String(v);
  if (Array.isArray(v)) return '['+v.map(canon).join(',')+']';
  if (v && typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';
  throw Error('Outside independent encoder domain');
}
export const bytes=v=>Buffer.from(canon(v),'utf8');
export const sha=v=>createHash('sha256').update(v).digest('hex');
export const hash=v=>sha(bytes(v));
const git=(kind,v)=>createHash('sha1').update(Buffer.from(kind+' '+v.length+'\0')).update(v).digest('hex');
const clone=v=>structuredClone(v);
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const spki=publicKey.export({type:'spki',format:'der'}).toString('base64');
const signed=s=>Buffer.concat([Buffer.from('receiptos.verify.statement.v2\0','ascii'),Buffer.from(hash(s),'hex')]);
export function resign(pair) {
  pair.bundle.statement.payload_digest=hash(pair.bundle.payload);
  pair.bundle.signature_base64=sign(null,signed(pair.bundle.statement),privateKey).toString('base64');
  if(!verify(null,signed(pair.bundle.statement),publicKey,Buffer.from(pair.bundle.signature_base64,'base64'))) throw Error('Independent signing control failed');
  return pair;
}
export function attach(pair,raw) {
  pair.bundle.statement.evidence_manifest=raw.map(x=>({id:x.id,role:x.role,digest:sha(x.bytes),size:x.bytes.length}));
  pair.bundle.evidence=raw.map(x=>({id:x.id,bytes_base64:x.bytes.toString('base64')}));
  return resign(pair);
}
export async function fresh(repo,options={}) {
  const profile=JSON.parse(await readFile(resolve(repo,'vendor/rvr/conformance/rvr-v0/verification-profile.json'),'utf8'));
  const artifact=Buffer.from('Independent v0.2 release audit: public bounded artifact\n','utf8');
  const artifactDigest=sha(artifact), blob=git('blob',artifact);
  const tree=Buffer.concat([Buffer.from('100644 audited.txt\0','ascii'),Buffer.from(blob,'hex')]);
  const treeDigest=git('tree',tree);
  const commit=Buffer.from('tree '+treeDigest+'\nauthor Independent Auditor <synthetic@example.invalid> 1791676800 +0000\ncommitter Independent Auditor <synthetic@example.invalid> 1791676800 +0000\n\nFresh release audit only\n','utf8');
  const subject={kind:'git-artifact',id:'audit02:independent-artifact',version:'audit.v2',artifact_digest:artifactDigest,commit:git('commit',commit),tree:treeDigest,artifact_path:'audited.txt'};
  const expected=options.negative?'0'.repeat(64):artifactDigest;
  const nativeClaim={schema:'rvr.claim.sha256-equals.v0',operation:'SHA256_EQUALS',evidenceMember:'artifact',expectedDigest:expected};
  const evidenceSet={schema:'rvr.evidence-set.v0',members:[{id:'artifact',status:'PRESENT',mediaType:'application/octet-stream',byteLength:String(artifact.length),digest:artifactDigest}]};
  const nativeCase={claim:nativeClaim,evidenceSet,payloadsBase64:{artifact:artifact.toString('base64')}};
  const outcome=options.negative?'REFUTED':'VERIFIED',reasonCode=options.negative?'rvr.v0.digest_mismatch':'rvr.v0.digest_match';
  const canonicalResult={schema:'rvr.canonical-result.v0',outcome,reasonCode,evaluation:{operation:'SHA256_EQUALS',evidenceMember:'artifact',expectedDigest:expected,observedDigest:artifactDigest}};
  const originalBundle={receipt:{claimDigest:hash(nativeClaim),evidenceSetDigest:hash(evidenceSet),verificationProfileDigest:hash(profile),outcome,reasonCode,resultDigest:hash(canonicalResult)},...clone(nativeCase),verificationProfile:profile,canonicalResult};
  const crystalBody={schema:'stealth.session.evidence.v1',session_id:'independent-v02-release-audit',directory:'audit/synthetic',task:{title:'Independent bounded artifact audit'},agent:{id:'release-auditor',runtime:'local'},scope:{permission:null},execution:[],commands:[],changes:{files_changed:[],diff_sha256:null},metadata:{generated_by:'independent-release-auditor'}};
  const crystal={...crystalBody,anchor:{receipt_root:'0x'+hash(crystalBody),network:'local/off-chain',onchain_anchor_status:'not anchored'}};
  const request={schema:'receiptos.verify.request.v2',verification_profile:'receiptos.verify.generic.v2',adapter:'rvr',claim:{id:'audit02:sha256-equals',kind:'SHA256_EQUALS',parameters:{expected_digest:expected}},subject:clone(subject),scope:{evidence_member:'artifact'},authority:{id:'audit02-key',class:'INDEPENDENT_RECOMPUTATION'},policy:{id:'audit02-policy',version:'audit.2',trusted_keys:[{id:'audit02-key',spki_base64:spki}],required_layers:[],minimum_grade:'LOCAL_RECOMPUTATION',verification_time:1791676800,established_assumptions:[],dependency_results:[],accepted_authorities:[{id:'audit02-key',class:'INDEPENDENT_RECOMPUTATION'}]},version:'audit.2',time:{not_before:1791676700,not_after:1791676900},assumptions:[],dependencies:[],evidence_requirements:['artifact','native-result','adapter-input','execution'],evidence:[],requested_guarantees:[]};
  const surface={claim:clone(request.claim),subject:clone(request.subject),scope:clone(request.scope),authority:clone(request.authority),policy:{id:request.policy.id,version:request.policy.version},version:request.version,time:clone(request.time),assumptions:[],dependencies:[],evidence_requirements:clone(request.evidence_requirements)};
  const payload={crystal,adapter:{originalBundle,candidateCase:clone(nativeCase)},guarantees:null,continuity:null};
  const bundle={schema:'receiptos.verify.bundle.v2',canonicalization_profile:'receiptos.verify.canonical-json.v1',statement:{schema:'receiptos.verify.statement.v2',verification_profile:request.verification_profile,adapter:'rvr',surface,asserted_result:options.negative?'FAIL':'PASS',evidence_manifest:[],payload_digest:'0'.repeat(64),crypto:{provider:'ed25519',key_id:'audit02-key'}},signature_base64:'',evidence:[],payload};
  return attach({request,bundle},[{id:'artifact',role:'artifact',bytes:artifact},{id:'commit',role:'git-commit',bytes:commit},{id:'tree',role:'git-tree',bytes:tree},{id:'native-result',role:'native-result',bytes:bytes(canonicalResult)},{id:'adapter-input',role:'adapter-input',bytes:bytes(payload.adapter)}]);
}
