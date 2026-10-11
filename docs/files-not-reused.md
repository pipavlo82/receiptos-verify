# Files and data not reused

This is the file-level companion to [the full reuse map](../FULL_WORK_REUSE_MAP.md) and [the source catalog](../provenance/sources.json). All 43 frozen public audit repositories are accounted for, including every owned repository. Paths below are representative exact files or directory groups at the stated audit or explicitly listed capability/PR pin; this is not a claim of exhaustive line-by-line inspection. Selected runtime files and their exact hashes are enumerated in the native manifests. Legal notices and public provenance metadata may be retained separately even when runtime/data files are excluded.

Existing sources were read only. Public neutral Semantic ABI work is allowed; private/commercial Vértice code and captures were not read or imported. No captured user/provider data, credentials or real trust keys become synthetic demo evidence. Optional, historical, fixture and methodology roles remain visible even when no source code is copied.

Audit snapshot and Fresh default labels below refer to the original source audit observation, not continuously current branch heads. V0.2 selected native additions are explicitly stated in the affected entries; all other exclusions and third-party rights remain in force.

## All 20 owned public repositories

### pipavlo82/-crystal-artifact

Audit snapshot: `fc0cd2cbe96ec448ac244ae21daabdab68c17022`. Fresh default: `fc0cd2cbe96ec448ac244ae21daabdab68c17022`.

Retained role: **optional_interface**. Paper/QR transport and viewer ideas remain useful. The current product keeps native evidence behind adapters and does not copy the vendored QR implementation or historical rendered artifacts.

Representative source references: `src/crystal-artifact.ts`, `src/canon.ts`, `src/types.ts`, `ui/ui.js`, `tests/golden-vectors.test.ts`.

Not copied as runtime/data: `src/crystal-artifact.ts`, `src/canon.ts`, `ui/ui.js`, `tests/golden-vectors.test.ts`. No renderer, QR vendor excerpt or old golden artifacts are copied. Paper/QR carriage remains an optional interface; the default has no root grant and new product capsule/UI code has a different schema.

### pipavlo82/Chronicle

Audit snapshot: `c467b48fd18fc8ec86f10582befa35946ce41914`. Fresh default: `c467b48fd18fc8ec86f10582befa35946ce41914`.

Retained role: **adapter**. Native admission, collection/portfolio roots and historical/current query boundaries inform the continuity adapter. User histories and the Chronicle brand are not imported.

Representative source references: `src/chronicle_receiptos_admission.mjs`, `src/chronicle_receiptos_root.mjs`, `src/chronicle_entry_identity.mjs`, `specs/chronicle_entry_v0.md`, `scripts/run_chronicle_node.mjs`.

Not copied as runtime/data: `src/chronicle_receiptos_admission.mjs`, `src/chronicle_collection.mjs`, `src/chronicle_portfolio.mjs`, `data/`, `examples/`. Source code and user histories are not copied. Admission/root concepts are independently reimplemented with product envelope/sequence/currentness extensions. Chronicle branding and underlying history/proof-object rights are not imported.

### pipavlo82/conduct-witness

Audit snapshot: `2b9ac1cc56d7c36ed1a29f9d4ac674b31eac6151`. Fresh default: `2b9ac1cc56d7c36ed1a29f9d4ac674b31eac6151`.

Retained role: **methodology**. Pinned reproduction, operator separation and workflow attestation remain assurance methodology. Upstream template/verifier code is not treated as independently authored Pavlo code.

Representative source references: `reproduce.sh`, `.github/workflows/reproduce.yml`, `requirements.lock`, `requirements-approval.lock`, `README.md`.

Not copied as runtime/data: `reproduce.sh`, `.github/workflows/reproduce.yml`, `requirements.lock`, `requirements-approval.lock`. No workflow/template/verifier implementation or historical reproduction artifact is imported. Pinned-operation methodology is retained; upstream template authorship and a missing default root grant prevent treating the whole repository as newly owned code.

### pipavlo82/cross-reference-console

Audit snapshot: `72b8804c4e85e6ec1530a3470a9af7a5fe47f238`. Fresh default: `72b8804c4e85e6ec1530a3470a9af7a5fe47f238`.

Retained role: **optional_interface**. Claim identity and signed Cell/lineage boundaries remain a declared optional observation interface. Registry signatures do not supply semantic independence.

Representative source references: `CLAIM.md`, `CELL-v1.md`, `reference/claim_id.py`, `reference/test_gate.py`, `ui/index.html`.

Not copied as runtime/data: `reference/claim_id.py`, `reference/test_gate.py`, `ui/index.html`, `nodes.json`. No console runtime, real node identities or proof captures are imported. Claim/Cell/lineage remains optional. Upstream-reported Pavlo requirements are not relabeled as sole original code authorship.

### pipavlo82/crystal-receipt

