import { createHash } from 'node:crypto';
export const descriptor = Object.freeze({
  profileId: 'receiptos.verify.continuity.v1', sourceRepository: 'pipavlo82/Chronicle',
  sourceCommit: 'c467b48fd18fc8ec86f10582befa35946ce41914', license: 'Apache-2.0', maturity: 'EXPERIMENTAL',
  mode: 'PUBLIC_SPEC_REIMPLEMENTATION_WITH_EXPLICIT_CONTINUITY_EXTENSION',
  capabilities: ['native-entry-identity', 'exact-proof-reference', 'product-sequence-predecessor', 'historical-current-separation', 'whole-envelope-binding'],
  requiredEvidence: ['ordered supplied entries', 'requested anchor identity', 'original envelope for whole-envelope claims'],
  nativeVocabulary: ['new', 'idempotent', 'conflict'],
});
const limitations = [
  'Chronicle native identity vocabulary is retained; sequence/predecessor/currentness are a new ReceiptOS profile, not an upstream native verifier.',
  'Supplied history establishes local continuity only, not authority, completeness, a transparency log, global latest state or official provenance.',
  'Derived-entry equality does not bind all original observation-envelope bytes. Whole-envelope binding is a separate canonical product obligation.',
];
const stable = x => x === null || typeof x !== 'object' ? JSON.stringify(x) : Array.isArray(x) ? '[' + x.map(stable).join(',') + ']' : '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + stable(x[k])).join(',') + '}';
const eq = (a, b) => stable(a) === stable(b);
function result(status, reasons, identity, selected, later, binding) {
  return { status, reasonCodes: reasons, nativeResult: { identity_classification: identity, selected_entry: selected ?? null, later_entries: later ?? [], whole_envelope_binding: binding ?? 'NOT_ESTABLISHED' }, limitations: [...limitations], provenance: { ...descriptor } };
}
export function evaluateContinuity(history, request) {
  if (request == null) return result('NOT_REQUESTED', ['CONTINUITY_NOT_REQUESTED'], null);
  if (!Array.isArray(history?.entries) || history.entries.length === 0) return result('UNVERIFIABLE', ['HISTORY_EVIDENCE_MISSING'], null);
  if (!request || !['historical', 'current'].includes(request.mode) || typeof request.entry_id !== 'string') return result('UNVERIFIABLE', ['CONTINUITY_REQUEST_UNSUPPORTED'], null);
  const entries = history.entries, ids = new Map(), refs = new Map(); let identity = 'new', previous = null;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (!entry || typeof entry.entry_id !== 'string' || !entry.entry_id || typeof entry.proof_object_ref !== 'string' || !entry.proof_object_ref || typeof entry.receipt_root !== 'string' || !entry.receipt_root) return result('UNVERIFIABLE', ['HISTORY_ENTRY_REFERENCE_MISSING'], null);
    const duplicate = ids.get(entry.entry_id) ?? refs.get(entry.proof_object_ref);
    if (duplicate) {
      if (!eq(duplicate, entry)) return result('VIOLATED', ['HISTORY_IDENTITY_CONFLICT'], 'conflict');
      identity = 'idempotent';
      // Idempotent duplicate observations are not a new sequence step.
      continue;
    }
    if (!Number.isSafeInteger(entry.sequence) || entry.sequence < 0) return result('UNVERIFIABLE', ['HISTORY_SEQUENCE_MISSING'], identity);
    if (!Object.hasOwn(entry, 'predecessor_ref')) return result('UNVERIFIABLE', ['HISTORY_PREDECESSOR_MISSING'], identity);
    if ((!previous && (entry.predecessor_ref !== null || entry.sequence !== 0)) || (previous && (entry.predecessor_ref !== previous.entry_id || entry.sequence !== previous.sequence + 1))) return result('VIOLATED', ['HISTORY_CONTINUITY_BROKEN'], identity);
    ids.set(entry.entry_id, entry); refs.set(entry.proof_object_ref, entry);
    previous = entry;
  }
  const selected = ids.get(request.entry_id);
  if (!selected) return result('UNVERIFIABLE', ['HISTORICAL_ANCHOR_UNAVAILABLE'], identity);
  const later = [...ids.values()].filter(x => x.sequence > selected.sequence && eq(x.subject, selected.subject));
  if (!Object.hasOwn(request, 'subject') || !Object.hasOwn(request, 'state') || !Object.hasOwn(selected, 'subject') || !Object.hasOwn(selected, 'state')) return result('UNVERIFIABLE', ['HISTORY_QUERY_BINDING_MISSING'], identity, selected, later);
  if (!eq(selected.subject, request.subject) || !eq(selected.state, request.state)) return result('VIOLATED', ['HISTORY_REQUEST_NOT_BOUND'], identity, selected, later);
  for (const field of ['receipt_root', 'proof_object_ref']) if (Object.hasOwn(request, field) && selected[field] !== request[field]) return result('VIOLATED', ['HISTORY_REFERENCE_NOT_BOUND'], identity, selected, later);
  if (request.mode === 'current' && later.length) return result('VIOLATED', ['LATER_STATE_SUPERSEDES_CURRENT_CLAIM'], identity, selected, later);
  let binding = 'NOT_ESTABLISHED'; const reasons = [];
  if (request.observation_envelope_digest !== undefined) {
    if (typeof request.observation_envelope_digest !== 'string' || !/^[0-9a-f]{64}$/.test(request.observation_envelope_digest)) return result('UNVERIFIABLE', ['WHOLE_OBSERVATION_ENVELOPE_DIGEST_UNSUPPORTED'], identity, selected, later);
    const observed = createHash('sha256').update(stable(history), 'utf8').digest('hex');
    if (observed !== request.observation_envelope_digest) return result('VIOLATED', ['WHOLE_OBSERVATION_ENVELOPE_MISMATCH'], identity, selected, later, 'MISMATCH');
    binding = 'BOUND';
  } else {
    reasons.push('WHOLE_OBSERVATION_ENVELOPE_NOT_BOUND');
    if (request.require_whole_envelope_binding === true) return result('UNVERIFIABLE', reasons, identity, selected, later, binding);
  }
  return result('PRESERVED', [request.mode === 'historical' && later.length ? 'LATER_STATE_NONBLOCKING_FOR_HISTORICAL_CLAIM' : 'LOCAL_CONTINUITY_PRESERVED', ...reasons], identity, selected, later, binding);
}
