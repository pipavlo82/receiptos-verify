import { base64, HEX, result } from '../core/common.mjs';
export const descriptor={profileId:'receiptos.verify.crypto-provider.v1',sourceRepository:'pipavlo82/pq-receipt-profile',sourceCommit:'54cf1a3784a56f4624b41357148bbe9ba301c470',license:'Independent public-profile implementation; no upstream code copied',maturity:'EXPERIMENTAL',capabilities:['crypto-provider-boundary','temporal-authority','vector-pack-admission'],requiredEvidence:['public_key','signature','message','authority'],nativeVocabulary:['VALID','INVALID','NOT_ESTABLISHED','UNSUPPORTED']};
const temporalLimitations = [
  'This is a bounded product interval/revocation gate over caller-supplied authority premises, not complete upstream event-time or earliest-anchor-history verification.',
  'A registered REAL_CRYPTO provider supplies the cryptographic result. Provider kind declarations and test callbacks do not establish a real ML-DSA backend or PQ conformance.',
];
const cryptoResult = (status, reasons, native = null) => result(status, reasons, native, {limitations:[...temporalLimitations],provenance:{...descriptor}});
const nonempty = value => typeof value === 'string' && value.length > 0;
const timestamp = value => Number.isSafeInteger(value) && value >= 0;
export class CryptoProviders {
  #providers=new Map();
  register(id,provider) {
    if(!id||this.#providers.has(id)||typeof provider.verify!=='function'||!['REAL_CRYPTO','MOCK','STRUCTURAL'].includes(provider.kind)) throw new Error('INVALID_PROVIDER');
    this.#providers.set(id,provider);return this;
  }
  async verify(input,now) {
    const provider=this.#providers.get(input?.provider);
    if(!provider) return cryptoResult('UNSUPPORTED',['CRYPTO_PROVIDER_NOT_IMPLEMENTED']);
    const authority=input.authority;
    if(!authority||typeof authority!=='object'||Array.isArray(authority)
      ||!['key_id','valid_after','valid_until','revoked'].every(key=>Object.hasOwn(authority,key))
      ||!nonempty(input.key_id)||!nonempty(authority.key_id)||authority.key_id!==input.key_id
      ||!timestamp(now)||!timestamp(authority.valid_after)||!timestamp(authority.valid_until)
      ||authority.valid_after>=authority.valid_until||now<authority.valid_after||now>=authority.valid_until
      ||authority.revoked!==false) return cryptoResult('UNVERIFIABLE',['TEMPORAL_KEY_AUTHORITY_NOT_ESTABLISHED']);
    const native=await provider.verify(input);
    if(provider.kind!=='REAL_CRYPTO') return cryptoResult('UNVERIFIABLE',['MOCK_OR_STRUCTURAL_NOT_CRYPTOGRAPHIC_VERIFICATION'],native);
    return cryptoResult(native?.valid===true?'VERIFIED':native?.valid===false?'CONTRADICTED':'UNVERIFIABLE',[],native);
  }
}
export function inspectVectorPack(pack) {
  if(!pack||!Array.isArray(pack.vectors)||!pack.vectors.length) return result('UNVERIFIABLE',['EMPTY_VECTOR_PACK']);
  try {for(const v of pack.vectors) {if(!HEX.test(v.message_digest)||base64(v.signature_base64).length===0) throw new Error();}}
  catch {return result('REJECTED_MALFORMED',['CRYPTO_VECTOR_MALFORMED']);}
  return result('UNVERIFIABLE',['STRUCTURE_ONLY_NOT_CONFORMANCE'],{vector_count:pack.vectors.length,conformance:'NOT_ESTABLISHED'});
}
