# Interpoll signed actions and supplied retry evidence

`receiptos.verify.interpoll-action.v2` executes the unchanged public Interpoll
`verifyAction` implementation from `Interpoll1/decentralised` default branch
`master`, pinned to `559e47f2cd2ffcbd8ad38293da89448d8ec3152d`. The source file is
`shared-validation/engagement.js`; its Unlicense is retained beside the copied
file. No Interpoll repository, server, browser, database or deployment is changed.

Pavlo's signed-action implementation is evidenced by commit
`2cfde5efc3d10b56c73e74723d3f328b77f2fc1f`; the durable exact retry implementation
is evidenced by `a1eb47653aa7b8f0484ab977d75a5db41d226d02`. Both are ancestors of
the inspected current default branch. These path-level commit records establish
identified contributions; they do not attribute the entire shared repository to
Pavlo. Exact file identities and contribution links are recorded in
`provenance/v02-actions-prf.json`.

## Caller and producer boundary

The product adapter is original glue around the native Schnorr action relation.
`evaluateInterpollV2(input, context)` accepts the producer trace separately from
the caller's selected `context.requested_action` and `context.authority`.

The requested action is the exact native material tuple: `version`, `namespace`,
`kind`, `actor`, `targetType`, `targetId`, `value`, `createdAt` and `nonce`.
The caller authority contains `actor` and `namespace`. The receipt cannot select
either premise on the caller's behalf. A signature over A cannot authorize B,
even when B retains A's signature or action ID. Equality covers the complete
native signed envelope for accepted actions and every retry, including material
parameters, nonce, timestamp, ID and signature.

The trace models these fields separately:

| Field | Evidence meaning |
| --- | --- |
| `signed_intent` | Native signed action; key control over exact intent |
| `accepted_action` | Supplied `accepted` or `duplicate` relay response and action |
| `attempts` | Distinct attempt IDs, exact signed envelopes, delivery status and declared execution attempt |
| `observation` | Supplied action/attempt-bound `APPLIED` or `REJECTED` observation |
| `final_committed_result` | Exact action ID, ordered attempt IDs and digests of supplied trace and observation |

`commitActionTrace` computes a product trace digest. That digest binds supplied
artifacts; it does not establish an actual database transaction or relay origin.
The adapter's `EXPERIMENTAL` maturity covers this bounded supplied-trace relation.

## Native result and product result

Native signature evaluation uses `fresh: false` for historical evidence.
`signature = VALID` therefore does not establish fresh admission, revocation
status, target existence, successful relay delivery or actual viewing. Native
authorization, acceptance status, retry relation, supplied observation and trace
commitment remain separate in `nativeResult`.

| Condition | Product result |
| --- | --- |
| Exact caller-selected signed action and complete matching supplied execution trace | `VERIFIED` for this bounded relation |
| Changed caller action, accepted action or material retry | `CONTRADICTED` |
| Invalid native signature | `CONTRADICTED` |
| Unsupported caller authority | `UNSUPPORTED_PROFILE` |
| Duplicate acceptance with no new execution | `INSUFFICIENT_EVIDENCE` for a new execution claim |
| Missing execution observation or trace commitment | `INSUFFICIENT_EVIDENCE` |
| Supplied execution rejection | `CONTRADICTED` |
| Extra or conflicting semantic fields | `REJECTED_MALFORMED` |

`AUTHORIZATION_ONLY` is a separately selected narrower outcome. It can establish
the exact signed-action relation while leaving execution `NOT_ESTABLISHED`.
`EXECUTION_OBSERVED` is the default and requires supplied observation evidence.
Neither mode independently authenticates an Interpoll server or execution.

## Controls and reuse limits

`tests/interpoll-v2.test.mjs` includes I01-I08 plus missing caller intent,
wrong caller target, native signature tampering, trace tampering, supplied
rejection, duplicate execution inflation and observation binding controls.
Positive fixtures use a public synthetic key and deterministic Schnorr auxiliary
bytes; they contain no real Interpoll identity or captured user data.

Only `engagement.js` and its license were copied. The application, relay, SQL
store, Gun integration, durable TypeScript outbox and captured production data
were not copied. Exact-retry and observation composition are recorded as
`REIMPLEMENTED_FROM_SPEC`. In particular, the adapter does not execute the
application's durable queue or prove its SQL atomicity.
