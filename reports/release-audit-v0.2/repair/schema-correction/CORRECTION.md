# Typed caller request classification correction

Before checkpoint: `40fcaa7bbf43872c1ab6d63565ad3c2d9808b81c`, preserving the fresh `1fecfc2587c5d89d350017a2a7a98ca78e933b9f` gate failure. That repair passed 703 tests but the full vector gate exposed two classification regressions: **66/68**, failing unchanged I03 and I08.

I03 requests action `kind=other-kind` against a valid signed reaction. The typed caller request must reach the exact signed-intent comparison and return `CONTRADICTED / SIGNED_INTENT_REQUEST_MISMATCH`. Restricting this caller field to the producer's action-kind enum instead rejected it before the native relation.

I08 requests authority `namespace=unsupported`. That string must reach the caller authority policy relation and return `UNSUPPORTED_PROFILE / ACTION_AUTHORITY_UNSUPPORTED`. Restricting this caller field to the producer namespace grammar instead rejected it as malformed.

The correction changes exactly two schema properties to the existing bounded nonempty text definition: caller action `kind`, and caller authority `namespace`. Producer/native signature validation, other typed fields, closed outer contexts and unknown-member rejection are unchanged. No vector or native runtime source changed.

Four new composed tests independently assert the intended native signature, execution status, semantic classification and exact reason for I03/I08; null versions of those fields remain malformed. Their expected values are literal and do not read the vectors' expected output field.

After the correction:

- **75/75 focused tests**, normal and `--no-opt`, zero failures/skips/cancellations/todos.
- **68/68 combined vectors**, including all 30 v0.1 controls and all 38 v0.2 controls.
- Exact five active before attacks still return `REJECTED_MALFORMED` in both direct and composed APIs. Two positive and two intentionally inactive context controls retain `VERIFIED`.
- Scoped diff check passes.

Raw outputs, command receipts and exact changed source hashes are recorded beside this document. `vectors.json` contains every fresh vector output. `summary.json` contains the exact five active attack replays and four positive/inactive controls.

Only `schemas/request-v2.schema.json` and new `tests/interpoll-request-classification-release.test.mjs` were edited by this correction agent. No commit or source-lock edit was made by this agent.
