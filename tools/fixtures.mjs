import { createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { schnorr } from '@noble/curves/secp256k1.js';
import { canonicalize, digest, sha256 } from '../src/core/common.mjs';
import { gitObjectId } from '../src/core/git.mjs';
import { signingBytes } from '../src/core/authenticity.mjs';
import { buildCrystalEvidence } from '../src/adapters/crystal.mjs';
import { buildRvrEvidence, descriptor as rvrDescriptor } from '../src/adapters/rvr.mjs';
import { actionBytes } from '../src/adapters/interpoll.mjs';
// Public synthetic fixture seed, never a deployed credential.
const key=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.alloc(32,1)]),format:'der',type:'pkcs8'});
export const publicKey=createPublicKey(key).export({format:'der',type:'spki'}).toString('base64');
export function seal(pair) {
  const {request,bundle}=pair;
  bundle.statement.policy={id:request.policy.id,version:request.policy.version,digest:digest(request.policy)};
  bundle.statement.payload_digest=digest(bundle.payload);
  bundle.signature_base64=sign(null,signingBytes(bundle.statement),key).toString('base64');
  return pair;
}
export function resign(pair) {pair.bundle.statement.payload_digest=digest(pair.bundle.payload);pair.bundle.signature_base64=sign(null,signingBytes(pair.bundle.statement),key).toString('base64');return pair;}
export function attach(pair,roles) {
  pair.bundle.statement.evidence_manifest=roles.map(({id,role,bytes})=>({id,role,digest:sha256(bytes),size:bytes.length}));
  pair.bundle.evidence=roles.map(({id,bytes})=>({id,bytes_base64:bytes.toString('base64')}));
  return seal(pair);
}
export async function baseline(options={}) {
  const artifact=Buffer.from('ReceiptOS Verify synthetic artifact\n');
  const blob=gitObjectId('blob',artifact);
  const treeBytes=Buffer.concat([Buffer.from('100644 result.txt\0'),Buffer.from(blob,'hex')]);
  const tree=gitObjectId('tree',treeBytes);
  const commitBytes=Buffer.from(`tree ${tree}\nauthor Synthetic Fixture <fixture@example.invalid> 0 +0000\ncommitter Synthetic Fixture <fixture@example.invalid> 0 +0000\n\nSynthetic evidence only\n`);
  const commit=gitObjectId('commit',commitBytes);
  const subject={kind:'git-artifact',id:'demo:receiptos',artifact_digest:sha256(artifact),commit,tree,artifact_path:'result.txt',version:'1'};
  const claim={kind:'SHA256_EQUALS',expected_digest:options.negative?'0'.repeat(64):sha256(artifact)};
  const semantic={claim_type:'artifact-digest',authority_class:'INDEPENDENT_RECOMPUTATION',subject:subject.id,scope:{artifact_path:'result.txt'},valid_after:0,valid_until:100,assumptions:[],evidence_requirements:['artifact','execution']};
  const request={schema:'receiptos.verify.request.v1',verification_profile:'receiptos.verify.git-artifact.v1',claim:structuredClone(claim),subject:structuredClone(subject),policy:{id:'local-v1',version:'1',trusted_keys:[{id:'synthetic-demo',spki_base64:publicKey}],required_layers:['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'],minimum_grade:'LOCAL_RECOMPUTATION',verification_time:1},evidence:[],semantic_requirement:structuredClone(semantic),requested_guarantees:[]};
  const rvr=await buildRvrEvidence(artifact.toString('base64'),claim.expected_digest,options);
  const bundle={schema:'receiptos.verify.bundle.v1',canonicalization_profile:'receiptos.verify.canonical-json.v1',statement:{schema:'receiptos.verify.statement.v1',verification_profile:request.verification_profile,subject,claim,policy:{},semantic_contract:semantic,asserted_result:options.negative?'FAIL':'PASS',evidence_manifest:[],payload_digest:'0'.repeat(64),crypto:{provider:'ed25519',key_id:'synthetic-demo'}},signature_base64:'',evidence:[],payload:{crystal:await buildCrystalEvidence(),rvr,relations:{guarantee:null,continuity:null,domain:null,execution:{package_present:true,runner_declared:true,executed:true,subject_digest:digest(subject),executable_pin:rvrDescriptor.sourceCommit,evidence_grade:'LOCAL_RECOMPUTATION'}}}};
  return attach({request,bundle},[{id:'artifact',role:'artifact',bytes:artifact},{id:'commit',role:'git-commit',bytes:commitBytes},{id:'tree',role:'git-tree',bytes:treeBytes},{id:'native-result',role:'native-result',bytes:canonicalize(rvr.originalBundle.canonicalResult)}]);
}
export function signedAction(value='up') {
  const privateKey=Buffer.alloc(32,2);
  const action={version:1,namespace:'v1',kind:'reaction',actor:Buffer.from(schnorr.getPublicKey(privateKey)).toString('hex'),targetType:'post',targetId:'synthetic-post',value,createdAt:1,nonce:'0'.repeat(32)};
  action.id=sha256(actionBytes(action));action.signature=Buffer.from(schnorr.sign(Buffer.from(action.id,'hex'),privateKey,Buffer.alloc(32,3))).toString('hex');return action;
}
