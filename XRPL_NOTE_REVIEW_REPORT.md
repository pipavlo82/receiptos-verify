# XRPL technical note review

Status: **READY_FOR_PAVLO_REVIEW**

Prepared 2026-10-12 UTC for Pavlo's review before any communication to Florian Alonso / XRPL Commons. Documentation and synthetic examples only. No live adapter, transaction submission, XLS proposal, upstream change, push, PR, tag, release or email was performed.

## Verified public baseline

| Identity | Observed value |
| --- | --- |
| Repository | `pipavlo82/receiptos-verify` |
| Release | [v0.2.0](https://github.com/pipavlo82/receiptos-verify/releases/tag/v0.2.0), published experimental prerelease, not draft |
| Release publication | `2026-10-12T00:22:20Z` |
| Annotated tag object | `358bbc8f63c747bde3e6a12fd0a69b4f4ef16d8e` |
| Peeled release commit / observed public main | `396143120f787d2f5534e92c0cf896c029a05775` |
| Base tree | `4cbfcdcf323e18978268cab4c6870ae693a281b9` |
| Local start | Clean `main`, exact public release commit |
| New local branch | `docs/xrpl-technical-note`, based directly on the peeled v0.2.0 tag |
| Existing source lock | 345 entries; SHA-256 `938820d6a5608fcb34eda832289c539802f51577f6f6e8eb72cd4b11559a9511` |
| Public Semantic ABI HEAD | `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee` |

These identities were read mechanically through Git/`gh`; the tag was fetched without changing it. Historical README statements that v0.2 is unpushed are frozen development observations, superseded by the public release. They were not rewritten in this documentation task.

Read product sources: `docs/generic-claim-boundary.md`, `docs/v0.2-architecture.md`, `docs/product-projection.md`, `src/core/claim-surface.mjs`, `src/core/verify-v2.mjs`, `src/core/evidence-v2.mjs`, `src/adapters/crystal.mjs`, `src/adapters/ledger.mjs`, and current schemas. Read neutral public Semantic ABI README, `schema/manifest-v0.md`, `runner/src/linker.mjs`; inspected related public manifest/evaluator paths for terminology. No private Vertice or unpublished team material was used.

## Deliverables

- `docs/xrpl/RECEIPTOS_VERIFY_XRPL_NOTE.md`: plain Markdown main note with one Mermaid flow.
- `docs/xrpl/xrpl-receipt-anchor-v0.schema.json`: proposed commitment-descriptor shape; imports the existing frozen claim-surface schema. It is not an XRPL transaction schema or implemented product profile.
- `docs/xrpl/examples/matching-claim.json` and `wrong-claim.json`: expressly synthetic, unexecuted contract examples, with assumed premises and illustrative ledger identifiers.
- `docs/xrpl/REFERENCES.md`: exact official URLs, access date, supported claims and exact source pins.
- `output/ReceiptOS_Verify_XRPL_Technical_Note.pdf`: two pages, same technical content, one flow diagram, existing ReceiptOS R geometry, near-black/white/cyan-violet visual style. The reused R is the existing screenshot-derived vector reconstruction, not an original brand master.

The main note is under 1,000 whitespace-delimited words including source-friendly diagram notation and compact references. Full contract-review details below are outside the two-page main note.

## Official documentation consulted

All accessed **2026-10-12 UTC**, official `xrpl.org` documentation first:

1. [Finality of Results](https://xrpl.org/docs/concepts/transactions/finality-of-results).
2. [tx API](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/tx).
3. [Transaction Common Fields: Memos, Account, signing, NetworkID](https://xrpl.org/docs/references/protocol/transactions/common-fields).
4. [AccountSet](https://xrpl.org/docs/references/protocol/transactions/types/accountset).
5. [Basic Data Types / Hashes](https://xrpl.org/docs/references/protocol/data-types/basic-data-types).
6. [Binary Format](https://xrpl.org/docs/references/protocol/binary-format).
7. [Cryptographic Keys](https://xrpl.org/docs/concepts/accounts/cryptographic-keys) and [Multi-Signing](https://xrpl.org/docs/concepts/accounts/multi-signing).
8. [Ledger Structure](https://xrpl.org/docs/concepts/ledgers/ledger-structure) and [server_info](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/server-info-methods/server_info).
9. [DID concepts](https://xrpl.org/docs/concepts/decentralized-storage/decentralized-identifiers) and [DID ledger entry](https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/did).
10. [Credentials concepts](https://xrpl.org/docs/concepts/decentralized-storage/credentials) and [Credential ledger entry](https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/credential).

Secondary official pages checked during research: [Consensus Structure](https://xrpl.org/docs/concepts/consensus-protocol/consensus-structure), [transaction malleability](https://xrpl.org/docs/concepts/transactions/finality-of-results/transaction-malleability), [official multi-sign tutorial](https://xrpl.org/docs/tutorials/best-practices/key-management/send-a-multi-signed-transaction), [permission delegation](https://xrpl.org/docs/concepts/accounts/permission-delegation), [DIDSet](https://xrpl.org/docs/references/protocol/transactions/types/didset), [CredentialCreate](https://xrpl.org/docs/references/protocol/transactions/types/credentialcreate), [Known Amendments](https://xrpl.org/resources/known-amendments). These do not establish enablement on a selected live network.

[RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) is the primary source for proposed off-ledger JCS canonicalization, not an XRPL or existing ReceiptOS canonicalization claim. Full URL-to-claim mapping is in `docs/xrpl/REFERENCES.md`.

## Proposed minimal contract

Everything in this section is a **PROPOSED RECEIPTOS ADAPTER CONVENTION**, not an XRPL standard or currently executable product feature.

### Carrier and authorization

A standalone `AccountSet` with **no account-setting options**, ordinary `Sequence > 0` and one Memo. Use normal `Fee` and `LastLedgerSequence` under caller-selected submission policy. No payment or account-domain change is required. Sequence/fee effects remain; this is not a free or side-effect-free submission.

Normal master-key, regular-key and multisign authorization may be recognized under actual ledger authorization rules. Require the actual `Account` to match caller-accepted submitting-account policy. A signer public key's derived account need not equal `Account`; do not impose that incorrect equality. Receipt authority and anchor submitter are separate roles: if the consumer requires them to be linked, a separately accepted binding is required.

V0 excludes Tickets, Delegate, Sponsor, inner/outer Batch and unknown account-setting/context fields. Flags must be absent, zero, or solely the documented canonical-signature flag; no account-setting flags. Single-sign and multisign representations are mutually appropriate under XRPL rules. These are conservative adapter restrictions, not claims that XRPL lacks other capabilities. A future implementation needs an explicit common-field allowlist and decoded-transaction admission; this descriptive schema does not implement it.

### Wire commitment

| Field | Proposed value / interpretation |
| --- | --- |
| MemoType | ASCII `receiptos/xrpl-receipt-anchor-v0`, 32 bytes, transported as hex |
| MemoFormat | ASCII `application/octet-stream`, 24 bytes, transported as hex |
| MemoData bytes 0-31 | `R`: decoded 32-byte SHA-256 root from supported `crystal.handoff-receipt-root.v1` |
| MemoData bytes 32-63 | `C`: 32-byte domain-separated SHA-256 claim commitment |
| Profile version | Fixed by exact MemoType/domain/schema; no parallel free version field |

`C = SHA256(ASCII("receiptos.xrpl-receipt-anchor-v0.claim") || 0x00 || UTF8(JCS(P)))`.

The **complete, closed** preimage P is:

```text
{
  receipt_profile: "crystal.handoff-receipt-root.v1",
  verification_profile: "receiptos.verify.generic.v2",
  surface: { claim, subject, scope, authority, policy, version, time,
             assumptions, dependencies, evidence_requirements },
  network_binding: {
    network_id,
    trusted_checkpoint: { ledger_index, ledger_hash }
  }
}
```

The existing surface schema retains artifact/commit/subject-version distinctions inside subject; `policy` here is the declaration's exact ID/version, not mutable caller trust configuration. `evidence_requirements` binds the declared basis; it does not establish that evidence exists. Caller-selected optional guarantees, dependency results, verification instant, trusted keys and accepted authority policy are still independent product obligations. They are not invented evidence fields. The compact anchor covers only the displayed declaration, not every consumer's future requirement.

The profile supports only the pinned root and generic verification identifiers listed above; extension needs explicit versioning. Decode the pinned native `0x` plus 64-hex root representation to 32 bytes after native root verification, then normalize the descriptor to lowercase hex. Do not hash a JSON export and relabel that hash as the native root.

**Root boundary:** native Crystal R covers its native object after excluding its entire top-level anchor. R is not identity of the whole v2 bundle, authenticated statement, every attachment or larger observation envelope. The future adapter must extract the declaration from the admitted/authenticated statement, run existing payload/manifest/attachment checks and associate R with that same bundle. The proposed pair R/C deliberately commits both; root equality alone does not establish their semantic association. Ledger observation metadata stays outside R to avoid circularity.

### Canonicalization / admission

JCS RFC 8785 is a proposed off-ledger commitment encoding. It does not replace the existing v0.2 `receiptos.verify.canonical-json.v1` profile. Reject duplicate keys before parsing, invalid UTF-8/Unicode, NaN/Infinity, non-I-JSON inputs and unsafe integers; preserve Unicode scalar values without NFC/NFD or case normalization. Existing ASCII property-name and bounded safe-integer surface restrictions remain. Array order is significant; the profile does not silently sort dependencies or claims. Absent required fields and null substitutions are rejected by the closed schema. Existing non-vacuity, unique dependency identities and valid time interval admission still apply.

Decode transaction hex strictly (even length, hex characters); compare actual **bytes**, not RPC JSON hex letter case. Canonical descriptor rendering uses uppercase Memo hex and lowercase digest hex. An equivalent lower-case transport rendering is not a different commitment after correct decoding/normalization. Exactly one Memo total is recognized: missing Memo -> NOT_ESTABLISHED; duplicate/extra/malformed Memo -> MALFORMED; unknown Type/Format/version -> UNSUPPORTED. No last-wins or first-matching rule.

Raw payload is exactly 64 bytes. Type+format+data are 120 decoded field bytes, **not** the complete serialized Memos size. XRPL limits the aggregate binary-serialized Memos field to 1 KB, including field/length/object/array overhead. This small layout appears comfortably within that cap; exact serialized size and codec conformance remain an implementation gate. JSON/hex character length is not the cap measurement. No codec was installed or executed for this architecture note.

### Ledger observation binding

Require the actual transaction's signed binary identity under XRPL hashing, its exact decoded Memo, actual Account, metadata result, validated ledger hash/index and selected network/checkpoint. Do not substitute SHA-256 of RPC JSON for XRPL's transaction hash. Preserve native transaction metadata separately.

`validated:true` and `meta.TransactionResult=tesSUCCESS` are both required by this proposed successful carrier. A validated ledger can also include failed `tec` transactions; those retain their native inclusion/result but do not satisfy the v0 success contract. `txnNotFound` or missing archive history is not proof of non-inclusion. A `LastLedgerSequence` value bounds admission but does not independently prove inclusion.

Network identity is caller-configured chain/checkpoint trust plus an independently obtained validated observation. Require the committed checkpoint index <= anchor ledger index and establish that checkpoint and anchor ledger are on the **same validated history**. A numeric NetworkID, endpoint URL, ledger index or saved boolean alone is insufficient. Mainnet/Testnet/Devnet omit transaction NetworkID; omission is not evidence of Mainnet. IDs >=1025 require it; cross-chain replay remains possible under documented conditions, including reused/low IDs. The intended checkpoint is hash-bound in C, but writing that hash is not itself chain authentication.

A first adapter can rely on an explicitly accepted, fully validating node and its consensus/validator trust policy, preserving the observation and trust basis in its report. No portable trustless transaction-inclusion or consensus proof is promised. Independent archive availability, checkpoint ancestry policy and historical authorization lookup must be concretized and tested before shipping an executable adapter.

### Native result and proposed product mapping

| Anchor-native result | Meaning under proposed contract | Proposed required-anchor projection |
| --- | --- | --- |
| ANCHOR_MATCH | Exact R/C, accepted Account, supported carrier and successful validated inclusion on selected chain established | Satisfies anchor obligation only; continue all product gates |
| ANCHOR_MISMATCH | Trusted inspected anchor differs from expected receipt commitment, Account or established network relation | CONTRADICTED |
| ANCHOR_NOT_ESTABLISHED | Missing/untrusted/unvalidated observation, archive gap or unsuccessful carrier | INSUFFICIENT_EVIDENCE; retain native result |
| ANCHOR_MALFORMED | Encoding, shape, duplicate/extra Memo or conflicting declaration problem | REJECTED_MALFORMED |
| ANCHOR_UNSUPPORTED | Unknown profile/version, unsupported carrier/context or unsupported network trust mode | UNSUPPORTED_PROFILE |

Admission and unsupported-context checks precede relation evaluation; missing trust cannot be turned into a demonstrated mismatch. Product malformed/contradiction precedence is retained. This mapping is **not installed** into v0.2's projection. No ANCHOR_MATCH -> VERIFIED shortcut is proposed. Signature/account authorization only establishes the account/transaction relation; its external business/issuer authority remains a separate claim gate.

## Examples and independent review

The two JSON files are visibly marked `SYNTHETIC_ARCHITECTURE_EXAMPLE_NOT_EXECUTED`. Their R and checkpoint/transaction identifiers are illustrative, not cryptographically verified native roots or actual XRPL hashes. `required_validated` is a required premise, not a captured node observation. There is no key, signature or issued transaction. The schema validates the `anchor` member only; examples are not live `verify` requests.

Both anchors and observation placeholders are identical. Matching caller surface A is compatible and merely continues the remaining layers. Request B changes claim ID and subject commit; anchor matching still compares ledger bytes to evidence A, while the independent product relation rejects A as support for B. Overall CONTRADICTED does not assert that B ran or failed.

Two independent read-only reviews checked XRPL semantics, public-source framing and hypothetical evidence boundaries. They independently recomputed both fixture hashes and byte layout using the deliberately restricted ASCII/safe-integer fixture domain, without reading expected output as an oracle. Minor clarifications about Tickets, Account policy, checkpoint ancestry, native-root decoding and whole-envelope boundaries were incorporated. These are document/fixture reviews, not live adapter or generic JCS conformance evidence.

## Authority extensions and uncertainties

DID is optional account-controlled verification-method/document resolution. Its content is not validated by XRPL as identity truth. Credentials bind issuer account, subject account and opaque issuer-defined CredentialType, 1-64 bytes; subject acceptance, optional expiry and deletion must be checked at the selected ledger, with explicit issuer/type acceptance. Neither establishes execution correctness or maps an arbitrary Git subject automatically to a ledger account.

Documented behavior is sufficiently clear for this architecture proposal. Unestablished deployment details remain: selected-network amendment activation, fully validating/archive trust configuration, checkpoint ancestry verification, native receipt-to-statement mapping implementation, actual signed binary codec size/conformance, historical key policy and transport lookup/evidence availability. Known Amendments returned dynamic Loading status in retrieved content; no activation claim is made. DID/Credentials are not required for the minimum adapter.

## Supported claims / explicit non-claims

Supported by current product source: separate typed claim boundary, conservative compatibility, preserved native replay/results, contradiction precedence and interface-only XRPL boundary. Supported by official XRPL documentation: no-setting AccountSet carrier, compact Memo bytes, validated transaction/result distinction, account signing and optional DID/Credential relations. The proposed encoding and example arithmetic are independently checked as documentation fixtures.

NOT established here: live XRPL integration, actual ledger inclusion, independent consensus authentication, arbitrary semantic entailment, provider/hardware authenticity, external execution provenance, proof of evidence availability, real-world issuer truth, exact codec conformance, new product test coverage, production readiness or official organizational endorsement.

**A new XRPL primitive is not currently necessary on the evidence available.** Existing primitives appear sufficient for the first bounded anchor convention. Typed claim/evidence relations, authority/subject semantics, profile discoverability and stronger canonical commitment semantics are **POSSIBLE GAP - NOT YET ESTABLISHED**. Implement and test the adapter first; only a reproduced concrete gap warrants protocol discussion. This note is not an XLS proposal, grant/hackathon application or an official Trustless-AI / XRPL Commons integration.

## Validation and preservation

- 42/42 local documentation-fixture checks: strict schema admission, independent Node/Python restricted-domain digest equality, byte layout, same-anchor A/B relation, nine malformed/unsupported descriptor shapes and sixteen digest-binding perturbations. One explicit control proves schema acceptance alone does not validate a hash; the independent relation catches that inconsistency. These are checks of the note's examples, not 42 new XRPL/product tests.
- PDF generated as two vector pages with base-14 fonts; rendered with Poppler and visually inspected, with text extraction and link/page checks. The host Poppler reported unrelated display-font configuration warnings; the actual used fonts and page layout rendered legibly.
- No runtime, adapter, existing schema/vector/test, upstream pin, vendor/license/dependency, existing audit/report or tag bytes changed. Only these documentation deliverables and the existing all-source documentation lock are intended changes.
- The 707-test/68-vector/14+14-mutant release results remain historical baseline evidence; the full release suite is not rerun or claimed as new XRPL evidence for this documentation-only task.
- Final fast checks: existing source-lock and provenance validation, intended-change inventory, LF/no-BOM and Git diff hygiene. The all-file source lock is refreshed only because its existing contract explicitly inventories new docs/PDF; all original 345 entries remain unchanged.

Stop at Pavlo review. Do not push, send to Florian, implement a live adapter or submit a protocol proposal under this task.
