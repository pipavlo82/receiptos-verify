# LIC-CAP-01 — audit capture rights, before sanitization

Severity: HIGH for publication of the audit branch; no verifier runtime effect.

Independent review of newly collected audit bytes found unnecessary upstream patch/source/body captures in three JSON reports. The original raw captures and their exact hashes were recorded before correction. Six repositories with absent or unclear grants account for 87 patch fields; the complete metadata-only field inventory records every omission without reproducing those source bytes. Repository ownership does not supply a grant.

A final deletion commit alone would leave those raw blobs in pushed ancestry. Preserve the exact raw audit commits in a local work/ Git bundle; curate only agent-created commits after frozen4888, replacing API patch/body/content captures with metadata/hash records. Frozen4888, v0.1/main, all runtime/vendor/legal/old evidence bytes stay unchanged. Record every old/new audit commit mapping and sanitized file mapping. Rerun final exact-checkout canonical validation.

This is an explicitly disclosed transformation of new audit captures, not retroactive modification of frozen product evidence. Original execution receipts continue to identify the original commits where commands actually ran; do not relabel them as executions on rewritten commits.
