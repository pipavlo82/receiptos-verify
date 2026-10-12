import { canonicalize, equal, result } from './common.mjs';

export const SURFACE_FIELDS = ['claim','subject','scope','authority','policy','version','time','assumptions','dependencies','evidence_requirements'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a,b) => a !== undefined && b !== undefined && equal(a,b);
const dependencyKey = value => JSON.stringify([value.id,value.version]);
// Match the existing v2 schema: exact, case-sensitive identities, not an
// arbitrary iterable. In particular, Set('AB') must never establish 'A'.
const identityList = (value, minimum = 0) => Array.isArray(value) && value.length >= minimum && value.length <= 64
  && value.every(item => typeof item === 'string' && [...item].length >= 1 && [...item].length <= 1024)
  && new Set(value).size === value.length;
const contextIdentityLists = context => ['established_assumptions', 'evidence_basis']
  .every(name => !Object.hasOwn(context, name) || identityList(context[name])); // XRPL_REPAIR_MUTATE exact-list-admission

// Exact, conservative relation. Scope strings/objects have no implied hierarchy.
// Premises are independently selected consumer context, never receipt self-grades.
export function compareClaimSurfaces(requested, evidence, context = {}) {
  const dimensions = {};
  const add = (name,status,codes) => { dimensions[name] = {status,reasonCodes:codes}; };
  try {canonicalize(requested);canonicalize(evidence);canonicalize(context);} catch {return result('INSUFFICIENT_EVIDENCE',['CLAIM_SURFACE_MALFORMED'],null,{dimensions});}
  if (!record(requested) || !record(evidence) || !record(context)
      || SURFACE_FIELDS.some(name => !Object.hasOwn(requested,name) || !Object.hasOwn(evidence,name))) {
    return result('INSUFFICIENT_EVIDENCE',['CLAIM_SURFACE_UNESTABLISHED'],null,{dimensions,requested:requested??null,evidence:evidence??null});
  }
  if (![requested.subject,evidence.subject,requested.claim,evidence.claim,requested.authority,evidence.authority,requested.policy,evidence.policy].every(record)
    || ![requested.assumptions,evidence.assumptions,requested.dependencies,evidence.dependencies,requested.evidence_requirements,evidence.evidence_requirements,context.dependency_results??[]].every(Array.isArray)) {
    return result('INSUFFICIENT_EVIDENCE',['CLAIM_SURFACE_MALFORMED'],null,{dimensions});
  }
  if (![requested.assumptions,evidence.assumptions].every(value => identityList(value))
      || ![requested.evidence_requirements,evidence.evidence_requirements].every(value => identityList(value, 1))
      || !contextIdentityLists(context)) {
    return result('INSUFFICIENT_EVIDENCE',['CLAIM_SURFACE_MALFORMED'],null,{dimensions});
  }
  for (const list of [requested.dependencies,evidence.dependencies,context.dependency_results??[]]) {
    if (list.some(value=>!record(value)||typeof value.id!=='string'||typeof value.version!=='string') || new Set(list.map(value=>value.id)).size!==list.length) return result('INSUFFICIENT_EVIDENCE',['DEPENDENCY_INPUT_AMBIGUOUS'],null,{dimensions});
  }
  const compare = (name,a,b,code) => add(name,same(a,b)?'COMPATIBLE':'CONTRADICTED',same(a,b)?[]:[code]);
  compare('claim',requested.claim,evidence.claim,'CLAIM_MISMATCH');
  const identity = value => ({kind:value.kind,id:value.id});
  compare('subject',identity(requested.subject),identity(evidence.subject),'SUBJECT_MISMATCH'); // V02_MUTATE subject
  const artifact = value => Object.fromEntries(['artifact_digest','tree','artifact_path'].filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]));
  compare('artifact',artifact(requested.subject),artifact(evidence.subject),'ARTIFACT_MISMATCH');
  const commit = value => Object.hasOwn(value,'commit')?{commit:value.commit}:{};
  compare('commit',commit(requested.subject),commit(evidence.subject),'SUBJECT_MISMATCH');
  compare('authority',requested.authority,evidence.authority,'AUTHORITY_MISMATCH'); // V02_MUTATE authority
  compare('scope',requested.scope,evidence.scope,'SCOPE_MISMATCH'); // V02_MUTATE scope
  compare('policy',requested.policy,evidence.policy,'POLICY_MISMATCH'); // V02_MUTATE policy
  compare('version',{claim:requested.version,subject:requested.subject.version},{claim:evidence.version,subject:evidence.subject.version},'VERSION_MISMATCH'); // V02_MUTATE version
  const validInterval = value => record(value) && Number.isSafeInteger(value.not_before) && Number.isSafeInteger(value.not_after)
    && value.not_before >= 0 && value.not_after > value.not_before;
  const instant = context.verification_time;
  const timeOk = validInterval(requested.time) && validInterval(evidence.time) && same(requested.time,evidence.time)
    && Number.isSafeInteger(instant) && instant >= evidence.time.not_before && instant < evidence.time.not_after;
  add('time',timeOk?'COMPATIBLE':'CONTRADICTED',timeOk?[]:['TIME_MISMATCH']);
  const established = new Set(context.established_assumptions ?? []);
  const assumptions = Array.isArray(requested.assumptions) && Array.isArray(evidence.assumptions)
    && [...new Set([...requested.assumptions,...evidence.assumptions])].every(id=>established.has(id));
  add('assumptions',assumptions?'COMPATIBLE':'INSUFFICIENT_EVIDENCE',assumptions?[]:['ASSUMPTION_UNESTABLISHED']);
  const dependencies = new Map((context.dependency_results ?? []).map(value=>[dependencyKey(value),value]));
  const requestedDeps = requested.dependencies ?? [], evidenceDeps = evidence.dependencies ?? [];
  const dependencyReasons = [];
  for (const required of [...requestedDeps,...evidenceDeps]) {
    const observed = dependencies.get(dependencyKey(required));
    if (!observed || observed.status !== 'SATISFIED' && observed.status !== 'CONTRADICTED') dependencyReasons.push('DEPENDENCY_MISSING'); // V02_MUTATE dependency-presence
    if (observed?.status === 'CONTRADICTED') dependencyReasons.push('DEPENDENCY_CONTRADICTED'); // V02_MUTATE dependency-contradiction
  }
  for (const required of requestedDeps) {
    const declared = evidenceDeps.find(value=>value.id===required.id);
    if (!declared) dependencyReasons.push('DEPENDENCY_MISSING');
    else if (declared.version !== required.version) dependencyReasons.push('DEPENDENCY_CONTRADICTED');
  }
  add('dependencies',dependencyReasons.includes('DEPENDENCY_CONTRADICTED')?'CONTRADICTED':dependencyReasons.length?'INSUFFICIENT_EVIDENCE':'COMPATIBLE',[...new Set(dependencyReasons)]);
  const basis = new Set(context.evidence_basis ?? []);
  const sufficient = [...new Set([...requested.evidence_requirements,...evidence.evidence_requirements])].every(kind=>basis.has(kind));
  add('evidence_basis',sufficient?'COMPATIBLE':'INSUFFICIENT_EVIDENCE',sufficient?[]:['EVIDENCE_BASIS_UNESTABLISHED']);
  const values = Object.values(dimensions);
  const status = values.some(value=>value.status==='CONTRADICTED')?'CONTRADICTED'
    :values.some(value=>value.status==='INSUFFICIENT_EVIDENCE')?'INSUFFICIENT_EVIDENCE':'COMPATIBLE';
  return result(status,[...new Set(values.flatMap(value=>value.reasonCodes))],null,{dimensions,requested,evidence});
}

export function requestSurface(request) {
  return Object.fromEntries(SURFACE_FIELDS.map(name=>[name,name==='policy'?{id:request.policy.id,version:request.policy.version}:request[name]]));
}
