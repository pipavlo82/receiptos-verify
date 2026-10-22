# Offline anchor-check contract

`agent-action.local-manifest-log.v0` is a new, deliberately local profile. It reuses ReceiptOS Verify's `buildManifest` and `verifyInclusion` from `src/core/capsule.mjs`. It does not reuse Crystal's one-leaf local-merkle stub as if it were a general log, and does not reinterpret Chronicle history roots as signed checkpoints.

## Exact leaf and tree

For lowercase `0x` plus 64 hexadecimal receipt-root characters, the payload is those **66 ASCII bytes**, not the 32 decoded digest bytes. Its manifest entry is `{id:"receipt/" + hex,digest:SHA256(payload),size:66}`. The caller's verified receipt root must derive this exact entry.

The existing capsule algorithm uses domain `receiptos.verify.capsule-merkle.v1` followed by NUL, sorted entry IDs, canonical entry bytes, distinct leaf/node/root domain bytes and a count-bound root. An odd final node is duplicated. Its original proof schema carries index, leafCount and directional siblings. The wrapper delegates all Merkle mathematics and index/path checking to that implementation and additionally requires checkpoint `tree_size == proof.leafCount`.

## Checkpoint and caller selection

Checkpoint fields: `{body,id,key_id,signature_base64}`. The body is exactly `{schema,log_id,sequence,tree_size,merkle_root,previous_checkpoint_id}`. Sequence is a nonnegative safe integer; tree size is 1..65535; root and ID are bare lowercase SHA-256 hex. `previous_checkpoint_id` is null or a digest.

Signed bytes are ASCII `agent-action.local-manifest-checkpoint.v0` followed by NUL and the existing host's canonical UTF-8 body. The checkpoint ID is SHA-256 of those bytes. The same bytes are verified using Ed25519 and a caller-selected SPKI key. Selection is `{profile,log_id,checkpoint_id,trusted_keys,require_consistency}` with optional `previous_checkpoint_id`. Duplicate selected key IDs are refused. Neither an evidence-supplied key nor an untrusted checkpoint bootstraps authority.

The signature, exact checkpoint identity, selected checkpoint identity, selected log identity, leaf binding and Merkle proof are separate checks. Missing evidence produces an explicit unverifiable reason; contradictory well-formed evidence produces a refuted reason. Malformed structure does not become a false cryptographic assertion. The report retains the native subcheck states reached before failure.

## Optional consistency

When required but missing, consistency is unverifiable. When supplied, even if optional, it is checked. Profile `agent-action.full-manifest-extension.v0` supplies the previous signed checkpoint and complete previous/current records. Both manifest roots and sizes are independently recomputed, both signatures use selected keys, log identities agree, sequence increments by one, and checkpoint linkage agrees. Every old manifest entry must appear byte-identically in the new manifest.

This is finite **set extension**, suitable for a small inspectable fixture. It is not an efficient transparency consistency proof and does not prove an append order, external publication, freshness, global uniqueness or absence of equivocation. A caller may pin the exact previous checkpoint; otherwise only the supplied authenticated predecessor/link is checked. No public history is discovered.

## Tested failures and limits

Cases cover wrong receipt selection, wrong or valid-other leaf, wrong sibling, out-of-range index, wrong root, conflicting tree size (including a correctly signed one), wrong log, invalid signature, missing trust key, duplicate key identity, missing checkpoint, forged or conflicting checkpoint ID, unsupported proof profile, missing consistency, conflicting predecessor, and changed old records under valid signatures.

The strongest successful status is `LOCAL_MANIFEST_INCLUSION_UNDER_CALLER_SELECTED_KEY`. `public_log_authenticity` and `claim_authorization` remain `NOT_COVERED` in every case. The public deterministic signing seed is test material, not a production secret or independent log authority.
