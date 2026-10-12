# XRPL technical note review

Status: **READY_TO_SEND_FLORIAN**

Prepared 2026-10-12 UTC; narrowly repaired after independent cold review of note commit `c561932687e096e4a49ff1e3c3474265a6d1a74b`, before any communication to Florian Alonso / XRPL Commons. Documentation and synthetic examples only. No live adapter, transaction submission, XLS proposal, upstream change, push, PR, tag, release or email was performed.

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
- `docs/xrpl/examples/matching-claim.json` and `wrong-claim.json`: expressly synthetic, unexecuted contract examples, with assumed premises, illustrative ledger identifiers and separate native transaction/policy fields.
- `docs/xrpl/examples/anchor-controls.json`: 36 literal documentation-classification scenarios, including tec inclusion, separate success policy, unique type selection, unrelated Memo preservation and adversarial controls; no network observations.
- `docs/xrpl/REFERENCES.md`: exact official URLs, access date, supported claims, exact source pins and separately classified public 1inch fixture identities.
- `tools/validate-xrpl-note.mjs`: durable offline documentation-contract validator; no product-runtime imports, network calls or actual XRPL verification.
- `output/ReceiptOS_Verify_XRPL_Technical_Note.pdf`: two pages, same technical content, one flow diagram, existing ReceiptOS R geometry, near-black/white/cyan-violet visual style. The reused R is the existing screenshot-derived vector reconstruction, not an original brand master.

The finalized main note remains two PDF pages (1,075 whitespace-delimited Markdown words including source-friendly diagram notation and compact references). Full contract-review details below are outside the two-page main note.

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

A standalone `AccountSet` with **no account-setting options**, ordinary `Sequence > 0` and one uniquely typed ReceiptOS anchor Memo; other unrelated Memos are preserved and ignored by this adapter. Use normal `Fee` and `LastLedgerSequence` under caller-selected submission policy. No payment or account-domain change is required. Sequence/fee effects remain; this is not a free or side-effect-free submission.

Normal master-key, regular-key and multisign authorization may be recognized under actual ledger authorization rules. Require the actual `Account` to match caller-accepted submitting-account policy. A signer public key's derived account need not equal `Account`; do not impose that incorrect equality. Receipt authority and anchor submitter are separate roles: if the consumer requires them to be linked, a separately accepted binding is required.

V0 excludes Tickets, Delegate, Sponsor, inner/outer Batch and unknown account-setting/context fields. Flags must be absent, zero, or solely the documented canonical-signature flag; no account-setting flags. Single-sign and multisign representations are mutually appropriate under XRPL rules. These are conservative adapter restrictions, not claims that XRPL lacks other capabilities. A future implementation needs an explicit common-field allowlist and decoded-transaction admission; this descriptive schema does not implement it.

### Wire commitment

| Field | Proposed value / interpretation |
| --- | --- |
| MemoType | ASCII `urn:receiptos:xrpl-receipt-anchor-v0`, 36 bytes, transported as hex |
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

JCS RFC 8785 is used only for the portable XRPL claim commitment so independent non-ReceiptOS implementations can derive the same bytes from a published standard; it does not replace the existing v0.2 `receiptos.verify.canonical-json.v1` profile. No generic JCS conformance is established by the restricted ASCII/safe-integer fixture checks. Reject duplicate keys before parsing, invalid UTF-8/Unicode, NaN/Infinity, non-I-JSON inputs and unsafe integers; preserve Unicode scalar values without NFC/NFD or case normalization. Existing ASCII property-name and bounded safe-integer surface restrictions remain. Array order is significant; the profile does not silently sort dependencies or claims. Absent required fields and null substitutions are rejected by the closed schema. Existing non-vacuity, unique dependency identities and valid time interval admission still apply.

Decode transaction hex strictly (even length, hex characters); compare actual **bytes**, not RPC JSON hex letter case. Canonical descriptor rendering uses uppercase Memo hex and lowercase digest hex. An equivalent lower-case transport rendering is not a different commitment after correct decoding/normalization. For a supported v0 request, select by exact decoded MemoType bytes `urn:receiptos:xrpl-receipt-anchor-v0`. Zero exact matches -> ANCHOR_NOT_ESTABLISHED; more than one exact match -> ANCHOR_MALFORMED. Unrelated well-formed Memos are retained byte-for-byte and ignored, regardless of position. A malformed matching Memo -> ANCHOR_MALFORMED; an unsupported matching Format -> ANCHOR_UNSUPPORTED. No last-wins, first-match, prefix or order-based rule. Unknown requested/descriptor profile or version -> ANCHOR_UNSUPPORTED at profile admission, before selection. A supported v0 request seeing only a future/other MemoType has zero exact matches and remains NOT_ESTABLISHED; that other type is preserved rather than reinterpreted. Structurally invalid transport/hex inventory is malformed input, not a penalty for an otherwise valid unrelated Memo. The descriptor schema covers the selected anchor only, not the complete Memos array.

