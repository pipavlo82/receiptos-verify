# ReceiptOS Verify v0.1 independent release-candidate audit

Audit date: 2026-10-11. Scope: this local repository and the public identities/rights of its selected sources. No upstream repository was edited. No remote, push, publication, PR or merge was created.

**The exact frozen candidate was rejected for release.** Green original tests missed a reachable signed-result contradiction and malformed-output mutation kills. Findings were saved before remediation in local commit `7976d3b36cc8127a4de855c6f38f59d59b403f01`. Dedicated repair commit `b893eeb1b22eada6431d7b2e819439e9f4f67414` passes fresh combined checks. The final gate below applies to that repaired code with the subsequent audit-document closure, never retrospectively to the frozen candidate.

This is an implementation-independent local audit: separate skeptical reviewers, independently constructed inputs/oracles and unchanged pinned upstream computations. It is not organizationally independent certification, exhaustive soundness, production deployment or authorization to publish.

## A. Exact candidate identity and freeze

| Item | Independently recorded value |
|---|---|
| Target | `C:\Users\msi\Documents\Codex\2026-10-11\files-pasted-by-the-user-mission\outputs\receiptos-verify` |
| Frozen commit | `33d8ee47ad733f1198f2b2fb8d171b31c7b10678` |
| Frozen tree | `719c0a5255f66b74f9bc58fd969905ee7d7c49d5` |
| Initial status / diff | Both empty before any audit output |
| Tracked regular files | 234; actual byte Git blob identities matched the index |
| Frozen source lock | 216 files; SHA256 `366dba85cdee7e62aef7f9f159c47ce2923c53599e6781f77b19baccb0cdd69c` |
| package-lock.json | SHA256 `34c5ead1add79a374494eba5d51966d5557f2109373d1a0ab9bc01ebbb5e307c` |
| Runtime | Node 22.15.0; Python 3.12.10; Bun 1.3.14; npm 10.9.2; Git 2.54.0.windows.1 |
| Environment | Windows 11, build 26200; initial preferred encoding cp1251; no TZ/PYTHONHASHSEED override |
| Repair commit / tree | `b893eeb1b22eada6431d7b2e819439e9f4f67414` / `85f2f1efdc3bd04e7550a8a9a62ab8fa9c42b60f` |
| Repair source lock | 219 files; SHA256 `5273644b6fff1686e5b7e2d5b2749faf4b941fa1412e096e2b4d00587bc66449` |

[freeze.json](reports/release-audit-v0.1/freeze.json) contains the complete 234-file inventory, each mode/Git blob/size/SHA256, raw status/diff, versions, dependency locks and command inventory. [before-evidence-manifest.json](reports/release-audit-v0.1/before-evidence-manifest.json) binds the saved before evidence. Audit output was created only after the initial clean-tree check. The later audit files and repairs are deliberate changes, not evidence that the initial candidate was dirty.

## B. Fresh-checkout reproduction and actual counts

Two detached, non-hardlinked, no-remote clones at the exact frozen commit were made under `reports/tmp/release-rc-audit/candidate-a` and `candidate-b`. Both had clean initial tracked trees and separately installed their own seven locked npm packages with `npm ci --ignore-scripts --no-audit --no-fund` and initially empty local caches. NODE_PATH was removed. Ajv and noble resolved inside each checkout. Fixed Python bridges use isolated `-I -B -X utf8` invocation and vendored sources, rather than a parent Python environment.

The dedicated repair was independently cloned to `reports/tmp/release-rc-audit/repaired-a`, detached at `b893eeb1b22eada6431d7b2e819439e9f4f67414`, with another fresh own install/cache. A second exact repaired checkout, `repaired-b`, has its own fresh install for two-path determinism controls. [canonical command receipts](reports/release-audit-v0.1/canonical/commands.json) and [repair command receipts](reports/release-audit-v0.1/canonical-after/commands.json) record exact argv, cwd, exits and output digests. The first original install attempt had a receipt-path error; installs were rerun and that limitation is explicitly recorded in their receipts.

