// Minimal closed authority-class set for the v0 draft. Overall v0 is not frozen.
// Claim names are intentionally not authority-class aliases.
export const AUTHORITY_CLASSES = [
  "INDEPENDENT_JUDGMENT",
  "CRYPTOGRAPHIC_VERIFICATION",
  "EX_POST_VALIDATION",
  "INFRASTRUCTURE_ATTESTATION",
  "ONCHAIN_COMMITMENT",
  "INDEPENDENT_RECOMPUTATION",
  "KEY_BINDING_AUTHORITY",
  "SEMANTIC_VERIFICATION",
];

// Authority labels have no global satisfy-closure. In particular,
// INDEPENDENT_RECOMPUTATION is not a universal SEMANTIC_VERIFICATION coercion.
// The linker recognizes that edge only for the exact claim, scope, and temporal
// boundary that was re-derived.
