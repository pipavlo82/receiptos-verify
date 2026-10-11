Detailed evidence paths in this frozen matrix/audit resolve under `reports/release-audit-v0.1/vectors-mutations/`. The frozen before assessment is preserved below.

# Mutation audit — frozen candidate

## Defects before any fix

1. **HIGH — malformed structured output counts as a semantic kill and makes the release gate green.** `tools/corpus.mjs:26` accepts any truthy schema/layers plus a string overall; `tools/run-mutations.mjs:26` only compares witness overall to baseline. A source patch returning `BANANA` for the V07 negative projection leaves V01 positive intact, gives valid baseline controls, and is counted KILLED with exit0. A separate patch returns report.schema BANANA, overall VERIFIED, but PRODUCT_PROJECTION.status CONTRADICTED for V04; V01 remains intact and this also counts KILLED with exit0. This is malformed/incoherent output, not admissible semantic evidence. The minimal patches and exact source digests are in the control inventories/receipts. No source repair was made by this audit.

2. **MEDIUM — Windows checkout path length changes the canonical release-gate outcome.** Exact candidate in the first audit clone produced14 CONTROL_BROKEN/0 KILLED; shortened nested clone produced13 KILLED/1 CONTROL_BROKEN; exact candidate in `reports/tmp/vm2` produced14 KILLED. The same2849-byte native schema is readable by Node at absolute path lengths272,262,246; Python3.12 read fails at272/262 and succeeds246 (`windows-path-reproducer.json`). The failing checker is classified as unavailable, so the runner fails closed, but a fresh authorized audit checkout cannot reproduce the claimed14/14 without a short path. This is an environment-sensitive reproduction limitation rather than a demonstrated semantic survival.

3. **MEDIUM — V09 and its package-presence mutation overstate what the witness exercises.** Actual native RVR execution is COMPLETED, semantic VERIFIED, replay REPRODUCED. Only the signed producer report says executed:false. The mutation deletes that declaration check while retaining the independent `context.executed` and `context.semanticObserved` guard, so it demonstrates report completeness, not acceptance of package/runner presence without semantic execution. A separate absent-semantic-execution witness is required for that broader advertised claim.

## Executed inventory

Canonical inventory contains14 source mutants. Every replacement anchor occurs exactly once, actual source bytes change, and the recorded original/mutant SHA256 pair agrees with a separate patch reconstruction. Full patch strings, source line positions and hashes: `catalog-patch-audit.json`. Each mutation has baseline positive and baseline witness checked against literal expected layer statuses and required reasons. The mutated positive must preserve those expectations. In the short exact-candidate checkout, every positive is preserved and all14 structured witness projections distinguish. No existing product source/test/doc was edited.

| mutant | source location(s) | positive / witness | baseline → mutant overall | status |
|---|---|---|---|---|
| ignore-requested-subject | src/core/subject.mjs:6 | V01 / V04 | CONTRADICTED → VERIFIED | KILLED |
| compare-receipt-to-itself | src/core/subject.mjs:6 | V01 / V04 | CONTRADICTED → VERIFIED | KILLED |
| accept-any-valid-signature | src/adapters/interpoll.mjs:14 | V13 / V25 | CONTRADICTED → VERIFIED | KILLED |
| promote-reproduced-to-verified | src/projection/project.mjs:9 | V01 / V07 | CONTRADICTED → VERIFIED | KILLED |
| accept-empty-evidence | src/core/evidence.mjs:36 | V01 / V06 | INSUFFICIENT_EVIDENCE → VERIFIED | KILLED |
| count-crash-as-semantic-refutation | src/projection/project.mjs:12 | V01 / V08 | CANNOT_RECOMPUTE → CONTRADICTED | KILLED |
| package-presence-as-pass | src/adapters/recompute_kit.mjs:6 | V01 / V09 | INSUFFICIENT_EVIDENCE → VERIFIED | KILLED |
| ignore-policy-version | src/core/subject.mjs:9 | V01 / V22 | CONTRADICTED → VERIFIED | KILLED |
| ignore-guarantee-dependency | src/adapters/prf.mjs:53,86,65 | V12 / V11 | CONTRADICTED → VERIFIED | KILLED |
| ignore-retry-action-change | src/adapters/interpoll.mjs:23 | V13 / V14 | CONTRADICTED → VERIFIED | KILLED |
| ignore-evidence-grade | src/adapters/recompute_kit.mjs:8 | V01 / V24 | INSUFFICIENT_EVIDENCE → VERIFIED | KILLED |
| ignore-authority | src/adapters/semantic_abi.mjs:64,66 | V01 / V19 | CONTRADICTED → INSUFFICIENT_EVIDENCE | KILLED |
| ignore-commit | src/core/subject.mjs:4 | V01 / V02 | CONTRADICTED → VERIFIED | KILLED |
| ignore-canonicalization-profile | src/core/verify.mjs:71 | V01 / V23 | REJECTED_MALFORMED → VERIFIED | KILLED |

