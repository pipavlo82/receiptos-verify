# ReceiptOS Verify — local build report

ReceiptOS Verify v0.1 is implemented as one local verification product. It combines fixed native execution of selected public Crystal/RVR/QEV capabilities with original neutral relation implementations, independently selected request subjects, a versioned projection, synthetic controls and a complete public-source provenance catalog.

## A–B. Repository and commit identity

Repository: `C:/Users/msi/Documents/Codex/2026-10-11/files-pasted-by-the-user-mission/outputs/receiptos-verify`.

The exact final local commit SHA, code-tested commit identity, source-lock digest and report digests are captured in [final-closure.json](reports/final-closure.json). This sidecar is deliberately excluded from Git to avoid a circular commit-self-hash. No remote is configured; nothing is pushed or published. Existing source repositories and frozen audit snapshots remain read-only. The earlier `receiptos-verify-v0` draft is superseded and was left untouched.

New authored material is Apache-2.0, Copyright 2026 Pavlo Tvardovskyi. Selected upstream files and seven npm dependencies preserve their actual licenses/notices; see [LICENSING.md](LICENSING.md). No private Vértice implementation, captured provider payload or imported benchmark dataset is included.

## C. Tree

```text
receiptos-verify/
  README.md LICENSE NOTICE LICENSING.md package.json package-lock.json
  BUILD_REPORT.md PROVENANCE.md FULL_WORK_REUSE_MAP.md source-lock.json
  src/
    cli.mjs server.mjs
    core/                 # strict admission, typed requests, signatures, Git closure, capsules, report
    projection/           # formal v1 product projection
    adapters/             # protocol + twelve independently inspectable adapters
      native/             # fixed Python/Bun bridges, executable and file guards
    analytics/            # evidence-cost metadata; no security proof
  schemas/ profiles/      # request, bundle, result and neutral semantic contracts
  vectors/                # V01–V30 literal input/expected-layer controls
  mutations/              # fourteen applied source mutation classes
  tests/ tools/ web/
  provenance/             # sources, authorship, live public state, path/license pins
  vendor/                 # selected unchanged public files and dependency licenses
  docs/                   # architecture, contract, claim model, trust boundaries, exclusions
  reports/                # test, corpus, mutation, native, demo, reproduction and UI evidence
```

## D. Implemented adapters and their boundaries

The stable adapter protocol exposes inspect, integrity, authenticity, subject binding, recomputation, evidence, semantic contract, guarantee projection and provenance operations. Unsupported operations remain explicit. Each descriptor declares version/profile, repository/commit, license, maturity, requirements and native vocabulary. The product has fourteen named layers; every report preserves their separate results and raw native outputs beneath `receiptos.verify.projection.v1`.

