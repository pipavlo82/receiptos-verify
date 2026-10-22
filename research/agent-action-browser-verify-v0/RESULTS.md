# Results and validation evidence

All counts below describe this finite experiment. They are not security probabilities or full ecosystem certification. No provider or chain execution was performed.

| Check | Observed result |
|---|---|
| Original host baseline before writes | 417/417 relevant tests; original source lock 345 entries PASS; original provenance PASS |
| Host + new contract suite | 430/430 = 417 inherited + 13 new, normal/repeat/Node `--no-opt` |
| Action/anchor fixture execution | 37/37, normal/repeat/optimized |
| Canonical differential | 36 raw cases, 180 literal expectations, 17 common controls, 19 differing cases; all expected |
| Browser | 41/41 checks, 36/36 canonical vectors, golden PASS; no page errors or external requests |
| Physical verification guard mutants | 21/21 KILLED, 0 unexpected changed cases; positive controls and restoration pass |
| Mutation classifier controls | No-op NOT_COVERED; syntax failure CRASHED; neither counted as KILLED |
| Historical preservation | All 2,156 tracked base files unchanged, including historical locks and source pins |
| External runtime source verification | Three pinned original repositories and selected executable files match |

The browser fixture count includes 37 action cases plus host-unavailable, browser/host disagreement, mobile layout and cross-origin refusal. Canonical byte cases are a separate denominator. Actual recorded Node is 22.15.0, Bun 1.3.14, Python 3.12.10; Python `-O` exercises the canonical-kit path and controller, while Node `--no-opt` exercises host/profile tests. The unchanged native RVR bridge uses isolated Python arguments; this is not a claim to have rerun every upstream Python component under `-O`.

The identical action semantic output SHA-256 across normal/repeat/optimized is `e6628648adc16e287c21a81ce0f84b483f92c2f108bb3af45ac5558969701439`. Canonical results SHA-256 is `c7f26b46b6749cc0bac21abb1f7418248f95235f3214460076d5ca45321aef5d`. Timing and absolute-path process data are preserved separately as raw evidence and are not required to be byte-identical.

## Exact action observations

Independent expected status/reason pairs are authored in the fixture builder before execution. The actual input is in [actions.json](fixtures/actions.json); exact input hashes, expectations, complete native results and product projections are in [machine-readable observations](evidence/actions/normal/results.json).

