# XRPL PoC repair report

## Identity and scope

Original candidate: `667760d0e153cb28b9f2524035dd444f32f30ad9`, branch `feat/xrpl-anchor-poc`.

Repaired implementation commit: **`3f3a9329228de6e9c93349a07ef2582217a5a81a`**, tree `b41f9cc876eb2fa3a3bc9ebea5304ada49dfd759`, direct child of the original candidate. The final documentation/evidence closure is an unpushed child of this tested implementation; its self-referential commit ID is obtained with `git rev-parse HEAD` and reported in the final handoff. Runtime/test/source bytes remain those of this implementation commit; the closure adds this report, evidence and its required documentation source-lock refresh.

Recommendation: **XRPL_POC_REPAIRED_READY_FOR_COLD_REVIEW**, for another independent audit of the bounded experimental PoC. This is not publication authorization, all-environment reliability, Mainnet readiness or a production certification.

No new XRPL wallet, XRPL key generation, funding, signing or XRPL transaction was performed. No Mainnet, upstream edits, Batch/DID/Credentials additions, push, PR, merge, tag/release or email occurred. Native upstream algorithms, Memo profile/domain, root profile and public anchor bytes are unchanged. Dependency versions/lock/legal bytes are unchanged.

## BEFORE FIX — preserved cold-review evidence

The complete 73-file local cold-review deliverable, including its 72-entry SHA256 manifest, was copied byte-for-byte before repair and verified against the original. Its report SHA256 is `4fba97d717150c0acb1cc667b8ac5ea6e9e9f5c52b88810b0747e5e1b9260536`. Summary and source identities are retained in [before.json](reports/xrpl-poc-repair/before.json). The original candidate is not retrospectively called sound.

1. **JIMMY_BINDING_GAP_CONFIRMED:** the checkpoint comparison existed, but removing only committed/selected-checkpoint equality survived original 95/95 and golden replay. A detached witness selected actual checkpoint 21488207 with coherent actual history [21488207,21488208], while the anchored declaration remained committed to 21488206. The mutant incorrectly continued. A source-lock would detect intentionally changed bytes; that separate identity check did not establish semantic binding completeness in a legitimately updated implementation.
2. **Direct API bug:** `new Set("AB")` produced characters A and B. A caller requiring assumption A was incorrectly satisfied by malformed raw-string context AB. Array[AB] already failed; array [A] passed. Normal CLI arrays and global v0.2 policy admission were not the exploited surface.
3. **Runner state:** cold sequential 800/802, not 802/802. Two legacy Moth/QEV tests failed; isolated reruns passed. The historical 32 parallel failures were ordinary fixture/module/assertion failures, not intentional isolation barriers, and their individual native causes were not fully retained.

## AFTER FIX — enforced interface

The opt-in descriptor declares:

```json
{"binding_contract":{"version":1,"required":["receipt_root","claim","subject","submitting_account","transaction","network","ledger_checkpoint"]}}
```

Every binding result has exactly `status`, `relation`, `expected`, `observed`, and `evidence`. `relation` is EXACT; evidence contains two distinct own-key references into the supplied evidence context. Core admits canonical JSON, resolves both references, checks their values against the reported snapshots, independently recomputes exact equality and checks every required result before projection. An aggregate success or matching adapter names cannot replace these steps. The accepted XRPL descriptor, contract and required array are immutable.

| Required binding | Native relation | Core obligation |
|---|---|---|
| receipt_root | Native-verified R vs selected Memo prefix | Complete backed EXACT result |
| claim | Recomputed C vs Memo suffix; supplied preimage vs root-bound receipt declaration | Complete backed EXACT result |
| subject | Supplied subject vs root-bound receipt subject | Complete backed EXACT result |
| submitting_account | Selected account vs decoded Account | Complete backed EXACT result |
| transaction | Selected/reported ID vs independently hashed signed bytes | Complete backed EXACT result |
| network | Selected endpoint/network vs observed, committed and carrier context | Complete backed EXACT result |
| ledger_checkpoint | Committed/selected/first-header checkpoint, final ledger, validated observation and reported membership | Complete backed EXACT result |

