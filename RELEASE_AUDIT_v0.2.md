# ReceiptOS Verify v0.2 - independent release audit

**Frozen candidate verdict: NEEDS_TECHNICAL_FIXES.** The exact frozen candidate
passed its canonical suite but independently reproduced defects in mutation
coverage classification and caller-requirement admission. Those observations
were committed before repair. Repairs and their own fresh reproduction are
reported separately; this audit does not retrospectively clear the frozen SHA.

**Final repaired verdict: READY_TO_PUBLISH_V0_2**, scoped to the repaired, curated source and declared bounded profiles. Exact fresh-tested commit: `eb942148eeb489db809b39e053ec905105cc3056`; tree: `3fa1cea8387f733cab6a0868acf6060ec958b06d`. Its clean clone contained 1795 tracked regular files. Source-lock: `3c7399a199fcff7fd4f381746d0a22071800065a9798b422fd49a36c0889f4e4` (344 files). The final closure child adds only audit/documentation/evidence and refreshes its own source lock; it does not change tested runtime, schemas, tests, vectors, vendors or dependencies. Its final digest/checks are recorded separately in `reports/release-audit-v0.2/closure.json`, avoiding a self-referential report hash.

Actual final gate: **707/707 normal, 707/707 no-opt, 707/707 repeat; 68/68 vectors; 14+14 semantic catalogue kills**. Independent final checks: **57/57 generic/adversarial, 3238/3238 projection, 51/51 domain, 16/16 mutation negative controls, 14/14 fresh demos, 30/30 complete v0.1 semantic report comparisons**. These counts describe separate scopes, not additive unique security properties.

No upstream repository was modified. No push, publish, tag, PR or merge was
performed. Corrections are bounded defect repairs, not new verification
features. Private Vertice implementation remains excluded.

## A. Exact frozen candidate identity

| Field | Independently observed value |
| --- | --- |
| Commit | `4888a0584369a91075eb2bdbd9a2ff6b99c46588` |
| Tree | `d5a6fb8e47db373e59b6ce5ed021f3e1240a09fc` |
| Branch | `feat/v0.2-generic-trustless-boundary` |
| Initial git status | CLEAN |
| Public v0.1.0 peeled base | `62cd3e59c8f568496ed087d55f0aec3d63363b0a` |
| Complete tracked regular-file count | **1028** |
| Source-lock SHA-256 | `86cf26a39b103ca32344119c2a5a183d7fcf0616b07257bd356435b2b12fbf2a` |
| Dependency-lock SHA-256 | `699f2fc389c8d95ad0e5c7f2ef1b3566152b1f9e5123e2ab49cb5c9d59285023` |
| Runtime/tool versions | Node22.15.0; Python3.12.10; npm10.9.2; Bun1.3.14 |

[Freeze identity](reports/release-audit-v0.2/freeze/identity.json), [tracked
inventory](reports/release-audit-v0.2/freeze/tracked-files.json), [fresh committed
inventory](reports/release-audit-v0.2/freeze/fresh-tracked-files.json), clean
status/working diff and complete diff/path inventory against v0.1.0 preserve the
exact starting state. Every tracked regular file has a SHA-256 entry.

Four historical v0.1 stdout working files have final CRLF while their committed
blobs use LF under Git attributes. They are disclosed individually in the
freeze identity; they were not rewritten. Git/source identity was clean, but
original working-byte equality with every Git blob is not claimed. The fresh
detached checkout was checked against all 1028 committed regular-file blobs.

## B. Fresh canonical reproduction

The frozen exact candidate was cloned detached into `work/v02-release-audit`,
with its own initially absent npm cache and `npm ci --ignore-scripts`. It did
not use development node_modules or cached output receipts. Controllers supply
only the documented empty `reports/tmp` parent required by unchanged v1 tests.

| Gate | Frozen actual | Final repaired actual |
| --- | --- | --- |
| Canonical normal suite | 624/624;0fail/skip/cancel/todo | `707/707; 0 fail/skip/cancel/todo` |
| Canonical no-opt suite | 624/624;0fail/skip/cancel/todo | `707/707; 0 fail/skip/cancel/todo` |
| Complete vectors | 68/68 =30v1+38v2 | `68/68 = 30 v1 + 38 v2` |
| Legacy mutation catalogue | 14/14 applied semantic catalogue kills | `14/14; all other outcome counts zero` |
| v2 mutation catalogue | 14/14 applied semantic catalogue kills | `14/14; all other outcome counts zero` |
| Source lock / provenance / legal checks | PASS | `PASS before/after; fresh dependency install` |
| CLI demos and diff check | PASS | `PASS; both CLI demo commands; no source drift` |
| UI smoke | Six actual browser verdict states | `Unchanged UI; actual repaired rejection and contradiction confirmed` |

