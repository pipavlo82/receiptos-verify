import { result, digest } from '../core/common.mjs';
export const descriptor={profileId:'receiptos.verify.execution-report.v1',sourceRepository:'trustless-ai/recompute-kit',sourceCommit:'e763f9b7be416ad244cbb6578bc2deb8f34b3877',license:'CC0-1.0 public source; new code Apache-2.0',maturity:'EXPERIMENTAL',capabilities:['reporter-not-self-grading','execution-binding','evidence-grade'],requiredEvidence:['native-process-result','executable-pin'],nativeVocabulary:['PASS','FAIL','CANNOT_CHECK']};
export function evaluateExecution(report,context) {
  if(!context.executed || !context.semanticObserved) return result('INSUFFICIENT',['NO_SEMANTIC_EXECUTION'],{report,observed:context}); // MUTATE: package-presence
  if(context.processStatus!=='COMPLETED') return result('CANNOT_RECOMPUTE',['CHECKER_UNAVAILABLE'],{report,observed:context});
  if(!report||report.package_present!==true||report.runner_declared!==true||report.executed!==true) return result('INSUFFICIENT',['EXECUTION_REPORT_INCOMPLETE']);
  if(report.subject_digest!==digest(context.subject)||report.executable_pin!==context.executablePin) return result('CONTRADICTED',['EXECUTION_BINDING_MISMATCH'],report);
  if(report.evidence_grade!=='LOCAL_RECOMPUTATION') return result('INSUFFICIENT',['EVIDENCE_GRADE_NOT_ESTABLISHED'],report); // MUTATE: execution-grade
  return result('VERIFIED',[],{report,independently_observed:context});
}
