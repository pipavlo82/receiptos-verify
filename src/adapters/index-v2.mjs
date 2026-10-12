import { adapterProtocol } from './protocol.mjs';
import * as crystal from './crystal.mjs';
import * as rvr from './rvr.mjs';
import * as semantic from './semantic-abi-v2.mjs';
import * as trustless from './trustless.mjs';
import * as interpoll from './interpoll-v2.mjs';
import * as prf from './prf-v2.mjs';
import * as chronicle from './chronicle.mjs';
import * as ledger from './ledger.mjs';
const registrations=[
  [crystal.descriptor,{verify_integrity:crystal.verifyIntegrity}],
  [rvr.descriptor,{recompute:rvr.recompute}],
  [semantic.descriptor,{semantic_contract:semantic.evaluateSemanticAbi}],
  [trustless.descriptor,{recompute:trustless.evaluateTrustless}],
  [interpoll.descriptor,{verify_authenticity:interpoll.evaluateInterpollV2}],
  [prf.descriptor,{guarantee_projection:prf.evaluatePrfV2}],
  [chronicle.descriptor,{inspect:chronicle.evaluateContinuity}],
  [{...ledger.descriptor,maturity:'INTERFACE_ONLY'},{inspect:ledger.inspectAnchor}],
];
export const adaptersV2=registrations.map(([descriptor,operations])=>adapterProtocol(descriptor,{...operations,provenance:()=>descriptor}));
export function inspectAdaptersV2(){return adaptersV2.map(adapter=>adapter.descriptor);}