| Adapter | Working slice | Preserved boundary |
|---|---|---|
| Crystal | Fixed native canonicalization/root/verification via Bun | Native root omits anchor; outer product signature binds supplied payload. Root validity supplies no execution authority. |
| RVR | Fixed native SHA256-equality evaluator and saved-artifact replay via Python | Native VERIFIED/REFUTED/UNVERIFIABLE stays separate from REPRODUCED/DIVERGED/CANNOT_RECOMPUTE. A reproduced negative stays negative. |
| Semantic ABI | Neutral claim, authority, subject, scope, interval, assumptions, required evidence and consumer compatibility | Original public-spec implementation with explicit product extensions; no private or public system-specific Vértice adapter. |
| recompute-kit | Execution/report/grade/source-pin admission and nonvacuous controls | Original methodology implementation; no claim that the upstream scanner or every native profile runs. |
| PRF | Exact dependency/obligation preservation, detached caller-accepted basis and observations | PRESERVED/VIOLATED/UNVERIFIABLE; merged PR13 methodology and open PR14 exact head remain distinct. |
| Chronicle | New/idempotent/conflict identity, predecessor/reference and historical/current continuity | Derived-entry equality alone does not bind every byte of a larger envelope. Full supplied-history digest is a separate optional product commitment. |
| Interpoll | Real Schnorr verification of public exact action tuple and immutable retry comparison | Signature establishes selected key control; producer cannot change caller-selected action or expected authority. No live database/deployment verification. |
| QEV generic | Native finite saved-bitline checker and public neutral semantic linker | Synthetic postprocessing may reproduce while provider authentication remains NOT_ESTABLISHED. |
| QEV Moth | Native counts/RVR and native ReceiptOS portable packaging over fresh synthetic Moth-shaped bytes | Requested 32 bytes and delivered 0 remain separate; native positive replay does not authenticate provider/hardware or repeat execution. |
| PQ | Trusted crypto-provider registry, explicit temporal-authority gate and nonempty vector admission | MOCK/STRUCTURAL cannot become real crypto; no ML-DSA provider installed. Caller authority is a premise, not complete earliest-anchor-history validation. |
| Stochastic | Original committed-byte replay, cursor/domain/candidate-set binding | Reproducibility does not establish provenance or entropy. Modulo-selection algorithm is a product extension, not a claimed upstream R4 sampler. |
| Ledger | Off-chain boundary plus Ethereum/XRPL provider interfaces | No live chain anchor, finality or XRPL implementation. |

Portable product capsules additionally bind canonical request+bundle entries, a count-bound Merkle manifest and inclusion proofs. They use a new product format; native Crystal capsule wire conformance is not claimed. CLI capsule verification always requires an independently selected external request. A separately held container digest can bind the complete carrier without a circular self-hash.

## E–F–K. Work reuse and provenance

[provenance/sources.json](provenance/sources.json) records 74 capability/inventory entries across all 43 audited repositories, including all 20 discovered public `pipavlo82` repositories. Each entry has exact source identity/paths, mechanical contribution evidence, actual source rights, required integration-mode enum, product files and bounded implementation status. Twenty-two named implemented slices include methodology and interfaces; this is not a claim of 22 complete native upstream profiles. The frozen audit contribution ledger contains 108 records; it is attribution evidence, not sole authorship, independent truth or revenue allocation.

Native selected manifests cover 15 generic Crystal/RVR files, 12 generic QEV files and 50 advanced QEV files, with compile-time nonempty file guards. Advanced QEV preserves its nested RVR pin `549a7e150ddc75df88dc90ee93f331fea7464567`, distinct from the generic RVR pin. [PROVENANCE.md](PROVENANCE.md) and [FULL_WORK_REUSE_MAP.md](FULL_WORK_REUSE_MAP.md) retain complete identities, source-path digests, contributor evidence, license differences and maturity. Selected integration modes are DEPENDENCY, PINNED_SOURCE, REIMPLEMENTED_FROM_SPEC, TEST_FIXTURE and METHODOLOGY_ONLY; richer roles also distinguish historical and future interfaces.

The following table accounts for every owned repository. Pins are freshly observed default heads; selected open experimental heads and path-specific license grants remain separately recorded in the catalog.

