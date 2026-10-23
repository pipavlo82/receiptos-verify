# Agent action browser verification v0

An additive, local research profile for ReceiptOS Verify. **AUDIT_FIRST / DO_NOT_BUILD_NEW_CORE.** The experiment verifies an exact caller-selected signed action, repeats one finite local state change, and checks optional local manifest inclusion. A positive receipt does not prove an external service executed an action.

Host: `pipavlo82/receiptos-verify`, base `396143120f787d2f5534e92c0cf896c029a05775`, isolated branch `research/agent-action-browser-verify-v0`. The base is the actual `v0.2.0` experimental prerelease and captured `main`; its package still says `0.2.0-dev.0`. Historical release evidence remains unchanged. The release's reported 707-test closure is not substituted for this experiment's own executions.

Original author checkout: `C:/Users/msi/Documents/Codex/agent-action-verify-v0`. Original external checkouts, build output, raw evidence and archives: `D:/PAVLO HQ/Workspaces/agent-action-verify-v0`. Memory Palace remains on D:. Those paths describe the historical author run. The research was subsequently published as [Draft PR #2](https://github.com/pipavlo82/receiptos-verify/pull/2); it remains separate from main. See [cold-review repairs](COLD_REVIEW_REPAIRS.md) and the [macOS harness follow-up](MACOS_HARNESS_REPAIRS.md) for the corrections and their finite coverage limits.

## What works

- Existing `verifyV2` caller selection, envelope authentication and Interpoll signed-action semantics, with native results retained.
- Existing native Crystal receipt-root verification and strict host JSON admission.
- `agent-action-receipt.v0`: bind the receipt, exact action, input, observed result, authority, premises and replay profile. The actual local operation adds one review marker; issuance executes it and verification repeats it.
- `agent-action.local-manifest-log.v0`: existing capsule Merkle implementation plus an explicit offline checkpoint contract. Ed25519 verification uses a caller-selected public demonstration key.
- The real external recompute-lens `receiptos-c14n-v0` module runs in Chromium. The browser recipe calls the existing host over loopback for claim verification and shows the distinct results.
- Literal canonical-byte vectors across Crystal, recompute-kit, recompute-lens and ReceiptOS Verify expose incompatible historical conventions. A new restricted compatibility domain preserves historical roots.

See [results](RESULTS.md), [reuse decisions](REUSE_MATRIX.md), [architecture](ARCHITECTURE.md), [canonicalization](CANONICALIZATION_COMPATIBILITY.md), [receipt profile](AGENT_ACTION_RECEIPT_PROFILE.md), [anchor contract](ANCHOR_CHECK_CONTRACT.md), [browser demo](BROWSER_DEMO.md), and [limitations](LIMITATIONS.md).

## Replay

Run from the host repository root. Node 22+, Python 3.12, Bun and the existing pinned npm dependencies are required. Browser tests additionally use Playwright with Chromium. Set `AGENT_ACTION_SUPPORT` to an external writable directory for source checkouts and outputs. `PLAYWRIGHT_MODULE` selects the research browser driver's Playwright installation. The controller reuses the Python interpreter that launched it (`sys.executable`) and passes that choice to the research Python canonicalization child; a separate `python` command is not needed for those research paths. Other historical host adapters retain their own runtime selection.

The unchanged host adapters still invoke the command `python`. On macOS/Linux, the controller temporarily supplies that name through a launcher bound to its own `sys.executable`, **only for `host-and-profile-tests`**. It preserves arguments, environment and exit status, then removes the launcher on success or failure. Other steps retain their original `PATH`. Running historical adapters directly outside the controller still needs their original runtime command. Windows runtime selection is unchanged. The dedicated portability regression now actually launches literal `python` from the POSIX host fixture; its research-only fixture is not substituted for the separately executed inherited host suite.

**Bun has two independent selectors.** Research tools use `BUN_EXECUTABLE` (otherwise the recorded Windows path or `bun` on POSIX). The preserved historical Crystal bridge ignores this variable: on Windows it uses `C:/Users/msi/.bun/bin/bun.exe`; on macOS/Linux it resolves `bun` from `PATH`. An override therefore does not select the host verifier's Bun. To reproduce the author semantic bytes, use Bun **1.3.14** for both selectors: check the fixed executable on Windows, or put that version first on POSIX `PATH`, as well as setting the research override. Keep each actual runtime in provenance. Different recorded runtimes legitimately change the semantic-output digest; do not strip runtime identity to manufacture equality.

```powershell
$env:AGENT_ACTION_SUPPORT = 'D:/PAVLO HQ/Workspaces/agent-action-replay'
npm ci --ignore-scripts --cache 'D:/PAVLO HQ/Workspaces/agent-action-replay/npm-cache'
python -B research/agent-action-browser-verify-v0/tools/prepare-sources.py
python -B research/agent-action-browser-verify-v0/tools/check-preservation.py
python -B research/agent-action-browser-verify-v0/tools/validate.py --mode normal --browser --mutations
python -B research/agent-action-browser-verify-v0/tools/validate.py --mode repeat --browser
python -O -B research/agent-action-browser-verify-v0/tools/validate.py --mode optimized
python -B research/agent-action-browser-verify-v0/tools/check-research.py
```

On macOS/Linux, use the installed `python3` command to launch the controller, for example:

```sh
export AGENT_ACTION_SUPPORT="$HOME/receiptos-agent-action-support"
# Replace these paths with your installed Bun 1.3.14 and Playwright module.
export PATH="/path/to/bun-1.3.14:$PATH"
export BUN_EXECUTABLE="/path/to/bun-1.3.14/bun"
export PLAYWRIGHT_MODULE="/path/to/node_modules/playwright/index.mjs"
python3 -B research/agent-action-browser-verify-v0/tools/prepare-sources.py
python3 -B research/agent-action-browser-verify-v0/tools/validate.py --mode normal --browser --mutations
python3 -B research/agent-action-browser-verify-v0/tools/check-research.py
```

The research source checker compares complete exact-path/byte/hash maps independently of inventory row order, accepts historical Windows ordering, and rejects duplicate paths or incomplete outer manifests. Its writer uses exact relative POSIX-string order. The separate current repository gate, `npm run check:sources`, now also includes this directory, its nested locks and the workflow under the explicit [source-inventory policy v2](../../docs/source-inventory-policy.md). Original v1 inventory/checker bytes survive as pinned archival snapshots; historical receipts and reports stay frozen.

The [experimental CI workflow](../../.github/workflows/agent-action-research.yml) defines exact-head Linux/macOS replays with no global `python` alias, default and symlinked temporary directories, browser and mutation controls. It also runs current global inventory before/after replay and the separate inventory-policy controls. It uploads only allowlisted generated reports, excluding external source and the compiled lens bundle. The matrix does not include hosted Windows because the frozen Crystal bridge has an author-specific Windows Bun path; recorded local Windows checks are separate evidence. A workflow definition is not a successful run: inspect the actual checks on the exact commit. CI does not replace Echo's independent Homebrew/macOS replay or establish production readiness.

Source preparation contacts public GitHub only when a required checkout is absent. It never resets an existing checkout. Once prepared, replay uses local data. No provider, blockchain, funds, wallet, enterprise service or production credential is required.

```powershell
& 'C:/Users/msi/.bun/bin/bun.exe' research/agent-action-browser-verify-v0/tools/build-browser.ts
node research/agent-action-browser-verify-v0/tools/serve.mjs
```

Open `http://127.0.0.1:8787`. Choose a scenario and click **Verify**. The page exposes the native report and exact canonical bytes in its details view. To verify a selected supplied request/package directly, import `verifyAgentAction` from [lib/profile.mjs](lib/profile.mjs); pass their original UTF-8 JSON strings, not an already permissively parsed object.

## Research disposition

**ITERATE.** The bounded local claim is worth independent review. Public-log authenticity and external action execution remain `NOT_COVERED`; adding them requires evidence and an explicit new contract. The current recompute-lens pin is `61f7392f1c4758231517b22ba06ab608dedbae02`, with its official upstream [CC0-1.0 LICENSE](https://github.com/trustless-ai/recompute-lens/blob/61f7392f1c4758231517b22ba06ab608dedbae02/LICENSE). Its selected runtime files are byte-identical to the historical `70b44d8` pin. It remains an external dependency, never vendored into this experiment or its archive. Historical receipts and their earlier license observations are preserved.

The current global inventory uses `receiptos.verify.source-lock.v2`; there is no blanket research exclusion. The original 345-entry v1 lock and checker remain byte-identical at `provenance/source-inventory-v1/`. Exactly those two current metadata paths are versioned; the other 2,154 baseline files, including every old receipt/report, remain byte-identical. The pinned historical preservation gate and the bounded research lock still run separately. This integration changes repository inventory and dependency metadata, not product verification semantics or research maturity. Run its isolated controls with `node --test research/agent-action-browser-verify-v0/tests/source-inventory.test.mjs`.
