# First public candidate publication controller

The immutable first public candidate is `62cd3e59c8f568496ed087d55f0aec3d63363b0a`, tree `8a5de5a3735e04f3f45cf164b59da17289693bc2`, source-lock SHA-256 `bd6ad5d4640823ab55458777f93aa5f7999107415fe4550c3d99cbe9b0eb54f6`. It includes the repaired verifier and subsequent documentation/brand work. Original rejected `33d8ee47ad733f1198f2b2fb8d171b31c7b10678` remains historical evidence, not the public release candidate.

The candidate contains no workflow. This separate `codex/ci-v0.1.0` controller branch adds CI orchestration, not product features. GitHub Actions checks out the candidate by full SHA into a sibling directory, installs its own locked npm dependencies using a fresh cache and executes the canonical suite. Its workflow-head SHA must not be confused with the checked-out product SHA. Main and the release tag remain on the immutable candidate; this branch is not merged into it.

The gate requires actual 275/275 tests with zero skips/failures, 30/30 vectors and 14 applied semantic mutant kills with all positive controls preserved. It rejects other mutation categories and preserves full outputs, command/digest receipts and the complete initial tracked-file SHA-256 inventory. Source-lock and diff checks run before/after. CLI/capsule wrong-commit demos and an unsigned local reproduction receipt are included. A successful process alone is not a semantic result.

The Linux job pins Node 22.15.0, Python 3.12.10 and Bun 1.3.14. The frozen Windows implementation expects Bun at `C:/Users/msi/.bun/bin/bun.exe`; Linux uses PATH. No arbitrary Windows host portability is claimed. Display typography uses installed fonts with fallbacks.

Pre-publication README statements that the repository has no remote describe its earlier local state; the public GitHub repository and release notes supersede that operational fact without rewriting the candidate. Historical audit no-publication statements retain their original time scope. Release publication still depends on successful GitHub CI and a subsequent fresh remote-checkout reproduction. This document does not assert that either has already passed.

This is an experimental local verifier and localhost UI, not a production hosted service, hardware authenticity certificate, real ML-DSA implementation or live ledger/finality verifier. Native results, provenance and original dependency rights remain separate from the product projection. A CI run is not a second independent human operator.
