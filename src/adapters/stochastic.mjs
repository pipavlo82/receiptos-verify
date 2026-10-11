import { digest, sha256, base64, result } from '../core/common.mjs';
export const descriptor={profileId:'receiptos.verify.stochastic-artifact.v1',sourceRepository:'pipavlo82/r4-saas-api',sourceCommit:'7815fd84dd7eb9347b8399719cfeff941ff8df2a',license:'No default-branch code grant; original ReceiptOS extension',maturity:'EXPERIMENTAL',integrationMode:'ORIGINAL_PRODUCT_EXTENSION_WITH_HISTORICAL_INTERFACE_CONTEXT',limitations:['The cited R4 endpoint is context only; no upstream R4 sampling algorithm is copied or claimed.'],capabilities:['committed-byte-stream','cursor','candidate-binding','domain-separation'],requiredEvidence:['committed_stream','candidate_set','cursor'],nativeVocabulary:['REPRODUCED','DIVERGED','CANNOT_RECOMPUTE']};
export function evaluateStochastic(input) {
  try {
    const bytes=base64(input.stream_base64);
    if(!bytes.length||sha256(bytes)!==input.stream_digest||!Number.isSafeInteger(input.cursor)||input.cursor<0||input.cursor>=bytes.length||input.domain!=='receiptos.verify.stochastic.v1'||!Array.isArray(input.candidates)||!input.candidates.length||digest(input.candidates)!==input.candidate_set_digest) return result('REJECTED_MALFORMED',['STOCHASTIC_COMMITMENT_MALFORMED']);
    // Fresh product profile: one byte consumed, no unbiased sampling or entropy claim.
    const selected=input.candidates[bytes[input.cursor]%input.candidates.length];
    if(digest(selected)!==digest(input.selected)) return result('CONTRADICTED',['STOCHASTIC_SELECTION_DIVERGED'],{selected});
    return result('UNVERIFIABLE',['STOCHASTIC_PROVENANCE_NOT_ESTABLISHED'],{replay:'REPRODUCED',selected,next_cursor:input.cursor+1,provenance:'NOT_ESTABLISHED',authenticity:'NOT_ESTABLISHED'}, {limitations:['Deterministic selection only. Modulo bias exists; no entropy, randomness quality or provider provenance claim.']});
  } catch {return result('REJECTED_MALFORMED',['STOCHASTIC_COMMITMENT_MALFORMED']);}
}
