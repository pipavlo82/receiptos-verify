import { keys, sha256, digest, base64, problem, result } from './common.mjs';
import { verifyGitSubject } from './git.mjs';
export function inspectEvidenceV2(bundle) {
  const manifest = bundle.statement.evidence_manifest, entries = [], missing = [];
  const supplied = new Map();
  for (const item of bundle.evidence) {
    if (supplied.has(item.id)) throw problem('DUPLICATE_EVIDENCE','Evidence IDs must be unique.');
    supplied.set(item.id,item.bytes_base64);
  }
  const ids = new Set();
  for (const item of manifest) {
    if (ids.has(item.id)) throw problem('DUPLICATE_EVIDENCE','Manifest IDs must be unique.');
    ids.add(item.id);
    if (!supplied.has(item.id) || supplied.get(item.id)===null) {missing.push(item.id);continue;}
    const bytes = base64(supplied.get(item.id));
    if (bytes.length!==item.size || sha256(bytes)!==item.digest) throw problem('ATTACHMENT_INTEGRITY_MISMATCH','Committed attachment bytes differ.');
    entries.push({...item,bytes});
  }
  if ([...supplied.keys()].some(id=>!ids.has(id))) throw problem('UNCOMMITTED_EVIDENCE','Uncommitted attachment.');
  if (digest(bundle.payload)!==bundle.statement.payload_digest) throw problem('PAYLOAD_INTEGRITY_MISMATCH','Payload differs from its signed commitment.');
  for (const role of ['artifact','native-result','adapter-input']) if (manifest.filter(item=>item.role===role).length>1) throw problem('AMBIGUOUS_EVIDENCE_ROLE','Singular evidence role repeated.');
  let git = null;
  const subject = bundle.statement.surface.subject;
  if (subject.kind==='git-artifact') {
    const gitEntries = entries.filter(item=>['artifact','git-commit','git-tree'].includes(item.role));
    if (['artifact','git-commit','git-tree'].every(role=>gitEntries.some(item=>item.role===role))) {
      git = verifyGitSubject({type:'git-artifact',objectFormat:'sha1',commit:subject.commit,tree:subject.tree,artifact:{path:subject.artifact_path}},gitEntries);
      if (sha256(gitEntries.find(item=>item.role==='artifact').bytes)!==subject.artifact_digest) throw problem('ARTIFACT_SUBJECT_MISMATCH','Git closure covers other artifact bytes.');
    }
  }
  return {manifest,entries,missing,git};
}
export function evaluateEvidenceV2(inspected, request, native, binding) {
  const available = new Set(inspected.entries.map(item=>item.id));
  if (!inspected.manifest.length || !inspected.entries.length) return result('INSUFFICIENT',['EVIDENCE_MISSING']);
  if (inspected.missing.length || request.evidence.some(id=>!available.has(id))) return result('INSUFFICIENT',['COMMITTED_EVIDENCE_UNAVAILABLE']);
  if (request.subject.kind==='git-artifact' && !inspected.git) return result('INSUFFICIENT',['GIT_CLOSURE_UNAVAILABLE']);
  if (request.policy.minimum_grade!=='LOCAL_RECOMPUTATION' || native.execution?.status!=='COMPLETED') return result('INSUFFICIENT',['EVIDENCE_GRADE_NOT_ESTABLISHED']);
  if (request.adapter==='trustless' && native.evidenceGrade!=='REPRODUCED') return result('INSUFFICIENT',['EVIDENCE_GRADE_NOT_ESTABLISHED']); // V02_MUTATE evidence-grade
  if (binding.status!=='VERIFIED') return result('INSUFFICIENT',binding.reasonCodes);
  return result('SUFFICIENT',[],{grade:'LOCAL_RECOMPUTATION',available:[...available],git:inspected.git});
}
