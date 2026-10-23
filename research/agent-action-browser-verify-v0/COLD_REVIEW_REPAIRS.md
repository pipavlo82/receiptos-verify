# PR #2 cold-review repairs

## Review and scope

Echo-Merlini's [public cold replay](https://github.com/pipavlo82/receiptos-verify/pull/2#issuecomment-6362471870) inspected `ac82f93b81559b4da61ae766824bb5fcf54388f4`. The macOS results are reviewer-reported. A separate local review reproduced the three portability findings and three missing semantic witnesses before editing. This follow-up changes only the additive research folder. The historical host, 2,156 original files, original evidence, source pins, canonicalization corpus, issued receipts, main, release tag, and frozen XRPL/cross-language branches remain unchanged.

The original finite 37-case / 21-mutant success did not establish complete guard coverage. These corrections preserve that history rather than rewriting the old reports as if the gaps had never existed. This is still an experimental local profile, not a released production integration.

## Before and after

| Finding | Before | Repair |
|---|---|---|
| Source inventory ordering | Identical paths/bytes/hashes failed on POSIX because `Path` ordering differs from Windows. | Compare strict complete exact-path maps; write relative POSIX-string order. Reject duplicate paths/JSON fields and incomplete or duplicate outer manifests. Accept the historical lock's row order. |
| Python selection | Controller and nested JavaScript driver invoked literal `python`. | Controller uses `sys.executable` and propagates it through `PYTHON_EXECUTABLE` to its canonicalization child. Isolated actual-process regressions remove `python` from `PATH`. |
| Bun selection | README omitted POSIX host `PATH` selection and suggested a single override. | Document both selectors and the exact Bun 1.3.14 author baseline. The frozen native bridge is untouched; runtime identity remains in semantic output. |
| Unsupported schema | Disabling the schema guard survived all 37 old cases and promoted crafted unsupported input to `VERIFIED`. | Independent caller-schema and package-schema fixtures pin `UNVERIFIABLE / SCHEMA_UNSUPPORTED`; physical guard mutation must expose the wrong promotion. |
| Wrong `requires_log` type | A string `"false"` lacked an independent admission witness. Guard removal promoted it to `VERIFIED`. | Pin `UNVERIFIABLE / RECEIPT_ADMISSION_FAILED`; mutate the actual admission guard. |
| Authority-premise mismatch | Guard removal survived the old cases. Native host rejection hid a downgrade from refutation to missing evidence. | Change only the host statement authority, retaining the receipt and its root. Pin `REFUTED / AUTHORITY_PREMISE_BINDING_MISMATCH`; require the specific structured downgrade to `UNVERIFIABLE / NATIVE_HOST_REJECTED_MALFORMED` to kill that mutant. |

The authority witness does not claim the host accepts malformed authority. It demonstrates preservation of the wrapper's established contradiction before the native host's later malformed-input result. A crash, unparsable report, arbitrary output difference, or reason-only change is not that semantic witness.

## Coverage boundaries

All seven previously unmarked checks are named. The existing receipt-identity check already had case E; it now joins the physical mutation inventory explicitly as a **`CONTRACT_REASON_WITNESS`**, outside semantic `KILLED` totals: removing it changes the refusal reason while the product remains `REFUTED`. Three checks remain **indirectly protected / independently unwitnessed**: malformed receipt subject, receipt-native verification profile, and saved recomputation result. Changing those receipt fields also changes the caller-pinned root, so existing root enforcement intercepts them. Their mutants are not counted as killed merely because another guard stops the input. No claim of exhaustive admission or guard-conjunct mutation coverage is made.

Original and supplemental populations remain distinguishable: 37 original action cases plus four new witnesses; 21 original semantic mutants plus three supplemental semantic mutants and one diagnostic reason witness. Original fixture objects and expectations are preserved. The schema witness tests caller and package separately even though one combined guard checks them. Population/unique-target assertions reject empty or altered inventories. No-op, crash, malformed-output and damaged-positive controls must remain outside successful semantic coverage.

