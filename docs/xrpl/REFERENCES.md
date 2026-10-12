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
