# ReceiptOS Verify product contract v1

All new implementation lives in this new local repository. Existing upstreams are read-only. Native formats and results are preserved behind adapters; product fields below are new and do not rename a native Crystal root or RVR verdict. Public neutral specifications only; private/commercial Vértice implementation is excluded.

## Entry point and documents

`verify(request, bundle)` is asynchronous and returns a report. CLI reads TWO separately selected JSON files. Raw-document intake uses strict JSON: duplicate/prototype keys, non-ASCII or control keys, floats, exponent tokens, unsafe integers, negative zero, invalid UTF-8/scalars, excess depth/size are rejected. The product restricted canonical JSON profile is `receiptos.verify.canonical-json.v1`; native adapters keep their own canonicalization. The new canonicalizer does not claim RFC8785 equivalence.

Request:
```
{
 schema:"receiptos.verify.request.v1",
 verification_profile:"receiptos.verify.git-artifact.v1",
 claim:{kind:"SHA256_EQUALS",expected_digest:<64 lowercase hex>},
 subject:{kind:"git-artifact",id:"demo:receiptos",artifact_digest:<64hex>,commit:<40hex>,tree:<40hex>,artifact_path:"result.txt",version:"1"},
 policy:{id:"local-v1",version:"1",trusted_keys:[{id:"synthetic-demo",spki_base64:<DER Ed25519 SPKI>}],
   required_layers:["INTEGRITY","AUTHENTICITY","SUBJECT_BINDING","RECOMPUTATION","EVIDENCE_SUFFICIENCY","SEMANTIC_COMPATIBILITY"],
   minimum_grade:"LOCAL_RECOMPUTATION",verification_time:0},
 semantic_requirement:{claim_type:"artifact-digest",authority_class:"INDEPENDENT_RECOMPUTATION",subject:<subject.id>,scope:{artifact_path:"result.txt"},valid_after:0,valid_until:100,assumptions:[],evidence_requirements:["artifact","execution"]},
 requested_guarantees:[]
}
```
Policy identity/version/digest are exact caller-selected values, not hints supplied by the receipt. Additional native-profile request fields, if needed, are explicitly declared in their profile schemas. Supported basic subjects use full Git identities and safe ASCII relative artifact paths. Other adapters use typed exact subjects appropriate to their domain; do not fabricate Git proof for them.

Bundle:
```
{
 schema:"receiptos.verify.bundle.v1", canonicalization_profile:"receiptos.verify.canonical-json.v1",
 statement:{schema:"receiptos.verify.statement.v1",verification_profile:<profile>,subject:<typed>,claim:<typed>,
   policy:{id:<id>,version:<version>,digest:<SHA256(canonical request.policy)>},
   semantic_contract:<same typed shape as semantic_requirement>,asserted_result:"PASS",
   evidence_manifest:[{id:"artifact",role:"artifact",digest:<64hex>,size:<integer>},...],
   payload_digest:<SHA256(canonical payload)>,crypto:{provider:"ed25519",key_id:"synthetic-demo"}},
 signature_base64:<64-byte signature>,
 evidence:[{id:<manifest id>,bytes_base64:<canonical base64 or null for unavailable committed bytes>}],
 payload:{crystal:<native evidence>,rvr:<native adapter input/saved receipt>,relations:{guarantee:null,continuity:null,domain:null,execution:null}}
}
```
Signature bytes: ASCII `receiptos.verify.statement.v1`, zero byte, binary SHA256 of canonical statement. Statement binds the native payload in full, including fields outside native roots. Native roots do not by themselves establish authenticity. Caller-selected trust keys only. No real keys in demos.

Manifest roles for the basic profile: artifact, git-commit, git-tree, native-result. All available attachment bytes must match digest/size. Missing roles are insufficient; committed but unavailable bytes are a replay barrier. Empty inventory cannot verify. Product statement/native payload disagreement is malformed. Git closure validates commit/tree/blob path membership, not official repository provenance. Requested A/B comparison remains independent of Git closure for the receipt's covered subject.

## Adapter protocol

Each adapter exports a self-describing `descriptor` with profileId, sourceRepository, sourceCommit, license, maturity (STABLE/EXPERIMENTAL/HISTORICAL), capabilities, requiredEvidence, nativeVocabulary. Implemented operations return `{status,reasonCodes,nativeResult,limitations,provenance}`; nativeResult is preserved. Unimplemented operations return UNSUPPORTED or NOT_REQUESTED explicitly. Never return a fabricated native positive.

Layer order and report slots: INPUT, CANONICALIZATION, INTEGRITY, AUTHENTICITY, SUBJECT_BINDING, RECOMPUTATION, EVIDENCE_SUFFICIENCY, SEMANTIC_COMPATIBILITY, GUARANTEE_PRESERVATION, CONTINUITY, DOMAIN_ADAPTERS, PRODUCT_PROJECTION, EXPLAINABLE_REPORT, PROVENANCE.

Adapters used by the host:

- `crystal.verifyIntegrity(nativeEvidence)` -> native root verification, plus `buildCrystalEvidence(...)` fixture support. Native inputs stay native.
- `rvr.recompute(nativeInput)` -> native verification outcome and REPRODUCED/DIVERGED/CANNOT_RECOMPUTE, raw stdout/stderr/exit status; `buildRvrEvidence(artifactBase64,expectedDigest,options)` for fresh synthetic fixture construction.
- `semantic_abi.evaluateSemantic(established, required, context)` -> COMPATIBLE/INCOMPATIBLE/UNVERIFIABLE with exact claim/authority/subject/scope/time/assumption/evidence checks. Context can carry independently observed evidence classes/authority; producer labels alone are not authority.
- `prf.evaluateGuarantees(upstreamGuarantees,requestedGuarantees,downstream,context)` -> PRESERVED/VIOLATED/UNVERIFIABLE/NOT_REQUESTED; required dependency, scope, authority, subject and exact obligation preserved. Experimental upstream PR14 remains marked experimental if open.
- `chronicle.evaluateContinuity(history,request)` -> native continuity classification plus historical/current query separation. Bind the entire admitted product observation envelope separately; do not claim native derived-entry equality binds all original bytes.
- Domain adapters declare typed operation inputs and return the same common result envelope, while preserving actual native outputs.

## Projection

Finite public summaries: VERIFIED, CONTRADICTED, INSUFFICIENT_EVIDENCE, CANNOT_RECOMPUTE, REJECTED_MALFORMED, UNSUPPORTED_PROFILE. Strict precedence: known malformed/integrity errors first; unsupported required profile; established binding/predicate/semantic/guarantee/action contradiction; missing evidence/trust/authority/grade premise; replay/process unavailability; VERIFIED only if every required layer explicitly establishes its obligation. No empty-layer or empty-evidence success. A checker crash is CANNOT_RECOMPUTE, not contradiction or mutation kill. Native negative + successful replay stays negative. Package-present/runner-declared without semantic execution is insufficient.

Expected A/B demo: integrity VERIFIED; authenticity VERIFIED; subject_binding CONTRADICTED; native positive and replay unchanged for A; overall CONTRADICTED with REQUESTED_SUBJECT_NOT_BOUND and COMMIT_MISMATCH. Explanation explicitly says A's authenticated evidence does not establish B, without saying B ran or failed. Same receipt/request A passes binding and proceeds through remaining layers.

Each vector records literal expected layer statuses/reasons and a paired positive. Mutation kills require applied source mutation, valid structured output, preserved positive control, semantic distinguishing witness. Crashes/unapplied/zero controls are not kills.