These claim/subject bindings establish what the native anchor **covers**. The caller-selected claim comparison remains separate; B can have complete native anchor bindings and still be contradicted. Submitting account is not external/business authority. Native hashing, receipt checking, Memo selection, ledger-header/ancestry and trust admission remain adapter-local; arbitrary domain algorithms are not encoded in JSON.

Core reuses existing statuses. Missing required results are INSUFFICIENT_EVIDENCE; null/malformed/unknown/unbacked/undeclared data is REJECTED_MALFORMED; contradicted exact relations remain CONTRADICTED; missing/new unsupported contract versions are UNSUPPORTED_PROFILE. Supported negative states cannot satisfy establishment. No Boolean fallback exists. Direct native completion and the separate product composition both call the core gate. A raw adapter MATCH is retained as `adapter_anchor_native` when contract enforcement refuses completion; the final anchor/product statuses explain why.

This contract checks declared completeness and backed exact relations over native snapshots. It does **not** prove a dishonest adapter actually executed a domain verifier or authenticated its snapshots. Pinned code, native trust, detached oracles and semantic mutation controls remain necessary. ANCHOR_MATCH never becomes global VERIFIED.

## Binding-omission mutation matrix

The durable command is `npm run mutations:xrpl`. One disposable copy is reused, each exact source replacement must apply once and change its digest, syntax/start must succeed, and semantic outputs determine the outcome. Source-lock is not repinned for intentionally mutated bytes. No crashes, malformed process output, no-op/unapplied edits or damaged positives count as kills.

| Binding / control | Mutation | Raw adapter → enforced native | Core / product | Replay / permanent witness | Killed? |
|---|---|---|---|---|---|
| receipt_root | Omit only structured bind call | ANCHOR_MATCH → ANCHOR_NOT_ESTABLISHED | INSUFFICIENT_EVIDENCE (receipt_root); INSUFFICIENT_EVIDENCE | REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED; exit 1 | KILLED |
| claim | Omit only structured bind call | ANCHOR_MATCH → ANCHOR_NOT_ESTABLISHED | INSUFFICIENT_EVIDENCE (claim); INSUFFICIENT_EVIDENCE | REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED; exit 1 | KILLED |
| subject | Omit only structured bind call | ANCHOR_MATCH → ANCHOR_NOT_ESTABLISHED | INSUFFICIENT_EVIDENCE (subject); INSUFFICIENT_EVIDENCE | REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED; exit 1 | KILLED |
| submitting_account | Omit only structured bind call | ANCHOR_MATCH → ANCHOR_NOT_ESTABLISHED | INSUFFICIENT_EVIDENCE (submitting_account); INSUFFICIENT_EVIDENCE | REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED; exit 1 | KILLED |
| transaction | Omit only structured bind call | ANCHOR_MATCH → ANCHOR_NOT_ESTABLISHED | INSUFFICIENT_EVIDENCE (transaction); INSUFFICIENT_EVIDENCE | REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED; exit 1 | KILLED |
| network | Omit only structured bind call | ANCHOR_MATCH → ANCHOR_NOT_ESTABLISHED | INSUFFICIENT_EVIDENCE (network); INSUFFICIENT_EVIDENCE | REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED; exit 1 | KILLED |
| ledger_checkpoint | Omit only structured bind call | ANCHOR_MATCH → ANCHOR_NOT_ESTABLISHED | INSUFFICIENT_EVIDENCE (ledger_checkpoint); INSUFFICIENT_EVIDENCE | REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED; exit 1 | KILLED |
| ledger_checkpoint | Bypass old R06 equality, retain mismatched backed report | ANCHOR_MATCH → ANCHOR_MISMATCH | CONTRADICTED (ledger_checkpoint); CONTRADICTED | Contract error; actual replay exit 1 (wrapper exit 0) | KILLED |
| assumptions | Restore raw iterable context admission | ANCHOR_MATCH → ANCHOR_MATCH | VERIFIED (complete); CONTINUE_REQUIRED_LAYERS | API incorrectly continues; permanent ERR_ASSERTION fires | KILLED |

