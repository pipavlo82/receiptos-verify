import { canonicalize, result } from '../core/common.mjs';
export const SUCCESS_V2 = Object.freeze({INTEGRITY:['VERIFIED'],AUTHENTICITY:['VERIFIED'],SUBJECT_BINDING:['VERIFIED'],
  RECOMPUTATION:['REPRODUCED'],EVIDENCE_SUFFICIENCY:['SUFFICIENT'],SEMANTIC_COMPATIBILITY:['COMPATIBLE'],
  GUARANTEE_PRESERVATION:['PRESERVED'],CONTINUITY:['PRESERVED','VERIFIED'],DOMAIN_ADAPTERS:['VERIFIED','PRESERVED']});
export const REQUIRED_V2 = ['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'];
const record = value => value!==null && typeof value==='object' && !Array.isArray(value) && [null,Object.prototype].includes(Object.getPrototypeOf(value));
const productStatuses = ['VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE','REJECTED_MALFORMED','UNSUPPORTED_PROFILE'];
function validProductProjection(value) {
  return record(value) && Object.keys(value).length===2 && Object.hasOwn(value,'status') && Object.hasOwn(value,'reasonCodes')
    && productStatuses.includes(value.status) && Array.isArray(value.reasonCodes) && value.reasonCodes.every(code=>typeof code==='string'&&code);
}
const statuses = {
  INPUT:['ADMITTED','REJECTED_MALFORMED'],CANONICALIZATION:['VERIFIED'],INTEGRITY:['VERIFIED','REJECTED_MALFORMED','CANNOT_RECOMPUTE','INSUFFICIENT_EVIDENCE'],
  AUTHENTICITY:['VERIFIED','CONTRADICTED','NOT_ESTABLISHED'],SUBJECT_BINDING:['VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE'],
  RECOMPUTATION:['REPRODUCED','DIVERGED','CANNOT_RECOMPUTE','CONTRADICTED','REJECTED_MALFORMED','INSUFFICIENT_EVIDENCE','UNSUPPORTED'],
  EVIDENCE_SUFFICIENCY:['SUFFICIENT','INSUFFICIENT'],SEMANTIC_COMPATIBILITY:['COMPATIBLE','CONTRADICTED','INSUFFICIENT_EVIDENCE','UNSUPPORTED'],
  GUARANTEE_PRESERVATION:['PRESERVED','VIOLATED','UNVERIFIABLE','NOT_REQUESTED'],CONTINUITY:['PRESERVED','VERIFIED','VIOLATED','UNVERIFIABLE','NOT_REQUESTED'],
  DOMAIN_ADAPTERS:['VERIFIED','PRESERVED','CONTRADICTED','VIOLATED','UNVERIFIABLE','NOT_ESTABLISHED','INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE','REJECTED_MALFORMED','UNSUPPORTED','UNSUPPORTED_PROFILE','NOT_REQUESTED'],
  PRODUCT_PROJECTION:['VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE','REJECTED_MALFORMED','UNSUPPORTED_PROFILE'],EXPLAINABLE_REPORT:['GENERATED'],PROVENANCE:['RECORDED'],
};
function valid(layers) {
  try {canonicalize(layers);} catch {return false;}
  if (!record(layers) || Object.keys(layers).length!==Object.keys(statuses).length) return false;
  return Object.entries(statuses).every(([name,allowed])=>{
    const property=Object.getOwnPropertyDescriptor(layers,name), value=property?.value;
    if (!property || !Object.hasOwn(property,'value') || !record(value)) return false;
    const native=Object.getOwnPropertyDescriptor(value,'nativeResult');
    if (!native || !Object.hasOwn(native,'value')) return false;
    if (name==='RECOMPUTATION' && Object.hasOwn(value,'semanticOutcome') && !['VERIFIED','REFUTED','UNVERIFIABLE',null].includes(value.semanticOutcome)) return false;
    if (name==='GUARANTEE_PRESERVATION' && Object.hasOwn(value,'productProjection') && !validProductProjection(value.productProjection)) return false;
    const status=Object.getOwnPropertyDescriptor(value,'status'), codes=Object.getOwnPropertyDescriptor(value,'reasonCodes');
    return status && Object.hasOwn(status,'value') && ['NOT_RUN',...allowed].includes(status.value)
      && codes && Object.hasOwn(codes,'value') && Array.isArray(codes.value) && codes.value.every(code=>typeof code==='string'&&code);
  });
}
export function projectV2(layers, required, supported=true) {
  try { canonicalize(required); } catch { return result('REJECTED_MALFORMED',['PROJECTION_INPUT_MALFORMED']); }
  if (!valid(layers) || !Array.isArray(required) || new Set(required).size!==required.length || required.some(name=>!Object.hasOwn(SUCCESS_V2,name)) || typeof supported!=='boolean') {
    return result('REJECTED_MALFORMED',['PROJECTION_INPUT_MALFORMED']);
  }
  const prfProjection = layers.GUARANTEE_PRESERVATION.productProjection ?? null; // V02_MUTATE prf-product
  const all = [...Object.values(layers),...(prfProjection===null?[]:[prfProjection])], reasons = [...new Set(all.flatMap(value=>value.reasonCodes))];
  const obligations = [...new Set([...REQUIRED_V2,...required])];
  const requiredPrf = obligations.includes('GUARANTEE_PRESERVATION') ? prfProjection : null;
  if (all.some(value=>value.status==='REJECTED_MALFORMED')) return result('REJECTED_MALFORMED',reasons);
  if (all.some(value=>['CONTRADICTED','INCOMPATIBLE','VIOLATED'].includes(value.status))) return result('CONTRADICTED',reasons); // V02_MUTATE contradiction
  if (layers.RECOMPUTATION?.semanticOutcome==='REFUTED') return result('CONTRADICTED',[...reasons,'NATIVE_NEGATIVE_RESULT']); // V02_MUTATE reproduced
  if (!supported || requiredPrf?.status==='UNSUPPORTED_PROFILE' || obligations.some(name=>['UNSUPPORTED','UNSUPPORTED_PROFILE'].includes(layers[name]?.status))) return result('UNSUPPORTED_PROFILE',[...reasons,'UNSUPPORTED_PROFILE']);
  if (requiredPrf?.status==='CANNOT_RECOMPUTE' || obligations.some(name=>['CANNOT_RECOMPUTE','DIVERGED'].includes(layers[name]?.status))) return result('CANNOT_RECOMPUTE',reasons);
  if (layers.INPUT?.status!=='ADMITTED' || layers.CANONICALIZATION?.status!=='VERIFIED'
      || layers.RECOMPUTATION?.semanticOutcome!=='VERIFIED' // V02_MUTATE positive
      || requiredPrf!==null && requiredPrf.status!=='VERIFIED'
      || obligations.some(name=>!SUCCESS_V2[name].includes(layers[name]?.status))) return result('INSUFFICIENT_EVIDENCE',reasons.length?reasons:['REQUIRED_LAYER_NOT_ESTABLISHED']);
  return result('VERIFIED',reasons);
}
