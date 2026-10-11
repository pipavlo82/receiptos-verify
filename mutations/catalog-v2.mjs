const boundary='src/core/claim-surface.mjs', projection='src/projection/project-v2.mjs';
const patch=(file,from,to)=>({file,changes:[[from,to]]});
const compare=(field,code)=>`compare('${field}',requested.${field},evidence.${field},'${code}');`;
const ignored=field=>`add('${field}','COMPATIBLE',[]);`;
const inject="  const obligations = [...new Set([...REQUIRED_V2,...required])];";
export const mutationsV2=[
  {id:'M01',defect:'ignore authority identity',positive:'G01',witness:'G04',patches:[patch(boundary,compare('authority','AUTHORITY_MISMATCH'),ignored('authority'))]},
  {id:'M02',defect:'ignore scope at both product and native semantic link',positive:'G01',witness:'G05',patches:[patch(boundary,compare('scope','SCOPE_MISMATCH'),ignored('scope')),patch('src/adapters/semantic-abi-v2.mjs','scope: encoded(surface.scope),','scope: encoded({}),')]},
  {id:'M03',defect:'ignore policy version',positive:'G01',witness:'G06',patches:[patch(boundary,compare('policy','POLICY_MISMATCH'),ignored('policy'))]},
  {id:'M04',defect:'ignore dependency premise presence',positive:'G23',witness:'G07',patches:[patch(boundary,"if (!observed || observed.status !== 'SATISFIED' && observed.status !== 'CONTRADICTED') dependencyReasons.push('DEPENDENCY_MISSING');","if (false) dependencyReasons.push('DEPENDENCY_MISSING');")]},
  {id:'M05',defect:'ignore dependency contradiction',positive:'G23',witness:'G08',patches:[patch(boundary,"if (observed?.status === 'CONTRADICTED') dependencyReasons.push('DEPENDENCY_CONTRADICTED');","if (false) dependencyReasons.push('DEPENDENCY_CONTRADICTED');")]},
  {id:'M06',defect:'compare evidence subject to itself',positive:'G01',witness:'G03',patches:[patch(boundary,"compare('subject',identity(requested.subject),identity(evidence.subject),'SUBJECT_MISMATCH');","compare('subject',identity(evidence.subject),identity(evidence.subject),'SUBJECT_MISMATCH');")]},
  {id:'M07',defect:'native positive bypasses semantic compatibility',positive:'G24',witness:'G11',patches:[patch(projection,inject,inject+"\n  if (layers.RECOMPUTATION?.semanticOutcome==='VERIFIED') return result('VERIFIED',reasons);")]},
  {id:'M08',defect:'promote reproduced negative to verified',positive:'G24',witness:'G12',patches:[{file:projection,changes:[
    ["if (layers.RECOMPUTATION?.semanticOutcome==='REFUTED') return result('CONTRADICTED',[...reasons,'NATIVE_NEGATIVE_RESULT']);","if (false) return result('CONTRADICTED',[...reasons,'NATIVE_NEGATIVE_RESULT']);"],
    ["layers.RECOMPUTATION?.semanticOutcome!=='VERIFIED'","!['VERIFIED','REFUTED'].includes(layers.RECOMPUTATION?.semanticOutcome)"]]}]},
  {id:'M09',defect:'allow retry to mutate signed material action',positive:'G13',witness:'G14',patches:[patch('src/adapters/interpoll-v2.mjs','if (!equal(attempt.action, input.signed_intent)) {','if (false) {')]},
  {id:'M10',defect:'collapse native PRF UNVERIFIABLE to preserved',positive:'G15',witness:'G21',patches:[patch('src/adapters/prf-v2.mjs',"if (actual.outcome === 'UNVERIFIABLE') return out(","if (false) return out(")]},
  {id:'M11',defect:'ignore requested claim version',positive:'G01',witness:'G22',patches:[patch(boundary,"compare('version',{claim:requested.version,subject:requested.subject.version},{claim:evidence.version,subject:evidence.subject.version},'VERSION_MISMATCH');",ignored('version'))]},
  {id:'M12',defect:'integrity and signature override contradiction',positive:'G01',witness:'G18',patches:[patch(projection,inject,inject+"\n  if (layers.INTEGRITY.status==='VERIFIED' && layers.AUTHENTICITY.status==='VERIFIED') return result('VERIFIED',reasons);")]},
  {id:'M13',defect:'promote authenticated scan report grade to local scanner recomputation',positive:'G24',witness:'G29',patches:[patch('src/core/evidence-v2.mjs',"if (request.adapter==='trustless' && native.evidenceGrade!=='REPRODUCED') return result('INSUFFICIENT',['EVIDENCE_GRADE_NOT_ESTABLISHED']);","if (false) return result('INSUFFICIENT',['EVIDENCE_GRADE_NOT_ESTABLISHED']);")]},
  {id:'M14',defect:'hide requested PRF native negative behind preserved transfer',positive:'G15',witness:'G30',patches:[patch(projection,"const prfProjection = layers.GUARANTEE_PRESERVATION.productProjection ?? null; // V02_MUTATE prf-product","const prfProjection = null; // V02_MUTATE prf-product")]},
];
