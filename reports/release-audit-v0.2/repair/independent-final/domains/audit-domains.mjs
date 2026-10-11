import {createHash,createPrivateKey,createPublicKey,sign} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../v02-audit-final/',import.meta.url));
const dest=fileURLToPath(new URL('./cases/',import.meta.url));await mkdir(dest,{recursive:true});
const load=async name=>import(pathToFileURL(join(root,name)).href);
const [{verifyV2},{evaluateSemanticAbi},{evaluateTrustless},{evaluateInterpollV2},{evaluatePrfV2},{buildCrystalEvidence},{buildRvrEvidence},{schnorr}]=await Promise.all([
 load('src/core/verify-v2.mjs'),load('src/adapters/semantic-abi-v2.mjs'),load('src/adapters/trustless.mjs'),load('src/adapters/interpoll-v2.mjs'),load('src/adapters/prf-v2.mjs'),load('src/adapters/crystal.mjs'),load('src/adapters/rvr.mjs'),load('node_modules/@noble/curves/secp256k1.js')]);
// Independent byte encoder and literal expectations. No product fixture helpers,
// expected verdict generators or old development outputs are imported.
const canon=x=>x!==null&&typeof x==='object'?Array.isArray(x)?`[${x.map(canon).join(',')}]`:`{${Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')}}`:JSON.stringify(x);
const hash=x=>createHash('sha256').update(x).digest('hex'),d=x=>hash(Buffer.from(canon(x))),clone=structuredClone;
const key=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.from(hash('independent audit02 public synthetic key'),'hex')]),format:'der',type:'pkcs8'});
const publicDer=createPublicKey(key).export({type:'spki',format:'der'}),publicRaw=publicDer.subarray(-32).toString('hex');
const authority={id:'audit02-public-test-key',class:'INDEPENDENT_RECOMPUTATION'};
const sourcePin='1a37bcaf91918fd8a98f164d97d0fddbc28c6755';
const rows=[];
async function save(id,input,output,expected,note=''){
 const actual=output.overall??output.status;const ok=actual===expected;
 const value={id,oracle:{kind:'DETACHED_LITERAL',expected,notes:note},input,output,assessment:ok?'PASS':'SEMANTIC_DISAGREEMENT',actual,inputSha256:d(input)};
 await writeFile(join(dest,id+'.json'),JSON.stringify(value,null,2)+'\n');rows.push({id,expected,actual,assessment:value.assessment,notes:note});return output;
}
function surface(r){return Object.fromEntries(['claim','subject','scope','authority','time','version','assumptions','dependencies','evidence_requirements'].map(k=>[k,clone(r[k])]).concat([['policy',{id:r.policy.id,version:r.policy.version}]]));}
function seal(pair){pair.bundle.statement.payload_digest=d(pair.bundle.payload);pair.bundle.signature_base64=sign(null,Buffer.concat([Buffer.from('receiptos.verify.statement.v2\0','ascii'),Buffer.from(d(pair.bundle.statement),'hex')]),key).toString('base64');return pair;}
function attach(pair,entries){pair.bundle.statement.evidence_manifest=entries.map(e=>({id:e.id,role:e.role,digest:hash(e.bytes),size:e.bytes.length}));pair.bundle.evidence=entries.map(e=>({id:e.id,bytes_base64:e.bytes.toString('base64')}));return seal(pair);}
function replaceAdapter(pair){return attach(pair,pair.bundle.statement.evidence_manifest.filter(e=>e.role!=='adapter-input').map(e=>({...e,bytes:Buffer.from(pair.bundle.evidence.find(x=>x.id===e.id).bytes_base64,'base64')})).concat([{id:'adapter-input',role:'adapter-input',bytes:Buffer.from(canon(pair.bundle.payload.adapter))}]));}
const artifact=Buffer.from('Fresh independently selected ReceiptOS v0.2 audit bytes.\n');
const crystal=await buildCrystalEvidence({session_id:'independent-v02-domain-audit',task:{title:'Fresh audit artifact'}});
const rvr=await buildRvrEvidence(artifact.toString('base64'),hash(artifact));
function base(adapter='rvr'){
 const request={schema:'receiptos.verify.request.v2',verification_profile:'receiptos.verify.generic.v2',adapter,
 claim:{id:'audit02:artifact-integrity',kind:'SHA256_EQUALS',parameters:{expected_digest:hash(artifact)}},subject:{kind:'portable-artifact',id:'audit02:portable-a',version:'2026-10-11',artifact_digest:hash(artifact)},scope:{evidence_member:'artifact'},authority:clone(authority),
 policy:{id:'audit02-policy',version:'1',trusted_keys:[{id:authority.id,spki_base64:publicDer.toString('base64')}],required_layers:['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'],minimum_grade:'LOCAL_RECOMPUTATION',verification_time:10,established_assumptions:[],dependency_results:[],accepted_authorities:[clone(authority)]},time:{not_before:0,not_after:20},version:'2',assumptions:[],dependencies:[],evidence_requirements:['artifact','native-result','adapter-input','execution'],evidence:[],requested_guarantees:[]};
 const bundle={schema:'receiptos.verify.bundle.v2',canonicalization_profile:'receiptos.verify.canonical-json.v1',statement:{schema:'receiptos.verify.statement.v2',verification_profile:request.verification_profile,adapter,surface:surface(request),asserted_result:'PASS',evidence_manifest:[],payload_digest:'0'.repeat(64),crypto:{provider:'ed25519',key_id:authority.id}},signature_base64:'',evidence:[],payload:{crystal:clone(crystal),adapter:clone(rvr),guarantees:null,continuity:null}};
 return attach({request,bundle},[{id:'fresh-artifact',role:'artifact',bytes:artifact},{id:'fresh-result',role:'native-result',bytes:Buffer.from(canon(rvr.originalBundle.canonicalResult))},{id:'adapter-input',role:'adapter-input',bytes:Buffer.from(canon(rvr))}]);
}
async function core(id,pair,expected,note=''){return save(id,pair,await verifyV2(pair.request,pair.bundle),expected,note);}
async function direct(id,fun,input,context,expected,note=''){return save(id,{input,context},await fun(input,context),expected,note);}

