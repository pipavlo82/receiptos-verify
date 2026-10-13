# XRPL repair: independent legacy runner investigation

This investigation does not edit ReceiptOS runtime/tests or upstreams. All execution is in fresh no-hardlink local clones with exact tracked LF bytes. Base is `6b403702628f216933d4b30a130f74ac5c81171d`; original PoC is `667760d0e153cb28b9f2524035dd444f32f30ad9`. Both clones install their exact lock using `npm ci --ignore-scripts --no-audit --no-fund --offline`: base 7 packages, original 26. The normal npm cache is used for dependency bytes; no previous test output is used as a result oracle.

No wallet generation/signing/funding, XRPL network call or transaction is performed. The old XRPL test module is deliberately excluded because its original fixture calls `Wallet.generate()` and the repair mission prohibits a new wallet. The common legacy suite is 707 tests in 38 files. Its instrumented parallel command is explicitly a diagnostic mode, not an unqualified canonical `npm test` result.

## Preserved cold-review failures

The original review's exact full sequential result remains **800/802, exit 1**, not 802/802. Its two failing cases were:

1. `portable anchor and separately supplied native bundle cannot drift`: CANNOT_RECOMPUTE observed instead of REJECTED_MALFORMED; 10.377 s.
2. `own native invocations clean temporary payloads and create no bytecode in an isolated product copy`: native fixture construction failure; 11.867 s.

That run lacked subprocess deadline instrumentation. The exact reason each historical child ended cannot be reconstructed from elapsed time alone. Earlier cold-review isolated rerun of those same two passed 2/2; that does not erase the full-run failures.

## Exact before-repair runs

An empty ignored `reports/tmp` parent is explicitly created in each disposable clone, preserving the known existing test-harness prerequisite. The read-only external preload `native-trace.mjs` records native child start/exit/kill timing and kill-origin stack, never input or signing payloads. Native 10-second deadline semantics are unchanged.

| Exact tree / selection | Registered | Pass | Fail | Native calls | Killed native calls |
|---|---:|---:|---:|---:|---:|
| Base, exact two Moth titles | 2 | 0 | 2 | 1 | 1 |
| Original PoC, exact two Moth titles | 2 | 1 | 1 | 6 | 1 |
| Base, common legacy parallel | 707 | 706 | 1 | 377 | 1 |
| Original PoC, common legacy parallel | 707 | 698 | 9 | 362 | 1 |

Actual subprocess evidence:

- Base targeted: before-hook `qev-moth-bridge.py` killed at **10,323 ms**, closes at 10,479 ms with SIGTERM, zero stdout/stderr. Stack is `Timeout._onTimeout` in unchanged `src/adapters/native/process.mjs:67`. Both target titles fail because their shared before-hook never completes.
- Original targeted: first target passes. Isolated-copy evaluation child is killed at **10,194 ms**, closes at 10,646 ms, zero output. Test cleanup subsequently raises Windows **EBUSY** removing the vendor directory; the report preserves the actual visible EBUSY error rather than relabeling it as the earlier cold-review fixture error.
- Base legacy parallel: one ordinary positive Moth test fails. The corresponding native child is killed at **10,416 ms**, closes at 11,485 ms, zero output.
- Original legacy parallel: one shared Moth fixture before-hook is killed at **10,097 ms**, closes at 10,290 ms, zero output; all nine Moth cases then fail through that hook.

Timing caveat: original-targeted ran 23:28:07.575–23:28:46.336 UTC; base-parallel started 23:28:34.236 UTC, so the last **12.100 seconds overlap**. This was a scheduling error and is explicitly retained. The initial base-targeted was exclusive, and original-parallel began after all preceding runners finished. Failure-count deltas are not a controlled causal estimate of PoC-induced resource demand.

Host: Node v22.15.0, 12 logical CPUs, 34,167,291,904 physical bytes. Observed available RAM at runner boundaries ranged approximately 31–183 MiB; unrelated user processes were not stopped. Severe memory scarcity is observed. Paging/resource pressure as the reason for slow children is an inference; the 10-second timeout and SIGTERM origin themselves are independently observed.

