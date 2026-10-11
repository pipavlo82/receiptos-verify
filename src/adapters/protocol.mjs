import { result } from '../core/common.mjs';
export const OPERATIONS=['inspect','verify_integrity','verify_authenticity','bind_subject','recompute','evaluate_evidence','semantic_contract','guarantee_projection','provenance'];
export function adapterProtocol(descriptor,operations={}) {
  if(!descriptor?.profileId||!descriptor.sourceCommit||!['STABLE','EXPERIMENTAL','HISTORICAL'].includes(descriptor.maturity)) throw new Error('ADAPTER_DESCRIPTOR_MALFORMED');
  return Object.freeze({descriptor,...Object.fromEntries(OPERATIONS.map(op=>[op,operations[op]??(()=>result('UNSUPPORTED',['ADAPTER_OPERATION_UNSUPPORTED'],{operation:op}))]))});
}