The seven omission witnesses name their exact missing obligation. Baseline and checkpoint/assumption appropriate positive controls pass. Mutant syntax/start and source-change receipts are preserved in `binding-mutations.json`.

For the seven report omissions, all native checks otherwise finish and the adapter initially claims MATCH. Core identifies the exact missing obligation, returns INSUFFICIENT_EVIDENCE, the enforced native result becomes ANCHOR_NOT_ESTABLISHED, product continuation stops, and replay emits `REQUIRED_BINDING_CONTRACT_NOT_ESTABLISHED`. The verdict is caused by the declared obligation, not an unrelated fixture comparison.

The separate **old R06 condition bypass** preserves the checkpoint report while bypassing the original adapter-local equality terms. The coherent-history witness now produces core CONTRADICTED specifically at ledger_checkpoint, native ANCHOR_MISMATCH, and product CONTRADICTED. The same witness fails replay explicitly at the contract gate. Normal A remains accepted. Its disposable replay uses an explicitly counterfactual history-suffix capture and separately re-pinned test policy; signed transaction, account, ledger and R/C stay identical. No new live observation or default-capture rewrite is claimed.

Four actual harness negative runs cover empty inventory, unapplied replacement, deliberate crash and damaged positive control. Each returns FAIL/nonzero with **zero semantic kills**. The final normal inventory is 9/9 KILLED, 0 survivors/crashes/unapplied/invalid/broken-positive outcomes. The initial run preceded a cleanup-only explicit junction-unlink improvement; the final frozen tool was rerun and its exact digest is recorded. Native test/capture source files were not changed by the disposable controls.

## Exact assumption repair and load-bearing API witness

Requested/evidence assumptions and evidence requirements, plus optional context established_assumptions/evidence_basis, must be unique arrays of bounded nonempty strings, matching the existing v0.2 schema. Missing optional context lists remain empty; explicit null, raw strings, nested arrays, duplicate/non-string/empty identities fail closed. Equality is exact and case-sensitive; no trimming, prefix/substrings or Unicode normalization is introduced.

| Required identity / supplied context | AFTER FIX |
|---|---|
| A / array [A] | Compatible; continuation permitted |
| A / array [AB] | Assumption unestablished |
| AB / array [A] | Assumption unestablished |
| A / raw string AB | Malformed-context reason; no continuation |
| A / null, nested array identity, duplicates or empty identity | Malformed-context reason; no continuation |
| A / lowercase a or prefix/suffix variants | No exact match |

The malformed direct context keeps the already established native ANCHOR_MATCH; compatibility is INSUFFICIENT_EVIDENCE with CLAIM_SURFACE_MALFORMED, and overall is INSUFFICIENT_EVIDENCE. It does not manufacture a contradiction about execution. Malformed requested surfaces retain existing request admission semantics. A valid array of externally established premises is still a caller-selected trust premise, not proof that XRPL establishes those assumptions.

The permanent direct API witness uses the unchanged actual capture with caller assumption [A] and raw context AB. Restoring only the old permissive context admission causes actual API continuation and an ERR_ASSERTION regression failure, while array [A] remains a positive control. Evidence-basis iterable admission receives analogous protection.45 new tests include30 actual exported-API calls and15 detached relation/admission controls; 40 are adverse under the explicit test taxonomy.

## Compatibility, capture and original live A/B

Existing fixed-dispatch v0.2 adapters are not broadly migrated. The protocol exposes LEGACY_NOT_DECLARED for old descriptors; paths requiring version 1 reject absent contracts instead of inferring all bindings established. The opt-in XRPL sibling requires version 1 on both native completion and product projection. Existing valid v0.2 relation semantics, source pins, vector expectations and upstream code remain unchanged.

The original 95 XRPL expectations remain; the test fixture now uses existing PUBLIC signature-shaped fields in explicitly counterfactual codec carriers. It does not generate a wallet or claim those changed carriers have valid authorization. Independent signature verification was never this adapter's contract; actual Testnet evidence remains the genuine unchanged public transaction. The existing live command was not invoked.