| Command / check | Frozen actual | Repaired fresh actual |
|---|---|---|
| `npm test` | 251/251 pass | **275/275 pass**, zero fail/cancel/skip/todo |
| `npm run vectors` | 30/30 pass | **30/30 pass** |
| `npm run mutations`, deep canonical checkout | Exit 1: 5 KILLED, 9 CONTROL_BROKEN | **Exit 0: 14 KILLED**, zero other categories |
| Same original 14 mutations, short exact checkout | 14/14 KILLED | Separately confirmed 14/14 in deep repaired copy |
| `npm run check:sources` before/after | PASS | PASS |
| `git diff --check` before/after | PASS | PASS |
| `node src/cli.mjs demo` | Exit 0 | Exit 0 |
| `node tools/write-demo.mjs` | Exit 0; A verified/B contradicted | Same |
| `node tools/reproduce.mjs V02` | Exit 0; reproduced contradiction | Same |
| UI build/start | No build step; static module/local server starts | Fresh repair server started and browser exercised |

The original mutation discrepancy is a real Windows path-length limitation: Python could not read a native schema at absolute lengths 272/262 but could at 246; Node saw the identical file at all three paths. The gate correctly refused broken positives. It did not establish surviving mutants. The repair shortens isolation directory names; the same deep-checkout class now reproduces 14 kills.

275 consists of the original 251 plus 17 independent projection regressions, four UI regressions and three mutation-runner regressions. Focused runs are not added again: semantic affected 74/74, UI 22/22 and mutation-runner 3/3. Separately, hostile semantic probes improved **256/269 to 269/269**; the repaired 269 were also run against the fresh exact repair checkout with own dependency resolution. See [fresh independent results](reports/release-audit-v0.1/semantics-fresh-after/results.json) and [canonical-after summary](reports/release-audit-v0.1/canonical-after/summary.json).

## C. Vector witness audit

[VECTOR_WITNESS_MATRIX.md](VECTOR_WITNESS_MATRIX.md) contains all 30 requested rows: exact claim/relation, native result, product projection, reason, independent oracle, executed mutant, positive control and assessment. Complete layer-native reports and literal expectations are retained in `reports/release-audit-v0.1/vectors-mutations/`.

Assessment: **26 LOAD_BEARING, 2 REDUNDANT, 2 UNCLEAR, 0 SELF_REFERENTIAL, 0 DECORATIVE**. These labels assess distinct semantic witnessing, not whether the vector command passes.

- V05 shares EVIDENCE_MISSING with V06; V18 shares native-negative projection with V07, while preserving an additional assertion-contradiction reason.
- V09 actually executes native RVR successfully. It tests a false signed producer execution declaration, not absence of real semantic execution. The release wording now says so.
- V19 combines an authority mismatch and an unsupported legacy authority. Its mutant changes CONTRADICTED to INSUFFICIENT_EVIDENCE; it does not demonstrate false VERIFIED.
- Expected labels are literal, not `expected := verify(actual)`. However, development fixture builders share native/product helpers with the implementation. Fixture self-consistency alone is not independent proof. A separate oracle uses its own SHA256, Git framing, Crystal canonicalization, Ed25519 checks, standalone BigInt BIP340 arithmetic and count relations without importing product evaluators/builders or reading expected labels.

The 30 vectors do not establish exhaustive conformance. In particular, they failed to catch the reverse signed-FAIL/native-positive contradiction; an independently generated positive/negative pair is now a permanent regression. Historical vectors and their frozen expected artifacts were not rewritten.

## D. All 14 mutations and hostile gate controls

[MUTATION_AUDIT.md](MUTATION_AUDIT.md) records every applied location/hash, baseline pair, preserved positive, witness and projection disagreement. The two subject-ID mutants target the same semantic branch; broad policy and guarantee mutants alter more than one check. Fourteen kills are fourteen catalog entries, not fourteen independent security properties.