Audit snapshot: `45b46bf7df3a60b32583291f577a36bf19d22f00`. Fresh default: `45b46bf7df3a60b32583291f577a36bf19d22f00`.

Retained role: **runtime**. Selected ReceiptOS core canonicalization, integrity, portable evidence and continuity are native adapter candidates. The desktop subtree and captured external evidence are outside the selected source scope.

Representative source references: `src/receiptos/canon/canonicalize.ts`, `src/receiptos/canon/receipt-root.ts`, `src/receiptos/verify/verify-receipt.ts`, `src/receiptos/schema/evidence.ts`, `scripts/receiptos-verify.ts`.

Not copied as runtime/data: `desktop-v1/`, `viewer-desktop/`, `candidate-audit/`, `src/receiptos/anchor/sepolia-payload.ts`, `src/receiptos/anchor/sepolia-result.ts`, `conformance/counterfactual-conformance-v0/`. The selected root subset and the separately manifested native Moth capsule subset are copied unmodified. Desktop rights/provenance are unresolved; captures, unrelated conformance packages and chain anchor import helpers are outside this product runtime. The new general product capsule/tree is original code, separate from native exports.

### pipavlo82/decentralised

Audit snapshot: `8f614bac346e9d618bbf69ea33cb175aa05e798d`. Fresh default: `8f614bac346e9d618bbf69ea33cb175aa05e798d`.

Retained role: **historical**. This old owned fork is accounted for as historical lineage. Its audited default lacks the current signed engagement/outbox implementation and has no root grant. Current public action semantics are sourced separately from Interpoll1.

Representative source references: `README.md`.

Not copied as runtime/data: `app.zip`, `message-cache.json`, `peer-data/`, `radata/`, `src/`, `tools/`. No code, archived app or runtime/peer/storage data from this historical fork is copied. Its audited default does not contain the current signed-action implementation and has no root grant. Current engagement semantics are referenced from the separately pinned Interpoll1 source.

### pipavlo82/ERCs

Audit snapshot: `98469bc93b6add1e3bc9501dafaa73311071145b`. Fresh default: `98469bc93b6add1e3bc9501dafaa73311071145b`.

Retained role: **optional_interface**. The fork is a reference corpus with upstream ERC authorship. It is not Pavlo-owned implementation credit or evidence that a draft ERC is accepted.

Representative source references: `ERCS/`, `LICENSE.md`, `README.md`.

Not copied as runtime/data: `ERCS/`, `assets/`, `_includes/`, `_layouts/`. No full standards/site/assets corpus is imported. The fork remains a reference corpus with upstream authorship and per-document status; fork ownership is neither code authorship nor standard acceptance.

### pipavlo82/gas-per-secure-bit

Audit snapshot: `e95d3bac5129b47a949c14b94b6a07d21220ed17`. Fresh default: `e95d3bac5129b47a949c14b94b6a07d21220ed17`.

Retained role: **methodology**. Surface/lane/provenance-aware measurement is reusable methodology. This product does not present old gas results as its own runtime measurements or import vendor records.

Representative source references: `spec/explicit_lanes.md`, `spec/dataset_schema.md`, `spec/security_metrics.md`, `spec/pqsig_userop_schema_v0.1.md`, `scripts/parse_bench.py`.

Not copied as runtime/data: `data/results.jsonl`, `.gitmodules`, `contracts/`, `bench/`, `test_vectors/`. No benchmark operands, measurements, vendor code or cryptographic verification implementation is copied. Original `src/analytics/cost.mjs` counts supplied evidence bytes/members/completed processes only and exposes `establishes_security_guarantee:false`. The product makes no gas/security performance claim and the default root LICENSE is empty.

### pipavlo82/ml-dsa-65-ethereum-verification

Audit snapshot: `6cf885533b65eec232934700daaf9b977ef305f9`. Fresh default: `6cf885533b65eec232934700daaf9b977ef305f9`.

Additional inspected capability/PR pins: `mldsa-pr27-research@6d58ce9e64b4c499fc52395e01e2bfbcd967d441` (OPEN_PR_27).

Retained role: **optional_interface**. The parser stub and experimental PR27 remain research/interface references. Structural parsing is not ML-DSA cryptographic verification; the closed unmerged license PR does not change main.

Representative source references: `solidity/MLDSA65Verifier.sol`, `solidity/IPQVerifier.sol`, `contracts/verifier/MLDSA65_Verifier_v2.sol`, `contracts/verifier/MLDSA65_ERC7913Verifier.sol`, `contracts/verifier/MLDSA65_ERC7913BoundCommitA.sol`.

Not copied as runtime/data: `solidity/MLDSA65Verifier.sol`, `contracts/verifier/MLDSA65_Verifier_v2.sol`, `contracts/verifier/MLDSA65_ERC7913BoundCommitA.sol`, `test/MLDSA_ERC7913_PackedA.t.sol`, `.gitmodules`. No Solidity verifier, vectors or vendor backend is copied. Main parser stubs and open experimental PR27 are reference interfaces, not complete cryptographic acceptance. The license cleanup PR is closed-unmerged; main root LICENSE remains empty.

