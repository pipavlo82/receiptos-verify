import { schnorr } from '@noble/curves/secp256k1.js';
import { sha256, equal, result } from '../core/common.mjs';
export const descriptor={profileId:'receiptos.verify.interpoll-action.v1',sourceRepository:'Interpoll1/decentralised',sourceCommit:'23c8c7b5b9803d906ea8ba62772104ebdae488e8',license:'Unlicense',maturity:'EXPERIMENTAL',capabilities:['signed-action','exact-retry','committed-attempts'],requiredEvidence:['authorized_action','accepted_action','attempts'],nativeVocabulary:['accepted','duplicate']};
export function actionBytes(a) {return Buffer.from(JSON.stringify(['interpoll.public-engagement.v1',1,a.namespace,a.kind,a.actor,a.targetType,a.targetId,a.value,a.createdAt,a.nonce]));}
function valid(a) {
  const fields=['version','namespace','kind','actor','targetType','targetId','value','createdAt','nonce','id','signature'];
  return a&&Object.keys(a).length===fields.length&&fields.every(k=>Object.hasOwn(a,k))&&a.version===1&&/^v[1-9][0-9]{0,3}$/.test(a.namespace)&&/^[0-9a-f]{64}$/.test(a.actor)&&/^[a-z0-9_.:-]{1,128}$/.test(a.targetId)&&Number.isSafeInteger(a.createdAt)&&a.createdAt>=0&&/^[0-9a-f]{32}$/.test(a.nonce)&&((a.kind==='reaction'&&['post','comment'].includes(a.targetType)&&['up','down','none'].includes(a.value))||(a.kind==='view'&&['post','poll'].includes(a.targetType)&&a.value==='view'))&&/^[0-9a-f]{64}$/.test(a.id)&&/^[0-9a-f]{128}$/.test(a.signature);
}
export function inspectAction(a,expected={}) {
  try {
    if(!valid(a)) return result('REJECTED_MALFORMED',['ACTION_MALFORMED']);
    const signature=schnorr.verify(Buffer.from(a.signature,'hex'),Buffer.from(a.id,'hex'),Buffer.from(a.actor,'hex'))&&sha256(actionBytes(a))===a.id;
    if(!signature) return result('CONTRADICTED',['ACTION_SIGNATURE_INVALID']);
    if(Object.entries(expected).some(([k,v])=>a[k]!==v)) return result('CONTRADICTED',['ACTION_AUTHORITY_MISMATCH']); // MUTATE: any-signature
    return result('VERIFIED',[],{signature:'VALID',key_control_only:true,fresh_admission:'NOT_EVALUATED'});
  } catch {return result('REJECTED_MALFORMED',['ACTION_MALFORMED']);}
}
export function evaluateActionRetry(input) {
  if(!input||!Array.isArray(input.attempts)||!input.attempts.length) return result('UNVERIFIABLE',['RETRY_EVIDENCE_MISSING']);
  const signed=inspectAction(input.authorized_action,input.expected_authority);
  if(signed.status!=='VERIFIED') return signed;
  const exact=[input.accepted_action,...input.attempts.map(a=>a.action)].every(a=>equal(a,input.authorized_action)); // MUTATE: retry-action
  if(!exact) return result('VIOLATED',['RETRY_AUTHORIZED_ACTION_CHANGED'],input,{authorization:signed});
  if(input.attempts.some(a=>!['accepted','duplicate'].includes(a.status))||input.committed_evidence!==true) return result('UNVERIFIABLE',['RETRY_COMMITMENT_NOT_ESTABLISHED'],input);
  return result('PRESERVED',[],input,{authorization:signed,limitations:['No deployment, SQL atomicity, target existence, human uniqueness or actual viewing established.','Historical signature verification does not establish fresh admission.']});
}
