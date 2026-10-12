# References and evidence boundaries

All listed sources accessed 2026-10-12 UTC. XRPL facts come from official XRPL documentation. RFC 8785 defines the proposed off-ledger canonicalization. No live ledger observation or network amendment-enablement claim is made.

Public baseline: tag object `358bbc8f63c747bde3e6a12fd0a69b4f4ef16d8e`; peeled commit `396143120f787d2f5534e92c0cf896c029a05775`; tree `4cbfcdcf323e18978268cab4c6870ae693a281b9`. Public release is a published experimental prerelease (2026-10-12T00:22:20Z). Public Semantic ABI current HEAD `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee` was independently read without modification.

| ID | Source | Supports | Access date (UTC) |
| --- | --- | --- | --- |
| 1 | [Finality of Results](https://xrpl.org/docs/concepts/transactions/finality-of-results) | Validated inclusion versus tentative submission; tes and tec distinction. | 2026-10-12 |
| 2 | [tx API](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/tx) | Transaction/metadata lookup, validated flag, ledger references, txnNotFound history limitation. | 2026-10-12 |
| 3 | [Transaction Common Fields](https://xrpl.org/docs/references/protocol/transactions/common-fields) | Account, signatures, NetworkID, Memos hex/URI conventions and aggregate binary 1 KB cap; delegated/batch contexts. | 2026-10-12 |
| 4 | [AccountSet](https://xrpl.org/docs/references/protocol/transactions/types/accountset) | All account-setting options optional; no-setting carrier has no account-setting effect beyond transaction cost. | 2026-10-12 |
| 5 | [Basic Data Types / Hashes](https://xrpl.org/docs/references/protocol/data-types/basic-data-types) | Transaction ID, signed-binary data and SHA-512Half; ledger indexes/hashes differ. | 2026-10-12 |
| 5a | [Binary Format](https://xrpl.org/docs/references/protocol/binary-format) | XRPL serialization is distinct from JSON/JCS; exact codec overhead needs measurement. | 2026-10-12 |
| 6 | [Cryptographic Keys](https://xrpl.org/docs/concepts/accounts/cryptographic-keys) | Master/regular-key signing and account authorization are distinct from real-world identity. | 2026-10-12 |
| 6a | [Multi-Signing](https://xrpl.org/docs/concepts/accounts/multi-signing) | Signer-list/quorum and empty SigningPubKey; signer key need not equal Account master key. | 2026-10-12 |
| 6b | [Ledger Structure](https://xrpl.org/docs/concepts/ledgers/ledger-structure) | Server validator trust boundary, validated ledger and ledger identity. | 2026-10-12 |
| 6c | [server_info](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/server-info-methods/server_info) | network_id is server-reported context; not a unique chain-authentication proof. | 2026-10-12 |
| 7a | [Decentralized Identifiers](https://xrpl.org/docs/concepts/decentralized-storage/decentralized-identifiers) | DID account control and verification-method/document role. | 2026-10-12 |
| 7b | [DID ledger entry](https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/did) | DIDDocument/Data/URI fields and lack of content validation. | 2026-10-12 |
| 7c | [Credentials](https://xrpl.org/docs/concepts/decentralized-storage/credentials) | Issuer-defined assertion, subject acceptance, expiry and deletion. | 2026-10-12 |
| 7d | [Credential ledger entry](https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/credential) | Issuer/Subject/CredentialType tuple, 1-64 bytes, lsfAccepted and Ripple-epoch expiration. | 2026-10-12 |
| 8 | [RFC 8785 / JCS](https://www.rfc-editor.org/rfc/rfc8785) | Proposed JSON canonicalization, I-JSON constraints, UTF-8 and no Unicode normalization; not an XRPL standard. | 2026-10-12 |
| 9 | [ReceiptOS Verify v0.2.0](https://github.com/pipavlo82/receiptos-verify/releases/tag/v0.2.0) | Public release baseline; bounded independent experimental product. | 2026-10-12 |
| 9a | [ReceiptOS generic claim boundary](https://github.com/pipavlo82/receiptos-verify/blob/396143120f787d2f5534e92c0cf896c029a05775/docs/generic-claim-boundary.md) | Exact conservative product surface and caller-premise limitations. | 2026-10-12 |
| 9b | [ReceiptOS projection](https://github.com/pipavlo82/receiptos-verify/blob/396143120f787d2f5534e92c0cf896c029a05775/docs/product-projection.md) | Native results separate; contradiction precedence; required positive layers. | 2026-10-12 |
| 9c | [ReceiptOS ledger interface](https://github.com/pipavlo82/receiptos-verify/blob/396143120f787d2f5534e92c0cf896c029a05775/src/adapters/ledger.mjs) | Explicitly no live XRPL adapter at the public baseline. | 2026-10-12 |
| 10 | [Public Semantic ABI](https://github.com/trustless-ai/semantic-abi/blob/d15c666dfccff17f7350fe97d2fc7b71cb2cbaee/README.md) | Neutral evidence-consumption boundary; separate upstream project. | 2026-10-12 |
| 10a | [Semantic ABI linker](https://github.com/trustless-ai/semantic-abi/blob/d15c666dfccff17f7350fe97d2fc7b71cb2cbaee/runner/src/linker.mjs) | Claim type, authority class, scope and temporal linking; constrained coercions. | 2026-10-12 |
| 10b | [Semantic ABI manifest specification](https://github.com/trustless-ai/semantic-abi/blob/d15c666dfccff17f7350fe97d2fc7b71cb2cbaee/schema/manifest-v0.md) | Public guarantee typing, not all ReceiptOS v2 extensions. | 2026-10-12 |
| S1 | [Consensus Structure](https://xrpl.org/docs/concepts/consensus-protocol/consensus-structure) | Secondary cross-check of validated outcome and consensus terminology. | 2026-10-12 |
| S2 | [Transaction Malleability](https://xrpl.org/docs/concepts/transactions/finality-of-results/transaction-malleability) | Use actual validated transaction identity; initial signing hash may not remain final identity in all signing cases. | 2026-10-12 |
| S3 | [Send a Multi-Signed Transaction](https://xrpl.org/docs/tutorials/best-practices/key-management/send-a-multi-signed-transaction) | Official example of no-setting AccountSet carrier and multisign constraints. | 2026-10-12 |
| S4 | [Permission Delegation](https://xrpl.org/docs/concepts/accounts/permission-delegation) | Account and delegate are distinct roles; excluded from proposed minimum profile. | 2026-10-12 |
| S5 | [DIDSet](https://xrpl.org/docs/references/protocol/transactions/types/didset) | Optional document/URI/data update mechanics; no execution claim. | 2026-10-12 |
| S6 | [CredentialCreate](https://xrpl.org/docs/references/protocol/transactions/types/credentialcreate) | Provisional issuer/subject/type issuance and optional references. | 2026-10-12 |
| S7 | [Known Amendments](https://xrpl.org/resources/known-amendments) | Activation status was not established from dynamic Loading indicators; no selected network queried. | 2026-10-12 |

Reference 7 in the main note denotes the 7a-7d authority sources. Current documentation describes amendment-gated features; no selected network was queried for activation. The DID ledger-entry page was read through its official text/HTTP representation when browser extraction returned unsupported content-type. Only paraphrased facts and links are included, not third-party source captures.

## Source roles

- **OFFICIAL XRPL SOURCE:** references 1-7 and S1-S7 are authoritative for the XRPL facts they describe; they do not specify a ReceiptOS profile or establish a particular live observation.
- **PUBLIC SEMANTIC ABI ARTIFACT:** references 10/10a/10b and 11 below describe the separate public Semantic ABI project, including an illustrative workflow fixture. They do not demonstrate a ReceiptOS XRPL integration.
- **RECEIPTOS PRODUCT SOURCE:** references 9/9a/9b/9c identify the pinned public product baseline and its bounded semantics, including its interface-only ledger boundary.
- **PROPOSED RECEIPTOS CONVENTION:** `xrpl-receipt-anchor-v0`, its URN, byte layout, domain/preimage, selection rules and native/product mapping are this note's proposed convention. They are not official XRPL or Semantic ABI standards. RFC 8785 supplies the proposed portable canonicalization rules, not generic conformance evidence for our finite fixture validator.

## 11. Public Semantic ABI / 1inch fixture

Accessed **2026-10-12 UTC**. Public sources only; no unpublished team information or private implementation was used.

| Artifact / identity | Classification | Mechanically observed support and boundary |
| --- | --- | --- |
| [Live demo](https://trustless-ai.eth.limo/semantic-abi/) | VERIFIED_PUBLIC | Direct HTTPS 200, 206363 bytes; SHA-256 `54a8c50add641bda7652edd3bed4efad3b3e72dfefefa7809e3dbc9a661219b2`. Its 1inch linker preset illustrates relative slippage versus an absolute user minimum. No actual swap execution or vulnerability follows. |
| [Pinned numerical fixture](https://github.com/trustless-ai/semantic-abi/blob/d15c666dfccff17f7350fe97d2fc7b71cb2cbaee/ui/index.html#L616) | VERIFIED_PUBLIC | Public main `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee`, `ui/index.html`, blob `277fbd6a475cf05a3420399043f4fa1ac5bbe97b`. Source length/hash exactly match the live demo. The source labels the numbers examples. |
| CID `bafybeidh7brlghppljrsciyviqcphljew5i3ew7uzcxhzmhyinvcx6jhee` | VERIFIED_PUBLIC as gateway-reported identity | Present in the live response's `x-ipfs-roots` header and the merged public pin record. This does not independently reconstruct the IPFS DAG, resolve ENS on-chain or prove ledger inclusion. Direct ipfs.io retrieval returned 429. |
| [CRC pin PR #93](https://github.com/trustless-ai/cross-reference-console/pull/93) / [pinned record](https://github.com/trustless-ai/cross-reference-console/blob/49ff0b895629e8469eeb125cb59434a0e022f895/pins/bafybeidh7brlghppljrsciyviqcphljew5i3ew7uzcxhzmhyinvcx6jhee.json) | VERIFIED_PUBLIC | Merged `2026-09-07T22:29:14Z`; merge `49ff0b895629e8469eeb125cb59434a0e022f895`, head `8322c8c0b090ea2f8ac1e8e3ad466a656227655c`. Record SHA-256 `ac397fdacad422119564ffaf19f1e6742fb51e26c398e04b6eec9eaf7f15a2a7`. Verifies existence/content of a public pin report, not its reported chain facts. |
| [Semantic ABI UI sync PR #8](https://github.com/trustless-ai/semantic-abi/pull/8) | VERIFIED_PUBLIC | Merged `2026-09-07T22:29:42Z`; merge `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee`, head `1e9503a65654a6053e0f7f38025633f8a326acd6`. Public PR author is `TMerlini`; repository ownership is not treated as authorship. |
| Pin record's transaction / block reference | VERIFIED_PUBLIC as report values; SUPPLIED_NOT_INDEPENDENTLY_VERIFIED as chain facts | The public record reports a complete transaction hash and block `25928456`. No independent receipt/calldata/resolver proof was established in this pass; these identities are unnecessary and omitted from the main note. Detailed reported values and lookup limits are in `XRPL_NOTE_REVIEW_REPORT.md`. |

The inspectable fixture supports the numerical non-entailment: `80 * (1 - 1/100) = 79.2`; an output meeting that relative floor can still be below the independently requested absolute minimum `90`. It does **not** establish that a real swap executed at 79.2, that any execution failed, or that 1inch is vulnerable. The main note uses the same class of composition error (narrower guarantee transferred to a broader claim), without identifying the mechanisms or asserting an existing XRPL bug.

The public UI/pin report mentions `adapters/oneinch`, but that directory is absent from the mechanically enumerated pinned Semantic ABI tree. Accordingly this note cites an **illustrative public workflow evidence-boundary fixture**, not a demonstrated executable 1inch adapter. Content identity, public accessibility, merged PR status and arithmetic do not supply execution or consensus authority.