[Frozen fresh gate](reports/release-audit-v0.2/gate/summary.json) records command
arguments, runtime versions, raw stdout/stderr hashes and actual counts. The
catalogue successes do not erase the separate false-coverage negative controls.

The first repair `1fecfc2587c5d89d350017a2a7a98ca78e933b9f` reproduced
**703/703 tests but only66/68 vectors**: its schema narrowed I03/I08 semantic
classifications. This was recorded in checkpoint `40fcaa7` before correction.
Correction `3df769c...` adds four regression tests. The final exact curated clone independently reproduced **707/707** normal, no-opt and repeat, with **68/68** unchanged vectors. Full command receipts are in [final fresh gate](reports/release-audit-v0.2/repair/final/summary.json).

## C. Generic-boundary audit

57/57 independently authored fresh composed probes passed on the frozen
candidate, first repair and final exact eb942 clone. Final [core receipts](reports/release-audit-v0.2/repair/independent-final/core/results/summary.json) and [domain receipts](reports/release-audit-v0.2/repair/independent-final/domains/summary.json) retain their actual identities. Fixtures use an audit-owned canonical
encoder, Node Ed25519, raw Git object hashing, literal RVR outcomes and directly
constructed Crystal roots; no product fixture builder supplied expected product
verdicts. Full exact inputs, layer results, literal oracles and digests are in
[core receipts](reports/release-audit-v0.2/core/results/summary.json).

| Attack | Observed bounded result |
| --- | --- |
| A01 subject identity | SUBJECT_MISMATCH / CONTRADICTED |
| A02 artifact identity | ARTIFACT_MISMATCH / CONTRADICTED |
| A03 authority | AUTHORITY_MISMATCH / CONTRADICTED |
| A04 scope expansion | SCOPE_MISMATCH / CONTRADICTED |
| A05 policy ID and policy version | POLICY_MISMATCH / CONTRADICTED |
| A06 claim and subject versions | VERSION_MISMATCH / CONTRADICTED |
| A07 time outside half-open interval | TIME_MISMATCH / CONTRADICTED |
| A08 absent assumption | INSUFFICIENT_EVIDENCE; accepted-premise positive succeeds |
| A09 missing dependency | DEPENDENCY_MISSING / INSUFFICIENT_EVIDENCE |
| A10 contradicted dependency | DEPENDENCY_CONTRADICTED / CONTRADICTED; exact positive succeeds |
| A11 simultaneous mismatches | All observed mismatch reasons remain visible; integrity does not mask them |
| A12 absent/null | Required absence/null rejected; optional digest absence contradicts and null rejects |
| A13 duplicate/conflicting declarations | Duplicate semantic JSON/dependency/result identities rejected |
| A14 formatting/canonicalization | Whitespace/member ordering/CRLF document formatting equivalent; NFC/NFD IDs remain distinct |
| A15 same digest, incompatible semantics | Added provider-authentication scope contradicts unchanged digest evidence |

Time uses a caller-selected instant, not a live trusted clock. Assumptions and
dependency statuses are accepted consumer premises, not externally proven
truth. Scope relation is exact canonical equality, not general entailment. Git
membership is proven for `git-artifact`; matching commit labels attached to an
opaque generic subject are not independently proven Git membership.

## D. Semantic ABI audit

Public neutral pin `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee` resolves to the
observed main. Exact reused paths are `runner/src/classes.mjs`, `linker.mjs`,
`manifest.mjs` and `evaluate.mjs`, with their retained Apache-2.0 grant.
Integration is PINNED_SOURCE with an EXPERIMENTAL product embedding; public
native manifest validation/linking/pair evaluation actually executes.

Native result, requested/observed surfaces, expected/observed semantic pairs and
overall product verdict remain separate. The product independently checks
subject/artifact/authority identity, policy/version, premises and evidence basis
that native v0 string fields do not fully represent. Wrong subject/authority,
scope expansion, policy/version, missing/contradicted dependencies and same-hash
incompatible claims match detached expectations. Native valid linking does not
override product incompatibility. No private Vertice dependency was found.

