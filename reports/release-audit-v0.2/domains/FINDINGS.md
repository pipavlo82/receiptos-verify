# Independent domain audit — frozen v0.2

Candidate: `4888a0584369a91075eb2bdbd9a2ff6b99c46588`.
The audit executed a new detached clone under `work/audit02-domains/repo`, its own initially absent npm cache and `npm ci --ignore-scripts`. It imported no product fixture helpers, expected-result generators or development reports. The audit script constructs a distinct public synthetic Ed25519 key, fresh artifact bytes, independently encoded signed declarations, Schnorr actions and PRF tuples. Expected product results are detached literals. Native construction computes saved replay artifacts without deriving expected product verdicts from product output.

## Findings recorded before repair

**HIGH — semantic extension requirements fail open.** The outer `adapter_requirement` and `guarantee_requirement` values admit arbitrary JSON object members. The direct adapters check selected nested fields while silently ignoring additional outer semantic requirements.

Exact fresh before inputs/outputs and frozen source SHA-256 identities are in `requirement-admission/*.json`:

| Case | Declared requirement | Frozen actual |
| --- | --- | --- |
| interpoll_unknown_fresh_requirement | `adapter_requirement.require_fresh_admission=true` | Overall `VERIFIED`, native admission `NOT_EVALUATED` |
| interpoll_unknown_server_requirement | `required_evidence_basis=INTERPOLL_SERVER_ATTESTATION` | Overall `VERIFIED`, native execution only `OBSERVATION_SUPPLIED` |
| interpoll_null_outcome | Known `required_outcome=null` | Overall `VERIFIED`; null silently defaults to `EXECUTION_OBSERVED` |
| prf_unknown_policy_requirement | `guarantee_requirement.required_policy_version=unsupported-v999` | Overall `VERIFIED`, transfer `PRESERVED` |
| prf_unknown_evidence_requirement | `required_evidence_basis=AUTHENTICATED_CHAIN_SETTLEMENT` | Overall `VERIFIED`, unauthenticated synthetic tuple relation |
| orphan_interpoll_requirement_on_rvr | Interpoll requirement supplied for adapter `rvr` | Overall `VERIFIED`; context never evaluated |
| orphan_prf_requirement_without_guarantee | PRF context supplied with empty requested guarantees | Overall `VERIFIED`; context never evaluated |

The existing narrower primitive relations remain correct, but a global success report silently drops caller-provided semantic requirements. Interpoll's documentation expressly lists extra/conflicting semantic fields as malformed. The correction should reject unsupported/malformed/nonapplicable requirements; it must not implement fresh server or chain authentication as a new feature. A known negative control, `required_guarantee=null`, already yields `UNSUPPORTED_PROFILE`, demonstrating that the failures are outer context admission rather than a universal projection promotion.

Supported direct Interpoll context: exactly required `requested_action`, `authority`, optionally `required_outcome`. `requested_action` must have the nine exact native material fields `version,namespace,kind,actor,targetType,targetId,value,createdAt,nonce`; `authority` exactly `actor,namespace`. Optional `required_outcome` must be a string in `EXECUTION_OBSERVED|AUTHORIZATION_ONLY`; omission defaults to execution observation. Known material field types are subsequently enforced by exact equality with the native signature-validated action. No extra context semantic key is supported by the implementation.

Supported direct PRF context: exactly required `accepted_basis`, `required_native_result`, `required_relation_input_digest`, `required_guarantee`. Basis exactly `{id:nonempty string,dependencies:nonempty unique [{id:nonempty string,version:nonempty string}]}`; required native result exactly `{outcome:PRESERVED|VIOLATED|UNVERIFIABLE,reason:nonempty string}`; tuple digest lowercase 64 hex; supported guarantee exactly `native-result-and-dependencies-preserved`. No extra outer context requirement is implemented.

## Bounded supported relations

`summary.json`: **51/51 fresh literal probes matched**. This is separate from the seven subsequently demonstrated extension admission failures; a green probe count does not negate those failures.