- Network: XRPL Testnet, ID 1.
- Account: `rGsFMVmcrHrKDGL1CjBPFTLbxj4QsjNkQn`.
- Transaction: `375AE7E0F1D1405E2356BD9ACB4EC0B59B9665E01CB1B10A95E4CDDE6AA98633`.
- Ledger 21488208: `332EA3AA4B141BE29F56C1CA978B977F16FA9F92D76A2912E5C6ECBABA1D242B`.
- Native result: tesSUCCESS.
- R: `767aaea2159e3e32a08be974b047e4f6d31a1b1b5d65e7b36ac632a35dfd4b16`.
- C: `1e407befea04ab2da1811f05de21ce8c8669b0011207d5ac13285e31cefdb0dc`.
- Capture SHA256: `7f7fa0ad162a5d619ff594e0aa562beb361fdd0d275821f7d1f0b2d54e7231ce`.
- Separate policy SHA256: `330f1a8e1fd7881720b57c72f699eed8fadf169de2023f464e0d6c68a045eadf`.

Both files remain byte-identical. Replay newly derives binding output and compares every original saved semantic field unchanged; it does not regenerate or relabel the old live observation.

| Same anchor | Anchor | Caller binding | Overall |
|---|---|---|---|
| A | ANCHOR_MATCH | COMPATIBLE | CONTINUE_REQUIRED_LAYERS |
| B, changed claim/commit | ANCHOR_MATCH | CONTRADICTED | CONTRADICTED |

Fresh read-only observation at 2026-10-12T23:52:12.361Z: the accepted primary Testnet RPC independently returned the exact transaction, public account, validated ledger, bytes and tesSUCCESS; detached R/C, transaction/header hashes and history checks match. The secondary XRPL Labs endpoint returned Transaction not found. The raw two-endpoint audit exit 1 is preserved, not called a complete two-endpoint PASS. Secondary history/cause is NOT_INDEPENDENTLY_ESTABLISHED; this is not proof of non-inclusion. No new transaction was submitted to compensate. TLS RPC observation remains a trust premise, not portable validator-consensus/SHAMap proof.

Normal, repeat and Node `--no-opt` replay outputs are byte-identical: SHA256 `f643f38fed959e860e51cc39e0ee858bc3e989fbfec6bfecd492c37f87bd3969`, 47,061 bytes. Separate `verify` A exits 0; B exits 2 with CONTRADICTED, not a process crash. Fresh-checkout/path comparison is separately recorded below.

## Test and negative-control results


Implementation `3f3a9329228de6e9c93349a07ef2582217a5a81a`, tree `b41f9cc876eb2fa3a3bc9ebea5304ada49dfd759`. Fresh no-hardlink detached clone, LF checkout, exact 26 locked packages installed offline from the ordinary npm cache. Empty ignored `reports/tmp` parent explicitly created. All commands run sequentially/exclusively; only diagnostic parallel modes preload the outside-repository native-process trace. Full sequential run is uninstrumented and retains the original 10-second native deadline.

