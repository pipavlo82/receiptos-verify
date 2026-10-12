# Independent mutation audit — ReceiptOS Verify v0.2

Frozen candidate: `4888a0584369a91075eb2bdbd9a2ff6b99c46588`.

This observer independently extracted source and fixture bytes with `git archive`, applied each exact catalogue substitution in a disposable copy, and invoked only the verifier from an original five-line runner. It did not import candidate corpus helpers, mutation classifiers, report validators or cached result receipts. The catalogue is the object being audited, not a trusted success oracle. The literal fixture oracle is additionally checked by source/semantic inspection; this audit alone does not prove that every literal expectation is independently correct.

Dependencies are the seven locked packages already installed in the separately reproduced frozen fresh checkout. This mutation observer makes no second fresh-install claim. It retains full freshly executed baseline, positive and witness outputs, exact replacement text/occurrences, original/mutated SHA-256, runtime, raw stdout/stderr hashes and process codes.

## Actual catalogue results

All **14 v1 + 14 v2** substitutions applied once in each declared source location. All 28 retained the positive control’s product, layer-status, semantic-outcome and reason summary. Every witness distinguished a wrong product verdict. No unexpected host crash, malformed result or failed inner checker supplied a catalogue kill.

26 positive reports were fully identical after excluding only diagnostic `execution.argv`. Two retained the same positive semantics while the intentionally removed check changed diagnostic native inputs/output: v1 `ignore-guarantee-dependency` and v2 `M02`. Exact differences are recorded in `positive-diagnostic-differences.json`; they are not hidden behind an assertion of byte equality.

| Family | Mutant | Positive | Witness | Baseline → mutant product | Applied / semantic kill | Intended semantic location |
| --- | --- | --- | --- | --- | --- | --- |
| v1 | ignore-requested-subject | V01 | V04 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Removes caller/evidence subject comparison. |
| v1 | compare-receipt-to-itself | V01 | V04 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Self-comparison ignores independently selected subject. |
| v1 | accept-any-valid-signature | V13 | V25 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Removes authorized action material comparison. |
| v1 | promote-reproduced-to-verified | V01 | V07 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Suppresses negative semantic outcome guard and requires no positive native outcome. |
| v1 | accept-empty-evidence | V01 | V06 | INSUFFICIENT_EVIDENCE → VERIFIED | yes / SEMANTIC_KILLED | Returns sufficient for an empty manifest despite required role evidence. |
| v1 | count-crash-as-semantic-refutation | V01 | V08 | CANNOT_RECOMPUTE → CONTRADICTED | yes / SEMANTIC_KILLED | Changes CANNOT_RECOMPUTE projection into false CONTRADICTED, with identical deliberate native crash on both sides. |
| v1 | package-presence-as-pass | V01 | V09 | INSUFFICIENT_EVIDENCE → VERIFIED | yes / SEMANTIC_KILLED | Drops executed=true requirement; narrower witness is execution-declaration completeness, not a no-run experiment. |
| v1 | ignore-policy-version | V01 | V22 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Deletes policy ID, version and digest comparison together; not isolated version-only mutant. |
| v1 | ignore-guarantee-dependency | V12 | V11 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Deletes upstream and downstream dependency checks. |
| v1 | ignore-retry-action-change | V13 | V14 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Bypasses exact action equality for retries. |
| v1 | ignore-evidence-grade | V01 | V24 | INSUFFICIENT_EVIDENCE → VERIFIED | yes / SEMANTIC_KILLED | Removes required LOCAL_RECOMPUTATION grade guard. |
| v1 | ignore-authority | V01 | V19 | CONTRADICTED → INSUFFICIENT_EVIDENCE | yes / SEMANTIC_KILLED | Deletes semantic authority checks; witness weakens CONTRADICTED to INSUFFICIENT rather than certifying success. |
| v1 | ignore-commit | V01 | V02 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Deletes commit member from subject comparison list. |
| v1 | ignore-canonicalization-profile | V01 | V23 | REJECTED_MALFORMED → VERIFIED | yes / SEMANTIC_KILLED | Bypasses supported canonicalization admission guard. |
| v2 | M01 | G01 | G04 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Deletes caller/evidence authority comparison. |
| v2 | M02 | G01 | G05 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Deletes scope comparison and erases scope in the native Semantic ABI embedding; both barriers must be bypassed. |
| v2 | M03 | G01 | G06 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Deletes complete policy comparison, including version. |
| v2 | M04 | G23 | G07 | INSUFFICIENT_EVIDENCE → VERIFIED | yes / SEMANTIC_KILLED | Deletes missing dependency premise check; G23 retains satisfied dependency positive. |
| v2 | M05 | G23 | G08 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Deletes contradicted dependency premise check; G23 retains satisfied dependency positive. |
| v2 | M06 | G01 | G03 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Compares evidence subject to itself. |
| v2 | M07 | G24 | G11 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Returns VERIFIED from positive native outcome before compatibility obligations. |
| v2 | M08 | G24 | G12 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Suppresses REFUTED guard and admits REFUTED as acceptable final semantic outcome. |
| v2 | M09 | G13 | G14 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Bypasses material equality between retry attempt and signed intent. |
| v2 | M10 | G15 | G21 | INSUFFICIENT_EVIDENCE → VERIFIED | yes / SEMANTIC_KILLED | Bypasses native PRF UNVERIFIABLE gate. |
| v2 | M11 | G01 | G22 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Deletes claim and subject version comparison together. |
| v2 | M12 | G01 | G18 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Returns VERIFIED from integrity and authenticity before semantic obligations. |
| v2 | M13 | G24 | G29 | INSUFFICIENT_EVIDENCE → VERIFIED | yes / SEMANTIC_KILLED | Deletes native scanner evidence-grade requirement. |
| v2 | M14 | G15 | G30 | CONTRADICTED → VERIFIED | yes / SEMANTIC_KILLED | Ignores nested PRF native product projection while transfer stays PRESERVED. |