const exactSurface=surface(base().request);
const semanticContext={verification_time:10,established_assumptions:[],dependency_results:[],evidence_basis:['artifact','native-result','adapter-input','execution'],expected_pair:'PRESERVED'};
for(const [id,modify,expected] of [
 ['S01_exact',()=>{},'COMPATIBLE'],['S02_subject',s=>s.subject.id='audit02:portable-b','CONTRADICTED'],['S03_authority',s=>s.authority.id='different-key','CONTRADICTED'],['S04_scope',s=>s.scope={evidence_member:'all-artifacts'},'CONTRADICTED'],['S05_policy',s=>s.policy.version='2','CONTRADICTED'],['S06_version',s=>s.version='3','CONTRADICTED'],['S07_missing_dependency',s=>s.dependencies=[{id:'prior-guarantee',version:'1'}],'INSUFFICIENT_EVIDENCE'],['S08_same_hash_claim',s=>s.claim.id='other-semantic-claim','CONTRADICTED']]){
 const requested=clone(exactSurface);modify(requested);const output=evaluateSemanticAbi({expected:requested,observed:exactSurface,context:semanticContext});await save(id,{requested,observed:exactSurface,context:semanticContext},output,expected,'Same artifact digest retained. Detached requested surface differs only in the declared attack dimension.');}
const dependencySurface=clone(exactSurface);dependencySurface.dependencies=[{id:'prior-guarantee',version:'1'}];await save('S09_contradictory_dependency',{requested:dependencySurface,observed:dependencySurface,context:{...semanticContext,dependency_results:[{id:'prior-guarantee',version:'1',status:'CONTRADICTED'}]}},evaluateSemanticAbi({expected:dependencySurface,observed:dependencySurface,context:{...semanticContext,dependency_results:[{id:'prior-guarantee',version:'1',status:'CONTRADICTED'}]}}),'CONTRADICTED');
for(const [id,edit] of [['D3_semantic_scope',p=>p.request.scope={evidence_member:'all-artifacts'}],['D4_semantic_authority',p=>p.request.authority.id='other-authority']]){const pair=base('semantic-abi');edit(pair);await core(id,pair,'CONTRADICTED');}

