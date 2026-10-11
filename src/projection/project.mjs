import { result } from '../core/common.mjs';
export const SUCCESS={INTEGRITY:['VERIFIED'],AUTHENTICITY:['VERIFIED'],SUBJECT_BINDING:['VERIFIED'],RECOMPUTATION:['REPRODUCED'],EVIDENCE_SUFFICIENCY:['SUFFICIENT'],SEMANTIC_COMPATIBILITY:['COMPATIBLE'],GUARANTEE_PRESERVATION:['PRESERVED'],CONTINUITY:['PRESERVED','VERIFIED'],DOMAIN_ADAPTERS:['VERIFIED','PRESERVED']};
export function project(layers,required,profileSupported=true) {
  const all=Object.values(layers);
  const reasons=[...new Set(all.flatMap(l=>l?.reasonCodes??[]))];
  if(all.some(l=>l?.status==='REJECTED_MALFORMED')) return result('REJECTED_MALFORMED',reasons);
  if(!profileSupported||required.some(k=>layers[k]?.status==='UNSUPPORTED')) return result('UNSUPPORTED_PROFILE',[...reasons,'UNSUPPORTED_PROFILE']);
  if(all.some(l=>['CONTRADICTED','INCOMPATIBLE','VIOLATED'].includes(l?.status))) return result('CONTRADICTED',reasons);
  if(layers.RECOMPUTATION?.semanticOutcome==='REFUTED') return result('CONTRADICTED',[...reasons,'NATIVE_NEGATIVE_RESULT']); // MUTATE: replay-positive
  const independentPremises=['EVIDENCE_MISSING','SIGNER_NOT_TRUSTED','EVIDENCE_GRADE_NOT_ESTABLISHED','DEPENDENCY_BASIS_NOT_SEPARATELY_ACCEPTED','GUARANTEE_AUTHORITY_UNESTABLISHED','GUARANTEE_ASSUMPTION_UNESTABLISHED','UPSTREAM_GUARANTEE_UNESTABLISHED'];
  if(layers.AUTHENTICITY?.status==='NOT_ESTABLISHED'||reasons.some(r=>independentPremises.includes(r))) return result('INSUFFICIENT_EVIDENCE',reasons);
  if(required.some(k=>['CANNOT_RECOMPUTE','DIVERGED'].includes(layers[k]?.status))&&!reasons.includes('EVIDENCE_MISSING')) return result('CANNOT_RECOMPUTE',reasons); // MUTATE: crash-kill
  if(required.some(k=>['INSUFFICIENT','INSUFFICIENT_EVIDENCE','UNVERIFIABLE','NOT_ESTABLISHED'].includes(layers[k]?.status))) return result('INSUFFICIENT_EVIDENCE',reasons);
  if(!Array.isArray(required)||!required.length||required.some(k=>!SUCCESS[k]?.includes(layers[k]?.status))) return result('INSUFFICIENT_EVIDENCE',[...reasons,'REQUIRED_LAYER_NOT_ESTABLISHED']);
  return result('VERIFIED',reasons);
}
