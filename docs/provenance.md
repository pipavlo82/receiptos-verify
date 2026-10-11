# Provenance guide

Start with [PROVENANCE.md](../PROVENANCE.md) and the [full public work reuse map](../FULL_WORK_REUSE_MAP.md).

- `provenance/sources.json` records capability, repository, selected and audit SHAs, source paths, authorship references, exact grant scope, reuse mode, product files and maturity.
- `provenance/upstream-state.json` preserves fresh read-only public metadata, default-head and selected PR observations. It does not alter frozen audit pins.
- `provenance/authorship-evidence.json` preserves mechanical code/spec/test/review/dependency evidence without sole-ownership or revenue-share claims.
- `provenance/native-sources.json`, `provenance/relation-sources.json` and `provenance/qev-sources.json` and `provenance/qev-moth-sources.json` retain file-level runtime copies versus original specification reimplementation and bounded adapter test evidence.
- A tested adapter slice and full host release validation are separate. `implemented: true` records only the named slice; pending optional candidates remain `false`.

All twenty owned repositories are explicitly accounted for. Historical, optional and methodology reuse is distinct from runtime code. Private Vértice files, captured user/provider datasets, credentials and real trust keys are excluded from selected product inputs.

## Product capsule format

`encodeCapsule(request,bundle)` returns `{bytes,containerDigest,manifestMerkleRoot}`. `decodeCapsule(bytes,{containerDigest?,requestDigest?,subject?})` admits only canonical `receiptos.verify.capsule.v1` bytes, exactly `bundle.json` and `request.json` in sorted order, canonical embedded documents, unique digest/size manifest entries and a matching tree root. Independent expected digest/subject values must come from the consumer. An internally consistent replacement container is detectable only against that separate capture or through later request/receipt verification.

`buildManifest([{id,bytes},...])` returns a sorted manifest/root/proofs. `verifyInclusion(entry,proof,root)` checks the complete manifest entry, proof index/count/directions and exact sibling path. A consumer must separately check the actual file bytes against the entry digest/size. Empty manifests are rejected. Odd nodes duplicate their own hash. SHA256 preimages use ASCII `receiptos.verify.capsule-merkle.v1` followed by NUL, then byte tag 00 for a canonical manifest entry, 01 for two binary child hashes, or 02 for a four-byte big-endian leaf count and binary top hash.

The capsule digest hashes every canonical container byte and is returned outside the container to avoid self-hashing. Packaging preserves request/bundle disagreement so semantic verification can explain it. Its result explicitly says `packagingOnly:true` and `semanticAuthority:NOT_ESTABLISHED`. The general tree and full-container capture are original product extensions, not native Crystal wire conformance.

## Validation, dependencies and excluded files

The source catalog links saved bounded host evidence: 30/30 corpus cases, fourteen applied/killed mutants, and exact report digests. Native manifests record a combined 29-test gate, including nine synthetic Moth cases. Report inspection and a fresh independent execution are labeled separately. No complete upstream native conformance claim follows from these gates.

`provenance/dependencies.json` records all seven runtime lockfile packages and links copied license files through `provenance/npm-licenses.json`. Six packages use MIT; fast-uri 3.1.8 is BSD-3-Clause. The npm SRI values are lockfile declarations, while installed version/license byte comparisons are independently inspected local facts.

[Files not reused](files-not-reused.md) explicitly accounts for every owned repository and all external/shared sources. The preservation report covers the frozen 43 public snapshots and 21,119 files only; it does not certify unrelated live worktrees or deployments.

Every source entry includes the required normalized `integrationMode` enum plus richer role, implementationMode, used, implemented and nativeExecution boundaries. Applied methodology and an implemented upstream domain operation are separate facts; SEG methods can be used while its Robinhood/Solidity capability remains unimplemented.

The original PQ authority interface has 41 dedicated admission controls in `tests/pq.test.mjs`. Exact key identity, explicit authority fields, nonnegative safe-integer ordered half-open validity windows and explicit non-revocation are required before a trusted provider is called. Caller-provided authority and a provider callback remain premises; no real ML-DSA backend, complete event-time history or earliest-anchor-history conformance is established.

The final saved full product suite passes 251/251 with zero failures, cancellations or skips; the final corpus passes 30/30 and all fourteen applied source mutants are killed. `provenance/sources.json` records the exact three report digests and labels saved-report inspection separately from a fresh independent execution. An earlier concurrent cleanup-control failure is preserved as a separate observation; the isolated final suite is the release gate.
