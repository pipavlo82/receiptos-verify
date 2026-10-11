import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { canonicalize } from '../core/strict-json.mjs';

const root = new URL('../../', import.meta.url);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceCommit = '1a37bcaf91918fd8a98f164d97d0fddbc28c6755';
const profile = 'scan_subject_binding.v0';
const limit = 1024 * 1024;
const files = Object.freeze({
  'tools/run_conformance.py': '588fec7a6dbf43e80badc33a9a1d55e3ac22852d37a7abdf76d4ad2ce3dbe8ac',
  'conformance/scan-subject-binding-v0/scan_check.py': '8c35eb3c2dcbd30ce190c569a797cde1c7d86cc0130985b8a533cad640fe0a06',
  'conformance/scan-subject-binding-v0/README.md': '62f0de287fcab59c734dda0de2a9626e1ab9a24f1db6aa35c44daeefdda1d024',
});
export const descriptor = Object.freeze({
  profileId: 'receiptos.verify.trustless-scan.v2', nativeProfileId: profile,
  sourceRepository: 'https://github.com/trustless-ai/recompute-kit', sourceCommit,
  license: 'CC0-1.0', maturity: 'EXPERIMENTAL', sourceMaturity: 'STABLE', sourceState: 'PUBLIC_MAIN', integrationMode: 'PINNED_SOURCE',
  capabilities: ['NATIVE_SCAN_SUBJECT_BINDING', 'NATIVE_ED25519_MANIFEST_CHECK', 'NATIVE_RESULT_REPLAY', 'NATIVE_SELF_GRADING_RUNNER'],
  requiredEvidence: ['signed-scan-manifest', 'corpus-and-decision', 'saved-native-scan-result'],
  nativeVocabulary: {
    semantic: ['NO_FINDING', 'CONTRADICTED', 'CANNOT_ESTABLISH', 'NOT_VALID'],
    evidenceGrade: ['REPRODUCED', 'AUTHENTICATED_REPORT', null],
    runner: ['PASS', 'SUITE', 'DRIFT', 'RUNNER', 'NOT COVERED', 'UNVERIFIABLE'],
    replay: ['REPRODUCED', 'DIVERGED', 'CANNOT_RECOMPUTE'],
  },
});
const limitations = Object.freeze([
  'sourceMaturity STABLE identifies the merged public relation; maturity EXPERIMENTAL identifies this bounded product integration, not production security certification or full recompute-kit conformance.',
  'Only scan_subject_binding.v0 is executable here. Other suites and PR57 reporter contracts are unsupported.',
  'NO_FINDING means only this declared scanner found nothing in its bound subject; it never means POISONING_ABSENT.',
  'AUTHENTICATED_REPORT establishes a signed assertion; it does not establish scanner-origin execution.',
  'The supplied scanner pattern/version is a declared deterministic toy scan, not a general poisoning detector.',
  'Canonical runner PASS records reproduction against the saved target; it is not an independent positive semantic verdict.',
]);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const hex = (value, size) => typeof value === 'string' && new RegExp(`^[0-9a-f]{${size}}$`).test(value);
const nonempty = (value) => typeof value === 'string' && value.length > 0 && value.length <= 16384;
const same = (a, b) => canonicalize(a).equals(canonicalize(b));
function validate(input) {
  if (!exact(input, ['profile', 'source_pin', 'case_id', 'input', 'artifact'])) return 'TRUSTLESS_INPUT_MALFORMED';
  if (input.profile !== profile || input.source_pin !== sourceCommit) return 'TRUSTLESS_PROFILE_UNSUPPORTED';
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(input.case_id) || input.case_id.startsWith('c0')) return 'TRUSTLESS_CASE_ID_INVALID';
  const item = input.input;
  if (!exact(item, ['public_key_ed25519', 'toy_scan', 'corpus', 'manifest', 'decision'])
      || !hex(item.public_key_ed25519, 64) || !exact(item.toy_scan, ['scanner_version', 'pattern'])
      || !nonempty(item.toy_scan.scanner_version) || !nonempty(item.toy_scan.pattern)) return 'TRUSTLESS_INPUT_MALFORMED';
  if (!Array.isArray(item.corpus) || item.corpus.length === 0) return 'TRUSTLESS_EMPTY_EVIDENCE';
  if (item.corpus.length > 128 || item.corpus.some((doc) => !exact(doc, ['id', 'content']) || !nonempty(doc.id) || !nonempty(doc.content))
      || new Set(item.corpus.map((doc) => doc.id)).size !== item.corpus.length) return 'TRUSTLESS_CORPUS_MALFORMED';
  if (!exact(item.manifest, ['body', 'sig']) || !hex(item.manifest.sig, 128) || !item.manifest.body?.rag_corpus?.poisoning_scan
      || !item.decision || !Array.isArray(item.decision.retrieved) || item.decision.retrieved.length === 0) return 'TRUSTLESS_INPUT_MALFORMED';
  const a = input.artifact;
  if (!exact(a, ['profile', 'results', 'total', 'reproduced']) || a.profile !== profile || !Array.isArray(a.results)
      || a.results.length === 0 || a.results.length > 128 || a.total !== a.results.length
      || !Number.isSafeInteger(a.reproduced) || a.reproduced < 0 || a.reproduced > a.total) return 'TRUSTLESS_ARTIFACT_MALFORMED';
  if (new Set(a.results.map((row) => row?.case_id)).size !== a.results.length
      || a.reproduced !== a.results.filter((row) => row?.reproduced === true).length) return 'TRUSTLESS_ARTIFACT_MALFORMED';
  if (a.results.some((row) => !exact(row, ['case_id', 'reproduced', 'result']) || typeof row.reproduced !== 'boolean')) return 'TRUSTLESS_ARTIFACT_MALFORMED';
  const row = a.results.find((row) => row.case_id === input.case_id);
  if (!row || !row.result || !['valid', 'FAIL'].includes(row.result.replay_bindings)
      || !['VALID', 'NOT_VALID'].includes(row.result.result_only_check)
      || !descriptor.nativeVocabulary.semantic.includes(row.result.subject_bound_check)
      || !descriptor.nativeVocabulary.evidenceGrade.includes(row.result.evidence_grade)
      || Object.keys(row.result).some((key) => !['replay_bindings', 'result_only_check', 'subject_bound_check', 'evidence_grade', 'replay_failures'].includes(key))) return 'TRUSTLESS_ARTIFACT_MALFORMED';
  return null;
}

