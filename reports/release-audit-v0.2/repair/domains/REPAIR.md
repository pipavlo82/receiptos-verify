# Scoped direct-adapter requirement admission repair

Findings were committed by the coordinator at `dde5419f453969ae33b9e88b3151dba3e370f196` before these changes. Frozen candidate `4888a0584369a91075eb2bdbd9a2ff6b99c46588` remains the before identity. After receipts identify the current checkpoint HEAD plus exact changed source hashes because the technical repair was still uncommitted when captured.

Only `src/adapters/interpoll-v2.mjs`, `src/adapters/prf-v2.mjs` and new `tests/adapter-context-release.test.mjs` were edited by this agent. No native/vendor source, executable pin, lock, old fixture or prior test was changed.

The direct Interpoll context now has a closed outer vocabulary (`requested_action`, `authority`, optional `required_outcome`) and validates provided known field types. Explicit null is not treated as omission. Missing/partial context remains safely insufficient; omitted outcome retains the documented execution-observed default. Unsupported nonempty outcome strings retain the direct API's existing `UNSUPPORTED_PROFILE` classification.

The direct PRF context now has a closed outer vocabulary (`accepted_basis`, `required_native_result`, `required_relation_input_digest`, `required_guarantee`) and validates provided object/string types. Missing/partial premise contexts retain existing insufficiency and native replay behavior. Existing supported positive, reproduced negative, native and transfer relations are unchanged.

`replay-active-contexts.mjs` replays the exact five frozen active-context before inputs without regenerating their signatures or fixtures. All five previously returned global `VERIFIED`; now composed and direct APIs each return `REJECTED_MALFORMED`. Original D7 and D9 positive controls remain `VERIFIED`.

Assessment correction: the two originally labeled orphan-context cases are **INFO**, not demonstrated technical defects. The explicit selector contract makes valid inactive contexts inert. They remain `VERIFIED` with the unselected relation inactive after repair, as intended. Frozen before receipts have not been rewritten; these corrected assessments supersede the initial claim.

Focused canonical Node tests: **66/66 normal and 66/66 `--no-opt`**, zero failures/cancellations/skips/todos. This comprises 28 new direct context tests and 38 existing Interpoll/PRF tests. Exact command receipts and raw stdout/stderr hashes are in `normal-focused.json` and `no-opt-focused.json`. Full canonical validation is the coordinator's next gate and is not claimed by this focused result.
