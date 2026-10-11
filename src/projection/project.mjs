import { result } from '../core/common.mjs';
export const SUCCESS={INTEGRITY:['VERIFIED'],AUTHENTICITY:['VERIFIED'],SUBJECT_BINDING:['VERIFIED'],RECOMPUTATION:['REPRODUCED'],EVIDENCE_SUFFICIENCY:['SUFFICIENT'],SEMANTIC_COMPATIBILITY:['COMPATIBLE'],GUARANTEE_PRESERVATION:['PRESERVED'],CONTINUITY:['PRESERVED','VERIFIED'],DOMAIN_ADAPTERS:['VERIFIED','PRESERVED']};
const MANDATORY=['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'];
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[null,Object.prototype].includes(Object.getPrototypeOf(value));
function admittedLayer(layer) {
  if(!record(layer)) return false;
  const fields=Object.getOwnPropertyDescriptors(layer);
  if(Object.values(fields).some(field=>!Object.hasOwn(field,'value'))) return false;
  return typeof fields.status?.value==='string'&&fields.status.value.length>0
    &&Array.isArray(fields.reasonCodes?.value)&&fields.reasonCodes.value.every(reason=>typeof reason==='string'&&reason.length>0);
}
export function project(layers,required,profileSupported=true) {
  if(!record(layers)||!Array.isArray(required)||required.some(name=>typeof name!=='string'||!name)
    ||typeof profileSupported!=='boolean'||!Object.values(layers).every(admittedLayer)) {
    return result('REJECTED_MALFORMED',['PROJECTION_INPUT_MALFORMED']);
  }
  const all=Object.values(layers);
  const reasons=[...new Set(all.flatMap(l=>l?.reasonCodes??[]))];
  if(all.some(l=>l?.status==='REJECTED_MALFORMED')) return result('REJECTED_MALFORMED',reasons);
  const obligations=[...new Set([...MANDATORY,...required])];
  if(!profileSupported||obligations.some(k=>layers[k]?.status==='UNSUPPORTED')) return result('UNSUPPORTED_PROFILE',[...reasons,'UNSUPPORTED_PROFILE']);
  if(all.some(l=>['CONTRADICTED','INCOMPATIBLE','VIOLATED'].includes(l?.status))) return result('CONTRADICTED',reasons);
  if(layers.RECOMPUTATION?.semanticOutcome==='REFUTED') return result('CONTRADICTED',[...reasons,'NATIVE_NEGATIVE_RESULT']); // MUTATE: replay-positive
  if(reasons.includes('ASSERTED_NATIVE_RESULT_CONTRADICTION')) return result('CONTRADICTED',reasons);
  const independentPremises=['EVIDENCE_MISSING','SIGNER_NOT_TRUSTED','EVIDENCE_GRADE_NOT_ESTABLISHED','DEPENDENCY_BASIS_NOT_SEPARATELY_ACCEPTED','GUARANTEE_AUTHORITY_UNESTABLISHED','GUARANTEE_ASSUMPTION_UNESTABLISHED','UPSTREAM_GUARANTEE_UNESTABLISHED'];
  if(layers.AUTHENTICITY?.status==='NOT_ESTABLISHED'||reasons.some(r=>independentPremises.includes(r))) return result('INSUFFICIENT_EVIDENCE',reasons);
  if(obligations.some(k=>['CANNOT_RECOMPUTE','DIVERGED'].includes(layers[k]?.status))&&!reasons.includes('EVIDENCE_MISSING')) return result('CANNOT_RECOMPUTE',reasons); // MUTATE: crash-kill
  if(obligations.some(k=>['INSUFFICIENT','INSUFFICIENT_EVIDENCE','UNVERIFIABLE','NOT_ESTABLISHED'].includes(layers[k]?.status))) return result('INSUFFICIENT_EVIDENCE',reasons);
  if(!required.length||layers.INPUT?.status!=='ADMITTED'||layers.CANONICALIZATION?.status!=='VERIFIED'
    ||layers.RECOMPUTATION?.semanticOutcome!=='VERIFIED'||obligations.some(k=>!SUCCESS[k]?.includes(layers[k]?.status))) return result('INSUFFICIENT_EVIDENCE',[...reasons,'REQUIRED_LAYER_NOT_ESTABLISHED']);
  return result('VERIFIED',reasons);
}