### pipavlo82/pipavlo82.github.io

Audit snapshot: `9a0139ebfa1df4fa6bb9133c0eb6be6d64e67037`. Fresh default: `9a0139ebfa1df4fa6bb9133c0eb6be6d64e67037`.

Retained role: **fixture**. The published witness-key format is accounted for as fixture/identity interface history. Real published keys are not trusted by the synthetic product demo.

Representative source references: `keys/witness.json`.

Not copied as runtime/data: `keys/witness.json`. The published real witness key is not copied into demo trust. Its format is retained as identity/interface history; synthetic product keys are independently generated and the source default has no root grant.

### pipavlo82/pq-receipt-profile

Audit snapshot: `54cf1a3784a56f4624b41357148bbe9ba301c470`. Fresh default: `54cf1a3784a56f4624b41357148bbe9ba301c470`.

Retained role: **optional_interface**. The original product provider/vector interface applies attribution/crypto-agility separation. Real backend absence stays UNSUPPORTED; callback declarations and structural vectors do not establish ML-DSA conformance.

Representative source references: `README.md`, `PRINCIPLES.md`.

Not copied as runtime/data: `README.md`, `PRINCIPLES.md`. No upstream document text or backend is copied into runtime. Crypto agility and long-lived attribution remain an optional policy reference. PQ operations require a declared real backend; structural/mock acceptance remains unestablished.

### pipavlo82/pqevm-vector-packs

Audit snapshot: `05988be4f37394b21257d2b5e6c639b4746b698a`. Fresh default: `05988be4f37394b21257d2b5e6c639b4746b698a`.

Retained role: **methodology**. Hash/count container and source-provenance rules inform fresh synthetic vector admission. Imported operands and missing historical source_commit are not repaired or copied.

Representative source references: `tools/validate_pack.py`, `tools/pack_hash.py`, `schema/manifest.schema.json`, `schema/vector.schema.json`, `packs/mldsa65_fips204/`.

Not copied as runtime/data: `packs/mldsa65_fips204/`, `tools/validate_pack.py`, `tools/pack_hash.py`, `schema/manifest.schema.json`. No imported vector operands, decorative expected outcomes or old validators are copied. Hash/count/source provenance informs new synthetic admission methodology. Missing historical source_commit and absent default grant are not repaired by the product.

### pipavlo82/protected-relation-fixtures

Audit snapshot: `fac26d2e8346aeab08194343b78c345d235c6935`. Fresh default: `fac26d2e8346aeab08194343b78c345d235c6935`.

Additional inspected capability/PR pins: `prf-guarantee@f525737069dc4cef7741f805d08a988912f4454f` (OPEN_PR_14).

Retained role: **adapter**. Neutral guarantee preservation and oracle-blind relation methodology remain explicit dependencies. Open PR14 is experimental; synthetic scoring is not independent truth.

Representative source references: `tools/relation_discrimination.py`, `adapters/v0/run_adapter.py`, `adapters/v0/score_results.py`, `spec/external-adapter-contract-v0.md`, `tools/award_actual_settlement.py`.

Not copied into product runtime/data: `fixtures/`, `corpus/`, `evidence/`, `adapters/v0/score_results.py`, `tools/guarantee_preservation.py`. V0.2 copies and executes only the merged-main `tools/award_actual_settlement.py` with its MIT license at `fac26d2e8346aeab08194343b78c345d235c6935`. PR14 consumer/scoring/captures are not copied or executed; the downstream relation is an original bounded reimplementation. PR14 remains OPEN and EXPERIMENTAL, with accepted basis/completeness caller premises.

### pipavlo82/quantum-execution-evidence

Audit snapshot: `5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05`. Fresh default: `5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05`.

Retained role: **runtime**. Provider-neutral, counts-native and request-versus-observation boundaries support a stochastic-domain adapter. Only fresh synthetic evidence is selected, not live provider captures.

Representative source references: `qev/checker.py`, `qev/__main__.py`, `docs/CONTRACT.md`, `fixtures/corpus/`, `qev/moth_rvr.py`.

Not copied as runtime/data: `fixtures/corpus/`, `qev/live_native.py`, `qev/live_relation.py`, `qev/live_portable.py`, `profiles/live-capture-replay-v1/`. Only the explicit native generic-QEV and 50-file Moth subsets are copied; all inputs are fresh synthetic. No live provider payloads, IBM/cross-provider captures or upstream fixture corpus is imported. Selected frozen claim/roles/profile/conformance metadata retains historical LIVE/qpu assertions without authenticating them. Complete upstream source-lock/admission/mutation plane is not claimed.

### pipavlo82/r4-saas-api

