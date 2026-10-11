# Independent generic-boundary and projection audit

Frozen candidate: `4888a0584369a91075eb2bdbd9a2ff6b99c46588`.
Independent fresh-checkout rerun after the first repair:
`1fecfc2587c5d89d350017a2a7a98ca78e933b9f`, tree
`08b48e23b0efc6f8d9912ff0d9eb9bea13d6c477`.

These observations are scoped to those exact identities. The later minimal
schema classification repair for I03/I08 requires its own final canonical
reproduction; these core results must not be relabeled as having run at that
later SHA.

## Projection decision table

Audited implementation: `src/projection/project-v2.mjs`. The product's existing
machine-readable table is `profiles/product-projection-v2.json` with 46 literal
cases. The separate independent table and exact 3238 input/output rows are
`work/audit02-core/results/projection-decision-table.json` for the frozen
candidate and `work/audit02-core-final/results/projection-decision-table.json`
for the fresh first repair. Both observations passed 3238/3238.

| Priority | Complete ordered condition | Overall verdict |
| --- | --- | --- |
| 1 | Invalid layer inventory/representation, data outside the canonical JSON domain or accessors, invalid status/reason/native-semantic vocabulary, invalid nested PRF projection, invalid/duplicate requested obligations, or non-Boolean support flag | REJECTED_MALFORMED |
| 2 | Any supplied layer or nested PRF product projection has REJECTED_MALFORMED | REJECTED_MALFORMED |
| 3 | Any supplied layer or nested PRF product projection has CONTRADICTED/VIOLATED, or recomputation's separate semanticOutcome is REFUTED | CONTRADICTED |
| 4 | Profile support is false; any mandatory/selected layer is UNSUPPORTED/UNSUPPORTED_PROFILE; or selected PRF nested product projection is UNSUPPORTED_PROFILE | UNSUPPORTED_PROFILE |
| 5 | Any mandatory/selected layer is CANNOT_RECOMPUTE/DIVERGED; or selected PRF nested product projection is CANNOT_RECOMPUTE | CANNOT_RECOMPUTE |
| 6 | INPUT is not ADMITTED, CANONICALIZATION is not VERIFIED, recomputation semanticOutcome is not VERIFIED, selected PRF nested projection exists but is not VERIFIED, or any mandatory/selected layer lacks its declared success status | INSUFFICIENT_EVIDENCE |
| 7 | All preceding guards clear and every required positive premise is established | VERIFIED |

The six mandatory successes apply even if the consumer's explicit
`required_layers` list is empty:

| Layer | Required success |
| --- | --- |
| INTEGRITY | VERIFIED |
| AUTHENTICITY | VERIFIED |
| SUBJECT_BINDING | VERIFIED |
| RECOMPUTATION | REPRODUCED, with separate semanticOutcome VERIFIED |
| EVIDENCE_SUFFICIENCY | SUFFICIENT |
| SEMANTIC_COMPATIBILITY | COMPATIBLE |

Optional selected obligations require GUARANTEE_PRESERVATION=PRESERVED,
CONTINUITY=PRESERVED/VERIFIED, and DOMAIN_ADAPTERS=VERIFIED/PRESERVED.
Requests activate their applicable guarantee, continuity and Interpoll domain
obligations in the composed verifier. A valid context for an unselected domain
or unrequested guarantee remains inactive: context presence is not itself a
request to establish an extra claim.

Supplied contradictions and malformed nested PRF product results dominate even
when the corresponding optional success was not selected. Unsupported,
unavailable and insufficient nested PRF results block verification when its
obligation is selected. Consequently PRESERVED transfer cannot hide a native
PRF negative result. A malformed native output or checker crash is unavailable
computation, not a semantic refutation. Integrity/authenticity successes never
override an incompatible subject, authority, scope, policy or dependency.

There is no Boolean success fallback. Exact status vocabularies are checked;
truthy objects, `true`, native `PASS` aliases and malformed outcomes do not
stand in for the required statuses. The independent malformed table explicitly
tries false/truthy/unknown native outcomes, Boolean status, missing/extra layers,
missing nativeResult, null reason lists, invalid nested result keys, duplicate
or unknown obligations and a non-Boolean support flag.

### Finite coverage boundary

The 3238 independent rows cover admitted single/pair status substitutions,
activation of optional obligations, separate native semantic outcomes and
profile-support flags, six nested PRF product values, and malformed/truthiness
controls. Expected verdicts come from a separately authored ordered consumer
contract oracle; they are not obtained by calling projectV2 or reading the
candidate's expected output. The independent script does not import the
candidate's success constants or its machine-readable test table.

This is finite transition and precedence coverage, **not** every Cartesian
combination of fourteen layer vocabularies and not a formal proof of all native
adapters. The decision algebra operates on supplied component results; it does
not independently authenticate those results or establish the truth of caller
premises.

## Generic claim boundary

57/57 fresh composed probes passed on both the frozen candidate and first
repaired fresh checkout. Inputs were independently constructed using Node
Ed25519, an audit-owned canonical encoder, raw Git object hashes, literal RVR
canonical outcomes and directly constructed Crystal root evidence. No product
fixture builder or verifier generated their expected results. Each receipt
contains its exact request/bundle input, selected literal oracle, complete
component report and input digest.

