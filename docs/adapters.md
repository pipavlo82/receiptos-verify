# Adapters

Each adapter declares its profile ID, exact source SHA, license, maturity, capabilities, required evidence and native vocabulary. `src/adapters/protocol.mjs` provides one versioned operation surface; unsupported operations return UNSUPPORTED explicitly. `src/adapters/index.mjs` exposes the implemented registry. Operations never infer a positive result from descriptor presence.

| Adapter | Integration | Scope / maturity |
|---|---|---|
| Crystal | Exact selected native TS via Bun | Root verification only; native anchor exclusion preserved |
| RVR | Exact selected native Python | Generic SHA256_EQUALS and saved-artifact replay |
| Semantic ABI | Original public neutral-spec relation | Claim/authority/scope compatibility + explicit product extensions |
| Recompute-kit | Original methodology/profile implementation | Observed process vs semantic execution, source pin, grade and binding; not native scan_check wire conformance |
| PRF | Original public-spec relation | PR13 methodology; PR14 exact open head EXPERIMENTAL for neutral guarantees |
| Chronicle | Original identity/continuity relation | Native identity classifications + product historical/current/whole-envelope checks |
| Interpoll | Original public action specification + pinned noble Schnorr dependency | Signed authorization and unchanged retries; no deployment or durable SQL proof |
| QEV | Exact native checker and neutral linker | Finite supplied-byte postprocessing; provider authentication NOT_ESTABLISHED |
| QEV Moth | Exact selected native counts/RVR/ReceiptOS functions | Optional synthetic adapter exercising preserved counts, independent claim, saved replay and portable packaging; no physical origin claim |
| PQ | Original provider interface and temporal authority | Provider admission, structural packs; real ML-DSA unsupported |
| Stochastic | Original committed-stream relation | Reproduction, cursor/domain/candidate binding; provenance unestablished |
| Ledger | Extension boundary | Off-chain explicit; Ethereum/XRPL live verification unsupported |

All mappings, paths, exact pins, grants, authorship evidence and historical/experimental roles are in `provenance/sources.json`, the native/relation submanifests, `PROVENANCE.md` and `FULL_WORK_REUSE_MAP.md`. Source catalog entries describe candidate lineage separately from actually implemented slices. Repository ownership is not sole-authorship evidence, and a PR branch is not default/main.

Native results and raw process receipts are preserved separately from wrapper statuses and product projection. The report's fourteenth-layer model does not collapse RVR negativity, crash, missing evidence or unsupported capability into Boolean success.
