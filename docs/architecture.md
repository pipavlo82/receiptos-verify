# Architecture

The product has one admission and projection contract. Input and evidence are separate: a producer cannot choose what the consumer asked. A product statement signs the exact payload digest, attachment manifest, subject, claim, policy identity/digest and semantic declaration. It also covers native Crystal anchor fields excluded by Crystal's own root.

| Layer | Obligation | Preserved output |
|---|---|---|
| INPUT | Strict UTF-8/JSON and typed schema admission | ADMITTED or structured rejection |
| CANONICALIZATION | Exact product profile; sorted ASCII keys and integers | Profile and statement digest |
| INTEGRITY | Attachment sizes/digests, full payload hash, Git closure, native Crystal root | Native Crystal result and process receipt |
| AUTHENTICITY | Ed25519 statement under caller-selected trust key | Signature scope; unknown trust stays unestablished |
| SUBJECT_BINDING | Requested vs covered subject, claim and exact policy | Exact mismatches and A/B explanation |
| RECOMPUTATION | Pinned RVR with independently selected expected digest | Native outcome, replay, fresh/saved results and raw execution |
| EVIDENCE_SUFFICIENCY | Nonempty required roles, available bytes, execution and grade | Missing roles vs committed-unavailable barrier |
| SEMANTIC_COMPATIBILITY | Claim/authority/subject/scope/time/assumptions/actual evidence | Compatible, incompatible or unverifiable |
| GUARANTEE_PRESERVATION | Exact obligations and separately accepted dependency basis | PRESERVED / VIOLATED / UNVERIFIABLE |
| CONTINUITY | Admission/identity and requested historical/current observation | Native identity plus product continuity extension |
| DOMAIN_ADAPTERS | Optional signed-action, quantum, stochastic, crypto/anchor obligations | Unmodified native results and bounded projections |
| PRODUCT_PROJECTION | Explicit finite rules below | Versioned product verdict |
| EXPLAINABLE_REPORT | Layer states, native output and precise reasons | Text, JSON and local UI |
| PROVENANCE | Exact source/authorship/rights/maturity | Machine catalog and full reuse map |

`src/core/types.d.ts` and `schemas/` define the wire contract. `profiles/git-artifact.v1.json` defines the current product profile. Native Crystal/RVR/QEV formats retain their own canonicalization and schema rules; product canonical JSON does not redefine their semantics.

Projection v1 prioritizes known malformed/integrity failures, unsupported required profiles, established relation contradictions, independently missing premises, replay/process barriers, then remaining insufficient obligations. A native REFUTED replay remains CONTRADICTED. Independently absent trust, grade or accepted guarantee basis is insufficient even alongside a process barrier; missing observations caused solely by the barrier do not mask CANNOT_RECOMPUTE. VERIFIED requires explicit positive status for every mandatory/requested layer. Empty/incomplete facts cannot verify.

Portable capsules are a new product wire format, not native Crystal capsule conformance. Domain-separated Merkle leaves/nodes/count roots bind sorted manifest entries; externally captured full-container hashes bind the whole carrier. Packaging does not verify the included claim. Consumer requests remain detached when opening a capsule.

Native processes use fixed scripts, no shell, bounded input/output/time, isolated Python with bytecode disabled, exact selected source inventories and preserved stdout/stderr/exit metadata. Runtime availability remains observable and never becomes a semantic success.

Existing repositories are maintained independently. Only narrow licensed source slices are vendored; neutral relations are reimplemented with fresh synthetic fixtures. No existing source, frozen artifact or technical pin was changed.