**Confirmed HIGH defect:** the original runner admitted arbitrary report schema/overall strings and counted changed malformed output as semantic kills. Unknown overall BANANA, arbitrary schema with BANANA, and arbitrary schema with a valid overall but conflicting PRODUCT_PROJECTION all falsely yielded KILLED/exit 0 while positives survived. Undefined output was rejected but mislabeled CRASHED.

The repaired runner admits the complete report schema, exact layer identities/status vocabulary, unique required layers, and coherent overall/PRODUCT_PROJECTION status and reasons. It reports INVALID_OUTPUT distinctly. It does not recompute projection while judging mutant output: that would hide genuine, structurally valid semantic projection defects. The existing replay-promotion mutant was adapted to remove both relevant native guards in repaired code; IDs, witnesses and positives remain the same 14. Runtime protection was not weakened to obtain kills.

| Deliberate negative inventory | Before | After | Required gate |
|---|---|---|---|
| Mutation anchor unapplied | NOT_APPLIED / exit 1 | Same | Reject |
| No-op mutation | NOT_APPLIED / exit 1 | Same | Reject |
| Host process exits 9 | CRASHED / exit 1 | Same | Reject |
| Damaged positive | CONTROL_BROKEN / exit 1 | Same | Reject |
| Zero mutants | ZERO_MUTANTS / exit 1 | Same | Reject |
| Damaged literal baseline | INVALID_BASELINE / exit 1 | Same | Reject |
| Unknown overall | KILLED / exit 0 | INVALID_OUTPUT / exit 1 | Reject |
| Undefined overall | CRASHED / exit 1 | INVALID_OUTPUT / exit 1 | Reject |
| Arbitrary schema plus unknown overall | KILLED / exit 0 | INVALID_OUTPUT / exit 1 | Reject |
| Arbitrary schema plus valid overall | KILLED / exit 0 | INVALID_OUTPUT / exit 1 | Reject |

All ten after inventories fail closed. All 14 real mutations apply, start, have valid baseline pairs and preserve their positive controls; their kills are structured semantic disagreements. See [repair verification](reports/release-audit-v0.1/vectors-mutations/after/FIX_VERIFICATION.md), exact control receipts and fresh canonical mutation JSON.

## E. Adapter audit and honest implementation count

There are **12 registered surfaces, 11 bounded executable computation/admission surfaces and one INTERFACE_ONLY ledger boundary**. Audited maturity is **2 STABLE, 9 EXPERIMENTAL, 0 HISTORICAL, 1 INTERFACE_ONLY**. The raw ledger descriptor still uses EXPERIMENTAL; this is distinguished from executable capability maturity. STABLE describes the selected narrow Crystal/RVR relation, not full upstream conformance or production security.

| Surface | Classification | Actual relation / boundary |
|---|---|---|
| Crystal | STABLE | Pinned Bun canonical root comparison; no authority or execution truth |
| RVR | STABLE | Pinned Python SHA256 predicate and saved replay; negative stays negative |
| Semantic ABI | EXPERIMENTAL | Original neutral compatibility with declared product extensions; supplied premise truth not independently certified |
| Recompute-kit | EXPERIMENTAL | Original process/report/observation/pin/grade discipline; does not run upstream scanners |
| PRF | EXPERIMENTAL | Original exact guarantee/dependency comparison over separately accepted premises; PR14 remains OPEN |
| Chronicle | EXPERIMENTAL | Supplied-history admission/reference/query and optional whole-envelope digest; no aggregate-root calculation |
| QEV generic | EXPERIMENTAL | Pinned saved finite-postprocessing arithmetic; provider origin unestablished |
| QEV Moth | EXPERIMENTAL | Pinned saved-count relation, independent claim, nested RVR and optional portable packaging; no QPU execution |
| Interpoll | EXPERIMENTAL | Original public signed-tuple/Schnorr and exact retry relation; accepted statuses are supplied observations |
| PQ | EXPERIMENTAL | Bounded temporal authority/provider API and structural packs; no REAL ML-DSA backend |
| Stochastic | EXPERIMENTAL | Original committed stream/cursor/domain/candidate replay; no entropy/provenance establishment |
| Ledger | INTERFACE_ONLY | Ethereum/XRPL refusal and off-chain boundary; no inclusion/finality verification |

