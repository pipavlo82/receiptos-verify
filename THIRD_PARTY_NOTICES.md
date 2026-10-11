# Third-party notices and source boundaries

The root Apache-2.0 grant covers new product-authored material. The selected
upstream components below retain their own grants, notices and attribution.
Copied license files are distributed as source bytes; this document supplements
them rather than replacing their terms. Git ownership does not establish sole
authorship.

## v0.2 selected native files

| Source | Exact source pin | Copied paths | Grant / retained file |
| --- | --- | --- | --- |
| `trustless-ai/semantic-abi` | `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee` | `runner/src/{classes,evaluate,linker,manifest}.mjs` and license | Apache-2.0; `vendor/semantic-abi-v02/LICENSE` |
| `trustless-ai/recompute-kit` | `1a37bcaf91918fd8a98f164d97d0fddbc28c6755` | `tools/run_conformance.py`, `conformance/scan-subject-binding-v0/{scan_check.py,README.md,suite.json}` and license | CC0-1.0; `vendor/recompute-kit-v02/LICENSE` |
| `Interpoll1/decentralised` | `559e47f2cd2ffcbd8ad38293da89448d8ec3152d` | `shared-validation/engagement.js` and license | Unlicense; `vendor/interpoll-v02/LICENSE` |
| `pipavlo82/protected-relation-fixtures` | `fac26d2e8346aeab08194343b78c345d235c6935` | `tools/award_actual_settlement.py` and license | MIT, Copyright (c) 2026 Pavlo Tvardovskyi; `vendor/prf-v02/LICENSE` |

These are fourteen files in total, including four license files. Raw SHA256,
Git blob identities and exact source/product paths are preserved in
`provenance/v02-semantic-abi.json`, `provenance/v02-trustless.json` and
`provenance/v02-actions-prf.json`, and consolidated in `provenance/sources.json`.
The selected source trees contained no additional root or nested NOTICE/COPYING
file applicable to these selected v0.2 files at inspection time. Original file
headers and the full copied licenses remain unchanged.

Semantic ABI's neutral runner has shared implementation history including
Echo-Merlini, with Pavlo's merged semantic-model fixes separately evidenced.
Recompute-kit's checker/runner retain babyblueviper1, Pavlo, Merlini/Echo and
zexoverz contribution boundaries. Public review/witness evidence is not converted
into sole checker authorship. Interpoll's selected signed-action implementation
and PRF's award relation have path-level Pavlo-authored commit evidence in the
action/PRF fragment; no attribution to the entire Interpoll application is made.

## Experimental specification reuse

PRF PR14 at `f525737069dc4cef7741f805d08a988912f4454f` remained open and unmerged
when inspected. Its public MIT specification informed the original bounded
product guarantee-transfer relation. Its Python consumer, adapters, schema and
source-derived fixture expectations are not copied or executed here. That
relationship is `REIMPLEMENTED_FROM_SPEC`, not a native dependency or main
behavior claim.

Interpoll's application outbox and database/relay implementation are public
read-only specification/behavior inputs. Their code and user data are not copied.
RSI/SEG provide public relation and consumer-context methodology only. These
relationships establish no runtime, deployment or standards conformance claim.

## Existing v0.1 retained components

Crystal, generic RVR, QEV and Moth nested source licenses and notices remain
unchanged in `vendor/crystal`, `vendor/rvr`, `vendor/qev` and `vendor/qev_moth`.
Exact selected byte/grant records remain in `provenance/native-sources.json`,
`provenance/qev-sources.json` and `provenance/qev-moth-sources.json`.
QEV's nested neutral Semantic ABI code is Apache-2.0 and its selected schema
dedication is CC0-1.0. Nested source pins differ where documented; no historical
component is silently upgraded by the v0.2 source selection.

Installed npm dependencies retain exact notices under `vendor/licenses` and
`provenance/npm-licenses.json`: noble curves/hashes, AJV, fast-deep-equal,
json-schema-traverse and require-from-string use MIT; fast-uri uses BSD-3-Clause.
The product does not relicense those packages or infer conformance from their
presence. No new npm dependency was added for the four v0.2 native slices.

No private/commercial Vértice implementation, external production capture,
provider/user dataset, credentials or unpublished operational key was imported
for v0.2. Fresh synthetic fixtures and deliberately public test keys are identified
as such. The source catalog and full reuse map retain all 43 historical audit
repository accounts without inventing additional transferred capability.