Audit snapshot: `7815fd84dd7eb9347b8399719cfeff941ff8df2a`. Fresh default: `7815fd84dd7eb9347b8399719cfeff941ff8df2a`.

Retained role: **optional_interface**. The application-specific ECDSA recovery endpoint remains an optional signature interface. Signature recovery is key control, not authoritative subject membership or execution.

Representative source references: `app/verify_route.py`, `app/main.py`, `requirements.txt`.

Not copied as runtime/data: `app/verify_route.py`, `app/main.py`, `core-dev/`, `docker-compose.yml`. No API/deployment/ECDSA implementation is copied. This source is an optional key-control/signature interface reference. New product cursor/modulo stochastic selection is an original extension, not an upstream R4 sampling specification. The default has no root grant; its license PR is closed-unmerged.

### pipavlo82/receiptos-mvp

Audit snapshot: `0e70ebe85f4dd1b8b2a24be9c29f1b9757e25a71`. Fresh default: `0e70ebe85f4dd1b8b2a24be9c29f1b9757e25a71`.

Retained role: **historical**. The HMAC receipt/chain/replay seed is retained as historical methodology. Its symmetric trust and local chain do not establish independent public verification.

Representative source references: `src/receiptos.py`, `src/cli.py`, `src/api.py`, `schemas/decision_receipt.schema.json`, `SECURITY_TRUST_BOUNDARIES.md`.

Not copied as runtime/data: `src/receiptos.py`, `src/cli.py`, `src/api.py`, `schemas/decision_receipt.schema.json`, `examples/`. No historical shared-secret HMAC implementation or example receipt is copied. It is retained as historical chain/replay lineage. HMAC is not a public signature authority model, and the default has no root grant.

### pipavlo82/receiptos-pq-lab

Audit snapshot: `a705d9c1942c0f30725c9bddec6606a0cddf4fc6`. Fresh default: `a705d9c1942c0f30725c9bddec6606a0cddf4fc6`.

Retained role: **optional_interface**. Extension/backend contracts, HMAC game lineage and adapter refusal reasons remain optional interfaces. Historical Stealth/ATP captures and vendor material are not imported.

Representative source references: `src/interfaces.py`, `src/extension_verifier.py`, `src/mldsa_adapter.py`, `src/reason_mapping.py`, `schemas/receipt_extension.schema.json`.

Not copied as runtime/data: `src/mldsa_adapter.py`, `src/extension_verifier.py`, `src/stealth_handoff_adapter.py`, `artifacts/`, `fixtures/`, `data/`. No optional crypto backend, historical Stealth outputs or captures are copied. Extension/provider/reason boundaries remain optional interfaces. Structural checks and absent backends do not become ML-DSA verification; the default grant remains absent.

### pipavlo82/recomputable-verification-receipts

Audit snapshot: `9dd36e882dd372f264b77b179130948aa5adcbde`. Fresh default: `9dd36e882dd372f264b77b179130948aa5adcbde`.

Retained role: **runtime**. Native RVR outcomes and recomputation statuses remain separate behind the adapter. Selected upstream profile implementations retain their own terms and vocabularies.

Representative source references: `docs/spec/RECOMPUTABLE_VERIFICATION_RECEIPTS_V0.md`, `conformance/rvr-v0/adapter.py`, `conformance/rvr-v0/adapter.ts`, `conformance/rvr-v0/rvr.schema.json`, `conformance/rvr-v0/verification-profile.json`.

Not copied as runtime/data: `conformance/rvr-v0/adapter.ts`, `profiles/invinoveritas-signed-verdict-v0/`, `profiles/invinoveritas-signed-verdict-v1/`, `profiles/erc8281-committed-receipt-snapshot-v0/`, `profiles/judge-protocol-rvr-v0/`, `review/rc2-independent-rust/`. The explicitly manifested generic Python subset is copied at 9dd36e8..., with an older independently pinned RVR subset inside QEV Moth at 549a7e1.... Other language implementations, domain capture corpora and independent-review packages are not copied. Native negative outcomes remain separate from successful replay.

### pipavlo82/relational-security-invariants

Audit snapshot: `e8fb81904af2ffe19e974383cf78d9d18d259b98`. Fresh default: `3d3038f90c3dd98e79f948398167c5cc3ef2fdd8`.

Retained role: **methodology**. Independent expected relations, protected maintenance and load-bearing source controls inform assurance. The new scoped Apache grant does not relicense evidence copies or prove evaluator independence.

Representative source references: `spec/RSI-core-v0.md`, `spec/expectation-contract-v0.md`, `spec/relation-profile-contract-v0.md`, `spec/serialization.md`, `runner/expectation_contract.py`.

Not copied as runtime/data: `runner/expectation_contract.py`, `runner/relation_runtime.py`, `corpora/`, `evidence/`, `oracle/`, `tools/prove_can_fail.py`. No evaluator, oracle, captured corpus or upstream runner is copied. Mapped mutation/control and assurance methodology is retained. A scoped owner Apache grant is now merged at the fresh default; this does not establish author/organizational independence or relicense third-party evidence.