| Required attack | Exact independent checks and observed boundary |
| --- | --- |
| A01 same claim, wrong subject | SUBJECT_MISMATCH; CONTRADICTED |
| A02 same subject, wrong artifact | ARTIFACT_MISMATCH; CONTRADICTED |
| A03 same subject/artifact, wrong authority | AUTHORITY_MISMATCH; CONTRADICTED |
| A04 broader requested scope | SCOPE_MISMATCH; CONTRADICTED |
| A05 wrong policy | Wrong ID and separately wrong policy version; POLICY_MISMATCH |
| A06 wrong version | Independent claim version and subject version; VERSION_MISMATCH |
| A07 outside interval | At exclusive upper boundary and before lower boundary; TIME_MISMATCH |
| A08 absent assumption | ASSUMPTION_UNESTABLISHED; INSUFFICIENT_EVIDENCE; caller-accepted positive control verifies |
| A09 missing dependency | DEPENDENCY_MISSING; INSUFFICIENT_EVIDENCE |
| A10 contradicted dependency | DEPENDENCY_CONTRADICTED; CONTRADICTED; exact accepted declared dependency control verifies |
| A11 multiple mismatches | Claim, subject, artifact, authority, scope, policy, version and time reasons remain visible together |
| A12 absent versus null | Missing/null required subject rejected; missing optional digest contradicts declared digest; null digest rejected |
| A13 duplicate/conflicting declarations | Duplicate semantic JSON keys, dependency IDs/versions and contradictory result declarations rejected |
| A14 equivalent formatting/canonicalization | Member reordering, whitespace and CRLF document formatting preserve VERIFIED; NFC/NFD identifier distinction remains exact |
| A15 same digest, incompatible declaration | Added provider-authenticity scope does not inherit the digest predicate; SCOPE_MISMATCH/CONTRADICTED |

D1 and D2 present the exact same authenticated receipt: requested commit A
verifies; requested commit B contradicts. D12 empty evidence is insufficient.
D14 unknown profile is unsupported. A fresh reproduced REFUTED native result
remains overall CONTRADICTED. Tampered root and invalid signature do not verify.
Native positive replay cannot bypass a changed caller-selected claim ID.

## Malformed and adversarial inputs

Explicit malformed probes include null, empty object, array, string root, empty
document, duplicate JSON members, extra root fields, absent/null required
fields, malformed and uppercase hashes, 1025-character bounded identity,
document above 4 MiB, unpaired surrogate, invalid UTF-8 bytes, relative path
traversal, unsupported URI in the path field, unsafe integer overflow,
fractional/exponent underflow, NaN/Infinity extensions, duplicate evidence,
conflicting attachment bytes, unsupported adapter/profile/semantic version and
canonicalization profile. None becomes VERIFIED.

The parser intentionally admits only exact safe JSON integers; it does not
silently round overflowing values or underflow fractional/exponent inputs.
Hash spelling is lowercase canonical hex. Identifier strings compare as Unicode
scalar sequences: legal NFC/NFD or case variants are not silently equivalent.
JSON member order and whitespace are insignificant; artifact bytes remain
byte-sensitive. URI probes concern the subject path field: the product does not
fetch those URI values or perform a live URL/file resolution operation.

The independent extension audit found malformed/unknown continuity options
could still verify on the frozen candidate. Those failures are separate from
the passing 57 checks; they are not hidden by that passing count. Exact before
receipts are in `reports/release-audit-v0.2/core/results/`. The first repair
globally types/closes optional contexts and rejects the six demonstrated
continuity fail-open cases before native execution. The 41 exact-input
after-replays and 43 standalone admission regressions are separately recorded
under `work/audit02-core-after/` and `work/audit02-core-final/`.

## Meaning and limitations

- Time is an exactly matched nonempty half-open interval plus a
  **caller-selected** verification instant. This is not a live clock, trusted
  timestamp, revocation service or historical-key authority discovery.
- Assumptions and dependency results are independently selected consumer
  premises. Their external truth is not proven by accepting their declarations.
- Scope compatibility is exact canonical equality, not general entailment,
  hierarchy/subset reasoning or natural-language semantic equivalence.
- A Git commit/tree/path closure is established for `subject.kind=git-artifact`.
  Opaque generic subject kinds can retain matching commit labels without a Git
  object closure; those labels must not be described as independent Git
  membership proofs. The exploratory cases are documented as a scope
  limitation, not a demonstrated SHA256 predicate bypass.
- Authenticity is a supplied statement's key-controlled signature under the
  caller's accepted authority, not proof of provider/server identity or external
  execution truth. Crystal integrity authenticates no semantic claim by itself.
- Native replay and native semantic outcome remain separate. A faithfully
  reproduced negative result remains negative; process success is not semantic
  success.

No core source was edited during discovery. Repair followed the committed
before-finding checkpoint and was limited to demonstrated admission failures.
The v1 schema/runtime and original vectors were not changed by this auditor.