The canonical JSON embedding in native v0 string fields is not native manifest
interchange conformance or arbitrary semantic entailment.

## E. Trustless/recompute-kit audit

The candidate executes pinned historical main
`1a37bcaf91918fd8a98f164d97d0fddbc28c6755`: real scan_subject_binding.v0 checker
and canonical runner, not a package-presence stub. Native check/case identity,
verdict, evidence grade, source/corpus pin, execution and replay remain visible.
Contract mode is null where the historical artifact lacks it; the wrapper's
MAIN_SELF_GRADING interpretation is explicit and is not invented reporter
metadata. Product wrapper maturity is EXPERIMENTAL.

Fresh positive/negative signed one-document USD cases, divergent saved output,
empty corpus, unsupported pin/profile, absent executable evidence and opaque
grade controls were exercised. Exit0/package/runner presence do not imply
semantic success. REPRODUCED negative stays negative; DRIFT/unavailable source
does not become semantic contradiction. Opaque authenticated reports do not
satisfy LOCAL_RECOMPUTATION.

Read-only audit observation found current main
`3c3923956200d01ab74c2dcbb49b268739943bda`: PR57 head
`197c6d26e68f85a117dd12a94924a7f959edaef4` merged at
`2026-10-11T22:35:33Z`. The earlier source observation remains historical; no
runtime repin was made. The candidate does not claim the newly merged reporter
protocol. All12 current public scan vectors were executed separately; checker
bytes match the selected checker. Explicit removal of an unused toy_scan.rule
annotation and selection of the supported historical pin are recorded input
adaptations, not current-main reporter support. The current runner's Windows
python3 command was unavailable; original RUNNER failure and a separately
recorded interpreter adaptation remain distinct observations.

## F. Interpoll audit

Public master pin `559e47f2cd2ffcbd8ad38293da89448d8ec3152d` and
`shared-validation/engagement.js` are exact and Unlicense-covered. Actual native
Schnorr verification is combined with original exact supplied retry/observation
relations. Pavlo attribution is scoped to signed engagement
`2cfde5efc3d10b56c73e74723d3f328b77f2fc1f` and retry
`a1eb47653aa7b8f0484ab977d75a5db41d226d02`, not the entire application.

Independent I01-I10 controls cover signed intent, target/type/material change,
identical retry, mutated retry, duplicate without new execution, absent or wrong
observation/attempt, unsupported authority and replay under a different claim.
Valid signatures do not authorize a different executed action. Native admission
remains NOT_EVALUATED and execution remains OBSERVATION_SUPPLIED: no live
Interpoll server, relay, SQL or human observation provenance is established.

REQ-01 exposed ignored fresh/server requirements and null outcome defaulting.
Closed typed requirements/direct guards repair those failures without adding
fresh admission/authentication capabilities. The later I03/I08 correction keeps
typed different action-kind requests contradictory and typed unsupported
authority namespaces explicitly unsupported; producer validators stay intact.

## G. PRF guarantee audit

Merged main pin `fac26d2e8346aeab08194343b78c345d235c6935` executes
`tools/award_actual_settlement.py` under retained MIT terms. PR14 remains OPEN at
`f525737069dc4cef7741f805d08a988912f4454f`; the product transfer rule is an
EXPERIMENTAL REIMPLEMENTED_FROM_SPEC relation, not execution of PR14's consumer.

P01-P06 independently exercise positive preserved transfer, changed downstream
dependency, reproduced native negative with preserved transfer, missing basis,
conflicting tuples/results and unsupported policy/evidence demands. Native
outcome, REPRODUCED/DIVERGED and PRESERVED/VIOLATED/UNVERIFIABLE are separate.
G30 preserves native VIOLATED and transfer PRESERVED while overall remains
CONTRADICTED. No chain authenticity or universal economic truth is inferred.
Unknown caller policy/evidence keys now reject rather than being ignored.

## H. Complete product projection rules

[Product table](profiles/product-projection-v2.json) has46 literal cases.
[Independent table](reports/release-audit-v0.2/core/results/projection-decision-table.json)
contains3238 independently-oracled substitutions, all matching. Ordered rules:

