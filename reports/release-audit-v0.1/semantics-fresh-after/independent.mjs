// Independent hostile audit. No fixture helpers, signing helpers, canonicalizer,
// digest helper, Git helper, or native build operation from the candidate is used.
import { createHash, generateKeyPairSync, sign, verify as cryptoVerify } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const candidate = resolve(process.argv[2] ?? resolve(here, '../../tmp/release-rc-audit/candidate-a'));
const expectedHead = 'b893eeb1b22eada6431d7b2e819439e9f4f67414';
const actualHead = execFileSync('git', ['-C', candidate, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (actualHead !== expectedHead) throw new Error('Candidate HEAD is not the frozen release candidate');
const candidateRequire = createRequire(resolve(candidate, 'package.json'));
const dependencyPaths = Object.fromEntries(['ajv/dist/2020.js', '@noble/curves/secp256k1.js'].map(name => [name,candidateRequire.resolve(name)]));
if(Object.values(dependencyPaths).some(p=>!p.startsWith(resolve(candidate,'node_modules')))) throw new Error('Dependency resolved outside fresh candidate installation');
const load = p => import(pathToFileURL(resolve(candidate, p)).href);
const { verify } = await load('src/core/verify.mjs');
const { project } = await load('src/projection/project.mjs');
const { recompute } = await load('src/adapters/rvr.mjs');
const { verifyIntegrity } = await load('src/adapters/crystal.mjs');
const { evaluateSemantic } = await load('src/adapters/semantic_abi.mjs');
const { evaluateGuarantees } = await load('src/adapters/prf.mjs');
const { evaluateExecution } = await load('src/adapters/recompute_kit.mjs');
const { evaluateContinuity } = await load('src/adapters/chronicle.mjs');
const { evaluateStochastic } = await load('src/adapters/stochastic.mjs');
const { inspectVectorPack, CryptoProviders } = await load('src/adapters/pq.mjs');
const { inspectAnchor } = await load('src/adapters/ledger.mjs');
const { adapters } = await load('src/adapters/index.mjs');
const { validateSchema } = await load('src/core/schemas.mjs');

// Independent canonical oracle for the restricted JSON domain. Inputs below
// use safe ASCII member names, scalar strings, booleans, null and safe integers.
function canon(v) {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0)) return String(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  throw new Error('Outside independent canonical domain');
}
const bytes = v => Buffer.from(canon(v), 'utf8');
const sha = v => createHash('sha256').update(v).digest('hex');
const hash = v => sha(bytes(v));
const gitHash = (kind, v) => createHash('sha1').update(Buffer.from(kind + ' ' + v.length + '\0')).update(v).digest('hex');
const clone = v => structuredClone(v);
const required = ['INTEGRITY', 'AUTHENTICITY', 'SUBJECT_BINDING', 'RECOMPUTATION', 'EVIDENCE_SUFFICIENCY', 'SEMANTIC_COMPATIBILITY'];
const pin = '9dd36e882dd372f264b77b179130948aa5adcbde';
const profile = JSON.parse(await readFile(resolve(candidate, 'vendor/rvr/conformance/rvr-v0/verification-profile.json'), 'utf8'));
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const spki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const signatureBytes = s => Buffer.concat([Buffer.from('receiptos.verify.statement.v1\0', 'ascii'), Buffer.from(hash(s), 'hex')]);
function signBundle(b) {
  b.statement.payload_digest = hash(b.payload);
  b.signature_base64 = sign(null, signatureBytes(b.statement), privateKey).toString('base64');
  if (!cryptoVerify(null, signatureBytes(b.statement), publicKey, Buffer.from(b.signature_base64, 'base64'))) throw new Error('Independent signature control failed');
  return b;
}
function nativeCase(artifact, expected, unavailable = false) {
  const claim = { schema: 'rvr.claim.sha256-equals.v0', operation: 'SHA256_EQUALS', evidenceMember: 'artifact', expectedDigest: expected };
  const member = unavailable ? { id: 'artifact', status: 'UNAVAILABLE', reasonCode: 'rvr.v0.evidence_unavailable' }
    : { id: 'artifact', status: 'PRESENT', mediaType: 'application/octet-stream', byteLength: String(artifact.length), digest: sha(artifact) };
  return { claim, evidenceSet: { schema: 'rvr.evidence-set.v0', members: [member] }, payloadsBase64: unavailable ? {} : { artifact: artifact.toString('base64') } };
}
function nativeBundle(c, observed) {
  const outcome = observed === null ? 'UNVERIFIABLE' : observed === c.claim.expectedDigest ? 'VERIFIED' : 'REFUTED';
  const reasonCode = { VERIFIED: 'rvr.v0.digest_match', REFUTED: 'rvr.v0.digest_mismatch', UNVERIFIABLE: 'rvr.v0.required_evidence_unavailable' }[outcome];
  const canonicalResult = { schema: 'rvr.canonical-result.v0', outcome, reasonCode, evaluation: { operation: 'SHA256_EQUALS', evidenceMember: 'artifact', expectedDigest: c.claim.expectedDigest, observedDigest: observed } };
  return { receipt: { claimDigest: hash(c.claim), evidenceSetDigest: hash(c.evidenceSet), verificationProfileDigest: hash(profile), outcome, reasonCode, resultDigest: hash(canonicalResult) },
    ...clone(c), verificationProfile: clone(profile), canonicalResult };
}
function fresh(id = 'audit-A', message = 'Independent A\n', artifactText = 'Audit own artifact\n', expectedOverride) {
  const artifact = Buffer.from(artifactText, 'utf8');
  const digest = sha(artifact), blob = gitHash('blob', artifact);
  const tree = Buffer.concat([Buffer.from('100644 artifact.txt\0', 'ascii'), Buffer.from(blob, 'hex')]);
  const treeId = gitHash('tree', tree);
  const commit = Buffer.from('tree ' + treeId + '\nauthor Release Auditor <synthetic@example.invalid> 1791676800 +0000\ncommitter Release Auditor <synthetic@example.invalid> 1791676800 +0000\n\n' + message, 'utf8');
  const subject = { kind: 'git-artifact', id, artifact_digest: digest, commit: gitHash('commit', commit), tree: treeId, artifact_path: 'artifact.txt', version: 'audit.v1' };
  const semantic = { claim_type: 'SHA256_EQUALS', authority_class: 'INDEPENDENT_RECOMPUTATION', subject: id, scope: 'artifact.txt', valid_after: 0, valid_until: 2000000000, assumptions: [], evidence_requirements: ['artifact', 'execution'] };
  const request = { schema: 'receiptos.verify.request.v1', verification_profile: 'receiptos.verify.git-artifact.v1', claim: { kind: 'SHA256_EQUALS', expected_digest: expectedOverride ?? digest }, subject,
    policy: { id: 'audit-policy', version: 'audit.v1', trusted_keys: [{ id: 'audit-ed25519', spki_base64: spki }], required_layers: [], minimum_grade: 'LOCAL_RECOMPUTATION', verification_time: 1791676800 }, evidence: [], semantic_requirement: clone(semantic), requested_guarantees: [] };
  const c = nativeCase(artifact, request.claim.expected_digest), originalBundle = nativeBundle(c, digest);
  // Crystal has a separate native root contract; author this shape directly.
  const crystalBody = { schema: 'stealth.session.evidence.v1', session_id: 'independent-release-audit', directory: 'audit/synthetic', task: { title: 'Independent artifact audit' }, agent: { id: 'audit', runtime: 'local' }, scope: { permission: null }, execution: [], commands: [], changes: { files_changed: [], diff_sha256: null }, metadata: { generated_by: 'independent-auditor' } };
  const crystal = { ...crystalBody, anchor: { receipt_root: '0x' + hash(crystalBody), network: 'local/off-chain', onchain_anchor_status: 'not anchored' } };
  const payload = { crystal, rvr: { originalBundle, candidateCase: clone(c) }, relations: { guarantee: null, continuity: null, domain: null,
    execution: { package_present: true, runner_declared: true, executed: true, subject_digest: hash(subject), executable_pin: pin, evidence_grade: 'LOCAL_RECOMPUTATION' } } };
  const raw = [{ id: 'artifact', role: 'artifact', bytes: artifact }, { id: 'commit', role: 'git-commit', bytes: commit }, { id: 'tree', role: 'git-tree', bytes: tree }, { id: 'result', role: 'native-result', bytes: bytes(originalBundle.canonicalResult) }];
  const statement = { schema: 'receiptos.verify.statement.v1', verification_profile: request.verification_profile, subject: clone(subject), claim: clone(request.claim), policy: { id: request.policy.id, version: request.policy.version, digest: hash(request.policy) }, semantic_contract: clone(semantic), asserted_result: expectedOverride && expectedOverride !== digest ? 'FAIL' : 'PASS',
    evidence_manifest: raw.map(r => ({ id: r.id, role: r.role, digest: sha(r.bytes), size: r.bytes.length })), payload_digest: hash(payload), crypto: { provider: 'ed25519', key_id: 'audit-ed25519' } };
  const bundle = signBundle({ schema: 'receiptos.verify.bundle.v1', canonicalization_profile: 'receiptos.verify.canonical-json.v1', statement, signature_base64: '', evidence: raw.map(r => ({ id: r.id, bytes_base64: r.bytes.toString('base64') })), payload });
  return { request, bundle };
}
const results = [], artifacts = {};
function record(id, category, expected, actual, detail = {}) {
  const pass = typeof expected === 'string' ? actual === expected : expected.includes(actual);
  results.push({ id, category, expected, actual, pass, ...detail });
  if (!pass) console.log('FINDING ' + id + ' expected=' + JSON.stringify(expected) + ' actual=' + actual);
}
function abbreviated(r) { return { overall: r.overall, reason_codes: r.reason_codes, explanation: r.explanation, required_layers: r.required_layers, layers: Object.fromEntries(Object.entries(r.layers).map(([k,v]) => [k,{ status: v.status, reasonCodes: v.reasonCodes, semanticOutcome: v.semanticOutcome ?? null, recomputationStatus: v.recomputationStatus ?? null, nativeResult: k === 'RECOMPUTATION' ? v.nativeResult : null }])) }; }
async function run(id, expected, mutate, category = 'subject') {
  const pair = fresh();
  if (mutate) await mutate(pair);
  const r = await verify(pair.request, pair.bundle);
  record(id, category, expected, r.overall, { report: abbreviated(r) });
  if (id === 'positive-own-fixture' || !results.at(-1).pass) artifacts[id] = { ...pair, report: r };
  return r;
}
await mkdir(here, { recursive: true });
await run('positive-own-fixture', 'VERIFIED');
await run('A.subject-A-request-B', 'CONTRADICTED', p => { p.request.subject.id = 'audit-B'; });
await run('B.commit-A-request-B', 'CONTRADICTED', p => { p.request.subject.commit = 'b'.repeat(40); });
await run('C.same-digest-other-real-commit', 'CONTRADICTED', p => { p.request.subject = fresh('audit-A', 'Independent B\n').request.subject; });
await run('D.same-commit-other-digest', 'CONTRADICTED', p => { p.request.subject.artifact_digest = 'b'.repeat(64); });
await run('E.same-id-other-version', 'CONTRADICTED', p => { p.request.subject.version = 'audit.v2'; });
await run('F.other-policy-version', 'CONTRADICTED', p => { p.request.policy.version = 'audit.v2'; });
await run('F.other-policy-content', 'CONTRADICTED', p => { p.request.policy.verification_time++; });
await run('G.valid-signature-A-request-B', 'CONTRADICTED', p => { p.request.subject = fresh('audit-B', 'B\n', 'B artifact\n').request.subject; });
await run('H.domain-replay-does-not-bind-B', 'CONTRADICTED', p => {
  p.request.subject.commit = 'b'.repeat(40); p.request.domain_profile = 'stochastic'; p.request.domain_requirement = {};
  p.bundle.payload.relations.domain = { stream_base64: 'AA==', stream_digest: sha(Buffer.from([0])), cursor: 0, domain: 'receiptos.verify.stochastic.v1', candidates: ['A'], candidate_set_digest: hash(['A']), selected: 'A' }; signBundle(p.bundle);
});
await run('I.missing-requested-subject', 'REJECTED_MALFORMED', p => { delete p.request.subject; });
for (const side of ['request', 'statement']) for (const field of ['kind','id','artifact_digest','commit','tree','artifact_path','version']) for (const variant of ['absent','null']) {
  await run('J.' + side + '.' + field + '.' + variant, 'REJECTED_MALFORMED', p => {
    const subject = side === 'request' ? p.request.subject : p.bundle.statement.subject;
    if (variant === 'absent') delete subject[field]; else subject[field] = null;
    if (side === 'statement') signBundle(p.bundle);
  });
}
for (const id of ['caf\u00e9', 'cafe\u0301', 'subject/\u{1f680}', 'line\u2028separator', 'esc"\\/']) {
  const p = fresh(id); const r = await verify(p.request,p.bundle); record('K.legal-unicode.' + JSON.stringify(id),'subject','VERIFIED',r.overall);
}
await run('K.distinct-normalization-forms', 'CONTRADICTED', p => { p.request.subject.id = 'cafe\u0301'; p.bundle.statement.subject.id = 'caf\u00e9'; p.bundle.statement.semantic_contract.subject = 'caf\u00e9'; p.bundle.payload.relations.execution.subject_digest = hash(p.bundle.statement.subject); signBundle(p.bundle); });
const equivalent = fresh('caf\u00e9');
const unicodeText = JSON.stringify(equivalent.request).replaceAll('é', '\\u00e9');
const rEquivalent = await verify(unicodeText, JSON.stringify(equivalent.bundle)); record('K.escaped-identical-codepoint','subject','VERIFIED',rEquivalent.overall);
await run('L.duplicate-evidence-id', 'REJECTED_MALFORMED', p => { p.bundle.evidence.push(clone(p.bundle.evidence[0])); });
await run('L.conflicting-manifest-role', 'REJECTED_MALFORMED', p => { const m=clone(p.bundle.statement.evidence_manifest[0]); m.id='artifact-second'; p.bundle.statement.evidence_manifest.push(m); p.bundle.evidence.push({id:m.id,bytes_base64:p.bundle.evidence[0].bytes_base64}); signBundle(p.bundle); });
await run('L.duplicate-trusted-key', 'REJECTED_MALFORMED', p => { p.request.policy.trusted_keys.push(clone(p.request.policy.trusted_keys[0])); });
await run('L.duplicate-required-layer', 'REJECTED_MALFORMED', p => { p.request.policy.required_layers=['INTEGRITY','INTEGRITY']; });
const duplicate = fresh();
const duplicateJson = JSON.stringify(duplicate.request).replace('"id":"audit-A"','"id":"audit-B","id":"audit-A"');
const rd = await verify(duplicateJson,duplicate.bundle); record('L.duplicate-JSON-subject-id','subject','REJECTED_MALFORMED',rd.overall);
await run('M.native-PASS-cannot-bypass-B', 'CONTRADICTED', p => { p.request.subject.commit = 'b'.repeat(40); p.bundle.payload.relations.domain = { status: 'PASS', valid: true }; signBundle(p.bundle); });
await run('signed-FAIL-native-VERIFIED', 'CONTRADICTED', p => { p.bundle.statement.asserted_result = 'FAIL'; signBundle(p.bundle); }, 'asserted-result');
await run('signed-CANNOT_CHECK-native-VERIFIED', ['VERIFIED','INSUFFICIENT_EVIDENCE','CONTRADICTED'], p => { p.bundle.statement.asserted_result = 'CANNOT_CHECK'; signBundle(p.bundle); }, 'exploratory-asserted-result');
await run('unknown-signature-provider', 'INSUFFICIENT_EVIDENCE', p => { p.bundle.statement.crypto.provider = 'unsupported-audit'; signBundle(p.bundle); }, 'premise');
await run('forged-signature', 'CONTRADICTED', p => { p.bundle.signature_base64 = Buffer.alloc(64).toString('base64'); }, 'premise');
await run('unsupported-profile', 'UNSUPPORTED_PROFILE', p => { p.request.verification_profile='audit.unknown'; }, 'premise');
for (const role of ['artifact','git-commit','git-tree','native-result']) {
  await run('missing-manifest-role.'+role, 'INSUFFICIENT_EVIDENCE', p => { const id=p.bundle.statement.evidence_manifest.find(x=>x.role===role).id; p.bundle.statement.evidence_manifest=p.bundle.statement.evidence_manifest.filter(x=>x.id!==id); p.bundle.evidence=p.bundle.evidence.filter(x=>x.id!==id); signBundle(p.bundle); }, 'premise');
  await run('missing-committed-bytes.'+role, ['INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE'], p => { const id=p.bundle.statement.evidence_manifest.find(x=>x.role===role).id; p.bundle.evidence.find(x=>x.id===id).bytes_base64=null; }, 'premise');
}
for (const flag of ['package_present','runner_declared','executed']) for (const value of [false,'true',1,null]) await run('execution-false-truthiness.'+flag+'.'+JSON.stringify(value),'INSUFFICIENT_EVIDENCE',p=>{p.bundle.payload.relations.execution[flag]=value; signBundle(p.bundle);},'premise');
await run('native-claim-artifact-byte-mismatch','REJECTED_MALFORMED',p=>{p.bundle.payload.rvr.candidateCase=nativeCase(Buffer.from('Different native artifact\n'),p.request.claim.expected_digest); signBundle(p.bundle);},'premise');
const negative = fresh('audit-negative', 'N\n', 'negative\n', '0'.repeat(64));
const nr = await verify(negative.request,negative.bundle); record('reproduced-negative-stays-negative','native','CONTRADICTED',nr.overall,{report:abbreviated(nr)});
const nativePositive = await recompute(fresh().bundle.payload.rvr); record('direct-rvr-own-positive','native','VERIFIED',nativePositive.status,{semanticOutcome:nativePositive.semanticOutcome,replay:nativePositive.recomputationStatus});
const crystalPositive = await verifyIntegrity(fresh().bundle.payload.crystal); record('direct-crystal-own-positive','native','VERIFIED',crystalPositive.status);

// Formal independent projection oracle: green requires every mandatory premise
// with an exact success status. Refuted or contradictory evidence blocks green;
// malformed reports and unavailable checks must never be upgraded.
const good = { INTEGRITY:'VERIFIED',AUTHENTICITY:'VERIFIED',SUBJECT_BINDING:'VERIFIED',RECOMPUTATION:'REPRODUCED',EVIDENCE_SUFFICIENCY:'SUFFICIENT',SEMANTIC_COMPATIBILITY:'COMPATIBLE' };
const greenLayers = () => Object.fromEntries(Object.entries({INPUT:'ADMITTED',CANONICALIZATION:'VERIFIED',...good}).map(([k,status])=>[k,{status,reasonCodes:[],nativeResult:null,...(k==='RECOMPUTATION'?{semanticOutcome:'VERIFIED'}:{})}]));
function proj(id,layers,req=required,supported=true,expected=['INSUFFICIENT_EVIDENCE','REJECTED_MALFORMED','CANNOT_RECOMPUTE','CONTRADICTED','UNSUPPORTED_PROFILE']) {
  let r; try { r=project(layers,req,supported); record(id,'projection',expected,r.status,{output:r}); } catch(e) { record(id,'projection',expected,'THREW',{error:e.message}); }
}
proj('projection-positive',greenLayers(),required,true,'VERIFIED');
for(const name of required) {
  const absent=greenLayers(); delete absent[name]; proj('projection-missing.'+name,absent);
  for(const status of ['NOT_RUN','NOT_REQUESTED','PASS','TRUE','true',true,1,null,'REPRODUCED','VERIFIED','PRESERVED','UNKNOWN','DIVERGED','CANNOT_RECOMPUTE','INSUFFICIENT','NOT_ESTABLISHED','UNVERIFIABLE','UNSUPPORTED','CONTRADICTED','INCOMPATIBLE','VIOLATED','REJECTED_MALFORMED']) {
    if(status===good[name]) continue; const l=greenLayers(); l[name].status=status; proj('projection-status.'+name+'.'+JSON.stringify(status),l);
  }
}
for(const semanticOutcome of ['REFUTED','UNVERIFIABLE',null,'PASS',true,1]) { const l=greenLayers(); l.RECOMPUTATION.semanticOutcome=semanticOutcome; proj('projection-native-outcome.'+JSON.stringify(semanticOutcome),l); }
for(const status of ['CONTRADICTED','INCOMPATIBLE','VIOLATED','REJECTED_MALFORMED']) {const l=greenLayers();l.OPTIONAL={status,reasonCodes:['AUDIT_OPTIONAL_NEGATIVE']};proj('projection-optional-negative.'+status,l);}
for(const reason of ['EVIDENCE_MISSING','SIGNER_NOT_TRUSTED','EVIDENCE_GRADE_NOT_ESTABLISHED','DEPENDENCY_BASIS_NOT_SEPARATELY_ACCEPTED','GUARANTEE_AUTHORITY_UNESTABLISHED','GUARANTEE_ASSUMPTION_UNESTABLISHED','UPSTREAM_GUARANTEE_UNESTABLISHED','ASSERTED_NATIVE_RESULT_CONTRADICTION']) { const l=greenLayers();l.RECOMPUTATION.reasonCodes=[reason];proj('projection-reason-barrier.'+reason,l); }
proj('projection-unsupported',greenLayers(),required,false,'UNSUPPORTED_PROFILE');
proj('projection-false-string-profile',greenLayers(),required,'false');
proj('projection-required-null',greenLayers(),null);
proj('projection-layers-null',null);
proj('projection-empty-required',greenLayers(),[]);
const onlyIntegrity={INPUT:{status:'ADMITTED',reasonCodes:[],nativeResult:null},CANONICALIZATION:{status:'VERIFIED',reasonCodes:[],nativeResult:null},INTEGRITY:{status:'VERIFIED',reasonCodes:[],nativeResult:null}};
proj('projection-required-single-layer',onlyIntegrity,['INTEGRITY']);
const missingInput=greenLayers();delete missingInput.INPUT;proj('projection-all-green-missing-input',missingInput);
const badReasons=greenLayers();badReasons.AUTHENTICITY.reasonCodes={malformed:true};proj('projection-object-reasonCodes',badReasons);

// Adapter results establish bounded relations only; none supplies central Git
// subject binding for an unrelated caller-selected subject.
for (const adapter of adapters) {
  const r = await adapter.bind_subject({subject:'B'},{subject:'A'});
  record('adapter-bind-subject.'+adapter.descriptor.profileId,'adapter','UNSUPPORTED',r.status);
}
const sem = fresh().request.semantic_requirement;
for (const dimension of ['authority_class','evidence_classes','established_assumptions']) {
  const s=clone(sem), req=clone(sem), context={verification_time:1791676800,authority_class:'INDEPENDENT_RECOMPUTATION',evidence_classes:['artifact','execution'],established_assumptions:[],evidence_subject:s.subject};
  if(dimension==='established_assumptions'){s.assumptions=['accepted-premise'];req.assumptions=['accepted-premise'];}else delete context[dimension];
  record('semantic-missing.'+dimension,'adapter','UNVERIFIABLE',evaluateSemantic(s,req,context).status);
}
const g={id:'g',subject:'A',scope:'audit',authority_class:'INDEPENDENT_RECOMPUTATION',dependencies:[],assumptions:[],evidence_requirements:['execution'],obligations:[{id:'o',predicate:'exact-artifact'}]};
for(const observed of [true,false,'true',1,null]) {const r=evaluateGuarantees([g],[g],{guarantees:[g]},{basis_accepted:true,accepted_basis_id:'audit-basis',supported_guarantee_ids:['g'],authority_class:'INDEPENDENT_RECOMPUTATION',evidence_classes:['execution'],established_assumptions:[],obligation_results:{g:{o:observed}}});record('guarantee-truthiness.'+JSON.stringify(observed),'adapter',observed===true?'PRESERVED':observed===false?'VIOLATED':'UNVERIFIABLE',r.status);}
const missingBasis = evaluateGuarantees([g],[g],{guarantees:[]},{basis_accepted:false,accepted_basis_id:'audit-basis',supported_guarantee_ids:['g'],authority_class:'INDEPENDENT_RECOMPUTATION',evidence_classes:['execution'],established_assumptions:[],obligation_results:{g:{o:false}}});record('guarantee-missing-premise-before-false','adapter','UNVERIFIABLE',missingBasis.status);
record('continuity-subject-A-request-B','adapter','VIOLATED',evaluateContinuity({entries:[{entry_id:'e',proof_object_ref:'p',receipt_root:'r',sequence:0,predecessor_ref:null,subject:'A',state:'PASS'}]},{mode:'historical',entry_id:'e',subject:'B',state:'PASS'}).status);
record('pq-structural-cannot-promote','adapter','UNVERIFIABLE',inspectVectorPack({vectors:[{message_digest:'0'.repeat(64),signature_base64:'AQ=='}]}).status);
record('ledger-label-cannot-promote','adapter','UNSUPPORTED',inspectAnchor({kind:'ethereum',transaction:'0x123',verified:true}).status);
const providers=new CryptoProviders().register('audit-mock',{kind:'MOCK',verify:async()=>({valid:true})});
const pq=await providers.verify({provider:'audit-mock',key_id:'k',authority:{key_id:'k',valid_after:0,valid_until:100,revoked:false}},10);record('pq-mock-valid-cannot-promote','adapter','UNVERIFIABLE',pq.status);
const stochastic=evaluateStochastic({stream_base64:'AA==',stream_digest:sha(Buffer.from([0])),cursor:0,domain:'receiptos.verify.stochastic.v1',candidates:['A'],candidate_set_digest:hash(['A']),selected:'A'});record('stochastic-replay-cannot-promote','adapter','UNVERIFIABLE',stochastic.status);
// Report schema checks structure only; independently falsify the verdict while
// preserving every other byte to see whether it rejects a contradictory report.
const forgedReport=clone(rd);forgedReport.overall='VERIFIED';
let schemaAccepted;try{schemaAccepted=validateSchema('report',forgedReport)}catch{schemaAccepted=false}
record('report-schema-structural-only','report','ACCEPTED',schemaAccepted?'ACCEPTED':'REJECTED',{limitation:'Schema structure validation is not semantic projection consistency; there is no documented report verification API. This is an observed boundary, not a defect.'});
const summary={candidate,expectedHead,actualHead,dependencyPaths,command:'node reports/release-audit-v0.1/semantics-fresh-after/independent.mjs reports/tmp/release-rc-audit/repaired-a',independence:'Independent generated key pair retained in memory only; no product fixtures/builders/oracle helpers invoked; fixed native profile document is read as declared data.',counts:{total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length},byCategory:Object.fromEntries([...new Set(results.map(r=>r.category))].map(c=>[c,{total:results.filter(r=>r.category===c).length,passed:results.filter(r=>r.category===c&&r.pass).length,failed:results.filter(r=>r.category===c&&!r.pass).length}])),results};
await writeFile(resolve(here,'results.json'),JSON.stringify(summary,null,2)+'\n');
for(const [id,value] of Object.entries(artifacts)) await writeFile(resolve(here,id+'.json'),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify(summary.counts));
process.exitCode=summary.counts.failed?1:0;