`ignore-authority` changes CONTRADICTED to INSUFFICIENT_EVIDENCE, not VERIFIED: HISTORICAL_CAPTURE also fails the supported-authority premise. It is a legitimate distinguishing result but does not demonstrate that this mutant accepts the claim. `ignore-policy-version` disables the entire id/version/digest condition. `ignore-guarantee-dependency` disables three checks together. The two V04 mutants are syntactically different but semantically equivalent;14 kills are not14 independent semantic branches. The runner currently accepts any changed overall, without requiring the intended alternate result or validating schema/projection coherence.

The fault mutant `count-crash-as-semantic-refutation` first runs the positive before replacing its RVR bridge with an exit7 control; the witness then returns a normal host report, with a wrong CONTRADICTED mapping for the native barrier. This kill is a semantic projection difference. It is not counting the native crash itself as a kill. A separate actual host process exit9 control below confirms that a process crash is not a kill.

## Negative controls actually executed

| control | observed classification | runner exit | assessment |
|---|---|---|---|
| unapplied | NOT_APPLIED | 1 | PASS: gate rejects control |
| noop | NOT_APPLIED | 1 | PASS: gate rejects control |
| crashing | CRASHED; witness CRASH, exit9 | 1 | PASS: gate rejects control |
| damaged-positive | CONTROL_BROKEN | 1 | PASS: gate rejects control |
| unknown-overall | KILLED | 0 | FAIL: malformed/incoherent output falsely KILLED |
| undefined-overall | CRASHED; witness INVALID_OUTPUT | 1 | Rejected as INVALID_OUTPUT; bucketed CRASHED |
| schema-spoof | KILLED | 0 | FAIL: malformed/incoherent output falsely KILLED |
| zero-inventory | ZERO_MUTANTS throw (no report) | 1 | PASS: gate rejects control |
| damaged-baseline | INVALID_BASELINE | 1 | PASS: gate rejects control |
| invalid-schema-valid-overall | KILLED | 0 | FAIL: malformed/incoherent output falsely KILLED |

Ten distinct audit control inventories were executed in the final short paths:9 single-mutant catalogs plus a zero-length catalog. Original candidate catalog contains14 mutants. Long/medium path attempts are separately preserved and never added to the14 distinct-mutant claim. Unknown-status, arbitrary-schema plus unknown-status, and arbitrary-schema with a valid vocabulary overall are three separate malformed-output false positives. Undefined overall is safely rejected but invalid output shares the CRASHED final bucket; this is imprecise reporting rather than a false kill.

## Evidence and reproduction

- Candidate HEAD `33d8ee47ad733f1198f2b2fb8d171b31c7b10678`, tree `719c0a5255f66b74f9bc58fd969905ee7d7c49d5`. Local clones have no remotes and own copies of candidate-a locked installed dependencies. Control copies inherit the unchanged root installed dependency versions.
- Canonical successful runner: `node tools/run-mutations.mjs` with cwd `reports/tmp/vm2`; raw command and14-row report in `baseline-mutations.command.json`, `baseline-mutations.json`.
- Audit reproduction: from target root, run `node reports/release-audit-v0.1/vectors-mutations/audit.mjs reports/tmp/vm2 reports/release-audit-v0.1/vectors-mutations mutations-only`, then `node reports/release-audit-v0.1/vectors-mutations/schema-repro.mjs`. These modify only isolated audit copies/reports.
- Independent byte/action oracle: `node reports/release-audit-v0.1/vectors-mutations/oracle.mjs reports/tmp/vm2 reports/release-audit-v0.1/vectors-mutations`. It reads each frozen vector and derives its projection from premises without consulting expected literals; all30 independently derived projections match observed product outcomes.
- `command-receipts.json` has argv/cwd/timestamps/status/raw stdout/stderr for canonical final mutations and ten control inventories. Each has an individual command receipt. `medium-path-second/command-receipts.json` preserves the earlier corpus and mutation/control commands. Initial and medium failed14-mutant reports remain under `long-path-initial/`, `medium-path-second/`.
- `control-invalid-schema-valid-overall.raw.json` proves schema BANANA, overall VERIFIED, PRODUCT_PROJECTION CONTRADICTED. `windows-path-reproducer.json` proves real byte existence versus Python path failure.

No upstream network/repository mutation, push, PR, merge, deployment, feature implementation, product source repair or frozen-artifact repin was performed. Results are independently observed for this candidate and environment only.


## Repaired release closure

Dedicated repair commit `b893eeb1b22eada6431d7b2e819439e9f4f67414` passes fresh 30/30 vectors and14/14 applied semantic mutation kills. All ten hostile mutation gate inventories fail closed, including malformed output. See `reports/release-audit-v0.1/vectors-mutations/after/FIX_VERIFICATION.md` and `RELEASE_AUDIT_v0.1.md`. Historical vectors, expected outputs and before evidence remain unchanged. The original coverage limitations remain explicit.