- Semantic ABI: exact compatibility, wrong subject, wrong authority, scope expansion, policy/version mismatch, absent/contradicted dependency and identical digest with different claim all match detached expectations. Native neutral manifest/link/pair results and product compatibility remain separate. Native linker identity can remain valid for fields it does not represent (subject or authority ID); the separate product dimensions correctly contradict those requests.
- Trustless: actual native checker executes fresh signed one-document USD cases, canonical runner replays saved output, native negative remains negative, altered saved output diverges, empty corpus refuses, unsupported profile/pin refuses, package/runner/exit-code declaration alone is malformed, opaque report cannot satisfy local recomputation grade.
- Interpoll: all I01–I10 requested attacks plus observation/attempt mismatch, rejection, duplicate execution inflation and pending attempt checks matched. The native Schnorr verifier runs. Exact signed bytes and every material retry are checked. Supplied relay/observation data remain explicitly unproven external execution.
- PRF: P01–P06 plus missing settlement, duplicate/conflicting settlement and malformed accepted basis matched. Native Python relation actually executes; reproduced negative retains transfer `PRESERVED` while product is `CONTRADICTED`.

## Fresh end-to-end demo files

Exact input and complete output reside in `cases/D3_semantic_scope.json`, `D4_semantic_authority.json`, `D5_trustless_compatible.json`, `D6_trustless_incompatible.json`, `D7_interpoll_exact.json`, `D8_interpoll_mutated_retry.json`, `D9_prf_preserved.json`, `D10_prf_violated.json`, `D11_reproduced_negative.json`.

`cases/D5_D6_native_comparison.json` independently records native result equality and adapter-input identity for compatible versus incompatible requests; only product interpretation changes.

## Live source state

`public-source-identities.json` records exact read-only GitHub API observations with query time and URLs.

- Neutral Semantic ABI main: `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee`, unchanged from candidate; four native public runtime files, Apache-2.0, pinned source, experimental product encoding. No private Vértice imports occur in this adapter.
- Interpoll master: `559e47f2cd2ffcbd8ad38293da89448d8ec3152d`, unchanged; public `shared-validation/engagement.js`, Unlicense; experimental product supplied-trace glue reimplements exact retry relation without importing server/database implementation.
- PRF main: `fac26d2e8346aeab08194343b78c345d235c6935`, unchanged; `tools/award_actual_settlement.py`, MIT; native main relation separately stable/bounded. PR14 remains OPEN at `f525737069dc4cef7741f805d08a988912f4454f`; transfer is experimental reimplementation from public spec.
- **Recompute-kit main changed during the build/audit interval.** Current main is `3c3923956200d01ab74c2dcbb49b268739943bda`; PR57 head `197c6d26e68f85a117dd12a94924a7f959edaef4` merged at `2026-10-11T22:35:33Z`. Candidate remains pinned to historical main `1a37bcaf91918fd8a98f164d97d0fddbc28c6755`. Do not repin during this audit. Current PR state wording must be corrected without claiming that the frozen adapter implements the newly merged reporter protocol.

`current-main-replay.json`: fetched exact current public checker/runner/spec/suite/vector bytes into audit scratch, recorded Git blob and SHA-256 identities, executed all **12/12** actual current scan vectors. Native checker bytes are identical to candidate's pinned checker. The candidate refuses the new source pin as `UNSUPPORTED`. The public corpus has an unused `toy_scan.rule` annotation; the product's narrower exact input shape rejects that raw object. Removing only this unused annotation and explicitly selecting the supported historical source pin preserves signed manifest/corpus/decision/native artifact and yields native `REPRODUCED`. This is a documented input adaptation, not current-main reporter support.

Current runner's unchanged Windows suite command `python3` is unavailable here: original run returns `RUNNER`, not semantic failure or success. A separate explicitly recorded interpreter-command adaptation executes only the current native conformance check with all source/spec/vector pins and `contract:self_grading` retained, yielding `ok:true,kind:SUITE`. This suite did not become a reporter suite merely because the reporter protocol merged.

## Audit controller limitations retained

Initial fresh positive construction used EUR rather than the native toy checker's fixed USD answer grammar and crashed. Exact failed input/native stderr are retained under `construction-error/`; it is not counted as a kill, refutation or product defect. Fresh declared positive controls were reconstructed with USD. An initial current-runner controller referred to `module.Path` rather than `pathlib.Path`; its receipt is retained in `current-main-initial-controller-error.json` and is not counted as native runner success. The corrected controller reports actual original RUNNER classification and separately marks the interpreter adaptation.

No product source, upstream, Git branch or remote was changed by this domain audit. Repairs require a separate documented commit after these findings.
