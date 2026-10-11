import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readVectorV2, runVectorV2, discrepanciesV2, isolatedCopyV2, isolatedRunV2 } from './corpus-v2.mjs';
import { sha256 } from '../src/core/common.mjs';

const statuses = ['KILLED','SURVIVED','CRASHED','INVALID_OUTPUT','NOT_APPLIED','CONTROL_BROKEN','INVALID_BASELINE'];
const vectorId = (value) => typeof value === 'string' && /^[GI][0-9]{2}$/.test(value);
function admitCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length === 0) throw new Error('ZERO_MUTANTS');
  if (catalog.length > 128 || new Set(catalog.map((mutant) => mutant?.id)).size !== catalog.length) throw new Error('INVALID_MUTANT_CATALOG');
  for (const mutant of catalog) {
    if (!mutant || typeof mutant.id !== 'string' || !mutant.id || !vectorId(mutant.positive) || !vectorId(mutant.witness)
        || !Array.isArray(mutant.patches) || !mutant.patches.length) throw new Error('INVALID_MUTANT_CATALOG');
    const paths = new Set();
    for (const patch of mutant.patches) {
      if (!patch || typeof patch.file !== 'string' || !/^src\/[a-zA-Z0-9_./-]+$/.test(patch.file)
          || patch.file.split('/').some((segment) => segment === '.' || segment === '..') || paths.has(patch.file)
          || !Array.isArray(patch.changes) || !patch.changes.length
          || patch.changes.some((change) => !Array.isArray(change) || change.length !== 2 || change.some((text) => typeof text !== 'string') || !change[0])) throw new Error('INVALID_MUTANT_CATALOG');
      paths.add(patch.file);
    }
  }
}
const observed = (report) => report ? { overall: report.overall, reasons: report.reason_codes,
  layers: Object.fromEntries(Object.entries(report.layers).map(([name, layer]) => [name, layer.status])),
  semanticOutcome: report.layers.RECOMPUTATION.semanticOutcome ?? null } : null;
function executionFailed(value,key='') {
  if (!value || typeof value!=='object') return false;
  if (key==='execution' && (value.status!=='COMPLETED' || (typeof value.exitCode==='number' && value.exitCode!==0))) return true;
  return Object.entries(value).some(([name,item])=>executionFailed(item,name));
}

// These are checker transport/output failures, not native semantic refusals.
// In particular TRUSTLESS_NATIVE_NOT_VALID remains a valid negative verdict.
const invalidNativeOutputCodes = new Set([
  'TRUSTLESS_NATIVE_OUTPUT_INVALID', 'TRUSTLESS_CHECKER_UNAVAILABLE',
  'TRUSTLESS_NATIVE_RUNNER_UNAVAILABLE', 'NATIVE_RVR_INVALID_OUTPUT',
  'NATIVE_RVR_EXECUTION_UNAVAILABLE', 'PRF_NATIVE_OUTPUT_MALFORMED',
  'PRF_NATIVE_EXECUTION_UNAVAILABLE',
]);
export function checkerOutputInvalid(layers) {
  return Object.values(layers ?? {}).some(layer => Array.isArray(layer?.reasonCodes)
    && layer.reasonCodes.some(code => invalidNativeOutputCodes.has(code)));
}

