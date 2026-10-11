import { result } from '../core/common.mjs';
export const descriptor={profileId:'receiptos.verify.ledger-anchor.v1',sourceRepository:'pipavlo82/crystal-receipt',sourceCommit:'45b46bf7df3a60b32583291f577a36bf19d22f00',license:'Apache-2.0',maturity:'EXPERIMENTAL',capabilities:['offchain','ethereum-interface','xrpl-interface'],requiredEvidence:['anchor','independent-ledger-observation'],nativeVocabulary:['UNANCHORED','NOT_ESTABLISHED','UNSUPPORTED']};
export function inspectAnchor(anchor) {
  if(!anchor||anchor.kind==='offchain') return result('NOT_ESTABLISHED',['OFFCHAIN_UNANCHORED'],{kind:'offchain'});
  if(!['ethereum','xrpl'].includes(anchor.kind)) return result('UNSUPPORTED',['LEDGER_UNSUPPORTED']);
  return result('UNSUPPORTED',['LIVE_LEDGER_ADAPTER_NOT_IMPLEMENTED'],anchor,{limitations:['A transaction identifier or producer label is not independently verified inclusion/finality.']});
}
