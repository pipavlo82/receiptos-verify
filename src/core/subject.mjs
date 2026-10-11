import { equal, digest, result } from './common.mjs';
export function bindSubject(request, statement) {
  const reasons=[];
  const fields=['kind','id','artifact_digest','commit','tree','artifact_path','version'];
  for (const field of fields) {
    if (!equal(request.subject[field],statement.subject[field])) reasons.push(field.toUpperCase()+'_MISMATCH'); // MUTATE: requested-subject
  }
  if (!equal(request.claim,statement.claim)) reasons.push('CLAIM_MISMATCH');
  if (request.policy.id !== statement.policy.id || request.policy.version !== statement.policy.version || digest(request.policy) !== statement.policy.digest) reasons.push('POLICY_MISMATCH'); // MUTATE: policy-version
  return result(reasons.length?'CONTRADICTED':'VERIFIED',reasons.length?['REQUESTED_SUBJECT_NOT_BOUND',...reasons]:[],{requested:request.subject,covered:statement.subject}, {explanation:reasons.length?`Evidence covering commit ${statement.subject.commit} does not establish the caller-selected claim for commit ${request.subject.commit}. This does not establish that the requested commit executed or failed.`:'The caller-selected subject and policy match the covered subject and policy.'});
}
