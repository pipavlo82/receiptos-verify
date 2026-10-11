import { adapterProtocol } from './protocol.mjs';
import * as crystal from './crystal.mjs';
import * as rvr from './rvr.mjs';
import * as semantic from './semantic_abi.mjs';
import * as prf from './prf.mjs';
import * as chronicle from './chronicle.mjs';
import * as kit from './recompute_kit.mjs';
import * as qev from './qev.mjs';
import * as qevMoth from './qev_moth.mjs';
import * as interpoll from './interpoll.mjs';
import * as pq from './pq.mjs';
import * as stochastic from './stochastic.mjs';
import * as ledger from './ledger.mjs';
const registrations=[
 [crystal,{verify_integrity:crystal.verifyIntegrity}], [rvr,{recompute:rvr.recompute}],
 [semantic,{semantic_contract:semantic.evaluateSemantic}], [prf,{guarantee_projection:prf.evaluateGuarantees}],
 [chronicle,{inspect:chronicle.evaluateContinuity}], [kit,{evaluate_evidence:kit.evaluateExecution}],
 [qev,{recompute:qev.evaluateQev}], [qevMoth,{recompute:qevMoth.evaluateQevMoth}], [interpoll,{verify_authenticity:interpoll.inspectAction,guarantee_projection:interpoll.evaluateActionRetry}],
 [pq,{inspect:pq.inspectVectorPack}], [stochastic,{recompute:stochastic.evaluateStochastic}], [ledger,{inspect:ledger.inspectAnchor}],
];
export const adapters=registrations.map(([module,operations])=>adapterProtocol(module.descriptor,{...operations,provenance:()=>module.descriptor}));
export function inspectAdapters() {return adapters.map(a=>a.descriptor);}
