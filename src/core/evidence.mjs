import { sha256, digest, base64, keys, HEX, problem, result } from './common.mjs';
import { verifyGitSubject } from './git.mjs';
export function inspectEvidence(bundle) {
  const manifest=bundle.statement.evidence_manifest;
  if (!Array.isArray(manifest)||!Array.isArray(bundle.evidence)) throw problem('SCHEMA_MISMATCH','Evidence arrays required.');
  const ids=new Set(), entries=[], missing=[];
  const supplied=new Map();
  for (const item of bundle.evidence) {
    keys(item,['id','bytes_base64']);
    if(typeof item.id!=='string'||supplied.has(item.id)) throw problem('DUPLICATE_EVIDENCE','Evidence IDs must be unique.');
    supplied.set(item.id,item.bytes_base64);
  }
  for (const item of manifest) {
    keys(item,['id','role','digest','size']);
    if(typeof item.id!=='string'||!item.id||ids.has(item.id)||typeof item.role!=='string'||!HEX.test(item.digest)||!Number.isSafeInteger(item.size)||item.size<0) throw problem('MANIFEST_MALFORMED','Invalid evidence manifest.');
    ids.add(item.id);
    const encoded=supplied.get(item.id);
    if(encoded===null||encoded===undefined) {missing.push(item.id);continue;}
    const bytes=base64(encoded);
    if(bytes.length!==item.size||sha256(bytes)!==item.digest) throw problem('ATTACHMENT_INTEGRITY_MISMATCH','Attachment bytes differ from their committed digest/size.');
    entries.push({...item,bytes});
  }
  if([...supplied.keys()].some(id=>!ids.has(id))) throw problem('UNCOMMITTED_EVIDENCE','Uncommitted evidence attachment.');
  if(['artifact','git-commit','native-result'].some(role=>manifest.filter(e=>e.role===role).length>1)) throw problem('AMBIGUOUS_EVIDENCE_ROLE','Artifact, commit and native-result roles are singular.');
  if(digest(bundle.payload)!==bundle.statement.payload_digest) throw problem('PAYLOAD_INTEGRITY_MISMATCH','Native payload differs from its signed commitment.');
  let git=null;
  const gitEntries=entries.filter(e=>['artifact','git-commit','git-tree'].includes(e.role));
  if(['artifact','git-commit','git-tree'].every(role=>gitEntries.some(e=>e.role===role))) {
    const s=bundle.statement.subject;
    git=verifyGitSubject({type:'git-artifact',objectFormat:'sha1',commit:s.commit,tree:s.tree,artifact:{path:s.artifact_path}},gitEntries);
    if(sha256(gitEntries.find(e=>e.role==='artifact').bytes)!==s.artifact_digest) throw problem('ARTIFACT_SUBJECT_MISMATCH','Covered artifact digest disagrees with its bytes.');
  }
  return {manifest,entries,missing,git};
}
export function evaluateEvidence(inspected,execution,policy) {
  const roles=['artifact','git-commit','git-tree','native-result'];
  const absent=roles.filter(role=>!inspected.manifest.some(e=>e.role===role));
  if(inspected.manifest.length===0||absent.length) return result('INSUFFICIENT',['EVIDENCE_MISSING'],{absent,available:inspected.entries.length}); // MUTATE: empty-evidence
  if(inspected.missing.length) return result('INSUFFICIENT',['COMMITTED_EVIDENCE_UNAVAILABLE'],{missing:inspected.missing});
  if(!inspected.git) return result('INSUFFICIENT',['GIT_CLOSURE_UNAVAILABLE']);
  if(execution.status!=='VERIFIED') return result('INSUFFICIENT',execution.reasonCodes,execution.nativeResult);
  if(policy.minimum_grade!=='LOCAL_RECOMPUTATION') return result('INSUFFICIENT',['EVIDENCE_GRADE_NOT_ESTABLISHED']); // MUTATE: grade
  return result('SUFFICIENT',[],{grade:'LOCAL_RECOMPUTATION',git:inspected.git});
}