async function kitEvidence(negative=false,opaque=false){
 const doc={id:'independent-audit-policy',content:`Allowed amount is 37 USD.${negative?' audit-poison-token':''}`};
 const merkle='sha256:'+hash(Buffer.concat([Buffer.from([0]),Buffer.from(doc.id),Buffer.from([0]),Buffer.from(doc.content)]));
 const toy={scanner_version:'audit02-detached-toy/1',pattern:'audit-poison-token'};
 const body={rag_corpus:{merkle_root:merkle,poisoning_scan:{result:'clean',scanner_version:opaque?'audit02-opaque/1':toy.scanner_version,subject_digest:merkle,semantics:'recordwise'}}};
 const input={public_key_ed25519:publicRaw,toy_scan:toy,corpus:[doc],manifest:{body,sig:sign(null,Buffer.from('scan-subject-binding-v0\n'+canon(body)),key).toString('hex')},decision:{corpus_root:merkle,effective_dataset_digest:merkle,query:'allowed amount',k:1,retrieved:[clone(doc)],answer:'37 USD',inclusion_proofs:[]}};
 const case_id=negative?'independent_negative':opaque?'independent_opaque':'independent_positive';
 const expected={replay_bindings:'valid',result_only_check:'VALID',subject_bound_check:negative?'CONTRADICTED':'NO_FINDING',evidence_grade:opaque?'AUTHENTICATED_REPORT':'REPRODUCED'};
 const vectors={test_public_key_ed25519:publicRaw,toy_scan:toy,cases:{[case_id]:{corpus:input.corpus,manifest:input.manifest,decision:input.decision,expect:expected}}};
 const vectorPath=join(dest,case_id+'-native-input.json');await writeFile(vectorPath,canon(vectors)+'\n');
 const checker=join(root,'vendor/recompute-kit-v02/conformance/scan-subject-binding-v0/scan_check.py');
 const executed=spawnSync('python',['-I','-B','-X','utf8',checker,vectorPath],{encoding:'utf8',windowsHide:true,shell:false,timeout:15000});
 await writeFile(join(dest,case_id+'-native-execution.json'),JSON.stringify({argv:['python','-I','-B','-X','utf8',checker,vectorPath],status:executed.status,stdout:executed.stdout,stderr:executed.stderr,checkerSha256:hash(await readFile(checker))},null,2)+'\n');
 if(executed.status!==0)throw Error('Independent native construction did not reproduce literal target '+case_id);
 return {profile:'scan_subject_binding.v0',source_pin:sourcePin,case_id,input,artifact:JSON.parse(executed.stdout)};
}
function kitPair(evidence){const p=base('trustless');p.request.claim={id:'audit02:scan-result',kind:'TRUSTLESS_CHECK',parameters:{profile:evidence.profile,case_id:evidence.case_id,input_digest:d(evidence.input)}};p.request.subject={kind:'trustless-native-case',id:evidence.case_id,artifact_digest:d(evidence.input),version:'1'};p.request.scope={case_id:evidence.case_id,relation:'scan-subject-binding'};p.request.evidence_requirements=['adapter-input','execution'];p.bundle.payload.adapter=clone(evidence);p.bundle.statement.surface=surface(p.request);p.bundle.statement.asserted_result=evidence.case_id.includes('negative')?'FAIL':'PASS';return attach(p,[{id:'adapter-input',role:'adapter-input',bytes:Buffer.from(canon(evidence))}]);}
const kitPositive=await kitEvidence(),kitNegative=await kitEvidence(true),kitOpaque=await kitEvidence(false,true);
await direct('T01_native_positive',evaluateTrustless,kitPositive,{},'REPRODUCED');await direct('T02_native_negative',evaluateTrustless,kitNegative,{},'REPRODUCED');
const kitNativeInput=clone(kitPositive);kitNativeInput.artifact.results[0].result.subject_bound_check='CONTRADICTED';await direct('T03_saved_result_tampered',evaluateTrustless,kitNativeInput,{},'DIVERGED');
const empty=clone(kitPositive);empty.input.corpus=[];await direct('T04_empty_corpus',evaluateTrustless,empty,{},'INSUFFICIENT_EVIDENCE');
const unsupported=clone(kitPositive);unsupported.profile='reporter-contract-pr57.v0';await direct('T05_unimplemented_PR57',evaluateTrustless,unsupported,{},'UNSUPPORTED');
const wrongPin=clone(kitPositive);wrongPin.source_pin='f'.repeat(40);await direct('T06_wrong_pin',evaluateTrustless,wrongPin,{},'UNSUPPORTED');
const packageOnly={package_present:true,runner_declared:true,exitCode:0};await direct('T07_package_presence',evaluateTrustless,packageOnly,{},'REJECTED_MALFORMED');
await core('T08_opaque_grade',kitPair(kitOpaque),'INSUFFICIENT_EVIDENCE');
const compatible=kitPair(kitPositive);const demo5=await core('D5_trustless_compatible',compatible,'VERIFIED');const incompatible=clone(compatible);incompatible.request.claim.id='audit02:different-native-claim';const demo6=await core('D6_trustless_incompatible',incompatible,'CONTRADICTED');
await writeFile(join(dest,'D5_D6_native_comparison.json'),JSON.stringify({nativeEqual:canon(demo5.layers.RECOMPUTATION.nativeResult)===canon(demo6.layers.RECOMPUTATION.nativeResult),inputEqual:d(compatible.bundle.payload.adapter)===d(incompatible.bundle.payload.adapter),compatible:demo5.overall,incompatible:demo6.overall},null,2)+'\n');
await core('D11_reproduced_negative',kitPair(kitNegative),'CONTRADICTED');