|Mode|Actual result|Exit|Command|
|---|---|---:|---|
|base-parallel|706/707; fail 1|1|`node --import <audit trace> --test <38 exact base files>`|
|original-parallel|698/707; fail 9|1|`node --import <audit trace> --test <38 exact base files>`|
|repaired-parallel|698/707; fail 9|1|`node --import <audit trace> --test <38 exact base files>`|
|repaired-full-parallel|925/934; fail 9|1|`node --import <audit trace> --test <42 exact test files>`|
|repaired-full-serial|934/934; fail 0|0|`node --test --test-concurrency=1 <42 exact test files>`|
|xrpl-focused|167/167; fail 0|0|`npm run test:xrpl`|
|xrpl-core-no-opt|227/227; fail 0|0|`node --no-opt --test --test-concurrency=1 tests/binding-contract.test.mjs tests/xrpl-*.test.mjs`|
|replay-normal|Same-anchor A/B expected;47,061B; byte-identical to root|0|`node tools/xrpl-poc.mjs replay --json`|
|replay-no-opt|Same-anchor A/B expected;47,061B; byte-identical to root|0|`node --no-opt tools/xrpl-poc.mjs replay --json`|
|canonical vectors|68/68; v0.1 30/30,v0.2 38/38|0|`node tools/run-vectors-v2.mjs <external output>`|
|canonical v1 mutations|13 KILLED; 1 CRASHED; all other categories 0|1|`node tools/run-mutations.mjs --out <external output>`|
|targeted v1 diagnostic|1/1 KILLED; all other categories 0|0|`node --import <audit trace> <targeted-v1.mjs> repaired`|
|canonical v1 bounded repeat|14/14 KILLED; all other categories 0|0|`node tools/run-mutations.mjs --out <separate external output>`|
|canonical v2 mutations|14/14 KILLED; all other categories 0|0|`node tools/run-mutations-v2.mjs`|
|sources|PASS; 387 files|0|`npm run check:sources`|
|provenance|PASS; 43 historical repos, 74 capabilities, 26 npm legal instances|0|`npm run check:provenance`|
|diff|PASS; empty output|0|`git diff --check`|

Full sequential **934/934** includes the original 802 inventory and132 added tests. The original cold-review **800/802** result remains historical evidence; it was not relabeled. Full parallel is **925/934**, with nine pre-existing Moth before-hook failures after the 10-second native deadline. Common exact legacy inventory is707: base706/707, original 698/707, repaired698/707. Original→repaired failure delta is0; no newly demonstrated native failure class. Parallel remains non-green.

Both fresh replay modes return A=ANCHOR_MATCH/COMPATIBLE/CONTINUE_REQUIRED_LAYERS and B=ANCHOR_MATCH/CONTRADICTED/CONTRADICTED, using the same transaction 375AE7E0F1D1405E2356BD9ACB4EC0B59B9665E01CB1B10A95E4CDDE6AA98633. SHA-256 is f643f38fed959e860e51cc39e0ee858bc3e989fbfec6bfecd492c37f87bd3969 in both paths/modes and matches root's prior normal/repeat/no-opt output. No network, new wallet or transaction is used.

Source-gate preparation explicitly inventories/hashes and removes only identified untracked native-temp/test-runs leftovers inside the disposable clone; `cleanup-record.json` records the transformation. It does not rewrite the source lock. Exact runtime/lock/capture/dependency identities are in `repaired-identities.json`; all raw receipts, TAP and diagnostic traces remain locally preserved.

Historical32 failures were ordinary regression/hook/module failures, not intentional barriers; individual historical native causes are not all recoverable. See `RUNNER_REVIEW.md` for Moth deadline evidence, Windows EBUSY caveat, and the 12.100-second overlap caveat in the before-repair measurements.

The planned canonical v2 command also generated its default tracked report inside the disposable clone. That actual report and its diff were preserved externally as generated-mutations-v2.json / generated-mutations-v2.diff, then only that clone report was restored from its exact HEAD blob (SHA-25668cbe1c61c73194bd10d79f353f95112653718b887754fb217e903d112fae8cc). This is recorded in report-restoration.json; the product checkout and source-lock were never changed. Final clone status/diff are empty.

Command placeholders abbreviate exact argv/file selections retained in `runner-summary.json` and the raw external receipts; they are not missing implementation inputs. The separate focused normal runs passed core/interface **60/60**, original XRPL **95/95**, direct API/admission **45/45** and public-capture binding **27/27**. Their combined registered inventory is 227; these overlapping runs are not added together as new coverage.

The first fresh v1 mutation inventory was **13 KILLED + 1 CRASHED**, exit 1. The compare-receipt-to-itself witness changed V04 as expected, but its positive native checker was invalid; the harness correctly refused a semantic kill. That harness did not retain detailed positive native stderr/deadline evidence, so the exact first-run cause is NOT_INDEPENDENTLY_ESTABLISHED. A targeted diagnostic or later complete repeat is reported separately and cannot rewrite that failure.

