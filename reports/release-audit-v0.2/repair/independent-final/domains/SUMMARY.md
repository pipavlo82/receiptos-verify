# Final exact-checkout domain replay

Executed the independent domain controller against fresh checkout `eb942148eeb489db809b39e053ec905105cc3056` with its installed locked dependencies. Product source and canonical report files were not changed by this replay.

**51/51 original independent domain probes passed.** `before-after-comparison.json` confirms all 51 detached literal oracles, exact input objects, adapter/product statuses and layer statuses match the corresponding frozen `4888a0584369a91075eb2bdbd9a2ff6b99c46588` supported-relation controls. The controller changed only its repository URL; source identities and raw stdout/stderr hashes are recorded in `controller-receipts.json`.

Fresh end-to-end machine-readable inputs and complete outputs are in:

- `cases/D3_semantic_scope.json` — `CONTRADICTED`
- `cases/D4_semantic_authority.json` — `CONTRADICTED`
- `cases/D5_trustless_compatible.json` — `VERIFIED`
- `cases/D6_trustless_incompatible.json` — `CONTRADICTED`
- `cases/D7_interpoll_exact.json` — `VERIFIED`
- `cases/D8_interpoll_mutated_retry.json` — `CONTRADICTED`
- `cases/D9_prf_preserved.json` — `VERIFIED`, transfer `PRESERVED`
- `cases/D10_prf_violated.json` — `CONTRADICTED`, transfer `VIOLATED`
- `cases/D11_reproduced_negative.json` — `CONTRADICTED`, native negative retained

`cases/D5_D6_native_comparison.json` confirms identical native results and adapter input for the compatible and incompatible Trustless requests.

`active-context-summary.json` separately records the five exact frozen active-context fail-open inputs. All five now return `REJECTED_MALFORMED` through direct and composed APIs at exact source HEAD `eb942148eeb489db809b39e053ec905105cc3056`. Two positive controls remain `VERIFIED`. Two valid inactive-context cases retain `VERIFIED` under the explicit selector contract and are INFO, not technical defects. These controls are not additional independent domain capability coverage.

No old receipt was relabeled or overwritten. No feature, source edit, upstream edit, branch, commit, push, tag or publication was performed by this replay.