### pipavlo82/semantic-execution-guard

Audit snapshot: `777a19f5e92afb60b123c545f0e9a3d77fe7e139`. Fresh default: `18f595b537017e5ff7b9074366c3065e877488f9`.

Retained role: **optional_interface**. Exact conversion/feed-consumption relations remain reusable domain specifications. The merged Apache grant is scoped to Pavlo additions; Federico/babyblueviper1 guard code retains separate attribution/terms.

Representative source references: `relations/robinhood-stock-token-v0/recompute.mjs`, `relations/robinhood-adjusted-feed-consumption-v0/recompute.mjs`, `relations/robinhood-stock-token-v0/relation.schema.json`, `contracts/SemanticExecutionGuard.sol`, `contracts/ProtectedPriceConsumer.sol`.

Not copied as runtime/data: `contracts/SemanticExecutionGuard.sol`, `contracts/ProtectedPriceConsumer.sol`, `contracts/ProtectedPriceActionTarget.sol`, `relations/robinhood-stock-token-v0/recompute.mjs`, `artifacts/`, `.gitmodules`. No contracts, on-chain deployment, vendor guard or real relation captures are copied. Exact conversion/consumption semantics remain optional references. Fresh default owner licensing is scoped; another author's guard and third-party material remain separate.

## All 23 external and shared repositories

### akashmahlaz/betting-club

Audit snapshot: `f85d3ea4e1a6e9ada21d576380c104a0b32976a1`. Fresh default: `f85d3ea4e1a6e9ada21d576380c104a0b32976a1`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `public/`, `src/`, `README.md`, `package.json`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### babyblueviper1/semantic-execution-guard

Audit snapshot: `093dc4f7832c1e18ede0bf9de6fb590aad6fbea8`. Fresh default: `093dc4f7832c1e18ede0bf9de6fb590aad6fbea8`.

Retained role: **historical**. This dependency source is retained for original guard authorship/provenance. Its absent root grant is not cured by a later grant for another author's additions.

Representative source references: Repository metadata/provenance only.

Not copied as runtime/data: `PROVENANCE.md`. Current default contains provenance metadata only; no guard implementation is copied from it. Historical original guard authorship and MIT scope are separate from Pavlo-owned SEG additions and cannot be inferred from current repository naming.

### casinocutup/Solana-Mines-Game

Audit snapshot: `320556ec84e9f7951e9613fdf808cc413626f000`. Fresh default: `320556ec84e9f7951e9613fdf808cc413626f000`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `programs/`, `tests/`, `README.md`, `package.json`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### CYPHES-ATP/Artifact-Two

Audit snapshot: `7990a327454a803b48e94b337fb000f7b43ff0da`. Fresh default: `7990a327454a803b48e94b337fb000f7b43ff0da`.

Retained role: **optional_interface**. ATP bundle and negative-control contracts remain optional. The atpprotocol core verifier and Pavlo tools/specification are distinct contributions; all-SKIP is not coverage.

Representative source references: `artifact_two/verifier.py`, `artifact_two/canonical.py`, `artifact_two/reason_codes.py`, `tools/verify_atp_bundle.py`, `docs/receipt-bundle-v0.md`.

Not copied as runtime/data: `artifact_two/`, `examples/`, `docs/`. No ATP verifier runtime, fixture/demo corpus or lease/event evidence is copied. Signed bundle and negative-control ideas remain optional/methodology references. Core verifier credit remains atpprotocol; Pavlo output-contract/red-team work and unavailable historical diff reconstructions stay separate.

### CYPHES-ATP/Stealth

Audit snapshot: `fa63212f13fc6300d4decaf4c06128328810f217`. Fresh default: `fa63212f13fc6300d4decaf4c06128328810f217`.

Retained role: **optional_interface**. Portable evidence/root/Merkle source remains an optional profile reference. Root equality does not authenticate real coding execution; the whole desktop is not selected.

Representative source references: `packages/opencode/src/session/handoff/evidence.ts`, `schemas/handoff-evidence.v1.schema.json`, `scripts/receipt-anchor/verify-root.mjs`, `scripts/receipt-anchor/verify-handoff-evidence.mjs`, `scripts/receipt-anchor/build-merkle-batch.mjs`.

Not copied as runtime/data: `packages/`, `README.md`. No coding-agent application, session capture or portable profile implementation is copied. Portable evidence remains an optional interface. Some historical PR reconstructions remain unavailable, so path-specific current evidence is preserved without blanket historical authorship claims.

### eddieoz/bitBingo

Audit snapshot: `28ac36f60414edfcf272433be15b2b0a4e37404f`. Fresh default: `28ac36f60414edfcf272433be15b2b0a4e37404f`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `client/`, `docs/`, `server/`, `README.md`, `package.json`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### ethereum/ERCs

