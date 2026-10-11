# ReceiptOS Verify brand style refresh

Requested by Pavlo on 2026-10-11 using the supplied R mark and ReceiptOS banner screenshots. Base: `750a9b63c2cec696334f9d43e389b4987d128189`. Local branch: `codex/brand-style`.

Changed only presentation in `web/index.html` and `web/style.css`: a manual SVG reconstruction of the supplied white angular R/cyan-violet folded strand/cube, graphite background, white wordmark, cyan/violet accents, restrained wireframe evidence illustration, thin panel borders and responsive spacing. The inline mark avoids adding a server route or external asset dependency. The standalone reconstruction and reference note are included here for future design use; this is not the original brand master.

The original 14 control IDs, labels, workspace markup and script route are preserved. `web/app.mjs`, verifier/adapter source, vectors, profiles, schemas, vendor files, dependency locks, legal files and frozen audit artifacts remain byte-identical to the base. The required product source lock is refreshed for the two changed presentation files. Reports remain outside its documented scope.

## Validation

- `node --test tests/ui-contract.test.mjs`: 22 tests, 22 pass, 0 fail/cancel/skip/todo. This includes stale-result invalidation, strict byte intake, reproduced negative presentation and fault-control restrictions. This focused run is not a new full release audit.
- Actual local browser at `http://127.0.0.1:8808/`: V01 `VERIFIED` uses mint `rgb(140,224,194)`; commit-B transformation first invalidates the prior report and then gives red `CONTRADICTED`, `rgb(255,155,169)`; V17 remains amber `INSUFFICIENT_EVIDENCE`, `rgb(225,197,139)`, with provider authentication explicitly not established.
- Actual browser layouts checked at default desktop, 390 px and 320 px. At both narrow widths document width equals viewport width; no horizontal page overflow. Temporary viewport override reset.
- `node tools/check-sources.mjs` and `git diff --check`: PASS at closure; exact source-lock digest is recorded in `closure.json`.

Existing semantic status classifiers were not changed. Brand colors do not assign verdicts. Success, contradiction and insufficient evidence keep separate textual and color treatment. No features, upstream modifications or publication.

## Captures

- `before.png`: original scrolled viewport before editing.
- `desktop-positive.png`: positive synthetic control.
- `desktop-wrong-commit.png`: full desktop wrong-commit report.
- `desktop-qev-insufficient.png`: QEV authentication limitation.
- `mobile-wrong-commit.png`: 390 px full-page result.
- `mobile-320.png`: narrow 320 px full-page result.
- `desktop-preview.png`: final desktop viewport showing brand and overall contradiction.

Native verification limitations and release-audit findings remain those of the repaired experimental v0.1. Cosmetic work does not establish additional verification capability or broaden release claims.
