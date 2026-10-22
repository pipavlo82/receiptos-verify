# Agent action receipt profile

Profile/schema: `agent-action-receipt.v0`. Admission and semantic rules are implemented in [lib/profile.mjs](lib/profile.mjs), composed with the existing host's strict parser, `verifyV2`, native Crystal and Interpoll adapter. The receipt is not a replacement for `receiptos.verify.bundle.v2`: it is carried in that bundle's Crystal evidence slot and separately supplied for independent identity checking. Those two copies must agree exactly.

## Receipt fields

Every field below is required; extra top-level fields are refused. The `schema` and `profile` fields both name this version. This is an executable research contract; a separately standardized interchange schema is not claimed.

| Field | Meaning and enforced binding |
|---|---|
| `canonicalization_profile` | `agent-action.receiptos-common-json.v0` |
| `receipt_id` | Nonempty local record label; cryptographic identity is the root |
| `agent` | Exact caller-selected `id` and key; key must match signed actor |
| `action` | Existing native `actionMaterial`: version, namespace, kind, actor, target type/ID, value, creation time, nonce |
| `claim` | Exact caller claim: kind `LOCAL_ACTION_REPLAY_EQUALS`, native action ID and expected output digest |
| `input_commitment` | Host SHA-256 canonical digest of exact supplied input state |
| `observed_result` | Issuer's result, compared with executed replay output |
| `evidence_attachments` | Exact digests of native adapter input and local input state |
| `verification` | Host `receiptos.verify.generic.v2`, native `receiptos.verify.interpoll-action.v2`, local replay profile |
| `native_verifier_result` | Native result object; compared to fresh host evaluation, never used as an oracle |
| `recomputation_result` | Replay profile, `REPRODUCED`, input digest and output digest; rechecked |
| `authority`, `assumptions`, `dependencies` | Must equal the authenticated host statement; host caller policy decides compatibility |
| `scope` | `LOCAL_SYNTHETIC_TRANSITION_ONLY`; stronger requested scope is unverifiable |
| `anchor` | Exactly `{receipt_root: "0x…"}`; native Crystal root over body |

The package is `{schema,receipt,host_bundle,input_state,log}` with schema `agent-action.package.v0`. The caller request independently selects `{schema,profile,expected_receipt_root,agent,action,claim,scope,host_request,requires_log,log_selection}` with schema `agent-action.request.v0`. Evidence cannot select its own required claim or log trust root.

## Executable operation

Replay profile `agent-action.local-review-marker.v0` accepts an exact object `{schema,item_id,review_markers}`. `review_markers` must be an integer from 0 through 999999. The signed action must be a reaction `up` to the same post ID. The finite local operation returns the same item with the marker count incremented once. This deliberately small laboratory semantics is not asserted to be an Interpoll service's internal database behavior.

The issuer actually executes the operation, checking the independently written literal 0 → 1 result. A verifier independently invokes the same specified function against supplied input. This proves reproducibility within the finite profile, not independent implementation or organizational independence. Repeating verification has no external side effect. No reputation consumption, real server request or payment occurs.

## Outcomes and non-promotion

`agent-action.browser-projection.v0` is explicit and local. A `VERIFIED` result means all selected obligations passed for this bounded claim. A concrete binding/result contradiction is `REFUTED`. Missing required evidence, unavailable authority, malformed or unsupported input, and a stronger requested guarantee are `UNVERIFIABLE`. These reasons remain distinct. This projection is not a blanket mapping of arbitrary native status vocabularies.

The complete native host report and native Crystal result are retained. In particular, native `OBSERVATION_SUPPLIED`, `NOT_EVALUATED`, `PRESERVED`, `REPRODUCED` and host `INSUFFICIENT_EVIDENCE` are not rewritten as external execution. The wrapper maps the latter to product `UNVERIFIABLE` while retaining the original result and reason. The browser similarly retains lens `verified-good`, `verified-bad`, `unverifiable` and identifies its own projection version.

The result always records `external_execution`, `public_log_authenticity` and `execution_permission` as `NOT_COVERED`. `VALID_RECEIPT != PROVEN_EXTERNAL_EXECUTION`, `VALID_SIGNATURE != CORRECT_JUDGMENT`, `CONFORMANCE_PASS != EXECUTION_PERMISSION`, and `LOG_INCLUSION != CLAIM_AUTHORIZATION` remain protected boundaries.

Integrity and other dimensions are evaluated separately where admitted. An optional omitted log remains visibly unverifiable even when the local action claim passes. A failure's overall reason has deterministic precedence; the report is not an exhaustive explanation of every possible simultaneous defect.
