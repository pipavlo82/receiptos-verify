import { canonicalize, equal, result } from './common.mjs';

// This contract checks completeness and exact relations over adapter-supplied
// evidence snapshots. Establishing the snapshots' native trust basis remains
// adapter-local; a VERIFIED binding is not a positive product verdict.
export const BINDING_CONTRACT_VERSION = 1;
export const BINDING_STATUSES = Object.freeze([
  'VERIFIED', 'CONTRADICTED', 'INSUFFICIENT_EVIDENCE',
  'REJECTED_MALFORMED', 'UNSUPPORTED_PROFILE',
]);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = (value, names) => record(value)
  && names.every(name => Object.hasOwn(value, name))
  && Object.keys(value).every(name => names.includes(name));
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(value)
  && !['constructor','prototype'].includes(value);
const isJson = value => { try { canonicalize(value); return true; } catch { return false; } };

export function inspectBindingContract(descriptor) {
  if (!record(descriptor) || !Object.hasOwn(descriptor, 'binding_contract')) {
    return { status: 'LEGACY_NOT_DECLARED', version: null, required: [] };
  }
  const contract = descriptor.binding_contract;
  if (!isJson(contract) || !fields(contract, ['version', 'required'])
      || typeof descriptor.profileId !== 'string' || !descriptor.profileId.length
      || !Array.isArray(contract.required) || !contract.required.length
      || contract.required.some(name => !identifier(name))
      || new Set(contract.required).size !== contract.required.length) {
    return { status: 'MALFORMED', version: null, required: [] };
  }
  if (contract.version !== BINDING_CONTRACT_VERSION) {
    return { status: 'UNSUPPORTED', version: contract.version, required: [...contract.required] };
  }
  return { status: 'DECLARED', version: contract.version, required: [...contract.required] };
}

export function validateBindingContract(descriptor, report, evidenceContext = {}) {
  const contract = inspectBindingContract(descriptor);
  const bindings = {};
  const missing = [];
  const finish = (status, reasonCodes) => result(status, reasonCodes, null, {
    version: contract.version, required: contract.required, bindings, missing,
    failures: Object.values(bindings).filter(binding => binding.status !== 'VERIFIED'),
  });
  if (contract.status === 'LEGACY_NOT_DECLARED') return finish('UNSUPPORTED_PROFILE', ['BINDING_CONTRACT_REQUIRED']);
  if (contract.status === 'UNSUPPORTED') return finish('UNSUPPORTED_PROFILE', ['BINDING_CONTRACT_VERSION_UNSUPPORTED']);
  if (contract.status !== 'DECLARED') return finish('REJECTED_MALFORMED', ['BINDING_CONTRACT_MALFORMED']);
  if (!isJson(report) || !fields(report, ['version', 'profileId', 'bindings'])
      || !record(report.bindings) || report.version !== contract.version
      || report.profileId !== descriptor.profileId) {
    return finish('REJECTED_MALFORMED', ['BINDING_REPORT_MALFORMED']);
  }
  if (!isJson(evidenceContext) || !record(evidenceContext)) return finish('REJECTED_MALFORMED', ['BINDING_EVIDENCE_MALFORMED']);
  if (Object.keys(report.bindings).some(name => !contract.required.includes(name))) {
    return finish('REJECTED_MALFORMED', ['UNDECLARED_BINDING']);
  }
  for (const name of contract.required) {
    if (!Object.hasOwn(report.bindings, name)) {
      missing.push(name);
      bindings[name] = { binding: name, status: 'INSUFFICIENT_EVIDENCE', reasonCodes: ['REQUIRED_BINDING_MISSING'] };
      continue;
    }
    const binding = report.bindings[name];
    if (!fields(binding, ['status', 'relation', 'expected', 'observed', 'evidence'])
        || !BINDING_STATUSES.includes(binding.status) || binding.relation !== 'EXACT'
        || binding.expected === null || binding.observed === null
        || !Array.isArray(binding.evidence) || binding.evidence.length !== 2
        || binding.evidence.some(ref => typeof ref !== 'string' || !ref.length)
        || binding.evidence[0] === binding.evidence[1]) {
      bindings[name] = { binding: name, status: 'REJECTED_MALFORMED', reasonCodes: ['BINDING_RESULT_MALFORMED'] };
      continue;
    }
    const [expectedRef, observedRef] = binding.evidence;
    if (![expectedRef, observedRef].every(ref => Object.hasOwn(evidenceContext, ref) && evidenceContext[ref] !== null)
        || !equal(binding.expected, evidenceContext[expectedRef])
        || !equal(binding.observed, evidenceContext[observedRef])) {
      bindings[name] = { binding: name, status: 'REJECTED_MALFORMED', reasonCodes: ['BINDING_EVIDENCE_UNBACKED'] };
      continue;
    }
    // BINDING_CONTRACT_MUTATE exact-equality: status alone never establishes a relation.
    const agrees = equal(evidenceContext[expectedRef], evidenceContext[observedRef]);
    const status = agrees ? binding.status : 'CONTRADICTED';
    bindings[name] = {
      binding: name, status, reasonCodes: agrees ? (status === 'VERIFIED' ? [] : ['BINDING_NOT_ESTABLISHED']) : ['BINDING_RELATION_MISMATCH'],
      evidence: [...binding.evidence],
    };
  }
  const values = Object.values(bindings);
  const codes = [...new Set(values.flatMap(value => value.reasonCodes))];
  const status = values.some(value => value.status === 'REJECTED_MALFORMED') ? 'REJECTED_MALFORMED'
    : values.some(value => value.status === 'CONTRADICTED') ? 'CONTRADICTED'
    : values.some(value => value.status === 'UNSUPPORTED_PROFILE') ? 'UNSUPPORTED_PROFILE'
    : values.some(value => value.status !== 'VERIFIED') ? 'INSUFFICIENT_EVIDENCE'
    : 'VERIFIED';
  return finish(status, codes);
}
