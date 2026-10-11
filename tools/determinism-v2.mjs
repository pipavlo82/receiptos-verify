import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { canonicalize, sha256 } from '../src/core/common.mjs';
import { parseStrict } from '../src/core/strict-json.mjs';
import { readVectorV2, discrepanciesV2, validateReportV2, isolatedCopyV2 } from './corpus-v2.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../reports/v0.2/determinism/', import.meta.url);

/** Exclude only exact execution.argv properties; native data and all verdicts remain. */
export function normalizeReportForDeterminism(report) {
  canonicalize(report);
  function visit(value, property = '') {
    if (Array.isArray(value)) return value.map((item) => visit(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !(property === 'execution' && key === 'argv'))
      .map(([key, item]) => [key, visit(item, key)]));
    return value;
  }
  return visit(report);
}
export const reportIdentityV2 = (report) => sha256(canonicalize(normalizeReportForDeterminism(report)));
export function validateNativeDeterminismWitness(id, report) {
  const valid = id==='rvr-bridge' ? report?.ok===true && report.value?.verificationOutcome==='VERIFIED' && report.value?.recomputationStatus==='REPRODUCED'
    : id==='trustless-bridge' ? report?.ok===true && report.native_result?.subject_bound_check==='CONTRADICTED' && report.runner_result?.verdict==='PASS'
      : id==='trustless-native-cli' ? report?.profile==='scan_subject_binding.v0' && report.total===1 && report.reproduced===1 && report.results?.length===1 && report.results[0].result?.subject_bound_check==='CONTRADICTED'
        : id==='prf-native-relation' ? report?.outcome==='PRESERVED' : false;
  if (!valid) throw new Error(`INVALID_NATIVE_DETERMINISM_WITNESS:${id}`);
  return true;
}