[adapter-audit.md](reports/release-audit-v0.1/provenance-adapters/adapter-audit.md) and [audit-records.json](reports/release-audit-v0.1/provenance-adapters/audit-records.json) retain every implementation/descriptor identity, exact source SHA, integration mode, native vocabulary, required evidence, mapping and failure boundary. Source file references are also retained in `provenance/sources.json`. Native-source identities and fake-label/forged-result probes were checked separately. Package presence, canned arithmetic success, mock crypto labels and supplied ledger-finality labels do not establish verification.

## F. Product projection decision table

This is the ordered repaired decision table from `src/projection/project.mjs`; first matching row wins. All conditions use exact enum/type/array membership checks, never Boolean truthiness of producer PASS/exit/package fields.

| Priority | Condition | Product projection |
|---:|---|---|
| 1 | Non-record layers; invalid layer status/reason shape; non-array required list; non-Boolean supported flag | REJECTED_MALFORMED / PROJECTION_INPUT_MALFORMED |
| 2 | Any established layer REJECTED_MALFORMED | REJECTED_MALFORMED |
| 3 | Unsupported product profile or required layer UNSUPPORTED | UNSUPPORTED_PROFILE |
| 4 | Any layer CONTRADICTED, INCOMPATIBLE or VIOLATED | CONTRADICTED |
| 5 | Native recomputation semanticOutcome REFUTED | CONTRADICTED / NATIVE_NEGATIVE_RESULT |
| 6 | ASSERTED_NATIVE_RESULT_CONTRADICTION | CONTRADICTED; replay/native positive retained |
| 7 | Authenticity NOT_ESTABLISHED or explicit missing independent premise reason | INSUFFICIENT_EVIDENCE |
| 8 | Required layer CANNOT_RECOMPUTE or DIVERGED, without EVIDENCE_MISSING override | CANNOT_RECOMPUTE |
| 9 | Required layer INSUFFICIENT, INSUFFICIENT_EVIDENCE, UNVERIFIABLE or NOT_ESTABLISHED | INSUFFICIENT_EVIDENCE |
| 10 | Empty requirements, input not ADMITTED, canonicalization not VERIFIED, native semantic outcome not VERIFIED, or any obligation lacks exact success status | INSUFFICIENT_EVIDENCE / REQUIRED_LAYER_NOT_ESTABLISHED |
| 11 | All above barriers absent and exact positive obligations established | VERIFIED |

The mandatory six obligations are always unioned with caller requirements. Exact positives are INTEGRITY/AUTHENTICITY/SUBJECT_BINDING=VERIFIED; RECOMPUTATION=REPRODUCED **and semanticOutcome=VERIFIED**; EVIDENCE_SUFFICIENCY=SUFFICIENT; SEMANTIC_COMPATIBILITY=COMPATIBLE. Optional requested guarantee needs PRESERVED; continuity PRESERVED or VERIFIED; domain VERIFIED or PRESERVED. INPUT must be ADMITTED and CANONICALIZATION VERIFIED. Reporting/provenance layers record the explanation and source identity; they do not create semantic authority.

Explicit missing-premise reasons are EVIDENCE_MISSING, SIGNER_NOT_TRUSTED, EVIDENCE_GRADE_NOT_ESTABLISHED, DEPENDENCY_BASIS_NOT_SEPARATELY_ACCEPTED, GUARANTEE_AUTHORITY_UNESTABLISHED, GUARANTEE_ASSUMPTION_UNESTABLISHED and UPSTREAM_GUARANTEE_UNESTABLISHED. Provider authentication NOT_ESTABLISHED remains a domain barrier. Integrity only, signature only, replayed negative, package/runner declarations, exit 0, empty evidence, unavailable adapters, missing authority, scope/policy/time/version mismatch and unverifiable guarantees were attacked independently; none establishes global VERIFIED after repair.

A report JSON schema validates structure, not authenticity or semantic truth. Editing a saved report's overall enum does not create evidence. Consumers must rerun verification from their own request and committed evidence; mutation admission additionally checks its projection envelope coherence.

