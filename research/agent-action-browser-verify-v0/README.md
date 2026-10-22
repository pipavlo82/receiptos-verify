# Agent action browser verification v0

An additive, local research profile for ReceiptOS Verify. **AUDIT_FIRST / DO_NOT_BUILD_NEW_CORE.** The experiment verifies an exact caller-selected signed action, repeats one finite local state change, and checks optional local manifest inclusion. A positive receipt does not prove an external service executed an action.

Host: `pipavlo82/receiptos-verify`, base `396143120f787d2f5534e92c0cf896c029a05775`, isolated branch `research/agent-action-browser-verify-v0`. The base is the actual `v0.2.0` experimental prerelease and captured `main`; its package still says `0.2.0-dev.0`. Historical release evidence remains unchanged. The release's reported 707-test closure is not substituted for this experiment's own executions.

Local checkout: `C:/Users/msi/Documents/Codex/agent-action-verify-v0`. External checkouts, build output, raw evidence and archives: `D:/PAVLO HQ/Workspaces/agent-action-verify-v0`. Memory Palace remains on D:. Nothing is pushed, deployed, merged or opened as a PR.

## What works

- Existing `verifyV2` caller selection, envelope authentication and Interpoll signed-action semantics, with native results retained.
- Existing native Crystal receipt-root verification and strict host JSON admission.
- `agent-action-receipt.v0`: bind the receipt, exact action, input, observed result, authority, premises and replay profile. The actual local operation adds one review marker; issuance executes it and verification repeats it.
- `agent-action.local-manifest-log.v0`: existing capsule Merkle implementation plus an explicit offline checkpoint contract. Ed25519 verification uses a caller-selected public demonstration key.
- The real external recompute-lens `receiptos-c14n-v0` module runs in Chromium. The browser recipe calls the existing host over loopback for claim verification and shows the distinct results.
- Literal canonical-byte vectors across Crystal, recompute-kit, recompute-lens and ReceiptOS Verify expose incompatible historical conventions. A new restricted compatibility domain preserves historical roots.

See [results](RESULTS.md), [reuse decisions](REUSE_MATRIX.md), [architecture](ARCHITECTURE.md), [canonicalization](CANONICALIZATION_COMPATIBILITY.md), [receipt profile](AGENT_ACTION_RECEIPT_PROFILE.md), [anchor contract](ANCHOR_CHECK_CONTRACT.md), [browser demo](BROWSER_DEMO.md), and [limitations](LIMITATIONS.md).

## Replay

Run from the host repository root. Node 22+, Python 3.12, Bun and the existing pinned npm dependencies are required. Browser tests additionally use Playwright with Chromium. The recorded Windows runtime paths are configurable for the research tools through `BUN_EXECUTABLE`, `PLAYWRIGHT_MODULE`, and `AGENT_ACTION_SUPPORT`; the unchanged historical Crystal bridge has its own fixed Windows Bun path.

```powershell
npm ci --ignore-scripts --cache 'D:/PAVLO HQ/Workspaces/agent-action-verify-v0/npm-cache'
python -B research/agent-action-browser-verify-v0/tools/prepare-sources.py
python -B research/agent-action-browser-verify-v0/tools/check-preservation.py
python -B research/agent-action-browser-verify-v0/tools/validate.py --mode normal --browser --mutations
python -B research/agent-action-browser-verify-v0/tools/validate.py --mode repeat --browser
python -O -B research/agent-action-browser-verify-v0/tools/validate.py --mode optimized
python -B research/agent-action-browser-verify-v0/tools/check-research.py
```

Source preparation contacts public GitHub only when a required checkout is absent. It never resets an existing checkout. Once prepared, replay uses local data. No provider, blockchain, funds, wallet, enterprise service or production credential is required.

```powershell
& 'C:/Users/msi/.bun/bin/bun.exe' research/agent-action-browser-verify-v0/tools/build-browser.ts
node research/agent-action-browser-verify-v0/tools/serve.mjs
```

Open `http://127.0.0.1:8787`. Choose a scenario and click **Verify**. The page exposes the native report and exact canonical bytes in its details view. To verify a selected supplied request/package directly, import `verifyAgentAction` from [lib/profile.mjs](lib/profile.mjs); pass their original UTF-8 JSON strings, not an already permissively parsed object.

## Research disposition

**ITERATE.** The bounded local claim is worth independent review. Public-log authenticity and external action execution remain `NOT_COVERED`; adding them requires evidence and an explicit new contract. A redistribution grant for recompute-lens was not established. Its original module is a pinned external local dependency, never vendored into this experiment or its archive.

The historical whole-tree source lock intentionally cannot cover additive research files without being changed. It passed before writes. This experiment preserves that lock and all 2,156 original tracked file bytes, and adds a separate research lock. Future host integration needs an explicit source-inventory update; this is not silently presented as an already integrated release.