## Reproduction and interpretation

Use the [replay instructions](README.md#replay). The controller includes ten dedicated portability tests as a separate Python suite. Those tests exercise real process selection with isolated host-command fixtures and strict source-map negatives. Full host/profile, action, canonicalization, mutation and browser executions are separate checks. Evidence of one does not substitute for another.

The Bun correction is explicit operational documentation, not a runtime-routing change. WSL probes using different Bun versions on `PATH` and in `BUN_EXECUTABLE` establish that the historical host follows `PATH` on POSIX. An override alone does not reproduce the author's semantic digest. Historical RVR/QEV bridge `python` selection is also unchanged.

## Executed repair gates (2026-10-23)

| Check | Actual result |
|---|---|
| Windows Node tests, normal / repeat / optimized | 434/434 each: 417 inherited + 17 research contract tests |
| Dedicated Python portability suite | 10/10 per Windows mode; 10/10 actual WSL, zero skips |
| Action cases | 41/41 in all three Windows modes and actual WSL |
| Canonicalization | 36 cases / 180 expectations per mode and WSL; 17 common / 19 historically divergent cases |
| Browser normal / repeat | 45/45 + 36/36 canonical each; no page errors or external requests |
| Final physical campaign | 21 original + 3 supplemental semantic mutants KILLED; 1 separate CONTRACT_REASON_WITNESS |
| Physical harness controls | 5/5 expected non-kill classifications: no-op, crash, malformed wrapper, malformed native report, damaged positive |
| Independent classifier / empty inventory | 19/19 finite controls; actual zero-inventory process refused before native execution |

All 25 physical mutations applied at their intended source locations, preserved three exact positive semantic reports, and restored source bytes. The full restored baseline matches. No crash is counted as a kill. The final campaign uses the exact harness SHA-256 `6ef7206d99d0a44eaf3f05782a419b735e2c59171044ede6bfd17c1d654d14ba`; an earlier four-control run is retained as intermediate evidence, not substituted for the final five-control run. An initial missing-dependency setup attempt is also retained separately.

Windows runtimes: Node 22.15.0, Python 3.12.10, Bun 1.3.14, Chromium 151.0.7922.34. Actual WSL Ubuntu: Node 24.11.0, Python 3.12.3, Bun 1.3.14. WSL is a different OS on the same physical host; no new local macOS or remote CI result is claimed. The inherited host-test family ran on Windows; WSL executes the dedicated portability suite, all 41 action cases and canonicalization.

Deterministic action output SHA-256 is `f96cf8092a19c25dcb46bd945bdc0b002c9c30591a77b610b2cf6ab135ae72e7`. Its original 37-case prefix is byte-identical to historical `e6628648adc16e287c21a81ce0f84b483f92c2f108bb3af45ac5558969701439`. Canonical output remains `c7f26b46b6749cc0bac21abb1f7418248f95235f3214460076d5ca45321aef5d`, including actual WSL. Browser canonicalization remains byte-identical to the frozen golden.

The new [machine-readable summary](evidence/cold-review-20261023/summary.json) records exact mutation source identities, witness pairs and population boundaries. Durable reproduction commands and source tests are in this repository. Full raw command/native-output receipts are local at `D:/PAVLO HQ/Workspaces/agent-action-pr2-repair-20261023`; separate before/independent-review receipts are at `C:/Users/msi/Documents/Codex/2026-10-11/files-pasted-by-the-user-mission/outputs/pr2-review-repair-20261023`. These are local evidence locations, not claims that they are publicly hosted.

No production code or dependency changes were required: the unmodified consumer already refused the four added witness inputs. These are portability corrections and finite coverage repairs. The preserved historical whole-tree lock is not repinned; the separate research lock is updated for the intended research files only.

The disposition remains **ITERATE / remain Draft**. No new canonical-admission policy, public-log authority, remote execution proof, licensing grant, CI certification or merge readiness follows from these finite repairs. Previously proposed larger admission/profile/anchor changes are outside this pass.
