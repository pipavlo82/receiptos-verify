# Semantic ABI adapter for v0.2

`evaluateSemanticAbi({expected, observed, context})` executes the unchanged public neutral Semantic ABI manifest validator, semantic linker and optional two-level pair evaluator. The source is `trustless-ai/semantic-abi` main at `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee` (tree `63b5075bffb3027ab63c2a7f25de06502b0ed861`). It is an **EXPERIMENTAL**, bounded adapter over the draft native v0 relation. It imports no Vértice adapter, commercial behavior, capture or private implementation.

The generic request is the caller-selected `expected` surface. The signed/packaged evidence declares the separate `observed` surface. The product's `compareClaimSurfaces` checks claim, subject, artifact, authority identity/class, exact scope, policy/version, claim version, time applicability, assumptions, dependencies and accepted evidence basis. These dimensions remain separately visible. Matching artifact bytes cannot override an incompatible authority or scope.

## Native execution and encoding

The vendored `runner/src/classes.mjs`, `linker.mjs`, `manifest.mjs` and `evaluate.mjs` retain their exact upstream bytes and Apache-2.0 license. Each adapter call validates the producer and consumer declarations and executes `linkEdge(producer, requirement)` when the declarations are supported.

Native v0 accepts string `claim_type`, `authority_class`, `scope` and exactly one of `issued_at` or `verification_time`. The wrapper encodes complete generic claim and scope objects as canonical JSON strings and the generic time interval as a tagged canonical JSON string in `verification_time`. This is an explicit product embedding of the native equality relation. It is not a claim of standard upstream manifest wire conformance or an assertion that an interval string is a wall-clock timestamp. Actual half-open interval applicability is independently checked by the product relation.

The native authority classes are `INDEPENDENT_JUDGMENT`, `CRYPTOGRAPHIC_VERIFICATION`, `EX_POST_VALIDATION`, `INFRASTRUCTURE_ATTESTATION`, `ONCHAIN_COMMITMENT`, `INDEPENDENT_RECOMPUTATION`, `KEY_BINDING_AUTHORITY` and `SEMANTIC_VERIFICATION`. Unknown classes remain unsupported. Native exact recomputation-to-semantic-verification coercion is preserved in the native result. The product conservatively requires the exact caller-selected authority identity/class and can therefore contradict that native edge.

## Preserved results

The response contains `nativeResult.manifest_validation`, `nativeResult.link`, `expectedSemanticPair`, `observedSemanticPair`, optional `nativeResult.pair_evaluation`, the complete product `compatibility`, and separate adapter `status`/`reasonCodes`.

`observedSemanticPair` comes from the executed native linker: valid edge gives `PRESERVED`; native `TYPE_ERROR` gives `VIOLATED`; unavailable or unsupported declarations give `UNVERIFIABLE`. The optional `context.expected_pair` is a detached caller-selected test oracle. The receipt cannot supply this oracle; it never changes the observation or product compatibility. If absent, `expectedSemanticPair` and pair evaluation remain null. No implementation-derived expectation is fabricated.

A negative native observation with detached expected `VIOLATED` yields backend-conformance `PASS` while the product remains `CONTRADICTED`. A native edge can be `PRESERVED` while the product reports `SUBJECT_MISMATCH`, `AUTHORITY_MISMATCH`, `POLICY_MISMATCH`, `VERSION_MISMATCH` or `DEPENDENCY_CONTRADICTED`; those fields are outside the native v0 manifest. Native vocabulary is preserved rather than rewritten as the product verdict.

Dependencies, assumptions and evidence basis come from independently selected context/policy premises. A producer declaration is not proof that a dependency or authority was established. This adapter does not authenticate a declaration by itself and never establishes real-world truth merely by linking it.

## Provenance and limits

`provenance/v02-semantic-abi.json` records exact copied-file Git blob IDs/SHA-256 digests and public contribution evidence. Pavlo Tvardovskyi authored semantic-model repair commit `8fb67bd43140a1cc7aab5c272796da0417d3ceaf`, merged through PR #1 at `474b474132a64d139972ebf2c06c18a174ce39bb`. The retained neutral runtime also contains Echo-Merlini implementation history; it is not attributed solely to Pavlo or inferred from repository ownership.

The product tests use fresh synthetic generic surfaces and detached literal outcomes. They cover exact compatibility, subject/artifact/authority/scope/policy/version/time mismatches, absent or contradicted dependencies, absent evidence basis, and equal artifact hashes with incompatible semantics. Their positive controls retain the exact matching surface. They demonstrate the bounded adapter and product relation, not complete upstream or cross-system conformance.
