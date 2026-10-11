import { readFile, mkdir, cp, writeFile, mkdtemp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, relative, sep, join, isAbsolute } from 'node:path';
import { verifyV2, LAYERS_V2 } from '../src/core/verify-v2.mjs';
import { validateV2Schema } from '../src/core/admission-v2.mjs';
import { parseStrict } from '../src/core/strict-json.mjs';
import { canonicalize, sha256 } from '../src/core/common.mjs';

export const rootV2 = fileURLToPath(new URL('../', import.meta.url));
const verdicts = ['VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE','REJECTED_MALFORMED','UNSUPPORTED_PROFILE'];
const layerStatuses = {
  INPUT: ['ADMITTED','REJECTED_MALFORMED'], CANONICALIZATION: ['VERIFIED'],
  INTEGRITY: ['VERIFIED','REJECTED_MALFORMED','CANNOT_RECOMPUTE','INSUFFICIENT_EVIDENCE'],
  AUTHENTICITY: ['VERIFIED','CONTRADICTED','NOT_ESTABLISHED'],
  SUBJECT_BINDING: ['VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE'],
  RECOMPUTATION: ['REPRODUCED','DIVERGED','CANNOT_RECOMPUTE','CONTRADICTED','REJECTED_MALFORMED','UNSUPPORTED','INSUFFICIENT_EVIDENCE'],
  EVIDENCE_SUFFICIENCY: ['SUFFICIENT','INSUFFICIENT'],
  SEMANTIC_COMPATIBILITY: ['COMPATIBLE','CONTRADICTED','INSUFFICIENT_EVIDENCE','UNSUPPORTED'],
  GUARANTEE_PRESERVATION: ['PRESERVED','VIOLATED','UNVERIFIABLE','NOT_REQUESTED'],
  CONTINUITY: ['PRESERVED','VERIFIED','VIOLATED','UNVERIFIABLE','NOT_REQUESTED'],
  DOMAIN_ADAPTERS: ['VERIFIED','PRESERVED','VIOLATED','CONTRADICTED','REJECTED_MALFORMED','CANNOT_RECOMPUTE','UNVERIFIABLE','NOT_ESTABLISHED','UNSUPPORTED','UNSUPPORTED_PROFILE','NOT_REQUESTED','INSUFFICIENT_EVIDENCE'],
  PRODUCT_PROJECTION: verdicts, EXPLAINABLE_REPORT: ['GENERATED'], PROVENANCE: ['RECORDED'],
};

export function vectorPathV2(reference, base = rootV2) {
  if (typeof reference !== 'string' || !reference || reference.includes('\0')
      || (/^[a-z][a-z0-9+.-]*:/i.test(reference) && !isAbsolute(reference))) throw new Error('VECTOR_REFERENCE_INVALID');
  const vectors = resolve(base, 'vectors', 'v0.2');
  const path = /^[GI][0-9]{2}$/.test(reference) ? resolve(vectors, `${reference}.json`)
    : isAbsolute(reference) ? resolve(reference)
      : resolve(base, reference.startsWith('vectors/') || reference.startsWith('vectors\\') ? reference : join('vectors', 'v0.2', reference));
  const inside = relative(vectors, path);
  if (!inside || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside) || !/\.json$/.test(path)) throw new Error('VECTOR_REFERENCE_OUTSIDE_V02_CORPUS');
  return path;
}

export async function readVectorV2(id) {
  const vector = parseStrict(await readFile(vectorPathV2(id)));
  if (!vector || typeof vector !== 'object' || !/^[GI][0-9]{2}$/.test(vector.id)) throw new Error('VECTOR_ID_INVALID');
  return vector;
}