const schnorrKey=Buffer.from('00'.repeat(31)+'17','hex'),actor=Buffer.from(schnorr.getPublicKey(schnorrKey)).toString('hex');
const material={version:1,namespace:'v3',kind:'reaction',actor,targetType:'post',targetId:'audit02-fresh-target',value:'up',createdAt:123,nonce:'33'.repeat(16)};
const actionId=hash(JSON.stringify(['interpoll.public-engagement.v1',1,material.namespace,material.kind,material.actor,material.targetType,material.targetId,material.value,material.createdAt,material.nonce]));
const signed={...material,id:actionId,signature:Buffer.from(schnorr.sign(Buffer.from(actionId,'hex'),schnorrKey,Buffer.alloc(32,7))).toString('hex')};
function commitment(input){return {action_id:input.signed_intent.id,attempt_ids:input.attempts.map(x=>x.id),observation_digest:d(input.observation),evidence_digest:d({signed_intent:input.signed_intent,accepted_action:input.accepted_action,attempts:input.attempts,observation:input.observation})};}
function trace(){const input={signed_intent:clone(signed),accepted_action:{status:'accepted',action:clone(signed)},attempts:[{id:'audit-attempt-one',action:clone(signed),delivery_status:'accepted',execution_attempted:true}],observation:{action_id:actionId,attempt_id:'audit-attempt-one',result:'APPLIED'},final_committed_result:null};input.final_committed_result=commitment(input);return {input,context:{requested_action:clone(material),authority:{actor,namespace:material.namespace},required_outcome:'EXECUTION_OBSERVED'}};}
const icases=[
 ['I01_exact',()=>{},'VERIFIED'],['I02_changed_target',f=>f.context.requested_action.targetId='another-target','CONTRADICTED'],['I03_changed_type',f=>f.context.requested_action.kind='view','CONTRADICTED'],['I04_changed_parameter',f=>f.context.requested_action.value='down','CONTRADICTED'],
 ['I05_identical_retry',f=>f.input.attempts.push({id:'audit-retry-two',action:clone(signed),delivery_status:'duplicate',execution_attempted:false}),'VERIFIED'],
 ['I06_mutated_retry',f=>{const retry={id:'audit-retry-two',action:clone(signed),delivery_status:'pending',execution_attempted:false};retry.action.value='down';f.input.attempts.push(retry);},'CONTRADICTED'],
 ['I07_duplicate_only',f=>{f.input.accepted_action.status='duplicate';f.input.attempts[0].delivery_status='duplicate';f.input.attempts[0].execution_attempted=false;},'INSUFFICIENT_EVIDENCE'],
 ['I08_missing_observation',f=>f.input.observation=null,'INSUFFICIENT_EVIDENCE'],['I09_unsupported_authority',f=>f.context.authority.namespace='v4','UNSUPPORTED_PROFILE'],
 ['I10_replayed_other_claim',f=>f.context.requested_action.nonce='44'.repeat(16),'CONTRADICTED'],
 ['I11_wrong_observation_attempt',f=>f.input.observation.attempt_id='other-attempt','CONTRADICTED'],['I12_rejected_observation',f=>f.input.observation.result='REJECTED','CONTRADICTED'],
 ['I13_duplicate_executes',f=>f.input.attempts[0].delivery_status='duplicate','CONTRADICTED'],['I14_pending_execution',f=>f.input.attempts[0].delivery_status='pending','INSUFFICIENT_EVIDENCE']];
const itraces={};for(const[id,modify,expected]of icases){const f=trace();modify(f);f.input.final_committed_result=commitment(f.input);itraces[id]=f;await direct(id,evaluateInterpollV2,f.input,f.context,expected);}
function interpollPair(f){const p=base('interpoll');p.request.claim={id:'audit02:signed-execution',kind:'SIGNED_ACTION_TRACE',parameters:{action:clone(material),outcome:'EXECUTION_OBSERVED'}};p.request.subject={kind:'agent-action',id:actionId,version:'1',artifact_digest:d(f.input)};p.request.scope={namespace:material.namespace,observation:'supplied-trace-only'};p.request.adapter_requirement=clone(f.context);p.request.evidence_requirements=['adapter-input','execution'];p.bundle.statement.surface=surface(p.request);p.bundle.payload.adapter=clone(f.input);return attach(p,[{id:'adapter-input',role:'adapter-input',bytes:Buffer.from(canon(f.input))}]);}
await core('D7_interpoll_exact',interpollPair(itraces.I01_exact),'VERIFIED');await core('D8_interpoll_mutated_retry',interpollPair(itraces.I06_mutated_retry),'CONTRADICTED');
const replayedPair=interpollPair(itraces.I01_exact);replayedPair.request.claim.id='audit02:unrelated-requested-claim';await core('I15_product_other_claim',replayedPair,'CONTRADICTED');

