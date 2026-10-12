# Trustless native integration in v0.2

The executable profile `receiptos.verify.trustless-scan.v2` wraps selected,
unchanged public recompute-kit code. It runs the real native
`scan_subject_binding.v0` relation and the real pinned-main conformance runner
against fresh caller-supplied evidence. It does not run the complete
recompute-kit suite inventory.

## Exact public source

The public main observed when this adapter was pinned was
`1a37bcaf91918fd8a98f164d97d0fddbc28c6755`, tree
`7b64f2b3f51a3df93ab74d6ea717f74635799845`. PR65 is merged into this main.
The selected scan checker and canonical runner are vendored byte-for-byte;
runtime SHA-256 checks pin all executed upstream files and the selected spec.
The CC0-1.0 source grant remains in `vendor/recompute-kit-v02/LICENSE`.

PR57 was OPEN at `197c6d26e68f85a117dd12a94924a7f959edaef4`, with
base `1a37bcaf91918fd8a98f164d97d0fddbc28c6755`, at the source observation.
Release audit independently found it merged at `2026-10-11T22:35:33Z`;
current main is `3c3923956200d01ab74c2dcbb49b268739943bda`. The adapter
retains its historical-main pin and does not import newly merged reporter
behavior. It rejects source pins other than its exact selected pin. That pinned suite
does not declare `adapter.contract`: the preserved native `contractMode` is
therefore `null`. `runnerContractInterpretation: MAIN_SELF_GRADING` describes
the observed main runner behavior separately. PR52 was also open at the source observation at
`7eaf8995748ec4a00cb313463d2555da8fea25b4`; its changes are not imported.

`sourceMaturity: STABLE` identifies the merged source relation and
`sourceState: PUBLIC_MAIN` excludes open-PR behavior. Adapter `maturity:
EXPERIMENTAL` identifies the new bounded product integration. Neither establishes
production security, complete upstream conformance, or a real-world poisoning detector.

## Input and execution

`evaluateTrustless(input, context)` accepts:

```json
{
  "profile": "scan_subject_binding.v0",
  "source_pin": "1a37bcaf91918fd8a98f164d97d0fddbc28c6755",
  "case_id": "receiptos_positive",
  "input": {
    "public_key_ed25519": "<64 lowercase hex digits>",
    "toy_scan": {"scanner_version": "declared/version", "pattern": "declared-pattern"},
    "corpus": [{"id": "document-id", "content": "document content"}],
    "manifest": {"body": {"rag_corpus": {}}, "sig": "<128 lowercase hex digits>"},
    "decision": {}
  },
  "artifact": {"profile": "scan_subject_binding.v0", "results": [], "total": 1, "reproduced": 1}
}
```

The abbreviated manifest, decision and artifact above illustrate field
placement and are not a valid fixture. `buildTrustlessEvidence()` in the test
helper constructs complete fresh synthetic inputs and captures genuine native
CLI JSON. Its positive and negative expectations are independent literals.
No upstream captured datasets or upstream test signing credentials are copied.
The helper uses an explicitly public RFC8032 test seed; it is not a secret or
an accepted production authority.

The supplied artifact is the actual `scan_check.py` JSON format: `profile`,
`results[{case_id,reproduced,result}]`, `total`, `reproduced`. A selected row must
contain `replay_bindings`, `result_only_check`, `subject_bound_check` and
`evidence_grade`; native refused-binding controls may also contain
`replay_failures`. Multi-row artifacts are admitted, but only the explicitly
selected case is replayed. Empty, duplicate or inconsistent inventories fail
admission. The `c0` answer-flip demonstration has a different result contract
and is unsupported by this bounded scan-result adapter.

Execution first calls native `check_decision`, `sig_ok`, `subject_bound`, and
`result_only` without reading the saved artifact's expectations. It independently
recomputes signature validity, Merkle/root and retrieval/answer bindings, the
bound scan subject, and the declared deterministic scanner's outcome.

