# Semantic repair verification

Scope: authorized minimal repairs to the local target after frozen findings were recorded. Frozen candidate-a and the before audit remain unchanged. No commit, source-lock edit, upstream edit, feature, or publication was performed by this agent.

Changed product files:

- `src/projection/project.mjs`: malformed internal projection inputs now receive a typed rejection; the six mandatory obligations remain implicit even when a caller supplies a shorter list; green requires admitted input, verified canonicalization and native semantic VERIFIED. The existing definite contradiction reason now projects CONTRADICTED. Native REFUTED retains its existing NATIVE_NEGATIVE_RESULT reason.
- `tests/projection-release.test.mjs`: 17 independent regressions, including paired real-native positive/definite-FAIL, CANNOT_CHECK uncertainty, native negative preservation and internal projection admission controls.
- `tests/helpers/independent-fixture.mjs`: independently authored synthetic artifact, Git, native receipt and signing construction using built-in crypto, with no product builders/signing/canonical helpers. No private key is saved.

Commands and results, run from the target root:

| Command | Exit | Result |
|---|---:|---|
| `node --test tests/projection-release.test.mjs tests/product.test.mjs tests/review.test.mjs` | 0 | 74/74 passed; 0 failures, cancelled, skipped or todo |
| `node reports/release-audit-v0.1/semantics-after/independent.mjs .` | 0 | 269/269 hostile probes passed; 0 mismatches |
| `node reports/release-audit-v0.1/semantics-after/replay-s1.mjs` | 0 | Exact original before fixture now CONTRADICTED; native result and canonical result preserved |

The exact before fixture SHA256 is `9ef6aeb691d16f2116398b224f75be670a3a44fde6cd938e420692a493ead104`. The original request, signed statement, signature and evidence were supplied unchanged to the patched verifier. Before overall VERIFIED becomes after overall CONTRADICTED; authenticity and subject remain VERIFIED; replay remains REPRODUCED; native semantic result remains VERIFIED; ASSERTED_NATIVE_RESULT_CONTRADICTION is retained. This is saved in `signed-FAIL-native-VERIFIED.after.json`.

An intermediate affected test run was 73/74 because placing the new definite assertion branch ahead of the native REFUTED branch omitted V18's NATIVE_NEGATIVE_RESULT reason. Branch ordering was corrected and the full affected 74 tests rerun successfully. No expectation or vector was weakened.

The after independent harness is a separate copy of the frozen before harness. Its expectations are unchanged, including the deliberate non-defect treatment of CANNOT_CHECK and structural report-schema validation. Only its recorded command metadata names the after path. Raw final affected TAP, independent stdout and full per-probe results are stored in this directory.

The coordinator must still run the combined final release gates after other agents' repairs and update the source lock. This agent's counts cover the affected semantic work only.
