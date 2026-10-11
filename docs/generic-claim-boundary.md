# Generic caller-selected claim boundary

ReceiptOS Verify does not answer only whether a receipt is intact. It evaluates what supplied evidence establishes for a caller-selected claim, within the selected profile's bounded relation.

Request v2 requires `claim`, `subject`, `scope`, `authority`, `policy`, `version`, `time`, `assumptions`, `dependencies`, `requested_guarantees`, `evidence`, `evidence_requirements`, `verification_profile` and an adapter ID. The authenticated statement carries a separate `surface` with the same ten semantic dimensions. Consumer policy configuration is caller-owned; the evidence surface carries only policy ID/version. Neither object is substituted for the other.

`claim` has an opaque ID, a supported primitive kind and exact parameters. Subject has a generic kind, opaque ID and version, with artifact and Git identities when represented. Artifact digest, Git commit/tree/path, top-level claim version and subject version remain distinct dimensions. Optional absence is not null. IDs compare exactly as Unicode scalar sequences under the existing canonical JSON profile: NFC/NFD or case transformations are not silently equivalent.

Authority has ID and class. Current executable v2 profiles require `INDEPENDENT_RECOMPUTATION`, a producer key ID matching the signed authority ID, caller-trusted Ed25519 key material and an explicitly accepted authority declaration. That is bounded local authority acceptance, not an external trust registry or proof of provider identity.

Scope is an exact canonical object. A broader or narrower object is incompatible unless a future versioned profile defines and tests an entailment relation. Native adapters also bind the evidence declaration to their permitted scope and actual input, preventing a signer from expanding a primitive into an unsupported guarantee.

Policy ID/version and the independent top-level claim version compare exactly. Time is an exact nonempty safe-integer half-open interval `[not_before, not_after)` and the independently selected verification instant must lie within it. No live clock, revocation service or historical-key discovery is implied.

All assumptions used by either surface must appear in caller policy's established assumptions. All dependencies used by either surface need an independently accepted exact ID/version result. Required dependencies must also be declared by the evidence. A contradicted dependency dominates missing information. Duplicate dependency IDs, including conflicting result statuses or differing versions, are rejected instead of last-wins resolution. These caller premises are inputs, not independently verified external truth.

Evidence basis comes from attachment roles whose actual bytes pass the manifest/payload commitment checks and from an actually completed pinned execution. Receipt-provided booleans such as package-present or exit-zero cannot establish that basis.

The compatibility result is `COMPATIBLE`, `CONTRADICTED`, `INSUFFICIENT_EVIDENCE` or `UNSUPPORTED`, with dimension results and exact reasons. Reasons include CLAIM_MISMATCH, SUBJECT_MISMATCH, ARTIFACT_MISMATCH, AUTHORITY_MISMATCH, SCOPE_MISMATCH, POLICY_MISMATCH, VERSION_MISMATCH, TIME_MISMATCH, ASSUMPTION_UNESTABLISHED, DEPENDENCY_MISSING and DEPENDENCY_CONTRADICTED. The public native Semantic ABI vocabulary is retained separately.

A matching digest, valid signature, native PASS or REPRODUCED result cannot override incompatibility. REPRODUCED negative evidence stays negative. Contradiction means supplied evidence does not establish the selected positive claim; it does not prove that some other subject executed or failed.

## Compatibility with v0.1

No v1 vector is migrated or regenerated. V1 callers retain the original schemas and projection. V2 inputs require an explicitly different statement signing domain (`receiptos.verify.statement.v2`); an old signature cannot be relabeled as v2. The original commit A/B witness remains a special case of the broader identity boundary.
