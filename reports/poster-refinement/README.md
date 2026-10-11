# Poster-reference design refinement

2026-10-11, following Pavlo's three additional visual references: the PRF observation/relation poster, ReceiptOS design-context-independence banner and TSEI wooden-ship/wireframe illustration. Base commit: `eb9890a83b85a9c03fc39d48d0d6817e3061dacf`.

Applied a compact circular frame around the existing R mark, condensed uppercase display headings, measured tracking, a cyan/violet vertical rule and a faint drafting grid with waveforms around the faceted crystal. Fonts use installed system families with fallbacks; no font files, raster source images, external assets or dependencies were imported. Exact typography may vary with installed fonts. The first mark reconstruction remains unchanged.

These are visual references only. Their benchmark numbers, model names, version labels, fixture classes and semantic slogans are not verification evidence or product claims. No static success seal is added. Brand illustration remains decorative and hidden from assistive technology. Actual result text and mint/red/amber status mappings remain unchanged.

Only `web/index.html`, `web/style.css` and their required source-lock entries change. Mobile inspection also corrected the missing space between intro sentences when the visual line break is hidden, and prevents the report button label from splitting. All control IDs and verification behavior are preserved. Core, adapter, app logic, tests, native/vendor/schema/profile/vector/dependency/legal files and earlier saved audit/style evidence remain unchanged. No upstream changes or publication.

Validation: `node --test tests/ui-contract.test.mjs` passed 22/22, zero failures/skips/cancellations. Actual local browser confirms V01 mint `VERIFIED`, wrong requested commit red `CONTRADICTED`, and V17 amber `INSUFFICIENT_EVIDENCE`. At 320 px the document width equals the viewport width, intro sentence spacing is correct and the save button stays one line; viewport override reset. Source-lock and diff checks pass. This focused cosmetic verification is not a new release audit.

See `desktop-preview.png`, `desktop-wrong-commit.png`, `desktop-qev.png`, `mobile-320.png` and `reference-identities.json`.
