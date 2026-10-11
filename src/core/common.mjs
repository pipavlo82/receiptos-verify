import { canonicalize, sha256, problem } from './strict-json.mjs';
export { canonicalize, sha256, problem };
export const digest = value => sha256(canonicalize(value));
export const result = (status, reasonCodes = [], nativeResult = null, extra = {}) => ({status, reasonCodes, nativeResult, ...extra});
export const equal = (a,b) => canonicalize(a).equals(canonicalize(b));
export const HEX = /^[0-9a-f]{64}$/;
export function base64(value) {
  if (typeof value !== 'string' || value.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw problem('INVALID_BASE64','Expected canonical base64.');
  const bytes = Buffer.from(value,'base64');
  if (bytes.toString('base64') !== value) throw problem('INVALID_BASE64','Noncanonical base64.');
  return bytes;
}
export function keys(value, required, optional=[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || required.some(k=>!Object.hasOwn(value,k)) || Object.keys(value).some(k=>!required.includes(k)&&!optional.includes(k))) throw problem('SCHEMA_MISMATCH','Missing or unknown object fields.');
}
export function subjectSchema(s) {
  keys(s,['kind','id','artifact_digest','commit','tree','artifact_path','version']);
  if (s.kind !== 'git-artifact' || !s.id || !s.version || !HEX.test(s.artifact_digest) || !/^[0-9a-f]{40}$/.test(s.commit) || !/^[0-9a-f]{40}$/.test(s.tree) || !/^[A-Za-z0-9._/-]+$/.test(s.artifact_path)) throw problem('SUBJECT_MALFORMED','Invalid git-artifact subject.');
}