| Owned repository | Default pin | Role | Contribution/boundary |
|---|---|---|---|
| pipavlo82/-crystal-artifact | `fc0cd2cbe96ec448ac244ae21daabdab68c17022` | optional interface | Paper/QR transport and viewer ideas remain useful. The current product keeps native evidence behind adapters and does not copy the vendored QR implementation or historical rendered artifacts. |
| pipavlo82/Chronicle | `c467b48fd18fc8ec86f10582befa35946ce41914` | adapter | Native admission, collection/portfolio roots and historical/current query boundaries inform the continuity adapter. User histories and the Chronicle brand are not imported. |
| pipavlo82/conduct-witness | `2b9ac1cc56d7c36ed1a29f9d4ac674b31eac6151` | methodology | Pinned reproduction, operator separation and workflow attestation remain assurance methodology. Upstream template/verifier code is not treated as independently authored Pavlo code. |
| pipavlo82/cross-reference-console | `72b8804c4e85e6ec1530a3470a9af7a5fe47f238` | optional interface | Claim identity and signed Cell/lineage boundaries remain a declared optional observation interface. Registry signatures do not supply semantic independence. |
| pipavlo82/crystal-receipt | `45b46bf7df3a60b32583291f577a36bf19d22f00` | runtime | Selected ReceiptOS core canonicalization, integrity, portable evidence and continuity are native adapter candidates. The desktop subtree and captured external evidence are outside the selected source scope. |
| pipavlo82/decentralised | `8f614bac346e9d618bbf69ea33cb175aa05e798d` | historical | This old owned fork is accounted for as historical lineage. Its audited default lacks the current signed engagement/outbox implementation and has no root grant. Current public action semantics are sourced separately from Interpoll1. |
| pipavlo82/ERCs | `98469bc93b6add1e3bc9501dafaa73311071145b` | optional interface | The fork is a reference corpus with upstream ERC authorship. It is not Pavlo-owned implementation credit or evidence that a draft ERC is accepted. |
| pipavlo82/gas-per-secure-bit | `e95d3bac5129b47a949c14b94b6a07d21220ed17` | methodology | Surface/lane/provenance-aware measurement is reusable methodology. This product does not present old gas results as its own runtime measurements or import vendor records. |
| pipavlo82/ml-dsa-65-ethereum-verification | `6cf885533b65eec232934700daaf9b977ef305f9` | optional interface | The parser stub and experimental PR27 remain research/interface references. Structural parsing is not ML-DSA cryptographic verification; the closed unmerged license PR does not change main. |
| pipavlo82/pipavlo82.github.io | `9a0139ebfa1df4fa6bb9133c0eb6be6d64e67037` | fixture | The published witness-key format is accounted for as fixture/identity interface history. Real published keys are not trusted by the synthetic product demo. |
| pipavlo82/pq-receipt-profile | `54cf1a3784a56f4624b41357148bbe9ba301c470` | optional interface | Long-lived attribution and crypto-agility policy remain an optional profile interface. Future PQ operations must declare a real backend or return unsupported. |
| pipavlo82/pqevm-vector-packs | `05988be4f37394b21257d2b5e6c639b4746b698a` | methodology | Hash/count container and source-provenance rules inform fresh synthetic vector admission. Imported operands and missing historical source_commit are not repaired or copied. |
| pipavlo82/protected-relation-fixtures | `fac26d2e8346aeab08194343b78c345d235c6935` | adapter | Neutral guarantee preservation and oracle-blind relation methodology remain explicit dependencies. Open PR14 is experimental; synthetic scoring is not independent truth. |
| pipavlo82/quantum-execution-evidence | `5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05` | runtime | Provider-neutral, counts-native and request-versus-observation boundaries support a stochastic-domain adapter. Only fresh synthetic evidence is selected, not live provider captures. |
| pipavlo82/r4-saas-api | `7815fd84dd7eb9347b8399719cfeff941ff8df2a` | optional interface | The application-specific ECDSA recovery endpoint remains an optional signature interface. Signature recovery is key control, not authoritative subject membership or execution. |
| pipavlo82/receiptos-mvp | `0e70ebe85f4dd1b8b2a24be9c29f1b9757e25a71` | historical | The HMAC receipt/chain/replay seed is retained as historical methodology. Its symmetric trust and local chain do not establish independent public verification. |
| pipavlo82/receiptos-pq-lab | `a705d9c1942c0f30725c9bddec6606a0cddf4fc6` | optional interface | Extension/backend contracts, HMAC game lineage and adapter refusal reasons remain optional interfaces. Historical Stealth/ATP captures and vendor material are not imported. |
| pipavlo82/recomputable-verification-receipts | `9dd36e882dd372f264b77b179130948aa5adcbde` | runtime | Native RVR outcomes and recomputation statuses remain separate behind the adapter. Selected upstream profile implementations retain their own terms and vocabularies. |
| pipavlo82/relational-security-invariants | `3d3038f90c3dd98e79f948398167c5cc3ef2fdd8` | methodology | Independent expected relations, protected maintenance and load-bearing source controls inform assurance. The new scoped Apache grant does not relicense evidence copies or prove evaluator independence. |
| pipavlo82/semantic-execution-guard | `18f595b537017e5ff7b9074366c3065e877488f9` | optional interface | Exact conversion/feed-consumption relations remain reusable domain specifications. The merged Apache grant is scoped to Pavlo additions; Federico/babyblueviper1 guard code retains separate attribution/terms. |