## G. Provenance and authorship

All **43 repositories, 20 owned, 74 source records and 108 historical attribution records** were reconciled; 100 distinct linked attribution IDs resolve. All 47 distinct source repository/SHA pairs and complete selected trees were independently read through exact public GitHub Git APIs. Selected paths/blobs resolve at their declared pins. The catalog now honestly counts **21 named implemented slices**, after removing duplicate/nonexistent CHRONICLE-ROOTS implementation claims.

Every source receives only the requested usage categories: RUNTIME_DEPENDENCY, PINNED_SOURCE_ADAPTER, REIMPLEMENTED_FROM_SPEC, METHODOLOGY_ONLY, FIXTURE_ONLY, HISTORICAL_LESSON, FUTURE_EXTENSION or NO_TRANSFERRED_CAPABILITY. The complete 43-row table and exact evidence are in [provenance-license-audit.md](reports/release-audit-v0.1/provenance-adapters/provenance-license-audit.md) and structured audit records; [FULL_WORK_REUSE_MAP.md](FULL_WORK_REUSE_MAP.md) accounts for every discovered repository.

Ownership, PR opener, review, finding, requirements, fork lineage and original implementation authorship remain distinct. Echo-Merlini, atpprotocol, TMerlini/babyblueviper1 and shared contributors are not silently converted into Pavlo sole authorship. Incomplete historical chains remain unresolved, not runtime dependencies. This audit does not independently reconstruct all historical human authorship claims or calculate revenue percentages.

Live selected-PR reads reconfirmed PRF13 MERGED; PRF14, recompute-kit65/57 and MLDSA27 OPEN at their declared exact heads. Open behavior remains experimental and distinct from main. The exact public observations are saved in `provenance-check.json`. No private Vértice implementation was accessed.

## H. New-product license and copied bytes

The actual copied scope passes: **77 upstream selected files**, their SHA256/Git blobs/sizes and declared pinned tree membership; **19 nested original memberships**; **seven npm legal notices** against own fresh installed packages. Apache LICENSE SHA256 is `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`; NOTICE retains Copyright 2026 Pavlo Tvardovskyi and upstream exclusions. No copied code from absent/pending/conflicting-grant sources was identified. Public-spec reimplementations are identified as REIMPLEMENTED_FROM_SPEC, not copied upstream implementations.

Selected native rights/nested licenses are retained. QEV captured provider payloads and private/commercial code were not selected; metadata references do not transfer captured bytes. The original upstream NOTICE/LICENSING scope is preserved and checked. Product Apache licensing does not relicense upstream vendor/captures. License/source pins, dependency locks, legal files and copied native bytes were unchanged by repair. This is an audit of selected product material, not blanket legal clearance of every historical repository.

## I. Determinism

[determinism/results.json](reports/release-audit-v0.1/determinism/results.json) records fixed independent inputs across both original checkout paths, normal/repeat runs, altered TZ/LANG/LC_ALL/PYTHONHASHSEED/PYTHONOPTIMIZE and explicit Python `-O` bridge invocations. Python `-I` ignores PYTHON environment controls, so optimized execution was separately tested with an actual `-O` flag.

| Compared identity | Result |
|---|---|
| Same-path full report normal/repeat | Byte-identical |
| Same-path full report with alternate environment | Byte-identical |
| Native RVR stdout across paths, normal and explicit optimized | Byte-identical |
| Portable capsule bytes across paths | Byte-identical; SHA256 `b527d10a32bd9b232e9d5c61c81bbfd372c16a83deb5c57dbbb2aae15514382b` |
| Full report across filesystem paths | Differs only at `/layers/INTEGRITY/execution/argv/1` and `/layers/RECOMPUTATION/execution/argv/5` |
| Full report excluding those diagnostic argv values | Identical |