| Priority | Condition | Verdict |
| --- | --- | --- |
| 1 | Malformed representation/inventory/status vocabulary/obligations/support flag | REJECTED_MALFORMED |
| 2 | Any supplied layer or nested PRF product is malformed | REJECTED_MALFORMED |
| 3 | Any supplied contradiction/violation or separate recomputation semanticOutcome REFUTED | CONTRADICTED |
| 4 | Unsupported profile/required layer/required nested PRF projection | UNSUPPORTED_PROFILE |
| 5 | Required inability/divergence or required PRF inability | CANNOT_RECOMPUTE |
| 6 | Required positive premise unestablished | INSUFFICIENT_EVIDENCE |
| 7 | All guards clear and all required positives established | VERIFIED |

Positive admission prerequisites: INPUT=ADMITTED and CANONICALIZATION=VERIFIED.
Mandatory: integrity/authenticity/subject VERIFIED, replay REPRODUCED **and**
native semantic outcome VERIFIED, evidence SUFFICIENT, compatibility COMPATIBLE.
Selected guarantees need PRESERVED, continuity PRESERVED/VERIFIED and domain
VERIFIED/PRESERVED. Integrity/authenticity/native PASS never override negative
compatibility. A selected nested PRF product must independently succeed.
There is no Boolean-truthiness fallback. Tests cover single/pair status axes,
optional obligations, native polarity/support combinations, nested six-value
PRF products and malformed reports; this is **not** an exhaustive Cartesian
product of all fourteen layers or a formal proof of adapter soundness.

## I. All 68 vector witnesses

[V0_2_VECTOR_WITNESS_MATRIX.md](V0_2_VECTOR_WITNESS_MATRIX.md) and its machine
matrix cover every vector, claim, relation, native/product expectations, reason,
independent oracle, measured mutant and positive control. Classification:
**63 LOAD_BEARING;5 REDUNDANT;0 SELF_REFERENTIAL;0 DECORATIVE;0 UNCLEAR**.
68 stored controls do not mean68 independent semantic branches.

The five aliases are G09/G01, G10/G05, G19/G04, I01/G13 and I05/G14. V08 shares
V01 receipt bytes but adds a deliberate crash setup, so is not redundant.
Both generators author literal product expectations rather than calling verify
or project to derive them.140 detached literal corpus checks passed. Shared
native fixture/verifier construction does not independently prove native
canonicalization/crypto; negative substitutions remain product witnesses.
Comparators require stated reasons, not an exact closed reason set; native
payload expectations are selected constraints, not exhaustive report equality.

## J. Both mutation families

An independent observer applied all 14 legacy +14 v2 substitutions, verified
intended source locations/hashes and exact witness IDs, and preserved positive
semantics. All 28 catalogue witnesses were semantic disagreements.26 positives
were fully identical excluding execution.argv; two retained identical semantics
with disclosed diagnostic differences. Broad mutants removing combined
policy/version or multiple scope barriers are not isolated subfield coverage.

Zero inventory, unapplied/no-op, outer crash/null and damaged positive controls
never counted as successful coverage. Frozen v2 correctly rejects inner-native
crash/null. **Frozen v1 incorrectly reported both as KILLED, exit0**, despite
unavailable computation rather than semantic refutation. MUT-01 records exact
before evidence and independent reproduction. The repair inspects nested
execution/output failure and retains the legitimate fixed-fault V08 witness:
the same crash is held constant while only false semantic refutation changes.
Final rerun receipts: [16 final negative controls](reports/release-audit-v0.2/repair/independent-final/mutations/negative-control-results.json): zero/no-op/unapplied/outer crash/outer null/damaged positive/inner crash/inner null for each family; all KILLED=0, no successful coverage. Function-driver exit0 is not treated as a successful returned gate.

## K. Provenance and authorship

All 43 historical repositories retain truthful roles in sources.json,
PROVENANCE.md and FULL_WORK_REUSE_MAP.md;74 historical capability records remain
unchanged. Eight additive integrations across six repositories keep native
source, product wrapper and experimental transfer identities separate.
51/51 selected unique SHAs resolve;396/396 declared paths/groups exist at pins;
18/18 new contribution declarations match changed paths and author metadata.

