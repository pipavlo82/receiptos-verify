# Repair regression recorded before correction

Tested commit: `1fecfc2587c5d89d350017a2a7a98ca78e933b9f`.

The disposable fresh checkout passed 703/703 normal, no-opt and repeat tests, but the separate canonical corpus gate passed only 66/68. I03 changed from CONTRADICTED to REJECTED_MALFORMED; I08 changed from UNSUPPORTED_PROFILE to REJECTED_MALFORMED. The added request-context schema constrained the caller-selected action and authority too narrowly, preventing the existing adapter from evaluating its declared semantic relation. This is a MEDIUM regression in the repair; it is not evidence that frozen 4888 had these two failures.

Exact command receipts, full outputs, source inventory and unchanged literal vector expectations: `repair/fresh/`. Fix the schema boundary and add explicit regressions without changing any vector or native semantics. Rerun the entire canonical gate on the next exact committed checkout.
