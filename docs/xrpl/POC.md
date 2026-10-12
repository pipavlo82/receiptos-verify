# XRPL anchor PoC

## Chosen seam (recorded before implementation)

Base: `6b403702628f216933d4b30a130f74ac5c81171d`, new local branch `feat/xrpl-anchor-poc`.

An opt-in sibling, `src/adapters/xrpl-anchor.mjs`, returns anchor-native, XRPL transaction, separate transaction-policy, receipt-integrity and claim-compatibility results. The existing ledger interface and global `verifyV2`/projection remain unchanged. MATCH permits CONTINUE_REQUIRED_LAYERS for compatible A; incompatible B is CONTRADICTED. Neither path promotes an anchor to global VERIFIED.

The pinned native Crystal verifier establishes R; metadata binds the exact claim preimage. Existing closed v2 admission/comparison and separately pinned JCS derive the reviewed portable C. Separate tooling performs Testnet-only submission/readback with an in-memory ephemeral wallet. Signed-binary transaction identity, ledger-header hashes, reported membership and checkpoint ancestry are checked under explicit RPC trust, not a portable consensus proof. Offline replay requires a separate caller-selected capture/account/network/checkpoint pin; saved validated:true alone is insufficient.

The reviewed note, schema, fixtures and validator remain frozen. No main/tag/upstream changes, Batch fees, DID/Credentials or protocol proposal.

## Run and evidence

One anchor AccountSet was submitted using `xrpl@5.3.0` and a new ephemeral faucet-funded Testnet wallet. Its secret remained in process memory and was discarded. No Mainnet/real funds, fee recipient, commercial logic, DID/Credentials or Batch transaction was used.

| Observation | Exact value |
| --- | --- |
| Network | XRPL Testnet, queried network_id `1` |
| Endpoint | `wss://s.altnet.rippletest.net:51233/` |
| Account | `rGsFMVmcrHrKDGL1CjBPFTLbxj4QsjNkQn` |
| Transaction | `375AE7E0F1D1405E2356BD9ACB4EC0B59B9665E01CB1B10A95E4CDDE6AA98633` |
| Validated ledger | `21488208` |
| Ledger hash | `332EA3AA4B141BE29F56C1CA978B977F16FA9F92D76A2912E5C6ECBABA1D242B` |
| Native TransactionResult | `tesSUCCESS` |
| Anchor-native | ANCHOR_MATCH |
| Caller A | COMPATIBLE / CONTINUE_REQUIRED_LAYERS |
| Caller B, SAME transaction | CONTRADICTED / CONTRADICTED; anchor stays ANCHOR_MATCH |

`R = 767aaea2159e3e32a08be974b047e4f6d31a1b1b5d65e7b36ac632a35dfd4b16`; `C = 1e407befea04ab2da1811f05de21ce8c8669b0011207d5ac13285e31cefdb0dc`. Capture timestamp: `2026-10-12T21:13:18.645Z`. Checkpoint `21488206` / `47d47bf9389ba3eddb096db84e5c3c8faf57abc063bbb88066adc9503a7412fa` is connected to the anchor by 3 captured headers. The public XRPL Labs Testnet endpoint also returned identical signed transaction bytes and ledger identity.

These are fresh synthetic declarations: A/B commit labels are not claims about real Git commits or executed work. Root-bound metadata carries the exact declaration/preimage. A's compatible inclusion only permits remaining verification layers. B changes claim identity and subject commit without another submission.

## Commands

Prerequisites: Node >=22.15, `npm ci`, and Bun for the existing pinned Crystal bridge (on Windows the inherited adapter uses `C:/Users/msi/.bun/bin/bun.exe`; elsewhere `bun` on PATH). Python is additionally needed for the full product regression suite.

```sh
npm run xrpl:poc:replay
node tools/xrpl-poc.mjs verify docs/xrpl/examples/poc-request-A.json
node tools/xrpl-poc.mjs verify docs/xrpl/examples/poc-request-B.json
node tools/xrpl-poc.mjs replay --json
npm run test:xrpl
```

The B-only command exits 2 for CONTRADICTED. The paired replay exits 0 only when both literal A/B controls hold. `--json` exposes separate native, integrity, compatibility, transaction-policy and limitation fields. Normal output requires no Memo/ledger/JCS knowledge.

To generate a new live Testnet capture: `npm run xrpl:poc`. This creates/funds a fresh wallet in memory, submits once and fetches the actual validated transaction. It replaces this local public capture/policy with a new observation; review the resulting diff. Never supply a seed. The native result is not success-gated: a trusted validated exact anchor can MATCH for tes or tec; an optional tesSUCCESS policy is separate.

## Replay trust and non-claims

Public evidence is `reports/xrpl-poc/testnet-capture.json`; independent caller acceptance is `profiles/xrpl-poc-testnet-policy.json`, including the exact capture SHA-256, account, transaction, network and checkpoint. Replay requires that pin; a saved validated:true flag cannot appoint its own trust. Transaction bytes/hash, native root, JCS digest, exact unique Memo, account/network, ledger-header hashes, parent ancestry and RPC-reported membership are recomputed/checked offline. Unrelated Memos are preserved; zero/duplicate/malformed/unsupported/mismatch remain separate outcomes.