Historical ledger108 entries includes68 ORIGINAL_CODE declarations with commit
proof:170 references across161 unique commit endpoints resolve without explicit
login mismatch. These prove scoped contributions, not exclusive authorship or
per-line ownership. Repository ownership is not authorship. Shared Semantic ABI
and Trustless implementation/review roles, Interpoll scoped contributions and
PRF native versus open-transfer attribution are distinguished. No revenue
percentage is calculated.

Public upstream observations are time-scoped to `2026-10-11T23:09:39.173Z`.
Current PR57 merged state and selected older-main behavior are both retained;
PR14 stays open/experimental. No experimental source is represented as current
production main. Exact public observations are in domains/public-source-identities.json
and corpus source/path/attribution reports.

## L. License and third-party audit

Root Apache-2.0 matches official text byte-for-byte, SHA-256
`cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`.
LICENSE/NOTICE/LICENSING/THIRD_PARTY notices preserve selected grants and product
glue distinction.91 copied upstream files (77 retained+14new, including four
new licenses) match Git blobs/SHA-256 and independently fetched exact-ref bytes.
Seven npm packages retain seven legal files. Selected runtime/vendor grants are
Apache-2.0,CC0-1.0,Unlicense,MIT and existing BSD-3-Clause; no selected runtime
source had absent/pending/conflicting grant. Reimplementations are separately
identified; provider captures/vendor material are not silently relicensed.

**Audit-capture finding LICENSE-01:** a newly added historical-ledger audit JSON
embedded upstream commit patches/source excerpts, some without a clear
redistribution grant. This is new audit evidence, not frozen4888 runtime/vendor
material; it contradicts an unqualified claim that every newly present source
byte is covered. Only the five agent-created post4888 audit commits were curated to retain
metadata/path/hash/authorship evidence instead of ambiguous copied patches.
Original raw evidence remains in private local audit scratch/bundle. Frozen
candidate bytes/commits remain unchanged. Clearance is established by
[curation mapping](reports/release-audit-v0.2/capture-license/local-history-curation.json) and [independent curation check](reports/release-audit-v0.2/capture-license/audit02-curation-independent-review.json) plus final tracked-byte/license/source-lock revalidation. A later deletion commit alone would have retained the raw bytes in pushed ancestry; the curation explicitly addresses that history. 1082 patch strings, 4 API body captures and 86 API contents were replaced with metadata/hash records. The exact raw bundle stays unpublished under work/, SHA256 `bdcda1d52ff39859be852c110c32fc010649a24e54268fad1d608ea9669aff3b`. Original raw execution receipts retain their original commit IDs; the old/new mapping does not relabel an execution. All non-report blobs per mapped commit are identical, frozen4888 remains the ancestor, and all raw audit commits/capture blobs are unreachable from the curated branch. No license clearance is inferred solely from the earlier runtime-vendor audit.

## M. Determinism

Frozen determinism gate passed42 product runs in seven groups plus12 native
runs in four groups: normal/repeat/jitless, environment variation, two distinct
filesystem paths and native Python optimized execution. Only exact
execution.argv paths are excluded from product semantic identity; native
results, evidence, policy, grade, reasons, statuses and pins remain included.
Operational receipts intentionally retain absolute command paths and timing.

Python -I ignores PYTHONHASHSEED; setting that variable is recorded without
claiming it changes isolated Python hashing. A separate direct native CLI -O
group covers Trustless optimization; bridge -O alone does not optimize its
child checker. JSON ordering/whitespace/CRLF document equivalence is separately
probed. Artifact byte line endings remain meaningful. Full --jitless HTTP
testing is unsupported on Node22 Undici/WebAssembly; full no-opt is the supported
alternate. No exhaustive environment/platform portability claim is made.
Final repaired determinism evidence: [final determinism](reports/release-audit-v0.2/repair/final/determinism.json): 42 product + 12 native runs, all declared comparisons pass.

## N. Malformed/adversarial inputs

Fresh probes reject null/{}/[]/wrong roots/empty document, duplicate JSON keys,
extra/missing members, malformed/uppercase hashes, oversized bounded identity,
document >4MiB, unpaired Unicode, invalid UTF-8, traversal/unsupported URI paths,
unsafe integers, exponent underflow, NaN/Infinity, duplicate/conflicting evidence,
unknown adapters/profiles/semantic versions/canonicalization. None verifies.
Numbers are exact safe integers; hashes are lowercase canonical hex; legal
Unicode IDs compare exactly, without NFC/NFD/case aliases.

