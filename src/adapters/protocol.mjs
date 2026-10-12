import { result } from '../core/common.mjs';
import { inspectBindingContract } from '../core/binding-contract.mjs';
export const OPERATIONS=['inspect','verify_integrity','verify_authenticity','bind_subject','recompute','evaluate_evidence','semantic_contract','guarantee_projection','provenance'];
export function adapterProtocol(descriptor,operations={},options={}) {
  if(!descriptor?.profileId||!descriptor.sourceCommit||!['STABLE','EXPERIMENTAL','HISTORICAL','INTERFACE_ONLY'].includes(descriptor.maturity)) throw new Error('ADAPTER_DESCRIPTOR_MALFORMED');
  const bindingInterface=inspectBindingContract(descriptor);
  if(['MALFORMED','UNSUPPORTED'].includes(bindingInterface.status)) throw new Error('ADAPTER_BINDING_CONTRACT_MALFORMED');
  if(options.requireBindingContract&&bindingInterface.status!=='DECLARED') throw new Error('ADAPTER_BINDING_CONTRACT_REQUIRED');
  return Object.freeze({descriptor,bindingInterface:Object.freeze(bindingInterface),...Object.fromEntries(OPERATIONS.map(op=>[op,operations[op]??(()=>result('UNSUPPORTED',['ADAPTER_OPERATION_UNSUPPORTED'],{operation:op}))]))});
}
