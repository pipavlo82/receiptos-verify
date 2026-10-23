# Current source inventory policy v2

This is repository integration metadata. It changes neither product verification
semantics nor historical commitments. The agent-action directory remains
experimental research, separate from the production API.

`npm run check:sources` checks `receiptos.verify.source-lock.v2` under policy
`receiptos.verify.source-inventory-policy.v2`. The current inventory includes all
regular source files within its declared scope, including the experimental
research directory, its nested `source-lock.json` and `SHA256SUMS`, and the
research CI workflow. There is no research-directory exclusion.

The exact exclusions are the root `source-lock.json` itself, root `reports/`,
and `.git`, `node_modules`, and `.cache` trees at any depth. Root report outputs
remain outside the current source closure. Historical tracked reports and
receipts remain protected by the separate pinned preservation check; the
exclusion does not authorize rewriting them. A nested directory named `reports`
is included. A nested file named `source-lock.json` is included.

The writer sorts exact relative POSIX paths by ECMAScript UTF-16 code-unit order,
without Unicode normalization. Verification
compares a unique path-to-byte-count-and-SHA-256 map, so inventory row order is
not semantic. Duplicate JSON fields, duplicate paths, unknown metadata, unsafe
paths, malformed row values, additions, removals, changed bytes, and non-excluded
symlinks fail closed. Normal verification never rewrites the lock. `--write` is
an explicit maintainer operation, not an automatic response to drift.

Non-vendor text must be UTF-8 without BOM or CR bytes. Frozen vendor bytes remain
hashed without text normalization. Only these three current source paths are
declared binary PNGs, with the PNG signature checked:

- `research/agent-action-browser-verify-v0/evidence/browser/desktop-positive.png`
- `research/agent-action-browser-verify-v0/evidence/browser/mobile-positive.png`
- `research/agent-action-browser-verify-v0/evidence/browser/untrusted-checkpoint.png`

An arbitrary new `.png` suffix does not bypass text admission. These checks
establish file identity and the bounded declared format, not image safety or
semantic correctness.

## Historical preservation

The original 345-entry v1 root inventory and its original checker survive
byte-for-byte at:

- `provenance/source-inventory-v1/source-lock.json`
- `provenance/source-inventory-v1/check-sources.mjs`

Both original digests are pinned in the current checker. These are archival
bytes, not the active v2 checker. The original v1 lock is not retroactively
relabeled as covering the experimental directory.

`research/agent-action-browser-verify-v0/tools/check-preservation.py` implements
`receiptos.verify.historical-preservation.v2`. It first pins the original
2,156-entry baseline inventory bytes and count. Exactly two named original
metadata paths are versioned: root `source-lock.json` and
`tools/check-sources.mjs`. Their original bytes must match the archival
snapshots; their current paths must remain regular files and pass the separate
current source-inventory gate. The other **2,154 original files**, including
every historical receipt/report, must remain byte-identical. Symlinks and Windows
junctions within those file paths are rejected, including redirected parent
directories; a physical alias above the checkout root is allowed. There is no
data-driven wildcard or extra-exception list. The check reports actual unchanged
file counts separately from the expected 2,154.

Changing this policy requires a new explicit version and review. Updating a
source lock does not authenticate its author, prove semantic soundness, or
replace the historical preservation check.

## Controls

Run the finite isolated-tree controls separately from the unchanged host test
suite:

```sh
node --test research/agent-action-browser-verify-v0/tests/source-inventory.test.mjs
```

They exercise exact closure, nested locks/workflows, order independence,
extra/missing/changed files, malformed/duplicate metadata, unsafe paths, PNG and
text admission, symlinks, pinned snapshots, explicit exclusions, immutable
baseline identity, and historical-report tamper rejection. A failed admission
or harness control is not a verifier semantic mutation kill.

The experimental replay workflow runs these current inventory gates on its research
branch, pull requests and main pushes. Including main prepares a future separately
authorized merge-head replay; it does not merge this PR or make the research a
production profile.
