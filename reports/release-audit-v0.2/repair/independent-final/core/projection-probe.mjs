import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const repo=resolve(process.argv[2]),out=resolve(process.argv[3]);await mkdir(out,{recursive:true});
const {projectV2}=await import(pathToFileURL(resolve(repo,'src/projection/project-v2.mjs')));
const critical=['INTEGRITY','AUTHENTICITY','SUBJECT_BINDING','RECOMPUTATION','EVIDENCE_SUFFICIENCY','SEMANTIC_COMPATIBILITY'];
const success={INTEGRITY:['VERIFIED'],AUTHENTICITY:['VERIFIED'],SUBJECT_BINDING:['VERIFIED'],RECOMPUTATION:['REPRODUCED'],EVIDENCE_SUFFICIENCY:['SUFFICIENT'],SEMANTIC_COMPATIBILITY:['COMPATIBLE'],GUARANTEE_PRESERVATION:['PRESERVED'],CONTINUITY:['PRESERVED','VERIFIED'],DOMAIN_ADAPTERS:['VERIFIED','PRESERVED']};
const vocabulary={INPUT:['ADMITTED','REJECTED_MALFORMED','NOT_RUN'],CANONICALIZATION:['VERIFIED','NOT_RUN'],INTEGRITY:['VERIFIED','REJECTED_MALFORMED','CANNOT_RECOMPUTE','INSUFFICIENT_EVIDENCE','NOT_RUN'],AUTHENTICITY:['VERIFIED','CONTRADICTED','NOT_ESTABLISHED','NOT_RUN'],SUBJECT_BINDING:['VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE','NOT_RUN'],RECOMPUTATION:['REPRODUCED','DIVERGED','CANNOT_RECOMPUTE','CONTRADICTED','REJECTED_MALFORMED','INSUFFICIENT_EVIDENCE','UNSUPPORTED','NOT_RUN'],EVIDENCE_SUFFICIENCY:['SUFFICIENT','INSUFFICIENT','NOT_RUN'],SEMANTIC_COMPATIBILITY:['COMPATIBLE','CONTRADICTED','INSUFFICIENT_EVIDENCE','UNSUPPORTED','NOT_RUN'],GUARANTEE_PRESERVATION:['PRESERVED','VIOLATED','UNVERIFIABLE','NOT_REQUESTED','NOT_RUN'],CONTINUITY:['PRESERVED','VERIFIED','VIOLATED','UNVERIFIABLE','NOT_REQUESTED','NOT_RUN'],DOMAIN_ADAPTERS:['VERIFIED','PRESERVED','CONTRADICTED','VIOLATED','UNVERIFIABLE','NOT_ESTABLISHED','INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE','REJECTED_MALFORMED','UNSUPPORTED','UNSUPPORTED_PROFILE','NOT_REQUESTED','NOT_RUN'],PRODUCT_PROJECTION:['NOT_RUN'],EXPLAINABLE_REPORT:['NOT_RUN'],PROVENANCE:['RECORDED','NOT_RUN']};
const baseline=Object.fromEntries(Object.entries(vocabulary).map(([k,v])=>[k,{status:v[0],reasonCodes:[],nativeResult:null}]));
baseline.RECOMPUTATION.semanticOutcome='VERIFIED';
for(const k of ['GUARANTEE_PRESERVATION','CONTINUITY','DOMAIN_ADAPTERS'])baseline[k].status='NOT_REQUESTED';
const decisionTable=[
 {priority:1,condition:'Invalid inventory, data representation, native semantic vocabulary, required-layer list or support flag',verdict:'REJECTED_MALFORMED'},
 {priority:2,condition:'Any supplied layer/nested PRF product result is REJECTED_MALFORMED',verdict:'REJECTED_MALFORMED'},
 {priority:3,condition:'Any supplied layer/nested PRF contradicts/violates OR recomputation semantic result is REFUTED',verdict:'CONTRADICTED'},
 {priority:4,condition:'Unsupported profile OR a required layer/nested PRF is unsupported',verdict:'UNSUPPORTED_PROFILE'},
 {priority:5,condition:'Required recomputation unavailable/diverged OR required nested PRF is CANNOT_RECOMPUTE',verdict:'CANNOT_RECOMPUTE'},
 {priority:6,condition:'Mandatory or selected positive premise is unestablished',verdict:'INSUFFICIENT_EVIDENCE'},
 {priority:7,condition:'All guards clear; all required successes established; native semantic result positive',verdict:'VERIFIED'},
];
// Independently authored contract oracle. Inputs below are valid data-shaped
// layer reports; malformed representation probes have detached literal answers.
function oracle(layers,required,supported){
  const obligation=[...new Set([...critical,...required])],prf=layers.GUARANTEE_PRESERVATION.productProjection;
  const statuses=Object.values(layers).map(v=>v.status);if(prf)statuses.push(prf.status);
  if(statuses.includes('REJECTED_MALFORMED'))return 'REJECTED_MALFORMED';
  if(statuses.some(s=>s==='CONTRADICTED'||s==='VIOLATED')||layers.RECOMPUTATION.semanticOutcome==='REFUTED')return 'CONTRADICTED';
  if(supported===false||obligation.some(k=>['UNSUPPORTED','UNSUPPORTED_PROFILE'].includes(layers[k].status))||obligation.includes('GUARANTEE_PRESERVATION')&&prf?.status==='UNSUPPORTED_PROFILE')return 'UNSUPPORTED_PROFILE';
  if(obligation.some(k=>['CANNOT_RECOMPUTE','DIVERGED'].includes(layers[k].status))||obligation.includes('GUARANTEE_PRESERVATION')&&prf?.status==='CANNOT_RECOMPUTE')return 'CANNOT_RECOMPUTE';
  if(layers.INPUT.status!=='ADMITTED'||layers.CANONICALIZATION.status!=='VERIFIED'||layers.RECOMPUTATION.semanticOutcome!=='VERIFIED'||obligation.some(k=>!success[k].includes(layers[k].status))||obligation.includes('GUARANTEE_PRESERVATION')&&prf&&prf.status!=='VERIFIED')return 'INSUFFICIENT_EVIDENCE';
  return 'VERIFIED';
}
const rows=[],clone=v=>structuredClone(v);
function run(id,layers,required=[],supported=true,expected){
 const literal=expected??oracle(layers,required,supported),actual=projectV2(layers,required,supported);
 rows.push({id,layers,required,supported,expected:literal,actual:actual.status,reasonCodes:actual.reasonCodes,passed:literal===actual.status});
}
run('baseline',clone(baseline));
const axes=Object.entries(vocabulary).filter(([name])=>!['PRODUCT_PROJECTION','EXPLAINABLE_REPORT','PROVENANCE'].includes(name));
for(let i=0;i<axes.length;i++)for(let j=i;j<axes.length;j++){
 const [a,as]=axes[i],[b,bs]=axes[j];
 for(const x of as)for(const y of bs){
  const layers=clone(baseline);layers[a].status=x;layers[b].status=y;
  run(`${a}:${x}|${b}:${y}`,layers);
  if(['GUARANTEE_PRESERVATION','CONTINUITY','DOMAIN_ADAPTERS'].includes(a)||['GUARANTEE_PRESERVATION','CONTINUITY','DOMAIN_ADAPTERS'].includes(b))run(`required:${a}:${x}|${b}:${y}`,layers,[...new Set([a,b].filter(k=>['GUARANTEE_PRESERVATION','CONTINUITY','DOMAIN_ADAPTERS'].includes(k)))]);
 }
}
for(const semantic of ['VERIFIED','REFUTED','UNVERIFIABLE',null])for(const support of [true,false])for(const native of vocabulary.RECOMPUTATION){const l=clone(baseline);l.RECOMPUTATION.status=native;l.RECOMPUTATION.semanticOutcome=semantic;run(`native:${native}|semantic:${semantic}|supported:${support}`,l,[],support);}
for(const nested of ['VERIFIED','CONTRADICTED','INSUFFICIENT_EVIDENCE','CANNOT_RECOMPUTE','REJECTED_MALFORMED','UNSUPPORTED_PROFILE'])for(const outer of vocabulary.GUARANTEE_PRESERVATION)for(const required of [[],['GUARANTEE_PRESERVATION']]){const l=clone(baseline);l.GUARANTEE_PRESERVATION.status=outer;l.GUARANTEE_PRESERVATION.productProjection={status:nested,reasonCodes:['AUDIT_NESTED_RESULT']};run(`prf:${outer}|nested:${nested}|required:${required.length}`,l,required);}
const malformed=[
 ['missing-layer',l=>delete l.AUTHENTICITY],['extra-layer',l=>l.EXTRA={status:'VERIFIED',reasonCodes:[],nativeResult:null}],
 ['truthy-status',l=>l.SEMANTIC_COMPATIBILITY.status=true],['false-native-outcome',l=>l.RECOMPUTATION.semanticOutcome=false],
 ['truthy-native-outcome',l=>l.RECOMPUTATION.semanticOutcome={}],['missing-native-result',l=>delete l.AUTHENTICITY.nativeResult],
 ['null-reason-codes',l=>l.AUTHENTICITY.reasonCodes=null],['nested-extra-key',l=>l.GUARANTEE_PRESERVATION.productProjection={status:'VERIFIED',reasonCodes:[],extra:true}],
 ['unknown-native-outcome',l=>l.RECOMPUTATION.semanticOutcome='PASS'],['null-layer',l=>l.SUBJECT_BINDING=null],
];
for(const [id,change]of malformed){const l=clone(baseline);change(l);run('malformed:'+id,l,[],true,'REJECTED_MALFORMED');}
run('malformed:required-unknown',clone(baseline),['UNKNOWN'],true,'REJECTED_MALFORMED');
run('malformed:required-duplicate',clone(baseline),['INTEGRITY','INTEGRITY'],true,'REJECTED_MALFORMED');
run('malformed:nonboolean-supported',clone(baseline),[],'true','REJECTED_MALFORMED');
const summary={total:rows.length,passed:rows.filter(x=>x.passed).length,failed:rows.filter(x=>!x.passed),method:'All admitted single/pair status substitutions, optional obligation activation, native semantic outcomes/support flag, nested PRF six product values, plus literal malformed/truthiness controls. This is finite transition coverage, not all Cartesian combinations of fourteen layers.',decisionTable};
await writeFile(resolve(out,'projection-decision-table.json'),JSON.stringify({summary,rows},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
