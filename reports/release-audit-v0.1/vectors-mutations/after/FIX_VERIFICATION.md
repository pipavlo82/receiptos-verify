# Runner repair verification

The frozen audit remains unchanged in the parent folder. This evidence concerns the explicitly authorized repair to the working tree based on `33d8ee47ad733f1198f2b2fb8d171b31c7b10678`; the root coordinator assigns its final commit identity.

Changed files:

- `tools/corpus.mjs`: validates the existing complete report schema, exact layer names and per-layer status vocabulary, required-layer identity/uniqueness, and equality of overall/projection status and reason codes. Both isolated-process admission and literal vector comparison reject invalid reports. Temporary copy leaves now use `i-` plus12 SHA256 hex characters, preventing descriptive mutant IDs from extending Windows native dependency paths.
- `tools/run-mutations.mjs`: distinguishes `INVALID_OUTPUT` from `CRASHED`, with both rejected before kill comparison. Baseline, positive-control and application requirements remain fail-closed.
- `tests/mutation-runner.test.mjs`:3 regression tests cover12 independently damaged process-output documents, a real exit9 crash, a matching-overall arbitrary schema, and bounded/different isolation names.
- `mutations/catalog.mjs`: the existing `promote-reproduced-to-verified` mutation now removes the native REFUTED early check **and** the independently repaired projection's final native VERIFIED guard. This preserves the intended false promotion in the new implementation. The14 mutation IDs, witnesses and positive controls are unchanged. The `count-crash-as-semantic-refutation` return anchor still applies without modification. Runtime projection guards were not weakened.

Final coherent working-tree verification:

- New regression tests:3/3 pass, zero skipped/cancelled/todo.
- Literal corpus:30/30 pass.
- Canonical mutations against the repaired target:14/14 KILLED, all14 source patches applied, all14 baseline pairs valid, all14 positive controls preserved; zero survived/crashed/invalid-output/unapplied/broken-positive/invalid-baseline.
- Canonical mutations in a fresh **deep** isolated copy at `reports/tmp/release-rc-audit/gate-after`:14/14 KILLED with the same zero failure counts. This directly reproduces the former Windows-path failure class after shortening isolation labels.
- Ten audit control inventories: all exit1. Unknown overall, undefined overall, arbitrary schema plus unknown overall, and arbitrary schema with valid overall now classify `INVALID_OUTPUT`; an actual host exit9 classifies `CRASHED`; unapplied/no-op classify `NOT_APPLIED`; damaged positive classifies `CONTROL_BROKEN`; damaged expected baseline classifies `INVALID_BASELINE`; zero inventory throws `ZERO_MUTANTS`.
- Source diffs pass `git diff --check`; all four authorized files use LF. Exact bytes/digests are in `authorized-source-files.json`.

Command receipts, full mutation/control reports, the copied vector report, regression TAP, the adapted mutation patch reconstruction and the deep-checkout report are saved in this folder. Historical tracked `reports/mutations.json` was restored byte-exactly from the frozen candidate after preserving the new evidence here. No source-lock, documentation, frozen vector, feature, commit, push, PR, merge or deployment was performed by this auditor.