Relevant shared public work is read-only. The full reuse map also accounts for every other discovered external repository, including issue-only contacts for which no useful transferable implementation was established.

| Shared repository | Default pin | Contribution/boundary |
|---|---|---|
| trustless-ai/semantic-abi | `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee` | Neutral manifest/linker claim, authority, scope and time semantics inform the semantic adapter. Public system-specific and private Vértice adapters are excluded. |
| trustless-ai/recompute-kit | `e763f9b7be416ad244cbb6578bc2deb8f34b3877` | Pinned scan/time/consumption/permission profiles and reporter/mutation methodology remain bounded integrations. Package presence or exit 0 is not semantic proof. |
| trustless-ai/primitives | `6b39e9540d4bd0a78decb588c0a8e328c303f208` | Registry discovery remains navigation only. Package-present or runner-declared cannot establish performed semantic execution. |
| trustless-ai/cross-reference-console | `d944c465b598de5e5ef79e19ab9f19fa10e7cb56` | Signed Cell and attribution/lineage rules remain an optional observation interface. Empty lineage and shared code do not establish independence. |
| trustless-ai/agent-sdk | `7bb831a80d624f22eb09c6d20dd873eb6a376e03` | The prospective basis-points fixture adoption and SDK interfaces remain optional test/agent integration references. No live SDK deployment is claimed. |
| trustless-ai/ccip-router | `e667a4f78b8a0aa0239e32d1e0b827495e72ae0a` | Exact-byte signed observation transport remains an optional gateway. A signed digest does not re-evaluate TSEI or establish independent vantage/finality. |
| trustless-ai/pq-agent-binding | `4f934ad31e96979002d818cd8a5f12909c1b6713` | Settled temporal authority construction is a policy reference. Complete earliest-anchor history is required; superseded R1-R3 semantics remain historical. |
| Interpoll1/decentralised | `23c8c7b5b9803d906ea8ba62772104ebdae488e8` | Signed public engagement, immutable retry and bounded supplied-history replay inform the action adapter. Key control is distinct from human identity, accepted action or truthful observation. |
| ethereum/ERCs | `0578f46b83fb2e11a6480cac1f5b8b33b563d237` | Open ERC-8404 PR1980 is a pinned normative proposal, not accepted default behavior. Other ERC authors retain upstream attribution. |

Experimental source identities explicitly preserved:

- PRF PR13 is merged; PR14 remains OPEN at `f525737069dc4cef7741f805d08a988912f4454f`.
- recompute-kit PR65 remains OPEN at `4ed3a65fb44324239cb67fd807f51881af1b8bb3`; reporter PR57 remains OPEN at `3540251738350d45597a44b7908c3f6de98e9cce`. Their lessons inform original controls, without relabeling open code as main.
- ML-DSA advanced PR27 remains OPEN at `6d58ce9e64b4c499fc52395e01e2bfbcd967d441`; its default remains a parser stub. No production ML-DSA support is claimed.

RSI and SEG supply detached relation/subject-binding methods, positive/negative controls and protected evidence discipline. Their full Robinhood/Solidity profiles are not installed. ReceiptOS MVP, PQ lab, old decentralised, ERC fork, paper-artifact and website work remain explicit historical, fixture or future-interface lineage. Age alone is never an exclusion reason.