Audit snapshot: `b1f2bd8b1d31ec3bb25077f1a15295ad29e8a8fd`. Fresh default: `0578f46b83fb2e11a6480cac1f5b8b33b563d237`.

Additional inspected capability/PR pins: `shared.erc8404@7a9e63a80bce04db53c6550103c1d41eca35f3d1` (OPEN_PR1980_ONLY).

Retained role: **optional_interface**. Open ERC-8404 PR1980 is a pinned normative proposal, not accepted default behavior. Other ERC authors retain upstream attribution.

Representative source references: `ERCS/erc-8404.md`.

Not copied as runtime/data: `ERCS/`, `assets/`, `_layouts/`. No standards corpus/site is copied. The exact OPEN PR1980 source is a separately pinned proposal reference; a draft/open PR is not accepted standard status or executable verifier implementation.

### Interpoll1/decentralised

Audit snapshot: `23c8c7b5b9803d906ea8ba62772104ebdae488e8`. Fresh default: `23c8c7b5b9803d906ea8ba62772104ebdae488e8`.

Retained role: **adapter**. Signed public engagement, immutable retry and bounded supplied-history replay inform the action adapter. Key control is distinct from human identity, accepted action or truthful observation.

Representative source references: `shared-validation/engagement.js`, `shared-validation/engagement-store.js`, `src/services/publicEngagementService.ts`, `src/services/reactionOutboxService.ts`, `docs/security/PUBLIC_ENGAGEMENT_V1.md`.

V0.1 did not copy the native action implementation. V0.2 copies and executes only `shared-validation/engagement.js` from `559e47f2cd2ffcbd8ad38293da89448d8ec3152d` under its retained Unlicense grant, through the bounded native signed-action adapter. Not copied as runtime/data: `shared-validation/engagement-store.js`, `src/services/publicEngagementService.ts`, `src/services/reactionOutboxService.ts`, `tools/coordination-impact-v2/`. No upstream service/store/UI/SQL deployment or coordination receipt corpus is copied. Supplied retry relation checks are product code around that native signature primitive. Exact signed retries do not establish live admission atomicity, target existence, viewing, human uniqueness or independent coordination judgments.

### jdleo/provably-fair-dice

Audit snapshot: `4297f223cd1289a40c43ab715ee14ec907666773`. Fresh default: `4297f223cd1289a40c43ab715ee14ec907666773`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `_legacy/`, `public/`, `src/`, `README.md`, `package.json`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### justFiveDev/Solana-Casino-Jackpot

Audit snapshot: `a1bb862aa9d4288b99f51df7bc33c17cf9d76d04`. Fresh default: `a1bb862aa9d4288b99f51df7bc33c17cf9d76d04`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `cli/`, `idl/`, `.gitmodules`, `README.md`, `package.json`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### OffchainLabs/community-helm-charts

Audit snapshot: `3d2c62a7a8c494271cf783dfda215303d2c318cb`. Fresh default: `3d2c62a7a8c494271cf783dfda215303d2c318cb`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `charts/`, `scripts/`, `README.md`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### open-quantum-safe/liboqs-java

Audit snapshot: `97353bcc8e53152e999248b8dfc89a1ef05d045b`. Fresh default: `97353bcc8e53152e999248b8dfc89a1ef05d045b`.

Retained role: **optional_interface**. JNI/PQ backend interface research remains optional. The discovered Pavlo issue is an interface question; no Pavlo implementation contribution was established.

Representative source references: `README.md`.

Not copied as runtime/data: `src/`, `examples/`, `README.md`. No JNI/Java/liboqs backend is installed or copied. It remains a potential future real-crypto backend reference; current PQ provider placeholders cannot claim its verification capability.

### PandaExplorer/Provably-Fair-iGaming-Demo

Audit snapshot: `49d6141b7f1f27321e3dfcde857a86a1219e13c5`. Fresh default: `49d6141b7f1f27321e3dfcde857a86a1219e13c5`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `README.md`, `index.html`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### Rohiteswar/Solana-SlotMachine

Audit snapshot: `57a69e8f380826fbef79b5b3de8a94fece3b7181`. Fresh default: `57a69e8f380826fbef79b5b3de8a94fece3b7181`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `README.md`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### shentonyan/sealed-bid-award-erc

Audit snapshot: `543da2e21d0269ac43880af4a71cb73248ed9eea`. Fresh default: `543da2e21d0269ac43880af4a71cb73248ed9eea`.

Retained role: **optional_interface**. The award/settlement specification remains a separately pinned reference. A bounded synthetic relation does not establish a universal incentive or chain-execution guarantee.

Representative source references: `README.md`.