The extra requirement probes found five active domain and six continuity
fail-open cases outside those57 passing checks. Closed typed context schemas
and direct guards now reject unknown/mistyped fields. Boolean continuity true
without envelope proof remains insufficient; false preserves limited continuity;
true with independently hashed envelope proves only that supplied envelope.
Missing contexts retain safe insufficiency. Valid unselected contexts remain
inactive by contract, not counted as a separate authorization claim.

## O. UI/CLI claim audit

Actual browser observations cover all six product verdicts, with screenshot,
text/class/color and selected layer state records:

| Scenario | Overall / visual result |
| --- | --- |
| Exact V01 | VERIFIED; good/green |
| G10 intact/authentic but incompatible scope | CONTRADICTED; bad/red; integrity/authenticity remain visibly VERIFIED |
| V17 QEV packaging/replay valid, provider unknown | INSUFFICIENT_EVIDENCE; neutral; provider reason visible |
| Isolated D13 checker crash | CANNOT_RECOMPUTE; neutral; no semantic refutation |
| Empty-object request | REJECTED_MALFORMED; bad/red |
| G17 unsupported profile | UNSUPPORTED_PROFILE; neutral |

Editing input invalidates stale verdict and disables saving until verification
runs. Request and bundle attachment inputs are visible. Overall verdict
dominates separate layer successes. QEV does not display global verified quantum
execution when provider authentication is NOT_ESTABLISHED. This static Node UI
has no separate framework build; its actual server/start/browser smoke is
recorded. These are finite visual checks, not exhaustive accessibility/browser
certification. CLI exact outputs preserve component/native statuses and reasons.

## P. Fourteen fresh end-to-end demos

Full machine-readable input/output index:
[demos/index.json](reports/release-audit-v0.2/demos/index.json).

| Demo | Fresh scenario | Actual bounded outcome |
| --- | --- | --- |
| D1 | Independently signed commit A, request A | VERIFIED |
| D2 | Same receipt, request B | CONTRADICTED |
| D3 | Semantic ABI scope mismatch | CONTRADICTED |
| D4 | Semantic ABI authority mismatch | CONTRADICTED |
| D5 | Real pinned Trustless checker, compatible request | Native positive retained; VERIFIED |
| D6 | Same native result, incompatible request | Native result unchanged; CONTRADICTED |
| D7 | Exact native-signed Interpoll action | Supplied exact execution relation VERIFIED |
| D8 | Mutated retry under same signed intent | CONTRADICTED |
| D9 | Native PRF positive and retained downstream relation | PRESERVED / VERIFIED |
| D10 | Changed downstream dependency | VIOLATED / CONTRADICTED |
| D11 | Valid packaging and reproduced native negative | REPRODUCED negative; CONTRADICTED |
| D12 | Empty evidence | INSUFFICIENT_EVIDENCE |
| D13 | Actual isolated checker crash | CANNOT_RECOMPUTE |
| D14 | Unsupported profile | UNSUPPORTED_PROFILE |

D13 intentionally faults only a disposable copy. Initial controller failures
are retained and not counted as product outcomes. Fresh domain construction's
initial EUR grammar error and current-main runner-controller mistake are also
retained separately, not semantic kills or successful verifier observations.
Final repaired demo rerun: [14 final fresh demos](reports/release-audit-v0.2/repair/independent-final/demos/index.json), all at exact eb942 source; D13 records its explicit disposable bridge fault.

## Q. v0.1 regression comparison

All 30 original vectors were run at public v0.1.0 `62cd3e59...` and frozen v0.2.
30/30 complete semantic reports match after excluding only execution.argv host
paths; native results, grades, reasons and statuses remain included. The
original vector inputs and expectations remain unchanged. Exact per-vector
reports/hashes are in [regression summary](reports/release-audit-v0.2/regression/summary.json).
Repairs do not alter v1 verifier/schema semantics; the legacy mutation harness
correction is assurance infrastructure, not changed product verdicts. Final canonical vector gate passes all 30 original plus38 v2 controls; [final full semantic comparison](reports/release-audit-v0.2/repair/independent-final/regression-final.json) again matches all 30 fresh v0.1 reports.

## R. Ranked findings