## Classification

| Cold-review test | Exists / same bytes on base? | Actual pre-PoC failure reproduced? | Classification |
|---|---|---|---|
| portable anchor / native-bundle drift | Yes | Yes, targeted shared fixture times out on base | **ENVIRONMENTAL**, with demonstrably **PRE_EXISTING** native-deadline failure class |
| isolated-copy cleanup / no bytecode | Yes | Yes, targeted shared fixture times out on base | **ENVIRONMENTAL**, with demonstrably **PRE_EXISTING** native-deadline failure class |

No PoC/repair regression is demonstrated by these before-repair runs. This does not transform failed runs into passes or retroactively prove each uninstrumented historical child timed out. Exact two historical child causes remain not independently recoverable; current equivalent failure mechanism is demonstrated mechanically.

The pre-existing nesting uses an outer Node 10-second deadline and an inner `qev/moth_receiptos.py:58–60` Bun subprocess timeout of 30 seconds. The outer runner calls `child.kill()` without explicit descendant-tree termination. This is consistent with the observed timeout followed by Windows EBUSY in isolated-copy removal, but descendant Bun causation is not claimed as independently proven by the bridge-only trace. The mismatch is a bounded legacy runner follow-up, unchanged by this repair task.

`tests/qev_moth.test.mjs` SHA-256 is `e8927d3a7f318edafd7b46b18c0712f619142bea24cc66388cf30bce28863d48` at both exact commits. `src/adapters/native/process.mjs` SHA-256 is `0cc7e4fa6a4b7b014ce4b9fc111d7a4dd42813358e60d560f3d231756b0d213c` at both. Native QEV adapter/bridge/fixture and all vendor files are also unchanged in the base-to-PoC Git diff.

## Historical "32 barriers"

The preserved development TAP has 762 registered /730 pass /32 fail, SHA-256 `3e5df225a6de11730411041b6751c54c0a121f0b25da44811013f73a2fe3960d`. Inventory: one generic-boundary preregistration module failure, 20 RVR fixture/hook failures, nine Moth hook failures, two downstream assertion failures. It predates the final 95th XRPL test. These are ordinary regression/positive failures, not intentional isolation barriers. Historical native exit status was not retained, so not all 32 can honestly be labeled demonstrated timeouts.

The current controlled common legacy inventory gives base **1** and original **9** failures, both from a single already-existing Moth deadline kill. The numerical increase is eight failed tests but zero newly demonstrated native failure *classes*. Counts fluctuate with whether timeout occurs in a shared hook versus one evaluation. There is no evidence here for an XRPL shared-state/resource correctness defect; unresolved default-run reliability remains a limitation.

## Evidence and pending repaired comparison

`analysis.json` retains exact commands, times, failures, full failure blocks, native kill stacks and stdout/stderr/trace hashes. `*-targeted.*`, `*-parallel.*` retain raw receipts and TAP; invocation errors are not counted as tests. Candidate product files are untouched by this investigation. Disposable tests produce only declared ignored reports/native scratch or untracked disposable `work/` state.

The completed after-repair comparison follows. No pre-repair count is reused as an after-repair result.

## After-repair exact fresh comparison

Exact implementation `3f3a9329228de6e9c93349a07ef2582217a5a81a`, tree `b41f9cc876eb2fa3a3bc9ebea5304ada49dfd759`; fresh detached no-hardlink clone with LF checkout and its own 26 locked installed packages. Root product checkout is never edited by this investigation.

|Repaired mode|Pass / registered|Fail|Exit|
|---|---:|---:|---:|
|repaired-parallel|698/707|9|1|
|repaired-full-parallel|925/934|9|1|
|repaired-full-serial|934/934|0|0|

Common exact legacy 707 inventory: base706/707, original 698/707, repaired698/707; original→repair failed-test delta0. All common and full-parallel failures are the same nine Moth cases sharing an unsuccessful before-hook; no newly demonstrated native failure class. Repaired common hook is killed at10,144 ms with SIGTERM. Repaired full-parallel hook timer fires at10,052 ms, then child closes0 at10,058 ms with 164,727 stdout bytes; the runner had already latched TIMEOUT. Thus full parallel is not mislabeled a child crash or semantic contradiction.