Absolute executable/script locations are diagnostic execution metadata, not canonical evidence identity. They are explicitly excluded when comparing portable semantic reports. No other field was silently removed. The saved deterministic input pair is fixed; independently generating fresh signing keys is intentionally nondeterministic fixture construction. The identical experiment was rerun across both fresh exact repaired checkouts: all comparisons and the capsule SHA256 above agree; [after determinism evidence](reports/release-audit-v0.1/determinism-after/results.json). Advanced QEV and all platforms/locales are not exhaustively covered by this small determinism experiment.

## J. Malformed and adversarial inputs

[root/malformed.json](reports/release-audit-v0.1/root/malformed.json) records **62 checks: 13 independent demo/control rows and 49 malformed/adversarial admission rows; 62/62 matched their independently selected outcomes**. The [fresh repaired run](reports/release-audit-v0.1/root-fresh-after/malformed.json) also passes 62/62, including an isolated checker fault on the repaired source. Inputs include empty JSON, null/arrays/objects/wrong roots, duplicate fields, unknown fields, bounded huge strings, malformed/uppercase hashes, invalid UTF-8, overflow/underflow/exponents/-0/NaN/Infinity, absent/null subject members, missing/empty/duplicate/conflicting evidence, unknown profiles/adapters, traversal and URI-like artifact paths. URI/path strings are never dereferenced into user-selected local files or network fetches. All malformed/adversarial cases remain non-VERIFIED; unsupported and missing-byte cases retain their distinct typed outcomes.

The additional 52 subject controls cover A-M: ID/commit/digest/version/policy, same bytes with different real Git commits, same label/different digest, authentic A/request B, another domain adapter, missing/null fields, legal Unicode and normalization distinction, duplicate/conflicting declarations, and native PASS bypass attempts. All 52 passed before and after repair. Unicode scalars are not silently normalized: exact NFC/NFD-distinct identifiers differ; equivalent JSON Unicode escapes agree. Missing requested subject is rejected.

One separate UI byte-boundary attack succeeded before repair: a single invalid 0xff byte in a JSON identifier was decoded by File.text into U+FFFD and matched a valid signed fixture; direct byte verification rejected INVALID_UTF8. Actual browser upload reproduced the false acceptance. The repair uses fatal UTF-8 decoding, preserves BOM for strict-parser admission, clears the attempted input on failure and invalidates stale green/download state. Valid U+FFFD/Unicode input remains allowed; replacing bytes outside the product and submitting a genuinely valid string is not itself a product verifier defect.

## K. CLI and UI claims, colors and actual browser checks

Original UI ran from fresh candidate-b at 8819; repaired UI was tested both locally and from exact fresh repair checkout at 8821. No evidence was taken from the pre-existing port-8808 process. The app has no compilation step. Localhost/host/origin/concurrency/CSP boundaries remain unchanged.

- Authentic A/request B displays **CONTRADICTED**, bad/red overall, with integrity/authenticity still VERIFIED and the explicit explanation that A does not establish B.
- Reproduced negative stays CONTRADICTED. QEV providerAuthentication NOT_ESTABLISHED displays **INSUFFICIENT_EVIDENCE**, neutral, and names the missing provider boundary; no global quantum verification claim.
- Exact signed-FAIL/native-positive reproducer now displays **CONTRADICTED**, bad/red, while preserving REPRODUCED/native VERIFIED and the assertion contradiction reason. [Fresh repaired browser proof](reports/release-audit-v0.1/ui/signed-FAIL-after.png).
- The original UI V08 label promised a checker crash but loaded only request/bundle and silently omitted execution_setup, producing green VERIFIED. Fault-dependent controls now show **CLI CONTROL REQUIRED**, empty inputs and a disabled verification button. They are exercised by the isolated CLI runner, not injected through web input.
- Invalid UTF-8 upload now shows INVALID_UTF8 and no current green report. Valid Unicode file positive still verifies. Input edits and stale asynchronous responses invalidate/download-disable prior results.

