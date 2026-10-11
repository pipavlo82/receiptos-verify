import { createPublicKey, verify } from 'node:crypto';
import { canonicalize, sha256, base64, result } from './common.mjs';
export function signingBytesV2(statement) {
  return Buffer.concat([Buffer.from('receiptos.verify.statement.v2\0','ascii'),Buffer.from(sha256(canonicalize(statement)),'hex')]);
}
export function verifyAuthenticityV2(request,bundle) {
  if (bundle.statement.crypto.provider !== 'ed25519') return result('NOT_ESTABLISHED',['UNSUPPORTED_CRYPTO_PROVIDER']);
  const keys = request.policy.trusted_keys.filter(key=>key.id===bundle.statement.crypto.key_id);
  if (keys.length !== 1) return result('NOT_ESTABLISHED',['SIGNER_NOT_TRUSTED']);
  try {
    const key = createPublicKey({key:base64(keys[0].spki_base64),format:'der',type:'spki'});
    const signature = base64(bundle.signature_base64);
    const valid = key.asymmetricKeyType==='ed25519' && signature.length===64 && verify(null,signingBytesV2(bundle.statement),key,signature);
    return result(valid?'VERIFIED':'CONTRADICTED',valid?[]:['INVALID_SIGNATURE'],{provider:'ed25519',key_id:bundle.statement.crypto.key_id,boundary:'Authenticates the supplied statement, not arbitrary semantic authority.'});
  } catch { return result('CONTRADICTED',['INVALID_SIGNATURE']); }
}