The bridge then creates a fresh one-case conformance capsule. It copies the
unchanged native checker/spec, supplies freshly pinned vector bytes, and makes
an ephemeral suite declaration whose only command is that checker under the
current Python interpreter. It executes the unchanged native CLI and
`run_conformance.run_suite`. Original main's reference `suite.json` is retained
as source evidence; the entire original conformance-plus-mutation suite is not
claimed executed. No caller-supplied command, path, interpreter or URL executes.
Temporary paths are excluded from canonical result identity and removed after
the run. Python standard library is the only additional runtime dependency.

## Separate native and product meanings

| Preserved item | Meaning |
| --- | --- |
| suite/check/case IDs | Exactly the bounded native profile and selected case |
| runner `PASS` | Native program reproduced its saved target |
| `NO_FINDING` | Declared scanner found nothing in its bound subject |
| `CONTRADICTED` | Native deterministic scan disagrees with the signed clean assertion |
| `CANNOT_ESTABLISH` / `NOT_VALID` | Native refusal, with no evidence grade |
| `REPRODUCED` evidence grade | Native deterministic scanner was rerun |
| `AUTHENTICATED_REPORT` grade | Signed bound assertion; scanner-origin execution is not established |
| product `REPRODUCED` / `DIVERGED` | Saved native result equality / disagreement |
| `CANNOT_RECOMPUTE` | Native source/runtime/parser/runner unavailable or invalid output |

The layer status is a replay state; it is never an overall `VERIFIED` label.
`semanticOutcome` separately maps bounded native `NO_FINDING` to `VERIFIED`,
contradiction or invalid binding to `REFUTED`, and unresolved evidence to
`UNVERIFIABLE`. This is a result for the named bounded scan relation, not
`POISONING_ABSENT` or proof of arbitrary correctness. The generic product
compatibility and evidence-sufficiency layers must still authorize the
caller-selected claim and accepted evidence grade.

A real native runner `PASS` can accompany a correctly reproduced
`CONTRADICTED` result. It remains negative. A fabricated saved positive result
cannot change the raw native computation; it produces `DIVERGED`. Canonical
runner exit 0 by itself is never a semantic result. Runner `DRIFT` is unavailable
source identity, not semantic failure. Exceptions/crashes and malformed or empty
output are `CANNOT_RECOMPUTE`, not contradiction.

## Claim and subject binding

The product binds `claim.kind = TRUSTLESS_CHECK` and claim parameters
`profile`, `case_id`, `input_digest` to the adapter's independently observed
`nativeBinding`. The bound `input_digest` is SHA-256 of the exact canonical
`input` object, including manifest, public key, scanner declaration, decision
and corpus; it is also `observedArtifactDigest`. The product-selected subject
can name this native case and those exact bytes. The digest does not replace
the generic authority/scope/policy/time/dependency relation.

The distinct native subject remains inspectable as `observedSubject` and
`nativeBinding.subject`: the effective-dataset Merkle digest and declared
scanner version. `binding` also preserves corpus root, signed scan subject,
signature validity, scanner declaration, query and k. A signed scan of one
dataset cannot establish another dataset; the native profile remains frozen
to k=1 and its explicit recordwise transfer rule.

## Contribution and limitations

The scan checker is authored by babyblueviper1, with its README documenting
Pavlo's effective-dataset witness/review contribution. Commit
`a05099ee5674f40148ee88ddf5105fdcf2fda607` explicitly credits Zexo and Pavlo's
evidence-grade refusal finding. Pavlo's exact authored runner failure-classifier
implementation is commit `ce28d6888b224dd8551d0d1a1196a6cd706420cd`; the overall
runner also contains babyblueviper1, Merlini/Echo and Zexo contributions. No
sole authorship is inferred from repository ownership or review.

This adapter does not execute arbitrary recompute-kit suites, scanner binaries,
live services, PR57 reporters, private Vértice code, or full main mutation
inventory. `AUTHENTICATED_REPORT` does not prove scanner-origin execution.
The public supplied key's signature validity does not establish an external
authority identity. A caller's broader authority, scope, version, policy,
dependencies and evidence basis remain independently checked product premises.
