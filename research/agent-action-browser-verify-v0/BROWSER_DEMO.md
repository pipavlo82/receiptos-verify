# Local browser demo

Build and serve using the commands in [README](README.md). The server binds to `127.0.0.1:8787` by default; `AGENT_ACTION_PORT` selects another port. The UI is ordinary local HTML/CSS/JavaScript, with no enterprise host, account, wallet or remote script.

The page presents “Mark an item as reviewed” and **Verify**. It shows an explicit scoped `VERIFIED`, `REFUTED` or `UNVERIFIABLE` result, separate receipt/claim/replay/log dimensions, the exact profile, and visible limitations. The expanded view includes request, complete evidence, native host result, native lens log, canonical UTF-8 text, canonical hex and root. A green icon alone is never the result.

## Actual lens reuse

[browser/recipe.mjs](browser/recipe.mjs) follows the actual lens `Recipe` interface: ID, label, profile, blurb, fields, example loader, `run`, and `selfTest`. It calls the **original** pinned `src/recompute/receiptos-c14n-v0.ts` implementation. The module is transpiled locally from its external checkout by Bun, with exact repository/file hash checks. Its golden test is run, and 36 independent literal byte vectors exercise the browser implementation.

The host action/checkpoint verifier is not rewritten in JavaScript for the UI. `run` submits the exact caller/package JSON strings to the existing host composition over loopback. The native receipt recipe executes in the browser. If the host claims success while the browser cannot reproduce the selected receipt identity, the product result is `UNVERIFIABLE` with `BROWSER_HOST_IDENTITY_DISAGREEMENT`. Host unavailability likewise does not become success.

The actual upstream module contains wording about its historical canonicalization conventions. That native log is retained in details as source output. [The differential analysis](CANONICALIZATION_COMPATIBILITY.md) is the experiment's narrower conclusion; a native “JCS” label is not promoted to complete standards conformance.

## Runtime and test boundary

`tools/browser-test.mjs` starts a separate loopback server and actual Chromium, clicks through every action fixture, compares independent expectations, executes all canonical vectors in-browser, tests an unavailable host and a fabricated positive host response against mismatching receipt bytes, rejects a foreign Origin, and checks mobile overflow. Desktop, untrusted-checkpoint and mobile screenshots are saved with machine-readable observations.

No test harness result constitutes independent organizational review. Chromium version, build hashes and commands are recorded in evidence. The browser has no independent proof that the loopback host honestly ran non-browser checks; no trusted execution or remote attestation is claimed.

## License and embedding

The current recompute-lens pin is `61f7392f1c4758231517b22ba06ab608dedbae02`, which adds the official upstream [CC0-1.0 LICENSE](https://github.com/trustless-ai/recompute-lens/blob/61f7392f1c4758231517b22ba06ab608dedbae02/LICENSE). Its three selected runtime files are byte-identical to the historical `70b44d854a32c867b756fa1272b194d4ae8f1ce0` pin: that update changed only `LICENSE`, `README.md` and `package.json`. Earlier evidence records the original pin and the license observation made then; those artifacts are not rewritten. The source and compiled module remain external and excluded from committed research files, evidence archives and CI artifacts. This pass does not change distribution packaging or modify recompute-lens upstream.