function prf(){const n={outcome:'PRESERVED',reason:'award_bound_to_actual_settlement'},deps=[{id:'observed-transfer',version:'audit02'}];const input={profile:'award-actual-settlement-v0',upstream:{award:{target_ref:'audit-task',tender_id:'audit-tender',winner:'audit-worker',price:37,finalized:true},settlements:[{target_ref:'audit-task',tender_id:'audit-tender',fulfiller:'audit-worker',amount:37,accepted:true}],native_result:clone(n)},downstream:{native_result:clone(n),dependencies:clone(deps)}};return {input,context:{accepted_basis:{id:'audit02-detached-basis',dependencies:clone(deps)},required_native_result:clone(n),required_guarantee:'native-result-and-dependencies-preserved',required_relation_input_digest:d({award:input.upstream.award,settlements:input.upstream.settlements})}};}
const pcases=[['P01_positive',()=>{},'VERIFIED'],['P02_changed_downstream',f=>f.input.downstream.dependencies[0].version='altered','CONTRADICTED'],
 ['P03_negative_preserved',f=>{const n={outcome:'VIOLATED',reason:'amount_mismatch'};f.input.upstream.settlements[0].amount=38;f.input.upstream.native_result=clone(n);f.input.downstream.native_result=clone(n);f.context.required_native_result=clone(n);},'CONTRADICTED'],
 ['P04_missing_dependency',f=>delete f.context.accepted_basis,'INSUFFICIENT_EVIDENCE'],
 ['P05_conflicting_native',f=>f.input.downstream.native_result={outcome:'VIOLATED',reason:'amount_mismatch'},'CONTRADICTED'],
 ['P06_unsupported_guarantee',f=>f.context.required_guarantee='universal-economic-security','UNSUPPORTED_PROFILE'],
 ['P07_missing_settlement',f=>{f.input.upstream.settlements=[];const n={outcome:'UNVERIFIABLE',reason:'missing_settlement'};f.input.upstream.native_result=clone(n);f.input.downstream.native_result=clone(n);f.context.required_native_result=clone(n);},'INSUFFICIENT_EVIDENCE'],
 ['P08_conflicting_settlement',f=>{f.input.upstream.settlements.push({...f.input.upstream.settlements[0],amount:38});const n={outcome:'VIOLATED',reason:'completion_cardinality'};f.input.upstream.native_result=clone(n);f.input.downstream.native_result=clone(n);f.context.required_native_result=clone(n);},'CONTRADICTED'],
 ['P09_basis_extra_policy',f=>f.context.accepted_basis.policy='unsupported-policy','INSUFFICIENT_EVIDENCE']];
const prfs={};for(const[id,modify,expected]of pcases){const f=prf();modify(f);f.context.required_relation_input_digest=d({award:f.input.upstream.award,settlements:f.input.upstream.settlements});prfs[id]=f;await direct(id,evaluatePrfV2,f.input,f.context,expected);}
function prfPair(f){const p=base();p.request.requested_guarantees=[{id:'native-result-and-dependencies-preserved'}];p.request.guarantee_requirement=clone(f.context);p.bundle.payload.guarantees=clone(f.input);return seal(p);}
await core('D9_prf_preserved',prfPair(prfs.P01_positive),'VERIFIED');await core('D10_prf_violated',prfPair(prfs.P02_changed_downstream),'CONTRADICTED');await core('P10_product_negative_preserved',prfPair(prfs.P03_negative_preserved),'CONTRADICTED');
const git=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});const summary={candidate:git.stdout.trim(),generatedAt:new Date().toISOString(),oracle:'Detached literal expectations; fresh synthetic artifacts/signatures constructed independently. Native construction may compute a saved replay artifact; it never supplies an expected product verdict.',count:rows.length,pass:rows.filter(r=>r.assessment==='PASS').length,fail:rows.filter(r=>r.assessment!=='PASS'),rows};
await writeFile(new URL('./summary.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
