import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { canonicalize, base64, problem } from './common.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const load = name => JSON.parse(readFileSync(new URL(`../../schemas/${name}.schema.json`, import.meta.url), 'utf8'));
ajv.addSchema(load('claim-surface'));
const validators = {
  surface: ajv.getSchema('urn:receiptos:verify:claim-surface:v2'),
  request: ajv.compile(load('request-v2')),
  bundle: ajv.compile(load('bundle-v2')),
  report: ajv.compile(load('report-v2')),
};

export function validateV2Schema(name, value) {
  if (!Object.hasOwn(validators, name)) throw problem('SCHEMA_VALIDATOR_UNSUPPORTED', 'Unknown v0.2 schema validator.');
  // Object API inputs have the same canonical safety boundary as parsed JSON.
  canonicalize(value);
  if (!validators[name](value)) throw problem('SCHEMA_MISMATCH', ajv.errorsText(validators[name].errors, { separator: '; ' }));
  return true;
}

function uniqueIds(values, code, description) {
  const ids = new Set();
  for (const value of values) {
    if (ids.has(value.id)) throw problem(code, `${description} IDs must be unique, including across differing versions or statuses.`);
    ids.add(value.id);
  }
}

function validateSurfaceRelations(surface) {
  if (surface.time.not_after <= surface.time.not_before) throw problem('TIME_INTERVAL_MALFORMED', 'Time applicability must be a nonempty half-open interval.');
  uniqueIds(surface.dependencies, 'DEPENDENCY_ID_DUPLICATE', 'Dependency');
  const path = surface.subject.artifact_path;
  if (path !== undefined && path.split('/').some(segment => segment === '.' || segment === '..')) {
    throw problem('ARTIFACT_PATH_MALFORMED', 'Artifact paths must be relative paths without dot or traversal segments.');
  }
}

/** Admit shape and non-ambiguous identity, without grading semantic success. */
export function admitV2(request, bundle) {
  validateV2Schema('request', request);
  validateV2Schema('bundle', bundle);
  validateSurfaceRelations(request);
  validateSurfaceRelations(bundle.statement.surface);
  uniqueIds(request.policy.trusted_keys, 'TRUST_KEY_ID_DUPLICATE', 'Trust key');
  uniqueIds(request.policy.accepted_authorities, 'AUTHORITY_ID_DUPLICATE', 'Accepted authority');
  uniqueIds(request.policy.dependency_results, 'DEPENDENCY_RESULT_ID_DUPLICATE', 'Dependency premise');
  uniqueIds(bundle.statement.evidence_manifest, 'DUPLICATE_EVIDENCE', 'Evidence manifest');
  uniqueIds(bundle.evidence, 'DUPLICATE_EVIDENCE', 'Evidence attachment');
  uniqueIds(request.requested_guarantees.filter(value => Object.hasOwn(value, 'id')), 'GUARANTEE_ID_DUPLICATE', 'Requested guarantee');
  for (const key of request.policy.trusted_keys) base64(key.spki_base64);
  base64(bundle.signature_base64);
  for (const evidence of bundle.evidence) if (evidence.bytes_base64 !== null) base64(evidence.bytes_base64);
  const singularRoles = ['artifact', 'native-result', 'adapter-input', 'git-commit'];
  for (const role of singularRoles) {
    if (bundle.statement.evidence_manifest.filter(value => value.role === role).length > 1) {
      throw problem('AMBIGUOUS_EVIDENCE_ROLE', 'Singular evidence roles cannot have conflicting declarations.');
    }
  }
  return true;
}