| Case | Product verdict | Exact reason | Receipt identity | Native host | Local log |
|---|---|---|---|---|---|
| A | VERIFIED | LOCAL_ACTION_REPLAY_AND_SELECTED_EVIDENCE_VERIFIED | VERIFIED | VERIFIED | VERIFIED |
| B | REFUTED | AGENT_ACTION_SUBJECT_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| C | UNVERIFIABLE | REQUESTED_ACTION_GUARANTEE_NOT_COVERED | VERIFIED | VERIFIED | VERIFIED |
| D | UNVERIFIABLE | LOG_PROOF_MISSING | VERIFIED | VERIFIED | UNVERIFIABLE |
| E | REFUTED | RECEIPT_IDENTITY_NOT_VERIFIED | REFUTED | VERIFIED | VERIFIED |
| F | REFUTED | MERKLE_INCLUSION_INVALID | VERIFIED | VERIFIED | REFUTED |
| G | UNVERIFIABLE | LOG_TRUST_ROOT_MISSING | VERIFIED | VERIFIED | UNVERIFIABLE |
| H | UNVERIFIABLE | RECEIPT_PROFILE_UNSUPPORTED | NOT_CHECKED | NOT_CHECKED | NOT_CHECKED |
| wrong-selected-receipt | REFUTED | CALLER_RECEIPT_ROOT_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| wrong-host-carrier | REFUTED | HOST_RECEIPT_CARRIER_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| wrong-claim | REFUTED | CALLER_CLAIM_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| wrong-caller-action-id | REFUTED | CALLER_CLAIM_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| wrong-input | REFUTED | ACTION_INPUT_COMMITMENT_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| native-authority-unavailable | UNVERIFIABLE | NATIVE_HOST_INSUFFICIENT_EVIDENCE | VERIFIED | INSUFFICIENT_EVIDENCE | VERIFIED |
| wrong-leaf | REFUTED | RECEIPT_LOG_LEAF_MISMATCH | VERIFIED | VERIFIED | REFUTED |
| wrong-path | REFUTED | MERKLE_INCLUSION_INVALID | VERIFIED | VERIFIED | REFUTED |
| wrong-index | REFUTED | MERKLE_INCLUSION_INVALID | VERIFIED | VERIFIED | REFUTED |
| wrong-size | REFUTED | CHECKPOINT_TREE_SIZE_MISMATCH | VERIFIED | VERIFIED | REFUTED |
| wrong-log | REFUTED | LOG_IDENTITY_MISMATCH | VERIFIED | VERIFIED | REFUTED |
| invalid-signature | REFUTED | CHECKPOINT_SIGNATURE_INVALID | VERIFIED | VERIFIED | REFUTED |
| missing-checkpoint | UNVERIFIABLE | CHECKPOINT_MISSING | VERIFIED | VERIFIED | UNVERIFIABLE |
| wrong-checkpoint-id | REFUTED | CHECKPOINT_IDENTITY_MISMATCH | VERIFIED | VERIFIED | REFUTED |
| conflicting-checkpoint | REFUTED | SELECTED_CHECKPOINT_MISMATCH | VERIFIED | VERIFIED | REFUTED |
| unsupported-log | UNVERIFIABLE | LOG_PROFILE_UNSUPPORTED | VERIFIED | VERIFIED | UNVERIFIABLE |
| log-not-required | VERIFIED | LOCAL_ACTION_REPLAY_AND_SELECTED_EVIDENCE_VERIFIED | VERIFIED | VERIFIED | UNVERIFIABLE |
| consistency-positive | VERIFIED | LOCAL_ACTION_REPLAY_AND_SELECTED_EVIDENCE_VERIFIED | VERIFIED | VERIFIED | VERIFIED |
| missing-consistency | UNVERIFIABLE | CONSISTENCY_EVIDENCE_MISSING | VERIFIED | VERIFIED | UNVERIFIABLE |
| conflicting-history | REFUTED | CONSISTENCY_CHECKPOINT_CONFLICT | VERIFIED | VERIFIED | REFUTED |
| wrong-native-record | REFUTED | SAVED_NATIVE_RESULT_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| wrong-input-commitment | REFUTED | ACTION_INPUT_COMMITMENT_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| wrong-local-output | REFUTED | LOCAL_ACTION_RESULT_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| wrong-action-id | REFUTED | CLAIM_ACTION_ID_MISMATCH | VERIFIED | VERIFIED | VERIFIED |
| valid-other-leaf | REFUTED | RECEIPT_LOG_LEAF_MISMATCH | VERIFIED | VERIFIED | REFUTED |
| signed-wrong-size | REFUTED | CHECKPOINT_TREE_SIZE_MISMATCH | VERIFIED | VERIFIED | REFUTED |
| selected-forged-id | REFUTED | CHECKPOINT_IDENTITY_MISMATCH | VERIFIED | VERIFIED | REFUTED |
| ambiguous-key | UNVERIFIABLE | AMBIGUOUS_LOG_TRUST_ROOT | VERIFIED | VERIFIED | UNVERIFIABLE |
| changed-old-record | REFUTED | CONSISTENCY_OLD_ENTRY_CHANGED | VERIFIED | VERIFIED | REFUTED |

## Mutation controls

Every mutant physically changes one guarded condition in the isolated research module, starts a new Node process, executes all fixtures, checks the three independently positive controls, and restores original bytes in `finally`. A killer requires a known negative witness to become VERIFIED with a determinate executed assertion failure. Mutant hashes, exact commands, changed cases, allowed change domains, unexpected changes and restoration are in [the full report](evidence/mutations/normal/report.json). Exclusivity is not assumed.

