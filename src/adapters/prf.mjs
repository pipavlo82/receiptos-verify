// Fresh product guarantee objects; no PRF Python source or fixtures are copied.
export const descriptor = Object.freeze({
  profileId: 'receiptos.verify.guarantee-preservation.v1', sourceRepository: 'pipavlo82/protected-relation-fixtures',
  sourceCommit: 'f525737069dc4cef7741f805d08a988912f4454f', license: 'MIT public upstream; new code Apache-2.0',
  maturity: 'EXPERIMENTAL', mode: 'PUBLIC_SPEC_REIMPLEMENTATION_WITH_PRODUCT_INPUT_SHAPE',
  capabilities: ['exact-obligations', 'dependency-coverage', 'exact-subject-scope-authority', 'three-valued-preservation'],
  requiredEvidence: ['caller-accepted bounded dependency basis', 'independently observed obligation results'],
  nativeVocabulary: ['PRESERVED', 'VIOLATED', 'UNVERIFIABLE'],
});
const limitations = [
  'Source PR14 is OPEN and unmerged at exact f525737069dc4cef7741f805d08a988912f4454f; this profile is EXPERIMENTAL.',
  'This original reimplementation uses product guarantee objects, not the upstream envelope wire schema or Python evaluator.',
  'Accepted dependencies and obligation observations are caller premises; completeness, soundness, acceptance authority and global truth are not proved.',
];
const stable = x => x === null || typeof x !== 'object' ? JSON.stringify(x) : Array.isArray(x) ? '[' + x.map(stable).join(',') + ']' : '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + stable(x[k])).join(',') + '}';
const eq = (a, b) => stable(a) === stable(b);
const list = value => Array.isArray(value) && value.every(x => typeof x === 'string' && x.length > 0) && new Set(value).size === value.length;
const bound = value => typeof value === 'string' ? value.length > 0 : value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
function out(status, reasons, checks = [], native = []) {
  return { status, reasonCodes: reasons, nativeResult: { outcome: status, checks, native_upstream: native, establishes: status === 'PRESERVED' ? [...new Set(checks.map(x => x.guarantee_id))] : [] }, limitations: [...limitations], provenance: { ...descriptor } };
}
export function evaluateGuarantees(upstreamGuarantees, requestedGuarantees, downstream, context = {}) {
  if (Array.isArray(requestedGuarantees) && requestedGuarantees.length === 0) return out('NOT_REQUESTED', ['GUARANTEES_NOT_REQUESTED']);
  if (!Array.isArray(upstreamGuarantees) || !Array.isArray(requestedGuarantees) || !Array.isArray(downstream?.guarantees)) return out('UNVERIFIABLE', ['GUARANTEE_INPUT_MISSING']);
  if (!context || typeof context !== 'object' || Array.isArray(context)) context = {};
  const upstream = new Map(), carried = new Map(), unknown = [], negative = [], checks = [];
  for (const [rows, map] of [[upstreamGuarantees, upstream], [downstream.guarantees, carried]]) for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id || map.has(row.id)) return out('UNVERIFIABLE', ['GUARANTEE_IDENTITY_AMBIGUOUS']);
    map.set(row.id, row);
  }
  if (context.basis_accepted !== true || typeof context.accepted_basis_id !== 'string' || !context.accepted_basis_id) unknown.push('DEPENDENCY_BASIS_NOT_SEPARATELY_ACCEPTED');
  if (!list(context.supported_guarantee_ids)) unknown.push('GUARANTEE_AUTHORITY_UNESTABLISHED');
  const supported = list(context.supported_guarantee_ids) ? context.supported_guarantee_ids : [];
  const assumptions = list(context.established_assumptions) ? context.established_assumptions : [];
  const evidence = list(context.evidence_classes) ? context.evidence_classes : [];
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { unknown.push('CIRCULAR_GUARANTEE_DEPENDENCY'); return; }
    if (visited.has(id)) return;
    const row = upstream.get(id);
    if (!row || !list(row.dependencies)) { unknown.push('DEPENDENCY_EVIDENCE_UNAVAILABLE'); return; }
    visiting.add(id);
    for (const dep of row.dependencies) visit(dep);
    visiting.delete(id); visited.add(id);
  }
  const pending = [...requestedGuarantees], scheduled = new Set(requestedGuarantees.map(x => x?.id));
  if (scheduled.size !== requestedGuarantees.length) return out('UNVERIFIABLE', ['GUARANTEE_REQUEST_IDENTITY_AMBIGUOUS']);
  for (const request of pending) {
    if (!request || typeof request.id !== 'string') { unknown.push('GUARANTEE_REQUEST_MALFORMED'); continue; }
    const source = upstream.get(request.id), target = carried.get(request.id);
    if (!source) { unknown.push('UPSTREAM_GUARANTEE_UNESTABLISHED'); continue; }
    visit(request.id);
    if (list(source.dependencies)) for (const id of source.dependencies) if (upstream.has(id) && !scheduled.has(id)) {
      scheduled.add(id); pending.push(upstream.get(id));
    }
    if (!supported.includes(request.id)) unknown.push('GUARANTEE_AUTHORITY_UNESTABLISHED');
    if (typeof context.authority_class !== 'string' || !context.authority_class || context.authority_class !== source.authority_class) unknown.push('GUARANTEE_AUTHORITY_UNESTABLISHED');
    if (!target) { negative.push('DOWNSTREAM_GUARANTEE_DROPPED'); continue; }
    for (const key of ['subject', 'scope', 'authority_class']) {
      if (!(key in source) || !(key in request) || !(key in target)) unknown.push('GUARANTEE_CONTEXT_MISSING');
      else if (!eq(source[key], request[key]) || !eq(target[key], request[key])) negative.push('GUARANTEE_' + key.toUpperCase() + '_MISMATCH');
    }
    for (const row of [source, request, target]) if (!bound(row.subject) || !bound(row.scope) || typeof row.authority_class !== 'string' || !row.authority_class || !list(row.dependencies) || !list(row.assumptions) || !list(row.evidence_requirements) || !Array.isArray(row.obligations) || row.obligations.length === 0 || row.obligations.some(x => !x || typeof x.predicate !== 'string' || !x.predicate)) unknown.push('GUARANTEE_CONTRACT_INCOMPLETE');
    if (unknown.includes('GUARANTEE_CONTRACT_INCOMPLETE')) continue;
    if (!eq([...source.dependencies].sort(), [...request.dependencies].sort()) || !eq([...target.dependencies].sort(), [...request.dependencies].sort())) negative.push('GUARANTEE_DEPENDENCY_CONTRACT_CHANGED');
    for (const row of [source, request, target]) if (new Set(row.obligations.map(x => x?.id)).size !== row.obligations.length) unknown.push('OBLIGATION_IDENTITY_AMBIGUOUS');
    const sourceObligations = new Map(source.obligations.map(x => [x?.id, x]));
    for (const obligation of request.obligations) if (!eq(sourceObligations.get(obligation?.id), obligation)) negative.push('UPSTREAM_OBLIGATION_NOT_ESTABLISHED');
    const requestedObligations = new Map();
    for (const obligation of [...source.obligations, ...request.obligations]) {
      if (!obligation || typeof obligation.id !== 'string' || !obligation.id) { unknown.push('OBLIGATION_IDENTITY_MISSING'); continue; }
      const existing = requestedObligations.get(obligation.id);
      if (existing && !eq(existing, obligation)) negative.push('OBLIGATION_CONTRACT_CHANGED');
      requestedObligations.set(obligation.id, obligation);
    }
    const targetObligations = new Map(target.obligations.map(x => [x?.id, x]));
    if (targetObligations.size !== target.obligations.length) unknown.push('OBLIGATION_IDENTITY_AMBIGUOUS');
    if (targetObligations.size !== requestedObligations.size) negative.push('DOWNSTREAM_OBLIGATION_CONTRACT_CHANGED');
    for (const [id, obligation] of requestedObligations) {
      if (!eq(targetObligations.get(id), obligation)) negative.push('DOWNSTREAM_OBLIGATION_NOT_PRESERVED');
      const observed = context.obligation_results?.[request.id]?.[id];
      checks.push({ guarantee_id: request.id, dependency_id: id, outcome: observed === true ? 'TRUE' : observed === false ? 'FALSE' : 'UNKNOWN' });
      if (observed === false) negative.push('BOUND_GUARANTEE_OBLIGATION_REFUTED');
      else if (observed !== true) unknown.push('REQUIRED_GUARANTEE_RELATION_UNESTABLISHED');
    }
    for (const dependency of new Set([...source.dependencies, ...request.dependencies])) {
      if (!target.dependencies.includes(dependency) || !carried.has(dependency)) negative.push('GUARANTEE_DEPENDENCY_DROPPED');
      if (!upstream.has(dependency) || !supported.includes(dependency)) unknown.push('DEPENDENCY_EVIDENCE_UNAVAILABLE');
    }
    for (const assumption of new Set([...source.assumptions, ...request.assumptions, ...target.assumptions])) if (!assumptions.includes(assumption)) unknown.push('GUARANTEE_ASSUMPTION_UNESTABLISHED');
    for (const item of new Set([...source.evidence_requirements, ...request.evidence_requirements, ...target.evidence_requirements])) if (!evidence.includes(item)) unknown.push('GUARANTEE_EVIDENCE_CLASS_MISSING');
  }
  const native = upstreamGuarantees.filter(x => x?.nativeResult !== undefined).map(x => ({ id: x.id, nativeResult: x.nativeResult }));
  // Preserve PRF's UNKNOWN-before-FALSE rule: absent premises never become a violation claim.
  if (unknown.length) return out('UNVERIFIABLE', [...new Set(unknown)], checks, native);
  if (negative.length) return out('VIOLATED', [...new Set(negative)], checks, native);
  return out('PRESERVED', ['DECLARED_GUARANTEE_OBLIGATIONS_PRESERVED'], checks, native);
}
