# Independent core audit of frozen v0.2

Candidate: `4888a0584369a91075eb2bdbd9a2ff6b99c46588`.
Source under test: fresh detached checkout `work/v02-release-audit`.
Product source was not changed by this auditor.

## CORE-01 — MEDIUM: malformed continuity requirement can produce VERIFIED

**Observed defect:** `continuity_request.require_whole_envelope_binding` is
admitted as arbitrary JSON and only acts when its value is Boolean `true`.
String `"true"`, number `1`, object `{}` and null are silently treated as if the
whole-envelope obligation was omitted. Each produces global `VERIFIED` and
continuity `PRESERVED` even while its native result states
`whole_envelope_binding: "NOT_ESTABLISHED"`.

This is a typed-requirement/admission failure, not a cryptographic signature
bypass or general claim-compatibility bypass. The surrounding RVR digest
predicate remains correctly positive, but the explicitly supplied malformed
continuity option should not certify a complete accepted request.

Exact before evidence:

- `results/continuity-binding-true.json`: Boolean true, expected and actual
  `INSUFFICIENT_EVIDENCE`; continuity `UNVERIFIABLE`.
- `results/continuity-binding-false.json`: Boolean false positive control,
  expected and actual `VERIFIED`; limited continuity only.
- `results/continuity-binding-_true_.json`: malformed string, actual
  `VERIFIED`, continuity `PRESERVED`, whole envelope `NOT_ESTABLISHED`.
- `results/continuity-binding-1.json`, `continuity-binding-__.json`,
  `continuity-binding-null.json`: other malformed types, same failure.
- `results/extension-summary.json`: compact result inventory.
- `results/continuity-unknown-option.json`: typo/unknown required option
  `require_whole_envelop_binding: true` is ignored, producing `VERIFIED`.
- `results/continuity-unknown-policy.json`: unknown `policy_version` option is
  ignored, producing `VERIFIED`.

Reproduce using:

```
node work/audit02-core/extension-probe.mjs work/v02-release-audit work/audit02-core/results
```

The script builds fresh independently signed inputs using its own encoder,
Git-object hashing, Node Ed25519 and literal native RVR result authoring. It
does not import the product's test or fixture generators. Full request, bundle,
native result, component report and input SHA-256 are recorded per case before
any implementation correction.

Relevant locations:

- `schemas/request-v2.schema.json`: `continuity_request` refers to generic
  `jsonObject`, with no known-option type checks.
- `src/core/admission-v2.mjs`: no continuity request semantic admission.
- `src/adapters/chronicle.mjs`: guard checks
  `request.require_whole_envelope_binding === true`, ignoring other types.

Required correction: validate the known continuity request contract before
evaluating it, including a Boolean type for this option, required identifiers,
supported mode and permitted optional fields. Reject malformed/unsupported
request options rather than grading the remaining recognized subset as a
successful whole request. A v2-only admission correction can preserve frozen
v1 source behavior while compatibility-testing the valid v1 corpus.

The current recognized field inventory, mechanically read from
`evaluateContinuity`, is:

| Field | Current intended admitted meaning |
| --- | --- |
| `mode` | `historical` or `current` |
| `entry_id` | selected entry identifier |
| `subject` | exact canonical JSON identity matching selected entry |
| `state` | exact canonical JSON state matching selected entry |
| `receipt_root` | optional exact selected root reference |
| `proof_object_ref` | optional exact selected proof reference |
| `observation_envelope_digest` | optional 64 lowercase hex SHA-256 |
| `require_whole_envelope_binding` | optional Boolean; true requires digest |

Before controls also demonstrate that malformed mode/object, null entry ID,
missing state and null/malformed envelope digest do not become VERIFIED;
they currently return UNVERIFIABLE/INSUFFICIENT. Wrong reference type returns
VIOLATED/CONTRADICTED. The defect is selective fail-open admission, not every
malformed field. Unknown fields have no declared extension-version mechanism
and cannot safely acquire requested-obligation semantics by being ignored.

## Independent passing evidence

- `results/summary.json`: **57/57** fresh generic/adversarial checks.
- `results/projection-decision-table.json`: **3238/3238** finite projection
  substitutions, selected optional obligations, native semantic/replay
  combinations, nested PRF statuses, malformed reports and Boolean-truthiness
  controls. This is finite transition coverage, not every Cartesian product of
  fourteen layers.
- D1 and D2 share exactly the same authenticated receipt. D1 verifies the
  caller-selected commit A; D2 requests B and contradicts subject binding.
- D12 empty attachments/manifest gives `INSUFFICIENT_EVIDENCE`.
- D14 unsupported profile gives `UNSUPPORTED_PROFILE`.
- All ten required semantic dimensions were attacked individually; the
  multiple-mismatch case exposes every expected reason without an integrity
  override. Member ordering, whitespace and CRLF formatting remain equivalent;
  Unicode normalization is deliberately exact, so NFC/NFD ID spellings differ.

## Scope interpretation: opaque subject kinds carrying commit labels

Exploratory results `git-kind-*.json` show Git-object closure is enforced only
for `subject.kind == "git-artifact"`. An opaque subject kind can carry matching
caller/receipt commit/tree/path labels without object closure and still verify
the SHA256 predicate. This is **not classified as a demonstrated defect**:
the supported claim remains SHA256_EQUALS and generic kinds/labels are opaque.
The release claim must keep Git membership specific to the git-artifact
profile, rather than implying every admitted generic commit label has a Git
closure proof. No unsupported-kind execution or repository-membership proof
has been independently established by these exploratory cases.