Raw payload is exactly 64 bytes. Type+format+data are 124 decoded field bytes, **not** the complete serialized Memos size. XRPL limits the aggregate binary-serialized Memos field to 1 KB, including field/length/object/array overhead. This small layout appears comfortably within that cap; exact serialized size and codec conformance remain an implementation gate. JSON/hex character length is not the cap measurement. No codec was installed or executed for this architecture note.

### Ledger observation binding

Require the actual transaction's signed binary identity under XRPL hashing, its exact decoded Memo, actual Account, metadata result, validated ledger hash/index and selected network/checkpoint. Do not substitute SHA-256 of RPC JSON for XRPL's transaction hash. Preserve native transaction metadata separately.

The ANCHOR relation is whether the exact accepted commitment is present in the actual transaction on the accepted validated ledger history. The TRANSACTION result is the independent native XRPL `meta.TransactionResult` (for example `tesSUCCESS` or `tecNO_PERMISSION`). A trusted validated transaction with the exact accepted anchor establishes ANCHOR_MATCH for either tesSUCCESS or a tec-class result. Transaction effect/result != anchor inclusion. No `tec => NOT_ESTABLISHED` inference is allowed. A consumer may separately require tesSUCCESS; an unsatisfied transaction-effect policy blocks its own product requirement without erasing ANCHOR_MATCH. If native metadata is absent but the exact transaction inclusion is otherwise independently established, preserve that absence separately; it does not erase the anchor fact. A purported validated observation containing a tem/tef/ter result contradicts official ledger-result constraints and is malformed observation data, not evidence of a failed anchor. [Official Finality](https://xrpl.org/docs/concepts/transactions/finality-of-results) and [tx](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/tx) were rechecked on 2026-10-12 UTC. `txnNotFound` or missing archive history is not proof of non-inclusion. A `LastLedgerSequence` value bounds admission but does not independently prove inclusion.

Network identity is caller-configured chain/checkpoint trust plus an independently obtained validated observation. Require the committed checkpoint index <= anchor ledger index and establish that checkpoint and anchor ledger are on the **same validated history**. A numeric NetworkID, endpoint URL, ledger index or saved boolean alone is insufficient. Mainnet/Testnet/Devnet omit transaction NetworkID; omission is not evidence of Mainnet. IDs >=1025 require it; cross-chain replay remains possible under documented conditions, including reused/low IDs. The intended checkpoint is hash-bound in C, but writing that hash is not itself chain authentication.

A first adapter can rely on an explicitly accepted, fully validating node and its consensus/validator trust policy, preserving the observation and trust basis in its report. No portable trustless transaction-inclusion or consensus proof is promised. Independent archive availability, checkpoint ancestry policy and historical authorization lookup must be concretized and tested before shipping an executable adapter.

### Native result and proposed product mapping

| Anchor-native result | Meaning under proposed contract | Proposed required-anchor projection |
| --- | --- | --- |
| ANCHOR_MATCH | Exact R/C, accepted Account, unique supported anchor Memo and validated inclusion on selected chain established, independently of tes/tec effect result | Satisfies anchor obligation only; continue all product gates |
| ANCHOR_MISMATCH | Trusted inspected anchor differs from expected receipt commitment, Account or established network relation | CONTRADICTED |
| ANCHOR_NOT_ESTABLISHED | Missing/untrusted/unvalidated observation, archive gap or zero matching profile Memos; not a tec result by itself | INSUFFICIENT_EVIDENCE; retain native result |
| ANCHOR_MALFORMED | Malformed encoding/shape, multiple exact-type anchor Memos or conflicting declaration problem; unrelated well-formed Memos are allowed | REJECTED_MALFORMED |
| ANCHOR_UNSUPPORTED | Unknown profile/version, unsupported carrier/context or unsupported network trust mode | UNSUPPORTED_PROFILE |

Admission and unsupported-context checks precede relation evaluation; missing trust cannot be turned into a demonstrated mismatch. Product malformed/contradiction precedence is retained. This mapping is **not installed** into v0.2's projection. No ANCHOR_MATCH -> VERIFIED shortcut is proposed. Signature/account authorization only establishes the account/transaction relation; its external business/issuer authority remains a separate claim gate.

## Examples and independent review

The two JSON files are visibly marked `SYNTHETIC_ARCHITECTURE_EXAMPLE_NOT_EXECUTED`. Their R and checkpoint/transaction identifiers are illustrative, not cryptographically verified native roots or actual XRPL hashes. `required_validated` is a required premise, not a captured node observation. There is no key, signature or issued transaction. The schema validates the `anchor` member only; examples are not live `verify` requests. Separate illustrative native TransactionResult and optional transaction-policy fields are neither computed ledger facts nor an inclusion gate.

Both anchors and observation placeholders are identical, including their illustrative tesSUCCESS native result; separate controls exercise tec without changing the anchor. Matching caller surface A is compatible and merely continues the remaining layers. Request B changes claim ID and subject commit; anchor matching still compares ledger bytes to evidence A, while the independent product relation rejects A as support for B. Overall CONTRADICTED does not assert that B ran or failed.

Two initial read-only reviews checked public-source framing and hypothetical evidence boundaries but did not catch the inclusion/result conflation subsequently identified by cold review. The correction is disclosed below. An additional read-only review checked the repaired contract against current official XRPL documentation. They independently recomputed both fixture hashes and byte layout using the deliberately restricted ASCII/safe-integer fixture domain, without reading expected output as an oracle. Minor clarifications about Tickets, Account policy, checkpoint ancestry, native-root decoding and whole-envelope boundaries were incorporated. These are document/fixture reviews, not live adapter or generic JCS conformance evidence.

## Authority extensions and uncertainties

DID is optional account-controlled verification-method/document resolution. Its content is not validated by XRPL as identity truth. Credentials bind issuer account, subject account and opaque issuer-defined CredentialType, 1-64 bytes; subject acceptance, optional expiry and deletion must be checked at the selected ledger, with explicit issuer/type acceptance. Neither establishes execution correctness or maps an arbitrary Git subject automatically to a ledger account.

Documented behavior is sufficiently clear for this architecture proposal. Unestablished deployment details remain: selected-network amendment activation, fully validating/archive trust configuration, checkpoint ancestry verification, native receipt-to-statement mapping implementation, actual signed binary codec size/conformance, historical key policy and transport lookup/evidence availability. Known Amendments returned dynamic Loading status in retrieved content; no activation claim is made. DID/Credentials are not required for the minimum adapter.

## Supported claims / explicit non-claims

Supported by current product source: separate typed claim boundary, conservative compatibility, preserved native replay/results, contradiction precedence and interface-only XRPL boundary. Supported by official XRPL documentation: no-setting AccountSet carrier, compact Memo bytes, validated transaction/result distinction, account signing and optional DID/Credential relations. The proposed encoding and example arithmetic are independently checked as documentation fixtures.

NOT established here: live XRPL integration, actual ledger inclusion, independent consensus authentication, arbitrary semantic entailment, provider/hardware authenticity, external execution provenance, proof of evidence availability, real-world issuer truth, exact codec conformance, new product test coverage, production readiness or official organizational endorsement.

**A new XRPL primitive is not currently necessary on the evidence available.** Existing primitives appear sufficient for the first bounded anchor convention. Typed claim/evidence relations, authority/subject semantics, profile discoverability and stronger canonical commitment semantics are **POSSIBLE GAP - NOT YET ESTABLISHED**. Implement and test the adapter first; only a reproduced concrete gap warrants protocol discussion. This note is not an XLS proposal, grant/hackathon application or an official Trustless-AI / XRPL Commons integration.

## Validation and preservation

- Current reproducible gate: **126/126 documentation-contract checks**, including all 36 preserved literal classification scenarios, independent finite claim-transfer comparison, restricted-domain digest/byte recomputation, strict schema admission, Memo selection/preservation/permutations, native-result/policy separation and explicit malformed/tampered controls. Run `node tools/validate-xrpl-note.mjs` after `npm ci` using existing dependencies. Expected cases remain in `docs/xrpl/examples/anchor-controls.json`; actual relations are recomputed rather than echoed. The historical 88-check repair result below is preserved as a prior observation, not the current durable gate. No live transaction, signature, XRPL codec, consensus/history/inclusion proof, product runtime or generic JCS conformance is validated.
- PDF generated as two vector pages with base-14 fonts; rendered with Poppler and visually inspected, with text extraction and link/page checks. The host Poppler reported unrelated display-font configuration warnings; the actual used fonts and page layout rendered legibly.
- No runtime, adapter, existing schema/vector/test, upstream pin, vendor/license/dependency, existing audit/report or tag bytes changed. Only these documentation deliverables and the existing all-source documentation lock are intended changes.
- The 707-test/68-vector/14+14-mutant release results remain historical baseline evidence; the full release suite is not rerun or claimed as new XRPL evidence for this documentation-only task.
- Final fast checks: existing source-lock and provenance validation, intended-change inventory, LF/no-BOM and Git diff hygiene. The all-file source lock is refreshed only because its existing contract explicitly inventories new docs/PDF; all original 345 entries remain unchanged.

Stop at Pavlo review. Do not push, send to Florian, implement a live adapter or submit a protocol proposal under this task.

## Cold-review repairs

This is an explicit post-review correction of `c561932`, not a new architecture or an implementation release.

| Repair | Old behavior | Repaired behavior | Why it matters |
| --- | --- | --- | --- |
| Inclusion / native result | Required validated:true AND tesSUCCESS; a validated tec carrier could be called NOT_ESTABLISHED | Exact accepted commitment on accepted validated history -> ANCHOR_MATCH for tesSUCCESS or tec; native TransactionResult and any tesSUCCESS policy remain separate | A failed transaction effect does not erase the committed Memo's ledger inclusion |
| MemoType | `receiptos/xrpl-receipt-anchor-v0` (32 ASCII bytes) | `urn:receiptos:xrpl-receipt-anchor-v0` (36 ASCII bytes), a PROPOSED RECEIPTOS CONVENTION | Clear URN relation identifier; not an XRPL-mandated name |
| Memo uniqueness | Exactly one Memo total; unrelated extra Memo could be MALFORMED | Exactly one decoded Type match; zero -> NOT_ESTABLISHED, multiple -> MALFORMED; preserve/ignore unrelated Memos | Prevent false rejection and avoid first/last/order-dependent selection |
| Why JCS | Standard named, portable rationale implicit | Explicit published-standard interoperation rationale; product internal canonicalization unchanged | Non-ReceiptOS implementations can derive published commitment bytes without claiming generic JCS conformance |

Exact MemoType ASCII: `urn:receiptos:xrpl-receipt-anchor-v0`.

Exact uppercase hex (72 digits / 36 bytes):

```text
75726E3A726563656970746F733A7872706C2D726563656970742D616E63686F722D7630
```

MemoFormat remains 24 decoded bytes; MemoData remains R[32] || C[32], 64 bytes. Own decoded fields total124 bytes, excluding serialization overhead and unrelated Memos. The unchanged 1 KB aggregate binary Memos cap applies to all Memos. The URN is fixed in MemoType, not in the existing P or hash domain, so fresh independent recomputation correctly preserves C = `4502e5ed22b9edb46fbdc15e77c58959772a8c461c82b02fa96c8ee2259dd24e`. Schema const, both MemoType fixture byte strings and PDF were regenerated. No old slash-Type is accepted as a v0 Type match by the repaired convention.

Added literal controls in `anchor-controls.json`:

- C01-C04: tes and tec both MATCH; separate tesSUCCESS policy SATISFIED/UNSATISFIED without changing anchor_native.
- C05-C08: unrelated Memos before/after/reordered remain MATCH and are preserved.
- C09-C12: zero / unrelated-only -> NOT_ESTABLISHED; identical/conflicting duplicate matching Types -> MALFORMED.
- C13-C17: odd/short/missing/unsupported/mismatched matching payload/format do not silently MATCH.
- C18-C20: unvalidated/untrusted observation -> NOT_ESTABLISHED; unknown requested version -> UNSUPPORTED.
- C21-C24: future/other Type is not v0; extra future Type, lowercase equivalent hex and unrelated Memo without Type are handled without false MALFORMED.
- C25-C27: malformed transport Type/data and impossible validated tem native result are MALFORMED observations.
- C28-C29: absent native result does not erase separately established inclusion; a required effect result remains NOT_ESTABLISHED.
- C30-C36: string-valued validated, case-equivalent duplicate Type, unrelated Format, unsupported-request precedence, malformed inventory, wrong accepted account and untrusted tec are explicit negative/ordering controls.
- Six permutations of the same three-Memo inventory preserve the anchor result; unrelated Memo order/bytes remain as received.

Prior cold-repair count at `df0b63b`: **88/88 documentation checks**, comprising42 retained +46 repair checks and36 distinct classification scenarios. Schema acceptance alone is still not a hash/inclusion proof. These examples/model do not implement the adapter, query XRPL, validate transaction signatures or establish generic JCS conformance. Product runtime and v0.2.0 remain unchanged.

Remaining uncertainty is unchanged: exact binary codec size/conformance, selected-network configuration/amendment enablement, independent archive/validator/checkpoint trust, historical account authority and full native receipt/statement association must be concretized before implementation. No unsafe Memo serialization restriction was found in official documentation: unrelated Memos are supported subject to the same aggregate cap. A new XRPL primitive remains unnecessary on the evidence available. Do not push or send to Florian.

## Final cold-review closure

This is another explicit post-review documentation/reproducibility repair, based on clean `docs/xrpl-technical-note` HEAD `df0b63b4afc1989d92c738fa4df4b89ad2167df1`. It is not an adapter redesign, runtime release or publication operation.

### Missing reproducibility artifact repaired

The prior report cited a local scratch validator that was not committed to the repository. That reference could not provide repository-contained reproducibility. The current evidence path is **`tools/validate-xrpl-note.mjs`**, committed alongside the note. It resolves inputs relative to its own repository location, imports only Node built-ins and the existing Ajv dependency/static schemas, and makes no product-runtime imports or network calls. It writes no product state.

Fresh-process command: `node tools/validate-xrpl-note.mjs` -> **PASS 126/126, 0 failed, 36 preserved classification cases**, exit 0. Its final line is machine-readable JSON with `kind: DOCUMENTATION_CONTRACT_VALIDATION_NOT_XRPL_INTEGRATION`. The finite oracle independently computes the documented claim domain/preimage digest, R[32] || C[32], exact A/B declaration equality and unique decoded MemoType selection under expressly assumed synthetic history/account premises. It compares derived observations to preserved literal expected cases. It does not establish actual ledger, signer or consensus authority. Its printable-ASCII/safe-integer subset is explicitly narrower than generic JCS.

An in-memory bad-reference-digest negative-control subprocess (no repository file alteration) returned **FAIL, 123/126 passed, 3 digest disagreements, exit 1**. This demonstrates failure propagation rather than accepting an expected value by construction. Unknown/malformed descriptors, tampered payload, schema-valid but inconsistent digest, nonempty case inventory, duplicate exact Types (both conflicting orders), all six unrelated-Memo permutations and out-of-subset canonicalization are also checked. Counts are finite documentation assertions, not 126 independent XRPL integrations or semantic branches.

### Public 1inch example and identity status

Section 2 now includes the inspectable Semantic ABI 1inch fixture. It illustrates **check X passed != claim Y established** with quote 100 -> 80, 1% relative floor 79.2 and independent absolute minimum 90. It makes no real swap execution, vulnerability or present XRPL bug claim. The same class of composition error is transferring a narrower valid guarantee to a broader claim; the mechanisms are different.

| Identity | Evidence status | Exact evidence / uncertainty |
| --- | --- | --- |
| Demo `https://trustless-ai.eth.limo/semantic-abi/` | VERIFIED_PUBLIC | Direct HTTPS 200; 206363 bytes; SHA-256 `54a8c50add641bda7652edd3bed4efad3b3e72dfefefa7809e3dbc9a661219b2`; same bytes as the pinned public UI. No live swap is established. |
| Public repo fixture | VERIFIED_PUBLIC | `trustless-ai/semantic-abi` main `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee`, `ui/index.html#L616`, blob `277fbd6a475cf05a3420399043f4fa1ac5bbe97b`. Numbers are explicitly illustrative. |
| CID `bafybeidh7brlghppljrsciyviqcphljew5i3ew7uzcxhzmhyinvcx6jhee` | VERIFIED_PUBLIC as gateway/public-record identity | Live `x-ipfs-roots` plus merged pin record. No independent whole-DAG reconstruction or ENS contenthash proof; ipfs.io returned 429. |
| Supplied contenthash reference `0x42a9b5c4` | SUPPLIED_NOT_INDEPENDENTLY_VERIFIED / OMIT_FROM_NOTE | Four bytes, not a complete transaction hash. It is retained here only as the supplied abbreviated description, never presented as a verified transaction identity. |
| Complete reported hash `0x42a9b5c42eebced58d54ae48d5dcd47b72ed24dcb9254a583aad683f69612d26` | VERIFIED_PUBLIC as pin-record value; SUPPLIED_NOT_INDEPENDENTLY_VERIFIED as chain fact | Mechanically read from CRC pin report; omitted from the two-page note. Two public Ethereum receipt lookups returned null, another endpoint failed. No independently confirmed inclusion/result/calldata/resolver relation; null does not establish non-inclusion. |
| Block `25928456` | VERIFIED_PUBLIC as pin-record value; SUPPLIED_NOT_INDEPENDENTLY_VERIFIED as chain fact | Public record reports this block. No independent chain confirmation; omitted from the two-page note. |
| CRC #93 | VERIFIED_PUBLIC | `trustless-ai/cross-reference-console/pull/93`, merged `2026-09-07T22:29:14Z`; merge `49ff0b895629e8469eeb125cb59434a0e022f895`, head `8322c8c0b090ea2f8ac1e8e3ad466a656227655c`; public pin record hash `ac397fdacad422119564ffaf19f1e6742fb51e26c398e04b6eec9eaf7f15a2a7`. Reported chain identities are not independently proven by a GitHub record. |
| Repo UI sync #8 | VERIFIED_PUBLIC | `trustless-ai/semantic-abi/pull/8`, merged `2026-09-07T22:29:42Z`; merge `d15c666dfccff17f7350fe97d2fc7b71cb2cbaee`, head `1e9503a65654a6053e0f7f38025633f8a326acd6`. Both PRs list `TMerlini` as author; no attribution from repository ownership. |

Exact URLs/access date and supported/non-supported claims are in `docs/xrpl/REFERENCES.md`. No identity in the main note is made to carry chain or execution semantics. The pinned public tree lacks the `adapters/oneinch` implementation named by the UI/pin text; this report therefore does not promote that source assertion to a demonstrated executable adapter.

### Preserved boundaries and final gates

- **No Hedera/Telos content added** to the note or PDF; no funding/grant claim was added. The author remains **Pavlo Tvardovskyi**.
- XRPL semantics from `df0b63b` are unchanged. Descriptor, matching/wrong-claim fixtures and all 36 preserved control cases are byte-identical to that commit. Exact accepted commitment on accepted validated history remains ANCHOR_MATCH with tesSUCCESS or tec; native TransactionResult stays separate. Required tesSUCCESS may be UNSATISFIED without erasing anchor inclusion.
- Unrelated Memos remain preserved/ignored independent of position/order; zero exact matching Types -> NOT_ESTABLISHED, duplicate exact matching Types -> MALFORMED. No first/last-match selection.
- Ledger inclusion != semantic correctness; transaction effect/result != anchor inclusion; A != B; ANCHOR_MATCH != global VERIFIED; account authorization != external/business authority; DID/Credentials != execution correctness; inclusion time != execution time; root != whole-envelope identity; missing history != proof of non-inclusion.
- **No live XRPL adapter, actual transaction/signature verification, portable consensus proof, protocol proposal or official organizational integration is claimed.** No upstream/runtime/product/dependency/license/tag changes, push, PR, release or email.
- Fresh `node tools/validate-xrpl-note.mjs`: 126/126 PASS. Existing `npm run check:sources`, `npm run check:provenance` and `git diff --check`: PASS after the intended documentation lock refresh. Source lock inventories 354 files; original 345 public-baseline entries are unchanged. Active fixtures have no old slash-form MemoType; no current evidence references the missing scratch validator. JSON/schema/reference identities and intended change inventory checked.
- Regenerated PDF: exactly two pages, unchanged readable 9.2-point body text, 12 clickable source links, readable flow, both pages rendered and visually inspected for clipping. Prose was tightened and paragraph spacing reduced by one point to accommodate the public example; no core XRPL contract details were removed.
- The full 707-test/68-vector/14+14-mutant product release suite was not rerun and is not new XRPL evidence. Current documentation gate and historical release evidence are separate.

Remaining technical uncertainty is unchanged: actual codec size/conformance, selected-network trust/amendments/checkpoint history, historical account authority and full receipt-root/statement association require future implementation work. Public 1inch transaction/block/ENS proof was not independently established and is not needed for the example. Existing XRPL primitives still appear sufficient for the first bounded anchor; no new primitive is necessary on the evidence available.

Stop after this local intended documentation commit. **Do not push or send Florian anything.**
