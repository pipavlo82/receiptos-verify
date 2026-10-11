import { createPublicKey, verify } from 'node:crypto';
import { canonicalize, sha256, base64, result } from './common.mjs';
export function signingBytes(statement) {return Buffer.concat([Buffer.from('receiptos.verify.statement.v1\0','ascii'),Buffer.from(sha256(canonicalize(statement)),'hex')]);}
export function verifyAuthenticity(request,bundle) {
  const crypto=bundle.statement.crypto;
  if (crypto.provider !== 'ed25519') return result('NOT_ESTABLISHED',['UNSUPPORTED_CRYPTO_PROVIDER']);
  const candidates=request.policy.trusted_keys.filter(k=>k.id===crypto.key_id);
  if (candidates.length!==1) return result('NOT_ESTABLISHED',['SIGNER_NOT_TRUSTED']);
  try {
    const key=createPublicKey({key:base64(candidates[0].spki_base64),format:'der',type:'spki'});
    const signature=base64(bundle.signature_base64);
    const valid=key.asymmetricKeyType==='ed25519' && signature.length===64 && verify(null,signingBytes(bundle.statement),key,signature);
    return result(valid?'VERIFIED':'CONTRADICTED',valid?[]:['INVALID_SIGNATURE'],{provider:'ed25519',key_id:crypto.key_id,key_scope:'caller-selected trust policy'});
  } catch {return result('CONTRADICTED',['INVALID_SIGNATURE']);}
}