Public TLS RPC observations and their reported membership remain trust assumptions. No validator-signature, transaction-SHAMap or portable consensus inclusion proof is implemented. Secondary agreement is corroboration, not consensus authentication. Integrity/inclusion is not execution correctness, authenticity of the declarant, business authority or global VERIFIED. Replay is not a new live execution; ledger time is not execution time. One successful anchor transaction is a bounded demonstration, not broad integration or production certification. Reviewed note/PDF/schema/docs validator remain unchanged.

## Binding-contract hardening

Independent cold review of `667760d0e153cb28b9f2524035dd444f32f30ad9` reproduced Jimmy's adapter-interface concern: removing the declared/selected checkpoint comparison survived all95 XRPL tests and golden replay. The original implementation contained that check, but neither a binding-completeness contract nor a coherent replacement-history regression made its omission load-bearing. The cold findings remain preserved; the original candidate is not retrospectively declared sound.

The opt-in interface now declares `binding_contract: {version:1, required:[...]}`. Core requires every structured result, admits only finite existing statuses, resolves two distinct evidence references, checks reported snapshots against those sources, and independently checks exact equality before projection. Missing/null/unknown/unbacked/contradicted obligations cannot permit continuation. The accepted XRPL descriptor and required list are immutable. Native parsing, receipt verification, hashing, Memo selection and ledger-history algorithms remain adapter-local.

| Required native binding | Exact relation |
|---|---|
| receipt_root | Native-verified R equals selected Memo root bytes |
| claim | Recomputed C equals Memo digest; supplied preimage equals root-bound receipt declaration |
| subject | Supplied subject equals the root-bound declaration's subject |
| submitting_account | Selected account equals decoded transaction Account |
| transaction | Selected/reported identity equals recomputed signed-byte transaction hash |
| network | Selected endpoint/network equals observed, committed and carrier network context |
| ledger_checkpoint | Selected checkpoint equals the committed checkpoint and first history header; final ledger, validated observation and reported membership agree |

These claim/subject entries describe what the **anchor covers**. Caller-selected A/B compatibility remains a separate generic relation; B retains ANCHOR_MATCH while its claim is CONTRADICTED. Account binding establishes no business authority. Core binding acceptance is not global VERIFIED. A deliberately dishonest adapter can still forge its evidence snapshots: this contract does not replace source pins, native trust or semantic mutation controls.

The checkpoint guard-bypass regression uses the same genuine transaction and a coherent actual history suffix beginning at21488207 while its committed declaration still specifies21488206. Core rejects the ledger_checkpoint relation even if the old adapter-local condition is bypassed. Separate omission mutants remove each of the seven reports and must fail the exact required obligation through direct/native, product and replay paths. Run `node tools/xrpl-binding-mutations.mjs --json`; results are recorded in `XRPL_POC_REPAIR_REPORT.md`.

Cold review also found `new Set("AB")` interpreted characters and satisfied requested assumption A. The direct API now admits only unique arrays of bounded, nonempty, case-sensitive identities. `["A"]` establishes A; `["AB"]` does not; raw string `"AB"`, explicit null, nested values and duplicates fail closed. There is no substring/prefix normalization. Missing optional context lists remain empty. The permanent direct-API witness and restored-old-behavior mutation cover the actual exported path; evidence-basis context receives the same type protection.

Existing v0.2 fixed-dispatch adapters are not silently migrated. Their protocol classification is explicitly LEGACY_NOT_DECLARED; a path requiring version1 rejects a missing contract. The XRPL sibling requires version1 on both native completion and product composition.

The original capture and separate acceptance policy remain byte-identical. Replay adds freshly derived binding reports to its output while comparing all original saved semantic fields unchanged. This is an additive verification-output change, not a regenerated live observation. Repair tests use the preserved public capture or explicitly counterfactual codec carriers with reused public signature-shaped fields; no wallet/key generation or new signing/submission is required. Those synthetic carriers are not authorized or live transactions.

## Historical validation and observed failures

Implementation-time validation reported802/802 serial,95/95 focused (76 adverse tests under its stated taxonomy),19/19 independent controls and replay SHA256 `61bad7f6e50b2b8cca189c7ca154248f6860f3f1f219b522bf7f2e1de2b08bbc`. Those historical receipts remain `reports/xrpl-poc/validation.json`. Independent cold review instead obtained800/802 sequential, with two legacy Moth/QEV failures; isolated95/95 and19/19 passed. The repaired candidate's exact counts, mutation evidence and runner classifications belong to `XRPL_POC_REPAIR_REPORT.md`; historical success is not substituted for current gates.

Observed failures are preserved: first live attempt stopped before signing/submission because SDK autofill adds NetworkID:undefined. Removing wire-absent undefined properties fixed it; an actual NetworkID remains rejected and a disconnected-SDK regression test covers this. No anchor was submitted by that attempt. The historical parallel log registered762/pass730/fail32: these were ordinary fixture/module/assertion failures, not intentional isolation barriers. Cold and repair traces demonstrate the unchanged native10-second Moth deadline before and after PoC; original error text cannot establish the cause of every historical launch. Pristine checkouts also require an empty ignored reports/tmp parent for the existing git-test module. No unrelated native timeout/runtime repair is included here.

Exact SDK/JCS source pins, official documentation and26 dependency license records (original7 unchanged) are in `provenance/xrpl-poc.json` and `provenance/npm-licenses.json`.

NEXT / OPTIONAL MONETIZATION EXPERIMENT: evaluate XRPL Batch per-use fees separately after verification flow and user friction are understood. No recipient, commercial logic or such fee is part of this PoC.
