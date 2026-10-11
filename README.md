# ReceiptOS Verify

A local verification product that answers **what supplied evidence is allowed to establish for a caller-selected claim**. It preserves native adapter results and adds a separate, versioned product projection.

**Local experimental v0.1.** This repository has no remote. Existing upstream repositories remain read-only. No private Vértice implementation is included.

## Run

Requires Node ≥22.15, Python ≥3.12 and Bun. The current Windows native runner finds Bun at `C:/Users/msi/.bun/bin/bun.exe`; other systems use `bun` on PATH. Native scripts and dependencies are fixed; evidence cannot choose executable paths or commands.

```sh
npm ci --ignore-scripts
node src/cli.mjs demo
npm test
npm run vectors
npm run mutations
npm run check:sources
npm start
```

The UI listens only at **http://127.0.0.1:8808/**. Verification runs offline once dependencies are installed. It makes no provider, ledger, scanner or model calls. Do not serve it publicly.

`node tools/reproduce.mjs V02` runs the saved-artifact control twice in a separate local copy and records exact commands, locks, commit and semantic digests in `reports/local-reproduction.json`. That receipt remains unsigned and does not claim a second independent operator.

```sh
node src/cli.mjs verify request.json bundle.json --text
node src/cli.mjs pack request.json bundle.json capsule.json
node src/cli.mjs verify-capsule independently-selected-request.json capsule.json [external-container-sha256]
```

`verify` returns exit 0 only for product VERIFIED, 2 for CONTRADICTED, and 3 for other projections. Process exit codes do not independently establish semantic outcomes. Capsules preserve the embedded historical request; `verify-capsule` still requires a separate caller-selected request.

## The first invariant

The same authentic, intact, native-positive receipt covering commit **A** produces:

| Request | Integrity | Authenticity | Subject binding | Native replay | Product |
|---|---|---|---|---|---|
| Commit A | VERIFIED | VERIFIED | VERIFIED | VERIFIED + REPRODUCED | VERIFIED |
| Commit B | VERIFIED | VERIFIED | CONTRADICTED | VERIFIED + REPRODUCED | CONTRADICTED |

Authenticated evidence for A does not establish the caller-selected claim for B. This does not mean B ran or failed. `reports/first-demo.json` preserves full output.

## Implemented surfaces

- Real pinned native Crystal root verification and RVR digest/replay; separate product Ed25519 signature and Git object closure.
- Neutral Semantic ABI compatibility, exact PRF guarantee/dependency preservation, and Chronicle historical/current continuity. These are original public-spec reimplementations with explicit product extensions; PRF14 remains experimental and pinned to its open head.
- Recompute-kit execution/report/grade discipline; Interpoll Schnorr signed action and exact retries.
- Native QEV finite postprocessing and optional counts/RVR/ReceiptOS capabilities, with provider authenticity unestablished.
- Original portable product capsules/Merkle proofs, human-readable reports, local inspection UI, full provenance.
- Experimental crypto-provider/temporal-authority, stochastic replay and Ethereum/XRPL/off-chain anchor boundaries. No ML-DSA verifier or live ledger adapter is claimed.

The main Git artifact profile has six mandatory layers; policy cannot omit subject binding. Domain, guarantee and continuity obligations become required when requested. Native roots, signatures, replay and presentation never bypass missing semantic premises.

## Inspect the evidence

See [architecture](docs/architecture.md), [claim model](docs/claim-model.md), [trust boundaries](docs/trust-boundaries.md), [adapters](docs/adapters.md), [full reuse map](FULL_WORK_REUSE_MAP.md), [provenance](PROVENANCE.md), [files not reused](docs/files-not-reused.md), and [build report](BUILD_REPORT.md).

The corpus contains literal inputs, expected results for all fourteen layers, reason witnesses, paired positives and killed mutation classes. Source mutations run in isolated copies under this repository. A crash, unapplied patch, broken positive control or empty corpus cannot count as a kill. A prior narrower dependency mutant survived a redundant guard; `reports/mutations-initial.json` preserves that development observation separately from the final whole-class mutation gate.

Apache-2.0 applies to new authored material, Copyright 2026 Pavlo Tvardovskyi. Vendored and npm dependencies retain their own notices and rights; see [LICENSING.md](LICENSING.md).
