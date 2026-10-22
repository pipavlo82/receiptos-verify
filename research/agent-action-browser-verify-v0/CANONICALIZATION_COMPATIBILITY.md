# Canonicalization compatibility

No historical `receiptos-c14n-v0` implementation was redefined. Exact original implementations were executed on 36 raw JSON vectors with 180 literal byte/rejection expectations; the browser also executes 36 native lens vectors. A shared golden vector alone is insufficient evidence of compatibility.

| Surface | Actual root exclusion | Key order | Numbers / raw admission |
|---|---|---|---|
| Crystal `45b46bf…` | Entire top-level `anchor` only | Recursive ECMAScript UTF-16 `.sort()` | `JSON.stringify` values after JS parsing |
| recompute-lens `70b44d…` | Entire top-level `anchor` only | Recursive ECMAScript UTF-16 `.sort()` | JS parsing/serialization; WebCrypto SHA-256 |
| recompute-kit `b9d4fc…` | Top-level `anchor` **and** `receipt_root` | Python Unicode code-point sorting | Python `json.dumps`, `ensure_ascii=False`; floats/nonfinite extensions not fully restricted |
| ReceiptOS Verify root path | Entire top-level `anchor` through pinned native Crystal | Native Crystal, after host admission | Strict raw parser, ASCII keys, safe integer syntax, scalar strings |
| ReceiptOS Verify content digest | No root-field exclusions | Host canonicalization | Same restricted host domain |

The matrix is an observation of these exact implementations, not a claim that their comments' “JCS” wording establishes full RFC 8785 conformance. The host content digest and receipt root serve different purposes and are compared separately.

## Observed differences

- Top-level `receipt_root` changes Crystal/lens roots but is removed by kit. A nested field with that name remains in all bodies. Nested `anchor` is likewise retained.
- Non-BMP versus BMP key ordering differs between UTF-16 and Unicode scalar order. Host raw admission rejects non-ASCII keys.
- `1.0`, exponent syntax and negative zero do not have identical parser/serializer behavior across runtimes. Host rejects those raw numeric forms. Python keeps distinctions such as float `1.0` that JS serializes as `1`.
- JS parsing rounds unsafe integer `9007199254740993`; Python retains the integer. Host refuses it. Nonfinite overflow can serialize as `null` in JS while Python emits an extension token; host refuses it.
- Duplicate keys, including escaped and nested duplicates, are lost by permissive parsers. Host rejects them before hashing. A supplied parsed object cannot recover discarded duplicates; callers should pass original raw JSON.
- Missing and explicit null differ. Unicode normalization is not applied; composed and decomposed values remain distinct bytes. Scalar Unicode values, escaping, arrays and nested order have explicit controls.
- Lens's top-level assignment into `{}` drops the tested `__proto__` member; Crystal's spread copy retains it. Host rejects that key. Unpaired surrogate input is outside the common domain.

The exact raw inputs, literal UTF-8 strings and rejection expectations are in [fixtures/canonicalization.json](fixtures/canonicalization.json). The generator [tools/define-canonical-cases.py](tools/define-canonical-cases.py) writes literal oracles; it does not call a tested canonicalizer to create expected bytes. Native results record canonical hex, status and root. There are **17 common-domain controls** and **19 cases with differing root-path acceptance or bytes**.

## New compatibility domain

`agent-action.receiptos-common-json.v0` uses the unchanged host's raw strict parser and canonicalizer, and forbids a top-level `receipt_root`. The only receipt identity carrier is `anchor.receipt_root`; this profile permits no other anchor fields. Keys are admitted ASCII keys; strings must contain Unicode scalar values; numbers use safe integer lexical forms, excluding negative zero, exponent and fractional syntax. Duplicate decoded keys and invalid UTF-8 are rejected. Host parser depth/size limits also apply.

This is a restricted intersection for newly issued action receipts. It does not declare all JSON interoperable or upgrade historical evidence. Raw admission precedes removal of `anchor`, so malformed excluded data is still rejected. Within admitted receipts the four root paths match byte-for-byte; host full-content digests intentionally retain the anchor.

Normal, repeated and optimized Python runs compare exact semantic output. Browser results come from Chromium's execution of the original lens module, not a copied canonicalizer. JSON input excludes JavaScript-only values such as `undefined`, functions and BigInt; no cross-runtime guarantee is claimed for those values.