Original 76 adverse XRPL tests are retained under the cold-review taxonomy; this does not mean 76 independent defect classes. New direct-API suite has 40 adverse tests, new core/interface and binding tests have their separate registered counts. Independent 19 controls again pass. Binding mutations are 7 mandatory omissions plus checkpoint-bypass and old-assumption restoration. Do not add repeated modes together as independent coverage.

## Moth/QEV and parallel/native classification

This investigation does not edit ReceiptOS runtime/tests or upstreams. All execution is in fresh no-hardlink local clones with exact tracked LF bytes. Base is `6b403702628f216933d4b30a130f74ac5c81171d`; original PoC is `667760d0e153cb28b9f2524035dd444f32f30ad9`. Both clones install their exact lock using `npm ci --ignore-scripts --no-audit --no-fund --offline`: base 7 packages, original 26. The normal npm cache is used for dependency bytes; no previous test output is used as a result oracle.

No XRPL wallet generation/signing/funding or XRPL network call or transaction is performed. The old XRPL test module is deliberately excluded because its original fixture calls `Wallet.generate()` and the repair mission prohibits a new wallet. The common legacy suite is 707 tests in 38 files. Its instrumented parallel command is explicitly a diagnostic mode, not an unqualified canonical `npm test` result.

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

The exact two cold-review failing titles are “portable anchor and separately supplied native bundle cannot drift” and “own native invocations clean temporary payloads and create no bytecode in an isolated product copy.” Both can fail on the exact pre-PoC base through a shared fixture deadline; the original PoC cleanup also demonstrated the same kill followed by Windows EBUSY. The current mechanically traced class is **ENVIRONMENTAL with a PRE_EXISTING outer 10-second deadline**, not a demonstrated POC_REGRESSION or REPAIR_REGRESSION. The exact causes of the old uninstrumented cold 800/802 children remain historically uncertain; current traces must not be backfilled onto them.

The outer timeout is 10 seconds while nested Moth Bun work permits 30 seconds, and process-tree cleanup is not guaranteed by the existing parent kill. These unchanged native mechanisms are separate follow-ups; no timeout, QEV/vendor source or unrelated runtime repair is included. Severe host memory scarcity is measured, while paging as the cause of a particular historical failure remains an inference. No user processes were stopped. Sequential success, if obtained, does not erase parallel failures; every actual mode stays separate.

The historical 32 log is not a fixed barrier inventory. It contained one generic pre-registration failure, 20 RVR fixture/hook failures, 9 Moth hook failures and 2 assertions, and predates the final95th XRPL test. Individual native launch causes were not retained. Common 707 comparisons and full repaired runs are reported separately; deltas are not causal defect counts.

## Secret hygiene, source, licensing and provenance

Implementation-commit full scan: 2,250 current/history/log artifacts, 126,071,540 bytes; 92 candidates classified as 90 known public identifiers and two occurrences of the already-public synthetic Interpoll test key. **Zero new/unclassified operational secrets.** The scan began before commit completion and included its actual final patch; its inventory is not represented as the final closure file count. The preserved original audit covered reachable pre-repair Git objects. The final documentation closure receives a separate incremental patch scan reported in the handoff.

All 26 installed dependency version/license/lock/SRI identities and retained legal bytes match. No secret value is printed. Regex scanning and source inspection do not prove historical process-memory contents or the absence of every possible secret. No new wallet, signing or submission code was added or run.

No dependency churn: xrpl 5.3.0, canonicalize 5.1.0, package-lock and 26 legal instances remain unchanged; no new vendor source/license copying. Historical 43 repositories / 74 capability fields remain unchanged. New metadata maps the local binding hardening and its review feedback accurately; Jimmy's observation is feedback attribution, not code authorship. The XRPL provenance fragment and its catalog digest are refreshed, then the existing source-lock is regenerated because product source/docs/tests changed. Native roots, capture/vector artifacts, upstream pins and the frozen reviewed note/PDF/schema are not repinned.