| ID | Severity | Demonstrated defect/issue | Disposition |
| --- | --- | --- | --- |
| MUT-01 | HIGH | Legacy v1 harness counted newly introduced inner checker crash/null output as successful semantic kill | Nested failure classification repaired; fixed-fault V08 preserved; 16 final controls reject false coverage |
| REQ-01 | HIGH | Five active Interpoll/PRF unknown or mistyped consumer requirements were dropped while overall VERIFIED | Typed closed contexts and direct guards; exact before/after evidence retained |
| CONT-01 | MEDIUM | Six malformed/unknown continuity requirements yielded VERIFIED with whole envelope NOT_ESTABLISHED | Typed closed continuity admission; Boolean controls retained |
| REG-01 | MEDIUM | First repair narrowed I03/I08 into malformed instead of contradicted/unsupported | Separate pre-correction checkpoint; minimally restored typed semantic classifications, four new regressions |
| LICENSE-01 | HIGH | New audit JSON embedded ambiguous-grant upstream patches/source excerpts | Metadata-only curation limited to own post4888 audit commits; closed; raw commits/blobs excluded from curated reachable ancestry |
| DOC-01 | LOW | files-not-reused.md kept stale no-copy/no-execution wording for now-vendored native files | Scoped documentation correction after discovery |
| DOC-02 | INFO | PR57 merged after original source snapshot; selected old main is not current-main reporter behavior | Current observation documented; selected source pin preserved |
| SCOPE-01 | INFO | Valid unselected adapter/guarantee context is inactive under documented activation rules | Earlier orphan suspicion corrected; no activation feature added |

No BLOCKER-level runtime bypass or ten-dimension compatibility promotion was
independently demonstrated. This does not mean no untested defect exists. Green
tests never override the explicit HIGH/MEDIUM reproductions.

## S. Fix chronology and before/after evidence

1. Frozen identity and fresh624/68/14+14 gate were captured first.
2. Discovery checkpoint `dde5419f453969ae33b9e88b3151dba3e370f196` records exact
   before findings and inputs before technical repair.
3. Repair `1fecfc2587c5d89d350017a2a7a98ca78e933b9f` adds closed typed optional
   requirements, direct guards, nested v1 mutation failure checks and meaningful
   regressions; no native source repin, v1 schema change or vector rewrite.
4. Independent41 exact before-input replays pass after repair; original57 and
   independent3238 projection checks pass on its fresh exact clone. New composed
   requirement tests are **43**, direct-context tests28 and mutation controls8;
   earlier prose saying44 requirement tests was an arithmetic error, not an
   observed TAP count. Canonical actual703/703 was correct.
5. The66/68 vector regression was committed at `40fcaa7` before correcting it.
   `3df769c4d873d6f354d1627a97967eec645bd727` restores typed Interpoll mismatch
   classifications with four additional tests. Final fresh gate passes707/707 in all three modes and68/68 vectors.
6. Metadata-only audit-evidence curation preserves frozen4888 and raw private
   before evidence. Exact final tested identity, curation mapping and source-lock fields above come from actual command/blob receipts.

The local raw audit commits above remain in the unpublished evidence bundle. Their sanitized equivalents are a9800bbb... (discovery), 2c602f64... (technical repair), e719f2dd... (regression checkpoint), b97201fe... (schema correction), and eb942148... (independent evidence). Exact full mappings and raw/sanitized byte hashes are in the curation receipt. Only audit capture metadata differs for each pair.

No meaningless feature/style cleanup or upstream modification was performed.
Any final report/evidence-only closure must identify the exact tested runtime
commit and disclose that its own child SHA is not self-embedded.

## T. Final verdict and release boundary

**Frozen4888 candidate: NEEDS_TECHNICAL_FIXES.**

Final repaired recommendation: **READY_TO_PUBLISH_V0_2**. All demonstrated technical defects, the repair regression, false release wording and audit-capture publication defect are closed in separate documented steps. No unresolved demonstrated HIGH/MEDIUM defect remains within the tested contract. The frozen4888 candidate itself must not be published as if cleared.

Readiness is for the bounded experimental v0.2 product and its
declared interfaces, not production security certification, independent human
operator reproduction, full upstream conformance, real provider/hardware or
server/chain authenticity, arbitrary entailment, live ledger finality or actual
PQ cryptographic conformance. XRPL remains an interface boundary only. No push
or publication is authorized or performed by this audit.

Final verdict: READY_TO_PUBLISH_V0_2