/** Every kill requires changed source, a valid baseline, a preserved positive and a semantic witness. */
export async function auditMutants(catalog, { writeReport = true, label = 'v02' } = {}) {
  admitCatalog(catalog);
  const rows = [];
  const baselineCache = new Map();
  async function baseline(id) {
    if (!baselineCache.has(id)) {
      const vector = await readVectorV2(id);
      const report = await runVectorV2(vector);
      baselineCache.set(id, { vector, report, errors: discrepanciesV2(vector, report) });
    }
    return baselineCache.get(id);
  }
  for (const mutant of catalog) {
    const folder = await isolatedCopyV2(`${label}-${mutant.id}`);
    const changes = [];
    let applicable = true;
    for (const patch of mutant.patches) {
      const path = new URL(patch.file, folder);
      let original;
      try { original = await readFile(path, 'utf8'); }
      catch { applicable = false; changes.push({ file: patch.file, error: 'SOURCE_FILE_MISSING' }); break; }
      let edited = original;
      const replacements = [];
      for (const [from, to] of patch.changes) {
        const occurrences = edited.split(from).length - 1;
        const actual = occurrences === 1 && from !== to;
        replacements.push({ occurrences, changed: actual, from_sha256: sha256(from), to_sha256: sha256(to) });
        if (!actual) { applicable = false; break; }
        edited = edited.replace(from, to);
      }
      if (edited === original) applicable = false;
      changes.push({ file: patch.file, original_sha256: sha256(original), mutant_sha256: sha256(edited), replacements, path, edited });
      if (!applicable) break;
    }
    const record = { id: mutant.id, positive: mutant.positive, witness: mutant.witness,
      patches: changes.map(({ path, edited, ...evidence }) => evidence), applied: applicable,
      baseline_controls_valid: false, positive_preserved: false,
      positive_process_status: 'NOT_RUN', witness_process_status: 'NOT_RUN' };
    if (!applicable) { rows.push({ ...record, status: 'NOT_APPLIED' }); continue; }
    for (const change of changes) {
      await writeFile(change.path, change.edited, 'utf8');
      if (sha256(await readFile(change.path)) !== change.mutant_sha256) throw new Error('MUTATION_WRITE_IDENTITY_MISMATCH');
    }
    const positiveBase = await baseline(mutant.positive);
    const witnessBase = await baseline(mutant.witness);
    record.baseline_controls_valid = positiveBase.errors.length === 0 && witnessBase.errors.length === 0;
    record.baseline_errors = { positive: positiveBase.errors, witness: witnessBase.errors };
    record.baseline_positive = observed(positiveBase.report);
    record.baseline_witness = observed(witnessBase.report);
    const positive = isolatedRunV2(folder, mutant.positive);
    const witness = isolatedRunV2(folder, mutant.witness);
    record.positive_process_status = positive.process_status;
    record.witness_process_status = witness.process_status;
    record.positive_exit_code = positive.exit_code;
    record.witness_exit_code = witness.exit_code;
    record.positive_errors = positive.report ? discrepanciesV2(positiveBase.vector, positive.report) : [positive.error ?? positive.stderr ?? positive.process_status];
    record.positive_preserved = positive.process_status === 'COMPLETED' && record.positive_errors.length === 0;
    record.mutant_positive = observed(positive.report);
    record.mutant_witness = observed(witness.report);
    record.baseline_projection = witnessBase.report.overall;
    record.mutant_projection = witness.report?.overall ?? null;
    record.witness_reasons = witness.report?.reason_codes ?? [];
    record.checker_execution_failed = [positive,witness].some(run=>run.report&&executionFailed(run.report.layers));
    // This catalog tests semantic defects. A valid host envelope around an
    // unavailable checker or malformed native output is not a semantic witness.
    record.checker_output_invalid = [positive,witness].some(run => run.report
      && (checkerOutputInvalid(run.report.layers)
        || ['CANNOT_RECOMPUTE','REJECTED_MALFORMED'].includes(run.report.overall)));
    record.status = !record.baseline_controls_valid ? 'INVALID_BASELINE'
      : [positive, witness].some((run) => run.process_status === 'INVALID_OUTPUT') ? 'INVALID_OUTPUT'
      : [positive, witness].some((run) => run.process_status !== 'COMPLETED') || record.checker_execution_failed ? 'CRASHED'
      : record.checker_output_invalid ? 'INVALID_OUTPUT'
      : !record.positive_preserved ? 'CONTROL_BROKEN'
      : witness.report.overall !== witnessBase.report.overall ? 'KILLED' : 'SURVIVED';
    rows.push(record);
  }
  const counts = Object.fromEntries(statuses.map((status) => [status, rows.filter((row) => row.status === status).length]));
  const report = { schema: 'receiptos.verify.mutation-report.v2',
    method: 'Exactly-applied source mutation, valid detached literal baseline, preserved positive control, and structured semantic projection disagreement. Crash, malformed output, no-op and unapplied mutation are never kills.',
    count: rows.length, passed: rows.length > 0 && counts.KILLED === rows.length, counts, rows };
  if (writeReport) {
    const path = new URL('../reports/v0.2/mutations.json', import.meta.url);
    await mkdir(new URL('./', path), { recursive: true });
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  return report;
}