The full sequential result is **934/934**, exit 0, no skips/cancellations,436,628.997 ms TAP duration (439,705 ms wall receipt). This run uses original runtime/deadlines, no preload, concurrency1, and an explicitly created ignored reports/tmp parent; it is not an unqualified pristine default-command result. It demonstrates all nine Moth cases can pass under controlled sequential execution without source repair. The original cold 800/802 and current parallel 925/934 remain preserved failures.

Fresh focused 167/167 and no-opt core+XRPL227/227 pass. Two fresh replay modes are byte-identical to the separate root run:47,061 bytes, SHA-256 f643f38fed959e860e51cc39e0ee858bc3e989fbfec6bfecd492c37f87bd3969. A and B use the same original Testnet transaction and expected semantic outcomes; no network or wallet is involved. Combined corpus passes 68/68 (30 legacy+38v0.2).

Canonical v1 initial inventory: **{"KILLED":13,"SURVIVED":0,"CRASHED":1,"INVALID_OUTPUT":0,"NOT_APPLIED":0,"CONTROL_BROKEN":0,"INVALID_BASELINE":0}**, exit 1. The compare-receipt-to-itself mutation applied, both literal baselines were valid, witness V04 escaped to VERIFIED as expected, but its positive V01 had an inner checker failure. The harness discarded detailed positive-native output, so original native cause is **NOT_INDEPENDENTLY_ESTABLISHED**. It was correctly counted CRASHED, not KILLED.

A justified single-mutant diagnostic then produced **{"KILLED":1,"SURVIVED":0,"CRASHED":0,"INVALID_OUTPUT":0,"NOT_APPLIED":0,"CONTROL_BROKEN":0,"INVALID_BASELINE":0}**, with its positive preserved; four recorded mutant native calls exit 0 with no kills. Baseline controls were admitted, but their individual native calls were not traced. One separately preserved bounded canonical-v1 repeat then produced **{"KILLED":14,"SURVIVED":0,"CRASHED":0,"INVALID_OUTPUT":0,"NOT_APPLIED":0,"CONTROL_BROKEN":0,"INVALID_BASELINE":0}**, exit 0. These later results do not relabel the initial failed inventory or backfill its discarded native details. Canonical v2 produces **{"KILLED":14,"SURVIVED":0,"CRASHED":0,"INVALID_OUTPUT":0,"NOT_APPLIED":0,"CONTROL_BROKEN":0,"INVALID_BASELINE":0}**, exit 0.

Fresh source/provenance/diff gates follow explicit inventory/hash preservation and deletion of 17 identified generated native-temp/test-runs files, only under the disposable clone's untracked work/. Exact transformation is cleanup-record.json; no source-lock rewrite occurs. Source result:{"status":"PASS","files":387,"sourceLockDigest":"6e150823ac3eaca2b6d5f7c9e4e06488ddaed1ac0ce95cfe470f7a9baa22e782"}. Provenance exit 0; diff exit 0. Final fresh clone tracked bytes remain exact; runtimes/locks/capture and all 26 installed versions are preserved in repaired-identities.json.

Detailed command/count table is final-test-summary.md; compact machine-readable receipt is final-summary.json. Raw TAP/native logs remain outside the product tree. No new transaction/wallet, Mainnet use, upstream edit, push, PR, merge or email is performed. Parallel reliability and historical native-detail loss remain explicit limitations.

The planned canonical v2 command also generated its default tracked report inside the disposable clone. That actual report and its diff were preserved externally as generated-mutations-v2.json / generated-mutations-v2.diff, then only that clone report was restored from its exact HEAD blob (SHA-25668cbe1c61c73194bd10d79f353f95112653718b887754fb217e903d112fae8cc). This is recorded in report-restoration.json; the product checkout and source-lock were never changed. Final clone status/diff are empty.