## G. Validation

All product verification and mutation execution runs offline after dependency installation. Exact results and outputs are saved under `reports/`.

| Check | Result | Evidence |
|---|---|---|
| Node full suite | 251/251 PASS; zero failure/skip/cancel | [tests.tap](reports/tests.tap) |
| Literal cross-project corpus | 30/30 PASS; all fourteen expected layer statuses plus required reasons | [vectors.json](reports/vectors.json) |
| Applied source mutations | 14/14 KILLED; zero survived/crashed/unapplied/broken controls/invalid baseline | [mutations.json](reports/mutations.json) |
| Native focused tests | 29/29 PASS: 13 generic native, 7 generic QEV, 9 advanced QEV | Native provenance manifests; subset of full suite |
| Scoped independent review | 37/37 focused checks PASS; findings resolved within reviewed scope | [independent-review.json](reports/independent-review.json); subset, not external certification |
| Capsule proofs/controls | 21/21 PASS including independent Python 1/2/3-leaf golden roots | Full suite subset |
| PQ temporal premises | 41/41 controls PASS; missing/invalid premises block callback invocation | Full suite subset |
| Exact analytics totals | 5/5 boundary controls PASS; overflow represented as explicit exact decimal strings | Full suite subset |
| Browser | Positive A, stale-result removal, and wrong B observed in running localhost UI | [ui-validation.json](reports/ui-validation.json), [screenshot](reports/ui-demo.png) |
| CLI capsule | External request A exits 0 VERIFIED; B exits 2 CONTRADICTED | [capsule-cli.json](reports/capsule-cli.json) |
| Local reproduction | Same saved V02 semantic result reproduced in separate local copy | [local-reproduction.json](reports/local-reproduction.json) |
| Read-only upstream preservation | 43 snapshots / 21,119 regular files / zero mismatches | [upstream-preservation.json](reports/upstream-preservation.json) |
| Source closure and Git whitespace | Exact nonempty source lock, authored LF/no BOM; staged and unstaged diff checks. Git attributes preserve upstream and verbatim TAP bytes without normalizing their existing whitespace | [final-closure.json](reports/final-closure.json) |

Focused subsets are not added to the full-suite count. Saved audit upstream test counts remain historical and are not presented as newly executed product tests. The public live-state report distinguishes default heads, open heads and merged PRs. Snapshot preservation says nothing about unrelated live workstation worktree cleanliness.

## H. Mutation outcomes

Every applied source mutant preserves its paired positive control and is distinguished by a structured semantic witness. Source-before/source-after hashes, baseline and mutant projections, process status and reasons are saved. An unapplied patch, checker crash, broken control or zero mutants cannot satisfy the gate.

| Required mutant class | Result |
|---|---|
| Ignore requested subject | KILLED |
| Compare receipt subject with itself | KILLED |
| Accept any valid signature | KILLED |
| Promote REPRODUCED to VERIFIED | KILLED |
| Accept empty evidence | KILLED |
| Count crash as semantic refutation | KILLED |
| Accept package presence as PASS | KILLED |
| Ignore policy version | KILLED |
| Ignore guarantee dependency | KILLED |
| Ignore retry action change | KILLED |
| Ignore evidence grade | KILLED |
| Ignore authority | KILLED |
| Ignore commit | KILLED |
| Ignore canonicalization profile | KILLED |

A concurrent development run passed 250/251 tests: a cleanup assertion incorrectly required a shared temporary parent to be globally empty while another runner was active. The original observation is retained in [tests-concurrent-observation.tap](reports/tests-concurrent-observation.tap); the cleanup test now verifies its own isolated invocation, and the final full suite is run separately.

The initial narrower dependency mutant survived a redundant relation guard. [mutations-initial.json](reports/mutations-initial.json) preserves that development observation. The final whole-class mutation disables all dependency checks and is killed while preserving its positive; expectations were not weakened.

