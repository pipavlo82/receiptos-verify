import { readFile, writeFile } from 'node:fs/promises';
import { readVector, runVector, discrepancies, isolatedCopy, isolatedRun } from './corpus.mjs';
import { sha256 } from '../src/core/common.mjs';

const statuses = ['KILLED','SURVIVED','CRASHED','INVALID_OUTPUT','NOT_APPLIED','CONTROL_BROKEN','INVALID_BASELINE'];
const invalidCodes = new Set(['NATIVE_RVR_EXECUTION_UNAVAILABLE','NATIVE_RVR_INVALID_OUTPUT',
  'TRUSTLESS_NATIVE_OUTPUT_INVALID','PRF_NATIVE_OUTPUT_MALFORMED','PRF_NATIVE_EXECUTION_UNAVAILABLE']);
function failures(value, path = '') {
  if (!value || typeof value !== 'object') return [];
  const own = path.endsWith('.execution') && (value.status !== 'COMPLETED' || value.exitCode !== undefined && value.exitCode !== 0)
    ? [{ path, status: value.status, exitCode: value.exitCode ?? null, signal: value.signal ?? null,
      stdoutSha256: value.stdoutSha256 ?? null, stderrSha256: value.stderrSha256 ?? null }] : [];
  return [...own,...Object.entries(value).flatMap(([key,item]) => failures(item, path ? `${path}.${key}` : key))];
}
function invalidNative(report) {
  return report && (['CANNOT_RECOMPUTE','REJECTED_MALFORMED'].includes(report.overall)
    || Object.values(report.layers).some(layer => layer.reasonCodes.some(code => invalidCodes.has(code))));
}
function admit(catalog) {
  if (!Array.isArray(catalog) || !catalog.length) throw new Error('ZERO_MUTANTS');
  if (catalog.length > 128 || new Set(catalog.map(item => item?.id)).size !== catalog.length) throw new Error('INVALID_MUTANT_CATALOG');
  for (const item of catalog) {
    if (!item || typeof item.id !== 'string' || !item.id || !/^V\d{2}$/.test(item.positive) || !/^V\d{2}$/.test(item.witness)
      || typeof item.file !== 'string' || !/^src\/[a-zA-Z0-9_./-]+$/.test(item.file) || item.file.split('/').some(part => part === '.' || part === '..')
      || !Array.isArray(item.changes) || !item.changes.length || item.changes.some(change => !Array.isArray(change) || change.length !== 2 || change.some(text => typeof text !== 'string') || !change[0])
      || item.fault !== undefined && item.fault !== 'crash-rvr') throw new Error('INVALID_MUTANT_CATALOG');
  }
}

/** Legacy vectors retain their semantics; only genuine semantic witnesses count. */
export async function auditMutantsV1(catalog) {
  admit(catalog);
  const rows = [], cache = new Map();
  async function baseline(id) {
    if (!cache.has(id)) { const vector = await readVector(id); cache.set(id, { vector, report: await runVector(vector) }); }
    return cache.get(id);
  }
  for (const mutant of catalog) {
    const folder = await isolatedCopy('v1-audit-'+mutant.id), path = new URL(mutant.file,folder);
    let original;
    try { original = await readFile(path,'utf8'); }
    catch { rows.push({id:mutant.id,source_file:mutant.file,positive:mutant.positive,witness:mutant.witness,applied:false,status:'NOT_APPLIED'}); continue; }
    let edited = original, applied = true;
    for (const [from,to] of mutant.changes) {
      if (from === to || edited.split(from).length !== 2) { applied = false; break; }
      edited = edited.replace(from,to);
    }
    const record = {id:mutant.id,source_file:mutant.file,original_sha256:sha256(original),mutant_sha256:sha256(edited),
      applied:applied && original !== edited,positive:mutant.positive,witness:mutant.witness};
    if (!record.applied) { rows.push({...record,status:'NOT_APPLIED'}); continue; }
    await writeFile(path,edited);
    if (sha256(await readFile(path)) !== record.mutant_sha256) throw new Error('MUTATION_WRITE_IDENTITY_MISMATCH');
    const positiveBase = await baseline(mutant.positive), witnessBase = await baseline(mutant.witness);
    record.baseline_controls_valid = discrepancies(positiveBase.vector,positiveBase.report).length === 0
      && discrepancies(witnessBase.vector,witnessBase.report).length === 0;
    const positive = isolatedRun(folder,mutant.positive);
    record.positive_process_status = positive.process_status;
    record.positive_preserved = !!positive.report && discrepancies(positiveBase.vector,positive.report).length === 0;
    if (mutant.fault === 'crash-rvr') await writeFile(new URL('src/adapters/native/rvr-bridge.py',folder),
      'import sys\nsys.stderr.write("Synthetic checker crash control\\n")\nsys.exit(7)\n');
    const witness = isolatedRun(folder,mutant.witness);
    record.witness_process_status = witness.process_status;
    record.baseline_projection = witnessBase.report.overall;
    record.mutant_projection = witness.report?.overall ?? null;
    record.witness_reasons = witness.report?.reason_codes ?? [];
    const baselineFailures = failures(witnessBase.report.layers), witnessFailures = failures(witness.report?.layers);
    // V08 holds the checker fault fixed and tests its false semantic grading.
    // A newly introduced crash cannot use this explicit baseline exception.
    record.expected_fault_preserved = mutant.fault === 'crash-rvr' && mutant.witness === 'V08'
      && witnessBase.report.overall === 'CANNOT_RECOMPUTE' && baselineFailures.length === 1
      && baselineFailures[0].path === 'RECOMPUTATION.execution' && baselineFailures[0].exitCode === 7
      && JSON.stringify(baselineFailures) === JSON.stringify(witnessFailures);
    record.checker_execution_failed = failures(positive.report?.layers).length > 0
      || witnessFailures.length > 0 && !record.expected_fault_preserved;
    record.checker_output_invalid = invalidNative(positive.report)
      || invalidNative(witness.report) && !record.expected_fault_preserved;
    record.status = !record.baseline_controls_valid ? 'INVALID_BASELINE'
      : [positive,witness].some(run => run.process_status === 'INVALID_OUTPUT') ? 'INVALID_OUTPUT'
      : [positive,witness].some(run => run.process_status !== 'COMPLETED') || record.checker_execution_failed ? 'CRASHED'
      : record.checker_output_invalid ? 'INVALID_OUTPUT'
      : !record.positive_preserved ? 'CONTROL_BROKEN'
      : witness.report.overall !== witnessBase.report.overall ? 'KILLED' : 'SURVIVED';
    rows.push(record);
  }
  const counts = Object.fromEntries(statuses.map(status => [status,rows.filter(row => row.status === status).length]));
  return {schema:'receiptos.verify.mutation-report.v1',method:'Applied source change, preserved positive and semantic disagreement. Unexpected inner/outer crashes and invalid native/host outputs are not kills. V08 holds its intentional fault fixed in baseline and mutant.',
    count:rows.length,passed:rows.length > 0 && counts.KILLED === rows.length,counts,rows};
}