The v1 `count-crash-as-semantic-refutation` control is valid: baseline V08 and the mutant witness receive the same deliberate exit-7 bridge bytes (`c4df76eac2a98d58f7d14c77386370d6fa8d12750261962aaf5edf9f94060e06`). The baseline reports inability; the mutant falsely asserts a semantic contradiction. The crash is held fixed rather than counted as the kill. Its positive V01 runs before the fault and remains valid.

## Negative controls against both candidate harnesses

These are newly executed controls in disposable copies. Function-driver exit 0 for v2 does not mean coverage passes: its returned `passed=false` and `KILLED=0` are inspected. The public v2 command separately maps `passed` to its process exit code.

| Family | Control | Actual candidate classification | KILLED | Successful coverage claimed? |
| --- | --- | --- | --- | --- |
| v1 | zero | ZERO_MUTANTS exception, no report | 0 | no |
| v1 | no-op | NOT_APPLIED | 0 | no |
| v1 | unapplied | NOT_APPLIED | 0 | no |
| v1 | outer-crash | CRASHED | 0 | no |
| v1 | outer-null | INVALID_OUTPUT | 0 | no |
| v1 | damaged-positive | CONTROL_BROKEN | 0 | no |
| v1 | inner-crash | KILLED | 1 | YES — defect |
| v1 | inner-null | KILLED | 1 | YES — defect |
| v2 | zero | ZERO_MUTANTS | 0 | no |
| v2 | no-op | NOT_APPLIED | 0 | no |
| v2 | unapplied | NOT_APPLIED | 0 | no |
| v2 | outer-crash | CRASHED | 0 | no |
| v2 | outer-null | INVALID_OUTPUT | 0 | no |
| v2 | damaged-positive | CONTROL_BROKEN | 0 | no |
| v2 | inner-crash | CRASHED | 0 | no |
| v2 | inner-null | INVALID_OUTPUT | 0 | no |

## Finding MUTA-01 — HIGH

The frozen **v1 mutation harness falsely counts a failed inner checker as a semantic kill**. A conditional native bridge exit 7, preserving V01 but crashing the V07 negative checker, produces a structurally valid host report with CANNOT_RECOMPUTE. The outer process exits 0. The v1 harness compares only the changed product projection and reports `KILLED=1` / command exit 0. A conditional native `null` response with exit 0 is also counted as KILLED. Neither establishes the tested semantic defect. Root’s earlier independent captures under `work/audit02-mutations/native-crash-before.json` and `native-null-before.json` are preserved; this observer independently reproduced both.

The v2 harness correctly detects both cases (`CRASHED` and `INVALID_OUTPUT`, KILLED=0). Required repair: inspect nested native execution/output failure in v1; preserve the legitimate fixed-fault V08 semantic witness by comparing the controlled baseline and mutant under the same fault. Add actual v1 negative controls, rerun both catalogues and the complete canonical suite. This is an audit/test-infrastructure defect, not a demonstrated false VERIFIED production path. Independent reproduction supports the current 14 catalogue kills but does not make the broad frozen “crash is never a kill” claim accurate.

## Boundaries of this evidence

All mutations are selected, single-source-string (or explicitly multi-barrier) defect simulations. They are not random mutation coverage, a proof of all code paths, or a count of independent security properties. V1/V2 overlap, deliberate corpus aliases, reason-subset oracles and incomplete expected-native fields must be disclosed in the vector audit. `ignore-policy-version`, M03 and M11 remove more than a single version subfield. M02 intentionally bypasses two scope barriers. The independent observer requires full positive semantic equality; it records remaining diagnostic differences rather than inventing independent byte identity.

Evidence files: `independent-mutation-results.json`, `baseline-inputs-and-reports.json`, `catalogs.json`, `negative-control-results.json`, `positive-diagnostic-differences.json`, `raw/`, `observer.mjs`, `audit.py`, `negative-controls.py`. No product, upstream or Git refs were modified by this sub-audit.
