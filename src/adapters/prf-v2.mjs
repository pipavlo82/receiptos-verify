import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { equal, sha256, digest } from '../core/common.mjs';

export const descriptor = Object.freeze({
  profileId: 'receiptos.verify.guarantee-preservation.v2',
  sourceRepository: 'pipavlo82/protected-relation-fixtures',
  sourceCommit: 'fac26d2e8346aeab08194343b78c345d235c6935',
  license: 'MIT native source; Apache-2.0 product glue', maturity: 'EXPERIMENTAL',
  integrationMode: 'PINNED_SOURCE',
  capabilities: ['native-main-award-settlement-recomputation', 'caller-selected-award-settlement-input', 'native-result-preservation', 'caller-selected-dependency-transfer'],
  claimBoundary: 'One caller-selected supplied award/settlement tuple; not the surrounding RVR or Trustless claim result.',
  requiredEvidence: ['upstream.award', 'upstream.settlements', 'upstream.native_result', 'downstream.native_result', 'downstream.dependencies'],
  nativeVocabulary: ['PRESERVED', 'VIOLATED', 'UNVERIFIABLE'],
  nativeRelationMaturity: 'STABLE',
  guaranteeProjectionSource: { repository: 'pipavlo82/protected-relation-fixtures', commit: 'f525737069dc4cef7741f805d08a988912f4454f', pullRequest: 14, state: 'OPEN', maturity: 'EXPERIMENTAL', integrationMode: 'REIMPLEMENTED_FROM_SPEC' },
});
const limitations = Object.freeze([
  'The executed main relation compares one supplied synthetic award with supplied settlement tuples; it establishes neither chain provenance nor universal economic truthfulness.',
  'The transfer projection is a bounded product reimplementation informed by open PR14, not execution of that PR Python consumer or its wire schema.',
  'The caller separately accepts a dependency basis. Neither its completeness, soundness nor acceptance authority is established by this adapter.',
]);
const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
const exactKeys = (x, fields) => object(x) && fields.every(k => Object.hasOwn(x, k)) && Object.keys(x).every(k => fields.includes(k));
const nativeShape = x => exactKeys(x, ['outcome', 'reason']) && ['PRESERVED', 'VIOLATED', 'UNVERIFIABLE'].includes(x.outcome) && typeof x.reason === 'string' && !!x.reason;
const deps = x => Array.isArray(x) && x.length > 0 && x.every(d => exactKeys(d, ['id', 'version']) && typeof d.id === 'string' && !!d.id && typeof d.version === 'string' && !!d.version) && new Set(x.map(d => d.id)).size === x.length;
const ordered = x => [...x].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const bridge = `import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('pinned_prf_award',sys.argv[1])
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
payload=json.load(sys.stdin)
print(json.dumps(module.relation(payload['award'],payload['settlements']),sort_keys=True,separators=(',',':'),allow_nan=False))
`;
function out(status, reasonCodes, nativeResult, guaranteeStatus = 'UNVERIFIABLE', execution = null) {
  return {
    status, reasonCodes, nativeResult,
    recomputation: { status: nativeResult?.recomputation ?? 'CANNOT_RECOMPUTE' },
    guaranteeProjection: { status: guaranteeStatus, reasonCodes },
    productProjection: { status, reasonCodes }, execution,
    provenance: { ...descriptor }, limitations: [...limitations],
  };
}
export function evaluatePrfV2(input, context = {}) {
  let execution = null;
  let native = { upstream: input?.upstream?.native_result ?? null, recomputed: null, recomputation: 'CANNOT_RECOMPUTE' };
  try {
    if (!exactKeys(input, ['profile', 'upstream', 'downstream'])) return out('REJECTED_MALFORMED', ['PRF_INPUT_MALFORMED'], native);
    if (input.profile !== 'award-actual-settlement-v0') return out('UNSUPPORTED_PROFILE', ['PRF_PROFILE_UNSUPPORTED'], native);
    if (!exactKeys(input.upstream, ['award', 'settlements', 'native_result']) || !exactKeys(input.downstream, ['native_result', 'dependencies']) || !nativeShape(input.upstream.native_result) || !nativeShape(input.downstream.native_result)) return out('REJECTED_MALFORMED', ['PRF_INPUT_MALFORMED'], native);
    const source = fileURLToPath(new URL('../../vendor/prf-v02/award_actual_settlement.py', import.meta.url));
    try {
      if (sha256(readFileSync(source)) !== '5780733a43b023b52d8c035277ca2b926f5ab1ae40edcc74e61880b43d665cd1') return out('CANNOT_RECOMPUTE', ['PRF_NATIVE_SOURCE_MISMATCH'], native);
    } catch {
      return out('CANNOT_RECOMPUTE', ['PRF_NATIVE_SOURCE_UNAVAILABLE'], native);
    }
    const payload = JSON.stringify({ award: input.upstream.award, settlements: input.upstream.settlements });
    if (Buffer.byteLength(payload) > 4 * 1024 * 1024) return out('REJECTED_MALFORMED', ['PRF_INPUT_LIMIT'], native);
    const argv = ['-I', '-B', '-X', 'utf8', '-c', bridge, source];
    const child = spawnSync('python', argv, { input: payload, encoding: 'utf8', windowsHide: true, shell: false, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
    execution = { status: child.error || child.signal ? 'UNAVAILABLE' : 'COMPLETED', executable: 'python', exitCode: child.status, signal: child.signal, stdout: child.stdout ?? '', stderr: child.stderr ?? '', stdoutSha256: sha256(child.stdout ?? ''), stderrSha256: sha256(child.stderr ?? '') };
    if (child.error || child.signal || child.status !== 0) return out('CANNOT_RECOMPUTE', ['PRF_NATIVE_EXECUTION_UNAVAILABLE'], native, 'UNVERIFIABLE', execution);
    let actual;
    try { actual = JSON.parse(child.stdout); }
    catch { return out('CANNOT_RECOMPUTE', ['PRF_NATIVE_OUTPUT_MALFORMED'], native, 'UNVERIFIABLE', execution); }
    if (!nativeShape(actual)) return out('CANNOT_RECOMPUTE', ['PRF_NATIVE_OUTPUT_MALFORMED'], native, 'UNVERIFIABLE', execution);
    native = { ...native, recomputed: actual, recomputation: equal(actual, input.upstream.native_result) ? 'REPRODUCED' : 'DIVERGED', downstream: structuredClone(input.downstream.native_result) };
    if (typeof context.required_relation_input_digest !== 'string' || !/^[0-9a-f]{64}$/.test(context.required_relation_input_digest)) return out('INSUFFICIENT_EVIDENCE', ['PRF_RELATION_SELECTOR_REQUIRED'], native, 'UNVERIFIABLE', execution);
    if (context.required_relation_input_digest !== digest({ award: input.upstream.award, settlements: input.upstream.settlements })) return out('CONTRADICTED', ['PRF_CALLER_RELATION_INPUT_MISMATCH'], native, 'VIOLATED', execution);
    if (native.recomputation === 'DIVERGED') return out('CONTRADICTED', ['PRF_NATIVE_RESULT_DIVERGED'], native, 'UNVERIFIABLE', execution);
    if (!exactKeys(context.accepted_basis, ['id', 'dependencies']) || typeof context.accepted_basis.id !== 'string' || !context.accepted_basis.id || !deps(context.accepted_basis.dependencies) || !deps(input.downstream.dependencies) || !nativeShape(context.required_native_result)) return out('INSUFFICIENT_EVIDENCE', ['PRF_ACCEPTED_DEPENDENCY_BASIS_REQUIRED'], native, 'UNVERIFIABLE', execution);
    if (context.required_guarantee !== 'native-result-and-dependencies-preserved') return out('UNSUPPORTED_PROFILE', ['PRF_GUARANTEE_UNSUPPORTED'], native, 'UNVERIFIABLE', execution);
    if (actual.outcome === 'UNVERIFIABLE') return out('INSUFFICIENT_EVIDENCE', ['PRF_NATIVE_RELATION_UNESTABLISHED'], native, 'UNVERIFIABLE', execution); // MUTATE: v2-unverifiable-promotion
    if (!equal(context.required_native_result, actual)) return out('CONTRADICTED', ['PRF_CALLER_NATIVE_EXPECTATION_MISMATCH'], native, 'VIOLATED', execution);
    if (!equal(ordered(context.accepted_basis.dependencies), ordered(input.downstream.dependencies))) return out('CONTRADICTED', ['PRF_GUARANTEE_DEPENDENCY_CHANGED'], native, 'VIOLATED', execution);
    if (!equal(input.downstream.native_result, actual)) return out('CONTRADICTED', ['PRF_DOWNSTREAM_NATIVE_RESULT_CHANGED'], native, 'VIOLATED', execution);
    native.transfer = { outcome: 'PRESERVED', upstream_native_outcome: actual.outcome, basis_id: context.accepted_basis.id };
    if (actual.outcome === 'VIOLATED') return out('CONTRADICTED', ['PRF_REPRODUCED_NEGATIVE_TRANSFER_PRESERVED'], native, 'PRESERVED', execution);
    return out('VERIFIED', ['PRF_NATIVE_RESULT_AND_DEPENDENCIES_PRESERVED'], native, 'PRESERVED', execution);
  } catch (error) {
    return out('REJECTED_MALFORMED', ['PRF_INPUT_MALFORMED'], { ...native, error: error.message }, 'UNVERIFIABLE', execution);
  }
}