Fresh implementation source-lock and provenance results, runtime/lock identities and exact commands are retained in `reports/xrpl-poc-repair/runner-summary.json` and `runner-identities.json`. Source-lock at the tested implementation covers **387 files**. Adding this report requires one documentation-only lock refresh; the final closure gate covers **388 files**. The final closure is checked again with `npm run check:sources`, `npm run check:provenance` and `git diff --check`, without another runtime change.

The compact committed receipts have a SHA256 manifest. Full raw native TAP/traces and original preserved cold-review files are retained in the separate local `receiptos-verify-xrpl-repair` deliverable. No failed diagnostic or secondary RPC response is relabeled as PASS.

## Remaining limits and next decision

The two confirmed repair targets are closed by core enforcement and load-bearing semantic controls. Another independent cold review is required; this report does not authorize publication. Existing environmental/native deadlines, imperfect process-tree cleanup, old fresh-checkout reports/tmp prerequisite, secondary-RPC historical availability, inherited Bun runtime/path and native trust remain explicit limitations. The first legacy v1 mutation run also had an undiagnosed invalid positive-native result; passing targeted and complete repeats do not establish that first cause.

No proof of independent XRPL consensus, signature verification, provider/hardware/execution provenance, business authority, arbitrary semantic entailment, Mainnet or production readiness is added. Ledger inclusion is not semantic correctness; transaction effect is not anchor inclusion; A's valid anchor is not proof of B. tes/tec and optional effect policy stay separate. A reproduced negative remains negative in the unchanged upstream layers.

The final working tree is clean with intended local unpushed implementation and evidence/report commits only. No new wallet, transaction, Mainnet funds, push, PR, merge or email. Final recommendation: **XRPL_POC_REPAIRED_READY_FOR_COLD_REVIEW**.

## Complete repair file inventory

Relative to the original frozen candidate; implementation and documentation/evidence closure only:

- `PROVENANCE.md`
- `XRPL_POC_REPAIR_REPORT.md`
- `docs/xrpl/POC.md`
- `package.json`
- `provenance/sources.json`
- `provenance/xrpl-poc.json`
- `reports/xrpl-poc-repair/HYGIENE_REVIEW.md`
- `reports/xrpl-poc-repair/RUNNER_REVIEW.md`
- `reports/xrpl-poc-repair/before.json`
- `reports/xrpl-poc-repair/binding-agent-evidence.json`
- `reports/xrpl-poc-repair/binding-control-crash.json`
- `reports/xrpl-poc-repair/binding-control-empty.json`
- `reports/xrpl-poc-repair/binding-control-positive-control.json`
- `reports/xrpl-poc-repair/binding-control-unapplied.json`
- `reports/xrpl-poc-repair/binding-mutations.json`
- `reports/xrpl-poc-repair/canonical-mutations-v1-repeat.json`
- `reports/xrpl-poc-repair/canonical-mutations-v1.json`
- `reports/xrpl-poc-repair/canonical-vectors.json`
- `reports/xrpl-poc-repair/focused-tests.json`
- `reports/xrpl-poc-repair/fresh-live-reobservation.json`
- `reports/xrpl-poc-repair/hygiene-implementation.json`
- `reports/xrpl-poc-repair/independent-controls-19.json`
- `reports/xrpl-poc-repair/manifest.json`
- `reports/xrpl-poc-repair/offline-replay.json`
- `reports/xrpl-poc-repair/runner-cleanup.json`
- `reports/xrpl-poc-repair/runner-identities.json`
- `reports/xrpl-poc-repair/runner-report-restoration.json`
- `reports/xrpl-poc-repair/runner-summary.json`
- `source-lock.json`
- `src/adapters/protocol.mjs`
- `src/adapters/xrpl-anchor.mjs`
- `src/core/binding-contract.mjs`
- `src/core/claim-surface.mjs`
- `src/core/types.d.ts`
- `tests/binding-contract.test.mjs`
- `tests/helpers/xrpl-fixture.mjs`
- `tests/xrpl-anchor.test.mjs`
- `tests/xrpl-assumption-context.test.mjs`
- `tests/xrpl-binding-contract.test.mjs`
- `tools/xrpl-binding-mutations.mjs`
- `tools/xrpl-poc.mjs`