Actual browser before/after JSON/screenshots are in `reports/release-audit-v0.1/ui/`. Three fresh repair CLI text controls independently return A=0/VERIFIED, B=2/CONTRADICTED, invalid UTF8=3/REJECTED_MALFORMED; [CLI receipts](reports/release-audit-v0.1/cli/results.json). Focused DOM tests are labeled logic harnesses and are not claimed as cross-browser/accessibility certification. JSON text fields show current verification truth; the corpus title is a selected example label rather than provenance of arbitrary uploaded material.

## L. Ten required independent demos and cross-adapter consistency

Fresh own SHA256/Git/Crystal/RVR/Ed25519 inputs use an independently selected predicate and a private synthetic key kept only in memory. Interpoll signs its public tuple with an independently selected key/intent; advanced QEV construction uses the pinned public native builder with the provider boundary independently expected. Full reports and exact inputs are retained under `root/`, not merely copied from README outcomes.

| Demo | Independent input / observation | Required and observed product |
|---|---|---|
| 1 | Authentic own receipt A; caller A | Binding VERIFIED, continues; overall VERIFIED |
| 2 | Exact same authentic receipt A; caller commit B | Integrity/authenticity VERIFIED; binding CONTRADICTED; overall CONTRADICTED |
| 3 | Tampered Crystal root, fresh enclosing signature | REJECTED_MALFORMED / RECEIPT_ROOT_MISMATCH |
| 4 | Valid packaging and reproduced REFUTED predicate | CONTRADICTED / NATIVE_NEGATIVE_RESULT; REPRODUCED retained |
| 5 | Empty manifest/evidence | INSUFFICIENT_EVIDENCE / EVIDENCE_MISSING |
| 6 | Controlled checker exits 7 with no semantic output | CANNOT_RECOMPUTE / NATIVE_RVR_EXECUTION_UNAVAILABLE |
| 7 | Legal but wrong scope and legal but wrong authority | CONTRADICTED / SEMANTIC_SCOPE_MISMATCH or SEMANTIC_AUTHORITY_CLASS_MISMATCH |
| 8 | Exact signed intent and retry positive, then signed materially different retry | Positive VERIFIED; changed retry CONTRADICTED / RETRY_AUTHORIZED_ACTION_CHANGED |
| 9 | Valid native QEV counts/RVR/portable package, provider origin unestablished | INSUFFICIENT_EVIDENCE / PROVIDER_AUTHENTICATION_NOT_ESTABLISHED |
| 10 | Exact accepted guarantee positive, then different downstream obligation | Positive VERIFIED; changed relation CONTRADICTED / DOWNSTREAM_OBLIGATION_NOT_PRESERVED |

The first authority probe used a nonexistent authority enum, correctly returning malformed input; it was replaced with a legal CRYPTOGRAPHIC_VERIFICATION mismatch before the final count. The rejected exploratory expectation was an oracle error, not a product fix.

The first demonstration's wrong-commit output, reduced without altering native meaning:

```json
{
  "INTEGRITY": "VERIFIED",
  "AUTHENTICITY": "VERIFIED",
  "RECOMPUTATION": "REPRODUCED",
  "nativeSemanticOutcome": "VERIFIED",
  "SUBJECT_BINDING": "CONTRADICTED",
  "overall": "CONTRADICTED",
  "reason": "Authenticated evidence for commit A does not establish the caller-selected claim for commit B."
}
```

The same byte/digest/subject premises are reused through native Crystal and RVR, neutral Semantic ABI, recompute-method evidence sufficiency, PRF and Interpoll/domain envelopes. Native vocabularies stay separate. Crystal validity never binds another requested commit; RVR REPRODUCED never means positive automatically; Semantic ABI needs observed authority and consumer scope; recompute-kit needs actual execution/semantic observation; PRF needs preserved dependencies; Chronicle literal derived/reference equality is not complete-envelope identity; Interpoll signature authorizes only its exact intent; QEV portable/replay validity is not provider authentication. Bounded cross-adapter controls passed; no universal equivalence of all upstream profiles is claimed.

## M. Ranked findings and resolution

