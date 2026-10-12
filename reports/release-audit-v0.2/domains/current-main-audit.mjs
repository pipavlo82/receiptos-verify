import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=fileURLToPath(new URL('./',import.meta.url));
const upstream=join(here,'public-current-recompute-kit');
const hash=x=>createHash('sha256').update(x).digest('hex');
async function api(path){const run=spawnSync('gh',['api',path],{encoding:'utf8',windowsHide:true,shell:false});if(run.status!==0)throw Error(run.stderr);return JSON.parse(run.stdout);}
const identities={queriedAt:new Date().toISOString()};
for(const [label,path]of Object.entries({semanticAbi:'repos/trustless-ai/semantic-abi/commits/main',recomputeKit:'repos/trustless-ai/recompute-kit/commits/main',PR57:'repos/trustless-ai/recompute-kit/pulls/57',interpoll:'repos/Interpoll1/decentralised/commits/master',PRF:'repos/pipavlo82/protected-relation-fixtures/commits/main',PR14:'repos/pipavlo82/protected-relation-fixtures/pulls/14'})){
 const v=await api(path);identities[label]=v.head?{state:v.state,merged:v.merged,mergedAt:v.merged_at,head:v.head.sha,base:v.base.sha,url:v.html_url}:{sha:v.sha,tree:v.commit.tree.sha,date:v.commit.committer.date,url:v.html_url};
}
await writeFile(join(here,'public-source-identities.json'),JSON.stringify(identities,null,2)+'\n');
const pin=identities.recomputeKit.sha;
const downloaded=[];
for(const path of ['tools/run_conformance.py','conformance/scan-subject-binding-v0/README.md','conformance/scan-subject-binding-v0/suite.json','conformance/scan-subject-binding-v0/scan_check.py','conformance/scan-subject-binding-v0/mutation_check.py','conformance/scan-subject-binding-v0/vectors.json']){
 const response=await api(`repos/trustless-ai/recompute-kit/contents/${path}?ref=${pin}`);const bytes=Buffer.from(response.content,'base64');const destination=join(upstream,path);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes);downloaded.push({path,gitBlob:response.sha,sha256:hash(bytes),size:bytes.length,url:response.html_url});
}
const vectorPath=join(upstream,'conformance/scan-subject-binding-v0/vectors.json'),checkerPath=join(upstream,'conformance/scan-subject-binding-v0/scan_check.py');
const native=spawnSync('python',['-I','-B','-X','utf8',checkerPath,vectorPath],{encoding:'utf8',windowsHide:true,shell:false,timeout:20000});
const runnerCode="import importlib.util,json,sys,pathlib\nspec=importlib.util.spec_from_file_location('audit_current_main',sys.argv[1]);module=importlib.util.module_from_spec(spec);sys.modules[spec.name]=module;spec.loader.exec_module(module)\nrows=module.run_suite(pathlib.Path(sys.argv[2]));print(json.dumps([r.__dict__ for r in rows],sort_keys=True))";
const runner=spawnSync('python',['-I','-B','-X','utf8','-c',runnerCode,join(upstream,'tools/run_conformance.py'),join(upstream,'conformance/scan-subject-binding-v0')],{encoding:'utf8',windowsHide:true,shell:false,timeout:30000});
const {evaluateTrustless}=await import('./repo/src/adapters/trustless.mjs');
const vectors=JSON.parse(await readFile(vectorPath,'utf8')),artifact=JSON.parse(native.stdout);
const case_id='c4_reproduced_clean';
const c=vectors.cases[case_id];
const input={profile:'scan_subject_binding.v0',source_pin:pin,case_id,input:{public_key_ed25519:vectors.test_public_key_ed25519,toy_scan:vectors.toy_scan,corpus:c.corpus,manifest:c.manifest,decision:c.decision},artifact};
const currentAdmission=await evaluateTrustless(input);
const pinnedAdmissionInput=structuredClone(input);pinnedAdmissionInput.source_pin='1a37bcaf91918fd8a98f164d97d0fddbc28c6755';
const pinnedAdmission=await evaluateTrustless(pinnedAdmissionInput);
const normalizedPinnedInput=structuredClone(pinnedAdmissionInput);
normalizedPinnedInput.input.toy_scan={scanner_version:normalizedPinnedInput.input.toy_scan.scanner_version,pattern:normalizedPinnedInput.input.toy_scan.pattern};
const normalizedPinnedAdmission=await evaluateTrustless(normalizedPinnedInput);
const portableRunnerCode="import importlib.util,json,sys,pathlib,subprocess\nspec=importlib.util.spec_from_file_location('audit_current_main',sys.argv[1]);module=importlib.util.module_from_spec(spec);sys.modules[spec.name]=module;spec.loader.exec_module(module)\nd=pathlib.Path(sys.argv[2]);m=json.loads((d/'suite.json').read_text());c=m['checks'][0];m.pop('checks');m['vectors']=c['vectors'];m['adapter']=dict(c['adapter']);m['adapter']['cmd']=subprocess.list2cmdline([sys.executable,'-I','-B','-X','utf8','scan_check.py','vectors.json']);r=module._run_one(d,m,'portable-conformance-only');print(json.dumps({'override':'interpreter command only; all spec/checker/vector pins and self_grading contract retained','effective_manifest':m,'result':r.__dict__},sort_keys=True))";
const portableRunner=spawnSync('python',['-I','-B','-X','utf8','-c',portableRunnerCode,join(upstream,'tools/run_conformance.py'),join(upstream,'conformance/scan-subject-binding-v0')],{encoding:'utf8',windowsHide:true,shell:false,timeout:30000});
const report={identity:identities.recomputeKit,downloaded,native:{argv:['python','-I','-B','-X','utf8',checkerPath,vectorPath],exitCode:native.status,stdout:native.stdout,stderr:native.stderr},runner:{exitCode:runner.status,stdout:runner.stdout,stderr:runner.stderr},selectedPublicCase:case_id,input,currentAdmission,pinnedAdmissionInput,pinnedAdmission,
 normalizedPinnedInput,normalization:'Remove unused toy_scan.rule annotation to meet the explicitly narrower product input shape; all signed manifest, corpus, decision and native artifact bytes retained.',normalizedPinnedAdmission,portableRunner:{exitCode:portableRunner.status,stdout:portableRunner.stdout,stderr:portableRunner.stderr},
 conclusions:{currentSourcePinRefused:currentAdmission.status==='UNSUPPORTED',sameCheckerHash:hash(await readFile(checkerPath))===hash(await readFile(join(here,'repo/vendor/recompute-kit-v02/conformance/scan-subject-binding-v0/scan_check.py'))),nativeCount:artifact.total,nativeReproduced:artifact.reproduced}};
await writeFile(join(here,'current-main-replay.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({identities,conclusions:report.conclusions,currentAdmission:currentAdmission.status,pinnedAdmission:pinnedAdmission.status,normalizedPinnedAdmission:normalizedPinnedAdmission.status,portableRunner:portableRunner.stdout,runner:runner.status}));
