# Native PRF relation and downstream guarantee preservation

`receiptos.verify.guarantee-preservation.v2` has two explicit source boundaries.

1. The **merged-main native relation** is
   `pipavlo82/protected-relation-fixtures` at
   `fac26d2e8346aeab08194343b78c345d235c6935`,
   `tools/award_actual_settlement.py`. It is copied unchanged with its MIT
   license and actually executed with isolated Python over fresh synthetic
   tuples. This source-main relation is classified `STABLE` within its stated
   bounded synthetic contract.
2. The **product downstream transfer relation** is original code informed by
   the public PR14 guarantee-preservation specification at
   `f525737069dc4cef7741f805d08a988912f4454f`. Live PR14 inspection found it
   `OPEN` and unmerged. This product projection is `EXPERIMENTAL` and
   `REIMPLEMENTED_FROM_SPEC`; it neither executes PR14's Python consumer nor
   claims its wire-format conformance.

The complete adapter remains `EXPERIMENTAL`. No PR-only behavior is called
current-main behavior. Source identities, licenses and path-level contribution
records are in `provenance/v02-actions-prf.json`.

## Separate caller premises

`evaluatePrfV2(input, context)` accepts:

```text
input.profile = award-actual-settlement-v0
input.upstream = {award, settlements, native_result}
input.downstream = {native_result, dependencies:[{id,version}]}

context.accepted_basis = {id, dependencies:[{id,version}]}
context.required_native_result = {outcome, reason}
context.required_relation_input_digest = SHA256(canonical({award,settlements}))
context.required_guarantee = native-result-and-dependencies-preserved
```

The caller independently selects the exact award/settlement input digest,
selects the required native result and separately accepts the exact
dependency identities and versions. Neither field is manufactured from a
producer's success flag. A nonempty, unambiguous basis is required. Dependency
ordering is irrelevant; identity and version equality are exact.
The selector is mandatory: an unrelated award tuple with the same native result
cannot establish the caller's requested PRF relation. This is a separately scoped
PRF award/settlement obligation, not proof that the surrounding RVR or Trustless
claim's native result was transferred.

The v2 product request supports exactly this guarantee declaration:
`requested_guarantees: [{"id":"native-result-and-dependencies-preserved"}]`.
Additional declaration fields, including version, parameters, scope or authority,
are unsupported rather than silently ignored. They produce guarantee
`UNVERIFIABLE` with `GUARANTEE_UNSUPPORTED` and an otherwise positive product
result of `INSUFFICIENT_EVIDENCE`. Unknown IDs and multiple obligations have the
same semantics. An empty declaration list makes no guarantee-preservation claim.
The independently selected native result, tuple digest and dependencies belong
in `guarantee_requirement` using the bounded context contract above.

The native main `relation(award, settlements)` checks one supplied finalized
award against one observed settlement: target, tender, fulfiller, acceptance and
actual amount must preserve the award tuple. Native `PRESERVED`, `VIOLATED` or
`UNVERIFIABLE` and its exact reason remain available. A completed Python process
with exit 0 establishes no positive native verdict by itself.

The copied module's fixture validation and expected case table are not invoked
by this adapter. It calls `relation` directly on supplied tuples and compares
the observed native output with separately declared native evidence. Changed
payment can therefore yield `VIOLATED` even when the producer declared a
positive result. No upstream fixture expectation is an oracle for product tests.

## Projection relation

The product preserves `recomputation`, `nativeResult` and
`guaranteeProjection` separately.

| Evidence | Replay | Transfer | Product |
| --- | --- | --- | --- |
| Native positive reproduced; exact caller result/dependencies preserved downstream | `REPRODUCED` | `PRESERVED` | `VERIFIED` |
| Native negative reproduced; that exact negative and dependencies retained | `REPRODUCED` | `PRESERVED` | `CONTRADICTED` |
| Native output differs from supplied native evidence | `DIVERGED` | `UNVERIFIABLE` | `CONTRADICTED` |
| Exact upstream result reproduced; downstream changes result or a dependency | `REPRODUCED` | `VIOLATED` | `CONTRADICTED` |
| Missing caller-accepted premise or native `UNVERIFIABLE` | `REPRODUCED` when possible | `UNVERIFIABLE` | `INSUFFICIENT_EVIDENCE` |
| Native process unavailable, crashes or output contract fails | `CANNOT_RECOMPUTE` | `UNVERIFIABLE` | `CANNOT_RECOMPUTE` |
| Unsupported profile/guarantee | As available | `UNVERIFIABLE` | `UNSUPPORTED_PROFILE` |

A preserved transfer is not necessarily a positive upstream result. Correctly
reproducing and faithfully retaining `VIOLATED / amount_mismatch` preserves the
declared transfer relation while the product remains negative. Conversely,
positive upstream evidence does not establish a consumer guarantee when that
consumer drops or changes a required dependency.

Composition preserves the adapter's separate `productProjection` as an explicit
product obligation alongside the transfer status. A positive surrounding RVR
claim cannot turn a faithfully transferred negative PRF tuple into global
`VERIFIED`: the transfer stays `PRESERVED`, the PRF product projection stays
`CONTRADICTED` and overall is `CONTRADICTED`. Unsupported PRF profiles, malformed
PRF input and unavailable native checks retain their respective product failure
classification rather than being reduced to generic insufficient evidence.

## Scope and limitations

The caller's accepted basis remains a bounded premise. This adapter does not
prove that the basis is complete, sound or authorized by an outside institution.
It does not establish authenticated chain execution, award authority, universal
mechanism truthfulness or arbitrary downstream program behavior. Exact
downstream declarations are supplied artifacts, not execution proof.

Fresh product tests independently declare expected tuple outcomes, exercise
payment substitution, native divergence, faithfully preserved negatives,
downstream native substitution, dropped/versioned dependencies, missing/empty
premises and malformed/unsupported inputs. RSI's detached relation expectations
and SEG's separately selected consumer context inform this discipline; neither
upstream's runtime is executed here.

Only the merged-main award module and MIT license were copied. PR14 Python
consumer, adapters, schema, suite and source-derived recompute-kit expectation
fixtures were not copied: the product uses its own bounded input contract, and
its Trustless adapter independently handles native recompute-kit execution.