| ID | Severity | Frozen finding | Resolution / remaining limit |
|---|---|---|---|
| S1 | HIGH | Signed definite FAIL/native VERIFIED gave overall VERIFIED despite contradiction reason | Fixed; exact original fixture now CONTRADICTED, native results deep-equal; independent permanent regression |
| M1 | HIGH | Malformed report admitted as semantic mutation kill | Fixed; all four invalid-output controls INVALID_OUTPUT/exit 1 |
| U1 | MEDIUM | Browser File.text repaired invalid UTF-8 into a verified signed request | Fixed; fatal byte decoding; invalid request cleared; actual browser and two-sided regressions |
| U2 | MEDIUM | UI crash-control label omitted fault setup and showed green | Fixed; isolated-CLI-required presentation and no verification of that partial control |
| M2 | MEDIUM | Windows deep path broke mutation positive controls | Fixed for observed paths; compact hashed isolation leaves; fresh deep14/14 |
| M3 | MEDIUM | V09 package/no-execution claim exceeded its witness | Corrected docs; declaration-completeness claim only; explicit unavailable-execution controls retained |
| PA1 | MEDIUM | Chronicle aggregate-root slice/count unsupported | Corrected catalog/docs; CHRONICLE-ROOTS unimplemented pinned future reference;21 slices |
| S2 | MEDIUM | Internal projection trusted malformed/omitted-premise structures | Hardened with typed shape/mandatory/native-positive guards; all12 direct mismatches now pass |
| PA2 | LOW | Ledger counted like an executable experimental adapter | Honest12 surfaces/11 executable/1 interface and maturity wording; raw descriptor boundary disclosed |
| PA3 | LOW | Direct evaluateExecution({}, null) throws | Known typed internal-helper limitation; public verify constructs/catches context; no escaped false VERIFIED |
| C1 | LOW | Duplicate/broad mutants and redundant/unclear vectors | Explicit coverage limits; no inflated independent-property count |
| D1 | LOW | Full report bytes contain absolute diagnostic argv | Explicit deterministic-identity exclusion; evidence/carrier/native bytes remain stable in tested paths |

No BLOCKER finding was required to describe these bounded defects; the two HIGH findings nevertheless blocked the original release. No features were added. Independent combined diff review found no remaining release-blocking regression and verified all before evidence and historical saved reports unchanged.

## N. Exact repairs and closure checks

The dedicated repair changes only projection/admission, runner report validation/path names, the existing guard-aware mutation patch, UI byte/control handling, truthful provenance/docs and meaningful regressions. No upstream implementation/profile/schema/vector/dependency/legal bytes were repinned. Package/dependency locks and all 77 native copied files remain unchanged. The source lock changes only product authored files and the three added regression/helper files. Audit-document closure adds this report and the two requested matrices and refreshes that documentation lock; it does not alter tested runtime code.

[Combined skeptical review](reports/release-audit-v0.1/provenance-adapters/remediation/combined-review.md) verified all208 before-manifest entries, all17 original saved reports and141 pinned/native/vendor/profile/schema/vector/dependency/legal files byte-identical. All74 source identity/path-pin/authorship/license fields remain unchanged. Current provenance reflects capability-use corrections rather than source identity changes.

Fresh repair checks are **275 tests,30 vectors,14 applied semantic kills,10 rejected negative inventories,269 independent semantic probes**, plus ten demo classes and actual browser/CLI controls. Canonical test/vector/mutation totals count distinct inventories, not accumulated reruns. There is no technical fix outstanding for the supported local experimental v0.1 contract. Provider/hardware origin, real PQ conformance, live ledger finality, complete global Chronicle history, unbiased entropy, independent operator execution and full upstream conformance remain explicitly NOT_ESTABLISHED/outside that contract. PA3 remains a non-blocking internal typed-caller boundary.

## O. Final verdict

**READY_TO_PUBLISH_V0_1**

This verdict applies only to the repaired **local experimental, bounded-profile** release and audit-document closure described above. It does not approve the frozen `33d8ee47...` bytes, imply production readiness, or perform publication. Nothing was pushed, published, merged or submitted upstream. Exact final local identity and closure hygiene are recorded separately to avoid embedding a commit's own SHA in itself.