async function run(payload) {
  const script = fileURLToPath(new URL('./native/trustless-bridge.py', import.meta.url));
  const argv = ['-I', '-B', '-X', 'utf8', script];
  let bytes;
  try {
    bytes = canonicalize(payload);
    if (bytes.length > limit) throw new Error('Native input exceeds 1 MiB');
    for (const [path, expected] of Object.entries(files)) {
      if (sha256(await readFile(new URL(`vendor/recompute-kit-v02/${path}`, root))) !== expected) throw new Error(`Native source drift: ${path}`);
    }
  } catch (error) {
    return { status: 'UNAVAILABLE', exitCode: null, stdout: '', stderr: error.message, argv: ['python', ...argv] };
  }
  return new Promise((resolve) => {
    const child = spawn('python', argv, { cwd: fileURLToPath(root), windowsHide: true, shell: false,
      stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1', PYTHONIOENCODING: 'utf-8' } });
    const out = []; const err = []; let size = 0; let barrier;
    const collect = (into, data) => { const room = Math.max(0, limit - size); if (room) into.push(data.subarray(0, room)); size += data.length;
      if (size > limit) { barrier = 'OUTPUT_LIMIT'; child.kill(); } };
    child.stdout.on('data', (data) => collect(out, data)); child.stderr.on('data', (data) => collect(err, data));
    child.stdin.on('error', () => {});
    child.on('error', (error) => { barrier = 'UNAVAILABLE'; err.push(Buffer.from(error.message)); });
    const timer = setTimeout(() => { barrier = 'TIMEOUT'; child.kill(); }, 20000);
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer); const stdout = Buffer.concat(out); const stderr = Buffer.concat(err);
      resolve({ status: barrier ?? (signal ? 'CRASH' : 'COMPLETED'), exitCode, signal, argv: ['python', ...argv],
        stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8'), stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr) });
    });
    child.stdin.end(bytes);
  });
}

/** Product admission of actual native computation; never grades process success as semantic success. */
export function projectTrustlessExecution(execution, parsed, savedResult) {
  if (execution?.status !== 'COMPLETED' || execution.exitCode !== 0 || !parsed?.ok) {
    return { status: 'CANNOT_RECOMPUTE', semanticOutcome: 'UNVERIFIABLE', recomputationStatus: 'CANNOT_RECOMPUTE', reasonCodes: ['TRUSTLESS_CHECKER_UNAVAILABLE'] };
  }
  const native = parsed.native_result;
  const runner = parsed.runner_result;
  if (runner?.kind === 'DRIFT') return { status: 'CANNOT_RECOMPUTE', semanticOutcome: 'UNVERIFIABLE', recomputationStatus: 'CANNOT_RECOMPUTE', reasonCodes: ['TRUSTLESS_SOURCE_DRIFT'] };
  if (!native || !Array.isArray(parsed.replay_failures) || typeof parsed.signature_valid !== 'boolean'
      || !['NO_FINDING', 'CONTRADICTED', 'CANNOT_ESTABLISH', 'NOT_VALID'].includes(native.subject_bound_check)
      || !descriptor.nativeVocabulary.evidenceGrade.includes(native.evidence_grade)
      || (['CANNOT_ESTABLISH', 'NOT_VALID'].includes(native.subject_bound_check) && native.evidence_grade !== null)
      || !runner || typeof runner.ok !== 'boolean' || !['SUITE', 'RUNNER', 'NOT COVERED', 'UNVERIFIABLE'].includes(runner.kind)) {
    return { status: 'CANNOT_RECOMPUTE', semanticOutcome: 'UNVERIFIABLE', recomputationStatus: 'CANNOT_RECOMPUTE', reasonCodes: ['TRUSTLESS_NATIVE_OUTPUT_INVALID'] };
  }
  if (!runner.ok && runner.kind !== 'SUITE') return { status: 'CANNOT_RECOMPUTE', semanticOutcome: 'UNVERIFIABLE', recomputationStatus: 'CANNOT_RECOMPUTE', reasonCodes: ['TRUSTLESS_NATIVE_RUNNER_UNAVAILABLE'] };
  const replay = same(native, savedResult) ? 'REPRODUCED' : 'DIVERGED';
  const artifact = parsed.native_artifact;
  const row = artifact?.results?.[0];
  const nativeReproduced = replay === 'REPRODUCED' && (parsed.replay_failures.length === 0
    || (Array.isArray(savedResult.replay_failures) && same(parsed.replay_failures, savedResult.replay_failures)));
  if (artifact?.profile !== profile || artifact.total !== 1 || !Array.isArray(artifact.results) || artifact.results.length !== 1
      || !row || !same(row.result, native) || typeof row.reproduced !== 'boolean'
      || artifact.reproduced !== Number(row.reproduced)
      || row.reproduced !== nativeReproduced
      || runner.ok !== row.reproduced || runner.verdict !== (runner.ok ? 'PASS' : runner.kind)
      || parsed.native_exit_code !== (row.reproduced ? 0 : 1)
      || !/^sha256:[0-9a-f]{64}$/.test(parsed.computed_effective_dataset_digest)
      || !/^sha256:[0-9a-f]{64}$/.test(parsed.computed_corpus_digest)
      || !hex(parsed.native_vector_digest, 64)) {
    return { status: 'CANNOT_RECOMPUTE', semanticOutcome: 'UNVERIFIABLE', recomputationStatus: 'CANNOT_RECOMPUTE', reasonCodes: ['TRUSTLESS_NATIVE_OUTPUT_INVALID'] };
  }
  const invalidBindings = parsed.replay_failures.length !== 0 || native.replay_bindings !== 'valid' || parsed.signature_valid !== true;
  const semanticOutcome = invalidBindings || ['CONTRADICTED', 'NOT_VALID'].includes(native.subject_bound_check) ? 'REFUTED'
    : native.subject_bound_check === 'NO_FINDING' && ['REPRODUCED', 'AUTHENTICATED_REPORT'].includes(native.evidence_grade) ? 'VERIFIED' : 'UNVERIFIABLE';
  const reasons = [replay === 'REPRODUCED' ? 'TRUSTLESS_NATIVE_RESULT_REPRODUCED' : 'TRUSTLESS_NATIVE_RESULT_DIVERGED'];
  if (invalidBindings) reasons.push('TRUSTLESS_NATIVE_BINDINGS_INVALID');
  if (native.subject_bound_check === 'CONTRADICTED') reasons.push('TRUSTLESS_NATIVE_CONTRADICTION');
  if (native.subject_bound_check === 'CANNOT_ESTABLISH') reasons.push('TRUSTLESS_SUBJECT_UNESTABLISHED');
  if (native.subject_bound_check === 'NOT_VALID') reasons.push('TRUSTLESS_NATIVE_NOT_VALID');
  if (native.evidence_grade === 'AUTHENTICATED_REPORT') reasons.push('TRUSTLESS_SCANNER_EXECUTION_NOT_ESTABLISHED');
  return { status: replay, semanticOutcome, recomputationStatus: replay, reasonCodes: reasons };
}

export async function evaluateTrustless(input, context = {}) {
  let problem;
  try { canonicalize(input); problem = validate(input); } catch { problem = 'TRUSTLESS_INPUT_MALFORMED'; }
  const provenance = { ...descriptor, contractMode: 'MAIN_SELF_GRADING', reporterContract: 'NOT_IMPLEMENTED',
    functions: ['check_decision', 'sig_ok', 'subject_bound', 'result_only', 'main', 'run_suite'] };
  if (problem) return { status: problem === 'TRUSTLESS_PROFILE_UNSUPPORTED' ? 'UNSUPPORTED' : problem === 'TRUSTLESS_EMPTY_EVIDENCE' ? 'INSUFFICIENT_EVIDENCE' : 'REJECTED_MALFORMED',
    semanticOutcome: 'UNVERIFIABLE', recomputationStatus: 'CANNOT_RECOMPUTE', reasonCodes: [problem], nativeResult: null, provenance, limitations };
  const saved = input.artifact.results.find((row) => row.case_id === input.case_id).result;
  const execution = await run({ input: input.input, case_id: input.case_id, saved_result: saved });
  let parsed;
  try { parsed = JSON.parse(execution.stdout); } catch { parsed = null; }
  const projection = projectTrustlessExecution(execution, parsed, saved);
  const nativeResult = parsed?.ok ? {
    suiteId: profile, checkId: 'conformance', caseId: input.case_id,
    verdict: parsed.runner_result.verdict, semanticVerdict: parsed.native_result.subject_bound_check,
    evidenceGrade: parsed.native_result.evidence_grade, sourcePin: sourceCommit,
    vectorCorpusIdentity: parsed.native_vector_digest, contractMode: null,
    runnerContractInterpretation: 'MAIN_SELF_GRADING',
    result: parsed.native_result, savedArtifact: input.artifact, recomputedArtifact: parsed.native_artifact,
    runner: parsed.runner_result, replayFailures: parsed.replay_failures,
  } : parsed;
  const effective = parsed?.computed_effective_dataset_digest;
  const inputDigest = sha256(canonicalize(input.input));
  const semanticCompatibility = context.compatibility ?? null;
  return { ...projection, nativeResult, execution, provenance, limitations,
    evidenceGrade: parsed?.native_result?.evidence_grade ?? null,
    semanticCompatibility,
    observedSubject: effective ? { kind: 'rag-effective-dataset', id: effective,
      version: input.input.manifest.body.rag_corpus.poisoning_scan.scanner_version, artifact_digest: effective.slice(7) } : null,
    observedArtifactDigest: parsed?.ok ? inputDigest : null,
    nativeBinding: parsed?.ok ? { profileId: profile, caseId: input.case_id, inputDigest,
      subject: effective, corpusDigest: parsed.computed_corpus_digest } : null,
    binding: parsed?.ok ? { corpusDigest: parsed.computed_corpus_digest, effectiveDatasetDigest: effective,
      signedScannerSubject: input.input.manifest.body.rag_corpus.poisoning_scan.subject_digest ?? null,
      signatureValid: parsed.signature_valid, scannerVersion: input.input.manifest.body.rag_corpus.poisoning_scan.scanner_version,
      declaredToyScan: input.input.toy_scan, query: input.input.decision.query, k: input.input.decision.k ?? 1 } : null,
  };
}
