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

## Validation and observed failures

Final normal serial regression: **802/802 PASS**; repeated focused XRPL: **95/95 PASS**, including76 negative tests across all13 required categories. Independent reviewer controls:19/19 PASS. Fresh-process repeat and --no-opt replay JSON are byte-identical (SHA256 `61bad7f6e50b2b8cca189c7ca154248f6860f3f1f219b522bf7f2e1de2b08bbc`). Counts and exact changed-file inventory are in `reports/xrpl-poc/validation.json`.

Observed failures are preserved: first live attempt stopped before signing/submission because SDK autofill adds NetworkID:undefined. Removing wire-absent undefined properties fixed it; an actual NetworkID remains rejected and a disconnected-SDK regression test covers this. No anchor was submitted by that attempt. Default parallel npm test registered762/pass730/fail32 with native fixture barriers; isolated affected modules passed49/49 and full serial passed802/802. The unchanged native runner's10-second deadline makes resource contention plausible, but exact timeout causation is not proven by its error text. No legacy runtime fix was made.

Exact SDK/JCS source pins, official documentation and26 dependency license records (original7 unchanged) are in `provenance/xrpl-poc.json` and `provenance/npm-licenses.json`.

NEXT / OPTIONAL MONETIZATION EXPERIMENT: evaluate XRPL Batch per-use fees separately after verification flow and user friction are understood. No recipient, commercial logic or such fee is part of this PoC.