function run(executable, argv, cwd, input, env = process.env) {
  const child = spawnSync(executable, argv, { cwd, input, env, encoding: 'utf8', windowsHide: true, shell: false, timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
  if (child.error || child.signal || child.status !== 0) throw new Error(`DETERMINISM_COMMAND_FAILED: ${child.error?.message ?? child.signal ?? child.status}: ${child.stderr}`);
  return { executable, argv, cwd, exit_code: child.status, stdout: child.stdout, stderr: child.stderr,
    stdout_sha256: sha256(child.stdout), stderr_sha256: sha256(child.stderr) };
}
async function saveRun(name, receipt) {
  await writeFile(new URL(`${name}.json`, output), receipt.stdout, 'utf8');
  await writeFile(new URL(`${name}.stderr.txt`, output), receipt.stderr, 'utf8');
  const { stdout, stderr, ...command } = receipt;
  return { ...command, stdout_file: `reports/v0.2/determinism/${name}.json`, stderr_file: `reports/v0.2/determinism/${name}.stderr.txt` };
}

export async function auditDeterminismV2() {
  await mkdir(output, { recursive: true });
  const a = await isolatedCopyV2('determinism-a');
  const b = await isolatedCopyV2('determinism-b');
  const versions = { node: process.version, python: run('python',['-I','-B','-c','import sys;print(sys.version.split()[0])'],root).stdout.trim() };
  const generic = [];
  for (const id of ['G01','G02','G10','G12','G14','G15','G30']) {
    const vector = await readVectorV2(id);
    const modes = [
      { name:'normal', base:root, flags:[], env:process.env },
      { name:'repeat', base:root, flags:[], env:process.env },
      { name:'jitless', base:root, flags:['--jitless'], env:process.env },
      { name:'env-variant', base:root, flags:[], env:{ ...process.env,TZ:'Pacific/Honolulu',LC_ALL:'C.UTF-8',PYTHONHASHSEED:'733' } },
      { name:'path-a', base:fileURLToPath(a), flags:[], env:process.env },
      { name:'path-b', base:fileURLToPath(b), flags:[], env:process.env },
    ];
    const rows = [];
    let baseline;
    for (const mode of modes) {
      const receipt = run(process.execPath,[...mode.flags,resolve(mode.base,'tools','verify-vector-v2.mjs'),resolve(mode.base,'vectors','v0.2',`${id}.json`)],mode.base);
      const report = validateReportV2(parseStrict(Buffer.from(receipt.stdout,'utf8')));
      const errors = discrepanciesV2(vector,report);
      if (errors.length) throw new Error(`DETERMINISM_INVALID_LITERAL_BASELINE:${id}:${mode.name}:${errors.join(';')}`);
      const identity = reportIdentityV2(report);
      if (!baseline) baseline = { report, identity };
      if (identity !== baseline.identity) throw new Error(`NONDETERMINISTIC_SEMANTIC_REPORT:${id}:${mode.name}`);
      // Canonical equality after removing only execution.argv proves every
      // remaining field byte is retained, including native evidence and pins.
      if (!canonicalize(normalizeReportForDeterminism(report)).equals(canonicalize(normalizeReportForDeterminism(baseline.report)))) throw new Error(`UNEXPLAINED_RAW_REPORT_DIFFERENCE:${id}:${mode.name}`);
      if (receipt.stdout!==`${JSON.stringify(report)}\n`
          || JSON.stringify(normalizeReportForDeterminism(report))!==JSON.stringify(normalizeReportForDeterminism(baseline.report))) throw new Error(`RAW_DIFFERENCE_BEYOND_EXECUTION_ARGV:${id}:${mode.name}`);
      rows.push({ mode:mode.name, overall:report.overall, semantic_identity_sha256:identity,
        full_report_byte_identical:receipt.stdout_sha256===sha256(`${JSON.stringify(baseline.report)}\n`),
        environment:mode.name==='env-variant'?{TZ:mode.env.TZ,LC_ALL:mode.env.LC_ALL,PYTHONHASHSEED:mode.env.PYTHONHASHSEED}:null,
        ...await saveRun(`${id}-${mode.name}`,receipt) });
    }
    generic.push({ id, passed:true, raw_report_difference_only_execution_argv:true, excluded_fields:['execution.argv, at any report depth'], rows });
  }
  const positive = await readVectorV2('G01');
  const trustless = (await readVectorV2('G12')).bundle.payload.adapter;
  const guarantee = (await readVectorV2('G15')).bundle.payload.guarantees.upstream;
  const prfBridge = `import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('pinned_prf_award',sys.argv[1])
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
payload=json.load(sys.stdin)
print(json.dumps(module.relation(payload['award'],payload['settlements']),sort_keys=True,separators=(',',':'),allow_nan=False))
`;
  const trustlessVectors = { test_public_key_ed25519:trustless.input.public_key_ed25519,toy_scan:trustless.input.toy_scan,
    cases:{[trustless.case_id]:{corpus:trustless.input.corpus,manifest:trustless.input.manifest,decision:trustless.input.decision,
      expect:trustless.artifact.results.find((row)=>row.case_id===trustless.case_id).result}} };
  const nativeInput = new URL('trustless-native-cli-input.json',output);
  await writeFile(nativeInput,`${JSON.stringify(trustlessVectors)}\n`,'utf8');
  const definitions = [
    { id:'rvr-bridge', args:[resolve(root,'src/adapters/native/rvr-bridge.py')], input:JSON.stringify({operation:'recompute',input:positive.bundle.payload.adapter}) },
    { id:'trustless-bridge', args:[resolve(root,'src/adapters/native/trustless-bridge.py')], input:JSON.stringify({input:trustless.input,case_id:trustless.case_id,saved_result:trustless.artifact.results.find((row)=>row.case_id===trustless.case_id).result}) },
    { id:'trustless-native-cli', args:[resolve(root,'vendor/recompute-kit-v02/conformance/scan-subject-binding-v0/scan_check.py'),fileURLToPath(nativeInput)], input:'' },
    { id:'prf-native-relation', args:['-c',prfBridge,resolve(root,'vendor/prf-v02/award_actual_settlement.py')], input:JSON.stringify({award:guarantee.award,settlements:guarantee.settlements}) },
  ];
  const native = [];
  for (const definition of definitions) {
    const rows = [];
    let identity;
    for (const mode of ['normal','repeat','optimized']) {
      const receipt = run('python',['-I','-B',...(mode==='optimized'?['-O']:[]),'-X','utf8',...definition.args],root,definition.input);
      validateNativeDeterminismWitness(definition.id,parseStrict(Buffer.from(receipt.stdout,'utf8')));
      identity ??= receipt.stdout_sha256;
      if (receipt.stdout_sha256!==identity) throw new Error(`NONDETERMINISTIC_NATIVE_BYTES:${definition.id}:${mode}`);
      rows.push({mode,...await saveRun(`${definition.id}-${mode}`,receipt)});
    }
    native.push({id:definition.id,passed:true,stdout_byte_identical:true,rows});
  }
  const report = {schema:'receiptos.verify.determinism-report.v2',passed:true,versions,
    generic_groups:generic.length,generic_runs:generic.reduce((sum,row)=>sum+row.rows.length,0),
    native_groups:native.length,native_runs:native.reduce((sum,row)=>sum+row.rows.length,0),
    identity_exclusions:['Only exact execution.argv fields in product reports; no native result, evidence, policy, grade, reason, status or pin fields excluded.'],
    limitations:[
      'Operational command receipts include exact host paths; their bytes are not the product semantic identity.',
      'Python -I ignores PYTHONHASHSEED; the environment variant records that variable without claiming it changes isolated Python hash randomization.',
      'Trustless optimized bridge imports raw native functions under -O; its child checker stays under the fixed normal command. Separate trustless-native-cli groups directly test that unchanged CLI with -O.',
      'PRF optimized run executes the unchanged native relation, not the JavaScript product transfer projection; generic G15 covers that projection in normal, repeated, jitless, environment and two-path modes.',
    ],generic,native};
  await writeFile(new URL('../reports/v0.2/determinism.json',import.meta.url),`${JSON.stringify(report,null,2)}\n`,'utf8');
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  const report=await auditDeterminismV2();
  console.log(JSON.stringify({passed:report.passed,generic_groups:report.generic_groups,generic_runs:report.generic_runs,native_groups:report.native_groups,native_runs:report.native_runs}));
}
