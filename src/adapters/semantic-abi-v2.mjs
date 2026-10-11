// Product wrapper over the unchanged public neutral Semantic ABI runtime.
// Product surfaces retain fields the native v0 manifest does not represent.
import { canonicalize } from '../core/strict-json.mjs';
import { compareClaimSurfaces } from '../core/claim-surface.mjs';
import { AUTHORITY_CLASSES } from '../../vendor/semantic-abi-v02/runner/src/classes.mjs';
import { linkEdge } from '../../vendor/semantic-abi-v02/runner/src/linker.mjs';
import { validateManifest } from '../../vendor/semantic-abi-v02/runner/src/manifest.mjs';
import { evaluate, PAIR } from '../../vendor/semantic-abi-v02/runner/src/evaluate.mjs';

export const descriptor = Object.freeze({
  profileId: 'receiptos.verify.semantic-abi.v2',
  sourceRepository: 'trustless-ai/semantic-abi',
  sourceCommit: 'd15c666dfccff17f7350fe97d2fc7b71cb2cbaee',
  sourcePaths: ['runner/src/classes.mjs', 'runner/src/linker.mjs', 'runner/src/manifest.mjs', 'runner/src/evaluate.mjs'],
  license: 'Apache-2.0',
  maturity: 'EXPERIMENTAL',
  integrationMode: 'PINNED_SOURCE',
  capabilities: ['native-manifest-validation', 'native-semantic-link', 'native-pair-evaluation', 'generic-claim-surface-compatibility'],
  requiredEvidence: ['evidence-declared semantic surface', 'independently established evidence basis and dependencies'],
  nativeVocabulary: ['valid', 'TYPE_ERROR', 'PRESERVED', 'VIOLATED', 'UNVERIFIABLE', 'PASS', 'FAIL', 'CANNOT_CHECK'],
});

const limitations = Object.freeze([
  'The unchanged public neutral linker and pair evaluator execute locally; no private or commercial adapter is imported.',
  'The native v0 claim/scope/temporal strings embed product canonical JSON. This encoding is not native upstream manifest interchange conformance.',
  'Subject, artifact, authority identity, policy, version, applicability, assumptions, dependencies and accepted evidence are checked by the separate product relation.',
  'A native valid edge or backend-conformance PASS does not establish product VERIFIED, authority authenticity or real-world truth.',
  'No detached pair oracle is invented. Pair conformance is evaluated only when an independently selected context.expected_pair is supplied.',
]);

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const encoded = value => canonicalize(value).toString('utf8');

// Native v0 requires strings and exactly one temporal discriminator. The tagged
// interval is a lossless identity encoding, not a claim that it is wall-clock time.
function nativeClaim(surface) {
  if (!record(surface) || !record(surface.claim) || !record(surface.scope)
      || !record(surface.authority) || !text(surface.authority.class) || !record(surface.time)) return null;
  return {
    claim_type: encoded(surface.claim),
    authority_class: surface.authority.class,
    scope: encoded(surface.scope),
    verification_time: encoded({ profile: 'receiptos.interval.v2', ...surface.time }),
  };
}

function manifest(claim, endpoint) {
  return { component: 'receiptos-verify.generic-claim-boundary', declarations: [{
    endpoint, consumes: [], establishes: [claim], does_not_establish: [],
  }] };
}

function pairEvaluation(expectedPair, observedPair, context) {
  if (expectedPair === null) return null;
  return evaluate({
    id: text(context.vector_id) ? context.vector_id : 'caller-selected-semantic-pair',
    relation: 'native-semantic-claim-edge',
    oracle: expectedPair,
  }, { name: 'pinned-public-semantic-abi-linker', observe: () => observedPair });
}

/**
 * expected/observed are caller-selected and evidence-declared generic surfaces.
 * context.expected_pair is an OPTIONAL detached test oracle, never a receipt
 * field. It only grades native observation and cannot alter compatibility.
 */
export function evaluateSemanticAbi({ expected, observed, context = {} } = {}) {
  if (!record(context)) context = {};
  const compatibility = compareClaimSurfaces(expected, observed, context);
  const expectedPair = Object.hasOwn(context, 'expected_pair') ? context.expected_pair : null;
  let observedPair = PAIR.UNVERIFIABLE;
  let nativeResult = { manifest_validation: null, link: null, pair_evaluation: null };
  let status = compatibility.status;
  const reasons = [...compatibility.reasonCodes];
  try {
    const required = nativeClaim(expected), established = nativeClaim(observed);
    if (required === null || established === null) {
      if (status === 'COMPATIBLE') status = 'INSUFFICIENT_EVIDENCE';
      reasons.push('SEMANTIC_ABI_DECLARATION_MISSING');
    } else if (!AUTHORITY_CLASSES.includes(required.authority_class) || !AUTHORITY_CLASSES.includes(established.authority_class)) {
      if (status !== 'CONTRADICTED') status = 'UNSUPPORTED';
      reasons.push('SEMANTIC_ABI_AUTHORITY_UNSUPPORTED');
    } else {
      const producer = { component: 'receiptos-verify.evidence', establishes: [established], does_not_establish: [] };
      const producerValidation = validateManifest(manifest(established, '/evidence'));
      const consumerValidation = validateManifest(manifest(required, '/requested'));
      nativeResult.manifest_validation = { producer: producerValidation, consumer: consumerValidation };
      if (!producerValidation.valid || !consumerValidation.valid) {
        if (status !== 'CONTRADICTED') status = 'INSUFFICIENT_EVIDENCE';
        reasons.push('SEMANTIC_ABI_DECLARATION_MALFORMED');
      } else {
        nativeResult.link = linkEdge(producer, required);
        observedPair = nativeResult.link.valid ? PAIR.PRESERVED : PAIR.VIOLATED;
        if (!nativeResult.link.valid) {
          status = 'CONTRADICTED';
          reasons.push('SEMANTIC_ABI_TYPE_ERROR');
        }
      }
    }
  } catch (error) {
    if (status !== 'CONTRADICTED') status = 'INSUFFICIENT_EVIDENCE';
    reasons.push('SEMANTIC_ABI_CANNOT_EVALUATE');
    nativeResult.failure = { code: error?.code ?? 'NATIVE_EVALUATION_ERROR' };
  }
  if (expectedPair !== null && !Object.values(PAIR).includes(expectedPair)) {
    if (status !== 'CONTRADICTED') status = 'UNSUPPORTED';
    reasons.push('SEMANTIC_ABI_ORACLE_UNSUPPORTED');
  } else nativeResult.pair_evaluation = pairEvaluation(expectedPair, observedPair, context);
  return {
    status,
    reasonCodes: [...new Set(reasons)],
    nativeResult,
    compatibility,
    expectedSemanticPair: expectedPair,
    observedSemanticPair: observedPair,
    requestedSurface: expected ?? null,
    evidenceSurface: observed ?? null,
    provenance: { ...descriptor },
    limitations: [...limitations],
  };
}