| Guard removed | Required distinguishing witness | Classification | Changed cases |
|---|---|---|---|
| receipt-profile | H | KILLED | H |
| caller-receipt-root | wrong-selected-receipt | KILLED | wrong-selected-receipt |
| host-receipt-carrier | wrong-host-carrier | KILLED | wrong-host-carrier |
| agent-action-subject | B | KILLED | B |
| caller-claim | wrong-caller-action-id | KILLED | wrong-claim, wrong-caller-action-id |
| action-id-binding | wrong-action-id | KILLED | wrong-action-id |
| protected-scope | C | KILLED | C |
| action-input-binding | wrong-input-commitment | KILLED | wrong-input, wrong-input-commitment |
| native-host-result | native-authority-unavailable | KILLED | native-authority-unavailable |
| native-result-preservation | wrong-native-record | KILLED | wrong-native-record |
| local-result-binding | wrong-local-output | KILLED | wrong-local-output |
| required-log-result | D | KILLED | D, F, G, wrong-leaf, wrong-path, wrong-index, wrong-size, wrong-log, invalid-signature, missing-checkpoint, wrong-checkpoint-id, conflicting-checkpoint, unsupported-log, missing-consistency, conflicting-history, valid-other-leaf, signed-wrong-size, selected-forged-id, ambiguous-key, changed-old-record |
| receipt-leaf-binding | valid-other-leaf | KILLED | wrong-leaf, valid-other-leaf |
| checkpoint-tree-size | signed-wrong-size | KILLED | wrong-size, signed-wrong-size |
| native-merkle-proof | wrong-path | KILLED | F, wrong-path, wrong-index |
| checkpoint-identity | selected-forged-id | KILLED | wrong-checkpoint-id, selected-forged-id |
| selected-checkpoint | conflicting-checkpoint | KILLED | conflicting-checkpoint |
| selected-log | wrong-log | KILLED | wrong-log |
| checkpoint-signature | invalid-signature | KILLED | invalid-signature |
| trusted-checkpoint | G | KILLED | G, invalid-signature |
| manifest-extension | changed-old-record | KILLED | changed-old-record |

Three positive controls (`A`, `log-not-required`, `consistency-positive`) remain correct for every mutant. The mutation inventory is finite, not complete: malformed-input paths, every optional consistency branch, upstream host internals and cryptographic libraries are not exhaustively mutated.

## Development failures retained

The initial action run passed 25/27. One fixture accidentally preserved an object alias and therefore changed both receipt carriers; the generator now creates independent JSON material. Another expected a generic unavailable-native reason where the real host correctly returned `INSUFFICIENT_EVIDENCE`; the expected native reason was corrected to that documented host category while the product remains UNVERIFIABLE.

The initial mutation campaign classified the input-binding deletion NOT_COVERED because the selected altered input also failed the later output check. A new intact receipt with a false input commitment isolates the missing guard; it kills the deletion without weakening the oracle. The initial report remains in [evidence](evidence/mutations/initial/report.json).

The first Chromium run passed semantic checks but failed mobile overflow because a long technical reason string was displayed inline. The exact reason remains in technical details, while the main view now uses readable scoped explanations. The initial browser results are [preserved](evidence/browser/initial/results.json).

## Fresh checkout and packaging

Fresh-checkout execution is pending at this candidate-writing stage; no fresh closure is claimed yet.

Recorded commands and exit codes: [normal](evidence/runs/normal/commands.json), [repeat](evidence/runs/repeat/commands.json), [optimized](evidence/runs/optimized/commands.json). Raw stdout/stderr and native process observations live on D: under the support workspace; a separate evidence archive and SHA-256 manifest are produced at local closure. Source and selected committed evidence are bound by `source-lock.json` and `SHA256SUMS` in this directory.

The original whole-tree checker passed at baseline. Running it against a tree containing additive research necessarily reports source-closure mismatch; its frozen manifest was deliberately not changed. Final checks instead verify every original tracked byte and the separately versioned research closure. This is an explicit integration limitation, not a waived successful check.

Final recommendation: **ITERATE**. The experiment is suitable for independent review of its bounded claim. A future Draft PR requires owner approval and explicit decisions on the lens dependency's distribution rights and the host inventory/CI integration. No independent organizational review, external execution or authenticated public-log guarantee is claimed.