Not copied as runtime/data: `analysis/`, `assets/`, `README.md`. No contracts, specification snapshots or external settlement evidence are copied. Separately pinned award/settlement semantics remain an optional bounded-relation reference; no universal incentive or actual chain execution guarantee is inferred.

### tapiwamakandigona/zimbet

Audit snapshot: `dc93bca4fdcb62b8255becb121f6aaa9c9b60532`. Fresh default: `dc93bca4fdcb62b8255becb121f6aaa9c9b60532`.

Retained role: **no_useful_capability_found**. Bounded issue-only relevance/license/source-tree triage found no implementation, executable finding or receipt adapter useful to this product. The contact is retained in the complete scope inventory, not converted into code contribution credit.

Representative source references: `README.md`.

Not copied as runtime/data: `assets/`, `README.md`, `index.html`. Bounded issue/relevance/license/source-tree triage found no implementation, executable finding or receipt adapter selected for this product. No application code, assets or user/runtime data are copied. Public issue contact is retained as provenance, not code authorship.

### trustless-ai/agent-sdk

Audit snapshot: `7bb831a80d624f22eb09c6d20dd873eb6a376e03`. Fresh default: `7bb831a80d624f22eb09c6d20dd873eb6a376e03`.

Retained role: **fixture**. The prospective basis-points fixture adoption and SDK interfaces remain optional test/agent integration references. No live SDK deployment is claimed.

Representative source references: `testkit/vectors/erc8275-reputation-bps-v0.vectors.json`, `python/tests/reputation/erc8275/test_recompute.py`, `typescript/test/reputation/ERC8275/recompute.test.ts`, `go/reputation/erc8275/recompute_test.go`, `rust/core/src/erc8275/recompute.rs`.

Not copied as runtime/data: `testkit/vectors/erc8275-reputation-bps-v0.vectors.json`, `python/tests/reputation/erc8275/test_recompute.py`, `typescript/test/reputation/ERC8275/recompute.test.ts`, `go/reputation/erc8275/recompute_test.go`, `rust/core/src/erc8275/recompute.rs`. No agent SDK runtime, deployed key/agent identity or real fixture corpus is copied. Prospective basis-point vector adoption is recorded as fixture/integration history, not production execution.

### trustless-ai/ccip-router

Audit snapshot: `e667a4f78b8a0aa0239e32d1e0b827495e72ae0a`. Fresh default: `e667a4f78b8a0aa0239e32d1e0b827495e72ae0a`.

Retained role: **optional_interface**. Exact-byte signed observation transport remains an optional gateway. A signed digest does not re-evaluate TSEI or establish independent vantage/finality.

Representative source references: `src/integrations/tseiProfileA.ts`, `src/integrations/tseiProfileARouter.ts`, `conformance/tsei-profile-a-v0/README.md`, `src/__tests__/tseiProfileA.test.ts`.

Not copied as runtime/data: `src/integrations/tseiProfileA.ts`, `src/integrations/tseiProfileARouter.ts`, `conformance/tsei-profile-a-v0/README.md`, `src/__tests__/tseiProfileA.test.ts`. No transport server, deployment/RPC configuration or chain receipts are copied. Signed exact-byte observation remains an optional interface; it does not re-evaluate claims or establish vantage/finality.

### trustless-ai/cross-reference-console

Audit snapshot: `d944c465b598de5e5ef79e19ab9f19fa10e7cb56`. Fresh default: `d944c465b598de5e5ef79e19ab9f19fa10e7cb56`.

Retained role: **optional_interface**. Signed Cell and attribution/lineage rules remain an optional observation interface. Empty lineage and shared code do not establish independence.

Representative source references: `CLAIM.md`, `CELL-v1.md`, `CELL-v2.md`, `CELL-v3.md`, `LINEAGE-REF.md`.

Not copied as runtime/data: `CLAIM.md`, `CELL-v1.md`, `CELL-v2.md`, `CELL-v3.md`, `LINEAGE-REF.md`. No shared Cell verifier/UI/lineage corpus is copied. Claim/Cell/lineage remain optional interfaces. Empty/shared lineage and signatures are not evaluator independence.

### trustless-ai/pq-agent-binding

Audit snapshot: `4f934ad31e96979002d818cd8a5f12909c1b6713`. Fresh default: `4f934ad31e96979002d818cd8a5f12909c1b6713`.

Retained role: **optional_interface**. The original bounded key-ID, half-open validity-window and explicit non-revocation gate is implemented before trusted provider invocation. Complete event-time/earliest-anchor-history evaluation remains unimplemented; superseded R1-R3 semantics remain historical.

Representative source references: `spec/v1-temporal-authority.md`, `README.md`.

Not copied as runtime/data: `spec/v1-temporal-authority.md`, `README.md`. No historical governance capture corpus or superseded R1-R3 implementation is copied. Settled event-time/earliest-anchor semantics remain a policy interface reference, with missing history an explicit barrier.

### trustless-ai/primitives

