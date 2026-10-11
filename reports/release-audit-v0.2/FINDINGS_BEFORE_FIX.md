# Frozen v0.2 audit findings — BEFORE REPAIR

Frozen candidate: `4888a0584369a91075eb2bdbd9a2ff6b99c46588`.
Tree: `d5a6fb8e47db373e59b6ce5ed021f3e1240a09fc`.
Initial worktree and fresh checkout clean; exact tracked inventories and diff against v0.1.0 are in `freeze/`.

The fresh canonical suite passes 624/624 normal and no-opt, all68 vectors and both14-mutant inventories. These observations do not override the independently demonstrated defects below. This checkpoint records discovery before changing any implementation, schema or test source. Frozen-candidate verdict: **NEEDS_TECHNICAL_FIXES**.

| ID | Severity | Exact defect | Before evidence |
| --- | --- | --- | --- |
| MUT-01 | HIGH | The legacy v1 mutation runner labels an inner-native crash and an exit-zero native JSON null as KILLED, returns process exit0, and reports successful mutation coverage. Positive V01 remains VERIFIED; negative V07 changes only to unavailable computation, not a semantic witness. | mutation-inner-failure/native-crash-before.json; native-null-before.json; controller.py |
| REQ-01 | HIGH | Unsupported/mistyped Interpoll and PRF caller requirements are silently dropped; orphan adapter/guarantee contexts are not evaluated. Seven exact requests become globally VERIFIED despite requesting unestablished fresh admission, server authentication, chain evidence or policy. | domains/FINDINGS.md; domains/requirement-admission/*.json |
| CONT-01 | MEDIUM | Non-Boolean whole-envelope requirement and unknown continuity options are ignored. Six malformed requests yield VERIFIED / continuity PRESERVED / whole-envelope NOT_ESTABLISHED. | core/FINDINGS.md; core/results/extension-summary.json and exact per-input reports |
| DOC-01 | LOW | docs/files-not-reused.md retains unqualified old no-copy/no-execution claims for native files now included/executed in v0.2. | corpus source/path audit and frozen document |
| DOC-02 | INFO | PR57 merged after the pinned-main observation: current recompute-kit main is3c3923956200d01ab74c2dcbb49b268739943bda, merge22:35:33Z. Candidate correctly uses historical-main1a37bcaf...; release wording must distinguish that observation from current state. No runtime repin is required. | domains/public-source-identities.json; current-main-replay.json; corpus/public-source-observations.json |

MUT-01 is a coverage-integrity failure, not a demonstrated positive core verdict bypass. The original declared v1 crash-refutation mutant is a different legitimate semantic test: the same deliberately induced crash is present in baseline and mutant, and the mutation incorrectly labels unavailable computation CONTRADICTED. A repair must retain that witness while refusing newly introduced checker failures.

REQ-01 and CONT-01 must be repaired by rejecting unknown, mistyped or nonapplicable consumer requirements, without implementing fresh server admission, chain authentication or new continuity features. Preserve supported positive contexts and all original v1 vector semantics. Direct adapter APIs and composed request admission both need the same fail-closed boundary.

Independent passing checks remain separately scoped:57 generic/adversarial inputs,3238 finite projection substitutions,51 supported domain probes,140 literal corpus-oracle checks. The extension failures are additional cases and are not hidden inside those passing totals. All68 vectors remain;63 are assessed load-bearing and5 redundant semantic aliases, not68 independent branches. See the independent matrix and detailed reports.

No upstream source or frozen candidate artifact was edited. No push, tag, release, PR or merge was performed. Implementation repairs follow in a separate commit; this discovery checkpoint must not be rewritten to pretend repaired outcomes occurred on the frozen SHA.
