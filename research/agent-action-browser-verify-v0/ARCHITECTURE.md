# Architecture and protected relation

The protected relation is exact claim/evidence compatibility under a caller-selected subject, action, authority, scope and input commitment. Equality of a receipt digest, or valid membership under a selected checkpoint, must not admit a materially different action or a stronger execution claim.

```text
caller request + evidence package
    |
    +--> existing host strict JSON admission
    +--> native Crystal receipt identity
    +--> existing verifyV2 -> Interpoll signed action / supplied trace
    +--> finite local transition replay
    +--> existing capsule Merkle verifier -> selected checkpoint signature
    |
    +--> versioned product projection, retaining native results

browser: original recompute-lens receipt recipe -> exact canonical bytes/root
    + loopback call to the same host profile -> readable result + full details
```

There is no new universal verifier, registry, execution engine or alternative ReceiptOS core. Research modules compose the existing public interfaces. No existing host adapter registration, release profile, source pin or historical artifact is changed. The profile is hosted as an isolated recipe beside the existing architecture; it is not advertised as supported by the released host CLI.

## Relations and authority

| Evidence | Established here | Not established |
|---|---|---|
| Crystal root matches | Equality to canonical committed body bytes under the identified convention | Truth, identity of a real agent, execution |
| Host signed envelope and native signed intent | Selected key/action/premise compatibility under the existing host policy | Correct judgment or real service observation |
| Local replay returns the selected result | This finite function on these supplied inputs reproduces that result | Historical external execution, general program correctness |
| Merkle inclusion | Exact receipt-root leaf is in the count-bound selected manifest | Public-log authenticity, permission, non-equivocation |
| Selected Ed25519 checkpoint signature | Signature verifies under the caller's selected laboratory key | Independent key ownership or public trust |
| Full-manifest extension | Old selected entries remain identical in a signed linked successor | CT consistency, global ordering or freshness |

The demonstration actor and checkpoint keys are public test material. Anyone can reproduce their signatures. The display agent ID is a caller-selected label bound to a key, not a certified real-world identity. `INDEPENDENT_RECOMPUTATION` in the inherited host authority is an evidence-mechanism label; it is not an independent organizational review of this work.

## Existing ecosystem boundaries

RVR separates verification outcome and recomputation status. This experiment preserves that distinction but creates no new ERC-8404 profile or claim of RVR conformance. The current native Interpoll adapter is sufficient for the bounded action claim.

TSEI's exact transformation/adoption lesson is applied to the versioned canonical-byte compatibility boundary. No TSEI proof is manufactured. Chronicle's admitted entry/history interfaces recompute receipt roots but do not supply the selected authenticated checkpoint protocol required here; Chronicle is inspected, not relabeled as a public log.

Semantic ABI's exact claim/authority/scope compatibility informs the non-promotion rule. The host already has the native neutral adapter; a second linker is unnecessary for this one-action profile. PRF/RSI/SEG supply methodology for independent expectations, distinguishing witnesses and preserving native outcomes. Agent SDK's chain-specific action hashes are not a chain-neutral action representation, so they are not forced into this profile.

## Reproducibility and integration boundary

External source pins are in [source-pins.json](source-pins.json). Host dependencies remain those of its unchanged lockfile. Research runtime source identity is checked explicitly; upstream metadata is not treated as code verification. The browser build checks the real lens module SHA-256 and repository HEAD before transient local compilation. Exact asset bytes are checked on server start.

The loopback service has fixed asset routes and one verification endpoint. It accepts raw JSON strings, denies foreign origins and hostnames, and exposes no file-path or command-execution endpoint. It is a laboratory host, not a hardened multi-user service. The browser independently recomputes receipt identity, but trusts the local host for signature, claim and Merkle evaluation. A fabricated local host can fabricate those non-browser results; no remote attestation is claimed.