Audit snapshot: `6b39e9540d4bd0a78decb588c0a8e328c303f208`. Fresh default: `6b39e9540d4bd0a78decb588c0a8e328c303f208`.

Retained role: **methodology**. Registry discovery remains navigation only. Package-present or runner-declared cannot establish performed semantic execution.

Representative source references: `primitives.json`, `check.py`.

Not copied as runtime/data: `primitives.json`, `check.py`. No registry generator/checker/database is copied. Discovery remains navigation, never authority or proof of performed semantic execution.

### trustless-ai/recompute-kit

Audit snapshot: `e763f9b7be416ad244cbb6578bc2deb8f34b3877`. Fresh default: `e763f9b7be416ad244cbb6578bc2deb8f34b3877`.

Additional inspected capability/PR pins: `shared.empty.pr65@4ed3a65fb44324239cb67fd807f51881af1b8bb3` (OPEN_PR65_ONLY), `shared.reporter.pr57@3540251738350d45597a44b7908c3f6de98e9cce` (OPEN_PR57_ONLY).

Retained role: **adapter**. Pinned scan/time/consumption/permission profiles and reporter/mutation methodology remain bounded integrations. Package presence or exit 0 is not semantic proof.

Representative source references: `conformance/scan-subject-binding-v0/scan_check.py`, `conformance/scan-subject-binding-v0/mutation_check.py`, `conformance/scan-subject-binding-v0/vectors.json`, `conformance/scan-subject-binding-v0/suite.json`, `conformance/encode-json-utf8-lf-v0/encode-json-utf8-lf-v0.spec.md`.

Not copied into product runtime: `conformance/scan-subject-binding-v0/mutation_check.py`, upstream `vectors.json`, or `conformance/encode-json-utf8-lf-v0/encode-json-utf8-lf-v0.spec.md`. V0.2 copies the selected scan checker, canonical `tools/run_conformance.py`, suite/README and CC0 license from historical main `1a37bcaf91918fd8a98f164d97d0fddbc28c6755`, and actually invokes that bounded checker/runner. It does not import the whole toolkit or newly merged PR57 reporter behavior. Release-audit-only public CC0 vectors/artifacts are separately identified in audit evidence, not used as product runtime or independently authored synthetic fixtures. Package presence/exit zero remains insufficient.

### trustless-ai/semantic-abi

Audit snapshot: `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee`. Fresh default: `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee`.

Retained role: **adapter**. Neutral manifest/linker claim, authority, scope and time semantics inform the semantic adapter. Public system-specific and private Vértice adapters are excluded.

Representative source references: `schema/manifest.schema.json`, `schema/manifest-v0.md`, `runner/src/manifest.mjs`, `runner/src/linker.mjs`, `runner/src/evaluate.mjs`.

Not copied as runtime/data: public system-specific `adapters/` or private/commercial Vértice implementations/captures. V0.2 copies four unchanged neutral public runtime files (`classes.mjs`, `manifest.mjs`, `linker.mjs`, `evaluate.mjs`) and their Apache-2.0 license from `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee`; the adapter actually executes validation/linking and optional pair evaluation. Generic-QEV neutral copies remain separately manifested. New product encoding/projection is original glue, not complete upstream wire conformance. No producer authority label becomes an independently established premise.

## New npm runtime dependencies

Npm dependencies are a separate source set, not part of the 43-repository discovery inventory. [Dependency provenance](../provenance/dependencies.json) records direct AJV 8.20.0 and @noble/curves 2.0.1, transitive @noble/hashes 2.0.1, fast-deep-equal 3.1.3, fast-uri 3.1.8, json-schema-traverse 1.0.0 and require-from-string 2.0.2. Lockfile resolved URLs/integrities and actual installed license hashes are preserved. Six use MIT; fast-uri uses BSD-3-Clause. Copied third-party notices are tracked independently of the product Apache grant.

Node/Bun/Python runtimes and optional real PQ/ledger/provider systems are environment or future interface requirements. They are not silently bundled, invoked, licensed or claimed available because an upstream repository was inspected.

The copied npm license paths and byte hashes are finalized in `provenance/npm-licenses.json` and linked from `provenance/dependencies.json`. Public snapshot preservation is limited to the saved 43 repositories / 21,119 files with zero mismatches, without a global live-worktree cleanliness claim.

Working bounded product slices also include original Interpoll action/retry, PQ provider/vector/temporal-authority interfaces and `tools/reproduce.mjs` local conduct reproduction. Selected native Interpoll, Semantic ABI, recompute-kit and PRF files are explicitly copied/executed as listed above and in the v0.2 manifests; remaining application/queue/provider implementations are uncopied. RSI/SEG methods are applied without their native tool/onchain execution; the machine catalog carries both `used` and implementation boundaries. `.gitmodules` references identify uninitialized external dependencies whose payload files are not present in the frozen source archives.
