# ReceiptOS Verify

A local verification product that answers **what supplied evidence is allowed to establish for a caller-selected claim**. It preserves native adapter results and adds a separate, versioned product projection.

**Local v0.2 review build, based on public v0.1.0.** Existing upstream repositories remain read-only. No private Vértice implementation is included. V0.2 is unpushed and has no release tag.

ReceiptOS Verify does not answer only whether a receipt is intact. It evaluates what supplied evidence actually establishes for a caller-selected claim, within explicit bounded profiles. The v2 contract keeps claim, subject, artifact, authority, scope, policy/version, time, assumptions and dependencies separate. See [generic boundary](docs/generic-claim-boundary.md), [v0.2 architecture](docs/v0.2-architecture.md) and [v0.2 review report](V0_2_REVIEW_REPORT.md).

The [independent v0.2 release audit](RELEASE_AUDIT_v0.2.md) records the frozen candidate, independent findings, separate repairs and exact fresh-checkout results.

The [release-candidate audit](RELEASE_AUDIT_v0.1.md) separates the original saved build reports from fresh candidate findings, fixes and release checks. Original saved counts are historical observations, not the current release verdict.

## Run

Requires Node ≥22.15, Python ≥3.12 and Bun. The current Windows native runner finds Bun at `C:/Users/msi/.bun/bin/bun.exe`; other systems use `bun` on PATH. Native scripts and dependencies are fixed; evidence cannot choose executable paths or commands.

```sh
npm ci --ignore-scripts
node src/cli.mjs demo
npm test
npm run vectors
npm run mutations
npm run check:sources
npm run vectors:v2
npm run mutations:v2
npm run demo:v2
npm run check:provenance
npm start
```

The UI listens only at **http://127.0.0.1:8808/**. Verification runs offline once dependencies are installed. It makes no external provider, ledger, scanner-service or model calls. The Trustless adapter runs its pinned deterministic toy scanner locally. Do not serve it publicly.

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

V0.2 adds versioned executable integrations: the neutral public Semantic ABI linker/validator, the actual main recompute-kit scan checker and conformance runner, Interpoll's native signed-action verification with exact supplied retry traces, and PRF's main award/settlement relation with a separately experimental downstream preservation rule. Native verdicts, replay and product compatibility remain distinct. These are bounded integrations, not whole-upstream conformance or external execution authentication. The adapter retains its pinned historical-main semantics. Independent release audit found PR57 merged at 2026-10-11T22:35:33Z; current recompute-kit main is `3c3923956200d01ab74c2dcbb49b268739943bda`. That newly merged reporter capability is not imported by this adapter. PRF PR14 remains open and separately experimental.

- Real pinned native Crystal root verification and RVR digest/replay; separate product Ed25519 signature and Git object closure.
- The v1 compatibility path retains neutral Semantic ABI compatibility, PRF guarantee/dependency preservation and Chronicle historical/current continuity as public-spec reimplementations with explicit product extensions. The v2 native upgrades above remain separately versioned; PRF14 remains experimental and pinned to its open head.
- Recompute-kit execution/report/grade discipline; Interpoll Schnorr signed action and exact retries.
- Native QEV finite postprocessing and optional counts/RVR/ReceiptOS capabilities, with provider authenticity unestablished.
- Original portable product capsules/Merkle proofs, human-readable reports, local inspection UI, full provenance.
- Experimental crypto-provider/temporal-authority, stochastic replay and Ethereum/XRPL/off-chain anchor boundaries. No ML-DSA verifier or live ledger adapter is claimed.

The unchanged v1 registry contains 12 surfaces: 11 bounded executable relations or admission operations and one ledger interface. Its capability maturity is 2 STABLE, 9 EXPERIMENTAL and 1 INTERFACE_ONLY; the raw ledger descriptor still uses EXPERIMENTAL. The four v2 modules upgrade/version those capability families rather than claiming sixteen independent verifiers. Chronicle checks supplied continuity and exact reference strings; it does not calculate or verify Artifact/Collection/Portfolio aggregate roots.

The main Git artifact profile has six mandatory layers; policy cannot omit subject binding. Domain, guarantee and continuity obligations become required when requested. Product projection evaluates these requirements separately from native roots, signatures and replay.

## Inspect the evidence

See [architecture](docs/architecture.md), [claim model](docs/claim-model.md), [trust boundaries](docs/trust-boundaries.md), [adapters](docs/adapters.md), [full reuse map](FULL_WORK_REUSE_MAP.md), [provenance](PROVENANCE.md), [files not reused](docs/files-not-reused.md), and [build report](BUILD_REPORT.md).

The corpus contains literal inputs, expected results for all fourteen layers, reason witnesses and paired positives. V09 checks completeness of the signed producer execution declaration while real native RVR recomputation still runs; its historical package-presence mutant name does not prove a no-execution condition. Checker-unavailable controls separately test absent native execution. Source mutations run in isolated local copies. A crash, unapplied patch, broken positive control or empty corpus cannot count as a kill. `reports/mutations.json` and `reports/mutations-initial.json` preserve original build observations; current mutation outcomes and environment limits are in the [release-candidate audit](RELEASE_AUDIT_v0.1.md).

Apache-2.0 applies to new authored material, Copyright 2026 Pavlo Tvardovskyi. Vendored and npm dependencies retain their own notices and rights; see [LICENSING.md](LICENSING.md).