// This admits a well-formed report, not its semantic correctness. The frozen
// literal witness is the independent oracle for a source mutant's wrong verdict.
export function validateReportV2(report) {
  canonicalize(report);
  validateV2Schema('report', report);
  const names = Object.keys(report.layers);
  if (names.length !== LAYERS_V2.length || LAYERS_V2.some((name) => !Object.hasOwn(report.layers, name))
      || names.some((name) => !layerStatuses[name] || !['NOT_RUN', ...layerStatuses[name]].includes(report.layers[name].status))) throw new Error('Invalid v2 report layer identity or status');
  if (!report.required_layers.length || new Set(report.required_layers).size !== report.required_layers.length
      || report.required_layers.some((name) => !LAYERS_V2.includes(name))) throw new Error('Invalid v2 report required layers');
  if (report.layers.PRODUCT_PROJECTION.status !== report.overall
      || !canonicalize(report.layers.PRODUCT_PROJECTION.reasonCodes).equals(canonicalize(report.reason_codes))) throw new Error('Incoherent v2 report projection');
  const native = report.layers.RECOMPUTATION.semanticOutcome;
  if (native !== undefined && !['VERIFIED','REFUTED','UNVERIFIABLE'].includes(native)) throw new Error('Invalid v2 native semantic outcome');
  return report;
}

export function discrepanciesV2(vector, report) {
  try { validateReportV2(report); } catch (error) { return [`invalid report: ${error.message}`]; }
  const expected = vector?.expected;
  if (!expected || !verdicts.includes(expected.overall) || !expected.layers || !Array.isArray(expected.reason_codes)) return ['invalid literal vector expectations'];
  const errors = [];
  if (report.overall !== expected.overall) errors.push(`overall ${report.overall} != ${expected.overall}`);
  for (const [layer, status] of Object.entries(expected.layers)) {
    if (!layerStatuses[layer] || !['NOT_RUN', ...layerStatuses[layer]].includes(status)) errors.push(`unknown expected layer/status ${layer}:${status}`);
    else if (report.layers[layer].status !== status) errors.push(`${layer} ${report.layers[layer].status} != ${status}`);
  }
  for (const reason of expected.reason_codes) if (!report.reason_codes.includes(reason)) errors.push(`missing reason ${reason}`);
  // Optional literal native constraints keep the native vocabulary inspectable
  // without forcing it to equal the product's compatibility vocabulary.
  for (const [path, value] of Object.entries(expected.native ?? {})) {
    const actual = path.split('.').reduce((current, key) => current?.[key], report.layers);
    if (actual === undefined || !canonicalize(actual).equals(canonicalize(value))) errors.push(`native ${path} differs from its literal expected value`);
  }
  return errors;
}

export async function isolatedCopyV2(label) {
  const parent = resolve(rootV2, 'reports', 'tmp');
  await mkdir(parent, { recursive: true });
  // A unique short directory avoids stale mutant files and Windows deep paths.
  const directory = await mkdtemp(join(parent, `j-${sha256(String(label)).slice(0, 8)}-`));
  const folder = pathToFileURL(`${directory}${sep}`);
  for (const name of ['src','vendor','provenance','vectors','schemas']) await cp(new URL(`../${name}`, import.meta.url), new URL(name, folder), { recursive: true });
  await mkdir(new URL('tools/', folder), { recursive: true });
  await cp(new URL('./verify-vector-v2.mjs', import.meta.url), new URL('tools/verify-vector-v2.mjs', folder));
  await writeFile(new URL('package.json', folder), '{"type":"module","private":true}\n', 'utf8');
  return folder;
}

export function isolatedRunV2(folder, id) {
  const base = fileURLToPath(folder);
  let path;
  try { path = vectorPathV2(id, base); }
  catch (error) { return { process_status: 'INVALID_INPUT', exit_code: null, error: error.message }; }
  const run = spawnSync(process.execPath, [fileURLToPath(new URL('tools/verify-vector-v2.mjs', folder)), path],
    { cwd: base, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, shell: false });
  if (run.status !== 0 || run.signal || run.error) return { process_status: 'CRASH', exit_code: run.status, signal: run.signal,
    stdout: run.stdout ?? '', stderr: run.stderr ?? String(run.error), error: run.error?.message ?? null };
  try { return { process_status: 'COMPLETED', exit_code: run.status, report: validateReportV2(parseStrict(Buffer.from(run.stdout, 'utf8'))),
    stdout_sha256: sha256(run.stdout), stderr: run.stderr }; }
  catch (error) { return { process_status: 'INVALID_OUTPUT', exit_code: run.status, stdout: run.stdout, stderr: run.stderr, error: error.message }; }
}

export async function runVectorV2(vector) {
  return verifyV2(vector.request, vector.bundle);
}