## I. Required end-to-end demo

Authentic, intact receipt with native positive result covers commit A `6d0d1867b0b3e1cb1c6c56caea39d583e4535250`. The same receipt is evaluated against independently chosen commit B `bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`.

| Layer | Request A | Request B |
|---|---|---|
| Integrity | VERIFIED | VERIFIED |
| Authenticity | VERIFIED | VERIFIED |
| Subject binding | VERIFIED | CONTRADICTED |
| Recomputation | REPRODUCED; native VERIFIED | REPRODUCED; native VERIFIED |
| Evidence sufficiency | SUFFICIENT | SUFFICIENT |
| Semantic compatibility | COMPATIBLE | COMPATIBLE |
| Overall | VERIFIED | CONTRADICTED |

Exact explanation: “Authenticated evidence covering commit 6d0d1867b0b3e1cb1c6c56caea39d583e4535250 does not establish the caller-selected claim for commit bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb. This does not establish that the requested commit executed or failed.”

Full report: [first-demo.json](reports/first-demo.json), [readable output](reports/first-demo.txt). Run `node src/cli.mjs demo`. Positive A proceeds through later layers. V07 preserves native REFUTED + REPRODUCED as product CONTRADICTED; V17/V20/V28 retain missing provider/provenance premises.

## J. Known gaps and maturity

- This is an experimental local v0.1 with one mandatory Git-artifact/SHA256 claim profile and optional bounded domain profiles. It is not a universal verifier, independent security audit or formal soundness proof.
- Ed25519 proves key control over exact product statement bytes under caller-selected trusted keys. Fresh fixtures use explicitly synthetic keys. No real operator/provider identity, trusted hardware, production deployment or execution-origin attestation is supplied.
- QEV executes saved artifact transformations; provider authenticity remains NOT_ESTABLISHED. Synthetic source labels such as LIVE_MOTH_API_CAPTURE remain preserved native assertions, never product authentication.
- PRF evaluates supplied, caller-accepted basis and observations; it does not establish their external truth. Chronicle covers its declared history envelope and projection, not arbitrary larger unbound source envelopes.
- Semantic ABI is a neutral compatibility implementation with documented product extensions, not a private Vértice integration or every upstream consumer's conformance suite.
- PQ has no ML-DSA backend. Temporal authority is a bounded explicit caller-premise gate, not the complete earliest-anchor-history settlement algorithm. One vector or a structural pack is not conformance.
- Stochastic replay does not establish entropy/security; no RNG is mandatory. Ledger interfaces have no live Ethereum/XRPL backend or finality evidence.
- Cross-reference claim/reference presentation and original receipt carrier/UI concepts are included; signed Cell wire interchange, CCIP, agent SDK, paper/QR export, full desktop applications, native scans and Robinhood guard execution remain future adapters.
- Local reproduction uses a separate product copy and exact locks but the same machine and installed locked dependencies. Its unsigned receipt does not claim an independent operator or independent implementation. Browser checks are focused, not full accessibility/browser certification.
- Fixed native processes are bounded and offline but are not an OS security sandbox for arbitrary untrusted programs; users cannot supply executables. Node/Python/Bun are required. No live ledger/provider or external scanner calls are made.

## L. Files not reused and exact reasons

[docs/files-not-reused.md](docs/files-not-reused.md) records source-file groups for all 43 audited repositories. Whole applications, captured third-party/provider evidence, benchmarks and unresolved-grant code are not copied. Their public behavior/specification/methodology remains represented where useful. Selected vendor files are unchanged and pinned; seven npm legal files are retained separately. License uncertainty changes integration mode to original specification reimplementation or methodology rather than silently discarding an idea.

No historical evidence was rewritten or repinned. No existing repository was branched, committed, pushed, merged or given a PR during this build. Memory Palace closure records the new operational truth separately from the frozen prior audit and stopped draft.
