import { writeFile,mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { verify } from '../src/core/verify.mjs';
import { digest } from '../src/core/common.mjs';
import { baselineV2,trustlessV2,interpollV2,resignV2,reattachAdapterV2 } from './fixtures-v2.mjs';
import { makePrfFixture } from '../tests/helpers/prf-v02-fixture.mjs';
import { refreshInterpollCommitment } from '../tests/helpers/interpoll-v02-fixture.mjs';

export async function demosV2() {
  const a=await baselineV2(), wrongCommit=structuredClone(a.request);wrongCommit.subject.commit='b'.repeat(40);
  const b=structuredClone(a.request);b.scope={all_artifacts:true};
  const c=await trustlessV2(), wrongClaim=structuredClone(c.request);wrongClaim.claim.id='unrelated-claim';
  const d=await interpollV2(), changed=structuredClone(d);
  const retry=structuredClone(changed.bundle.payload.adapter.attempts[0]);retry.id='mutated-retry';retry.action.value='down';retry.delivery_status='pending';retry.execution_attempted=false;
  changed.bundle.payload.adapter.attempts.push(retry);refreshInterpollCommitment(changed.bundle.payload.adapter);
  changed.request.subject.artifact_digest=digest(changed.bundle.payload.adapter);changed.bundle.statement.surface.subject.artifact_digest=changed.request.subject.artifact_digest;reattachAdapterV2(changed);
  const e=await baselineV2(), fixture=makePrfFixture();e.request.requested_guarantees=[{id:'native-result-and-dependencies-preserved'}];e.request.guarantee_requirement=fixture.context;e.bundle.payload.guarantees=fixture.input;resignV2(e);
  const broken=structuredClone(e);broken.bundle.payload.guarantees.downstream.dependencies[0].version='changed';resignV2(broken);
  const reports={
    A:{matching:await verify(a.request,a.bundle),wrong_commit:await verify(wrongCommit,a.bundle)},
    B:{wrong_scope:await verify(b,a.bundle)},
    C:{compatible:await verify(c.request,c.bundle),incompatible:await verify(wrongClaim,c.bundle)},
    D:{matching:await verify(d.request,d.bundle),mutated_retry:await verify(changed.request,changed.bundle)},
    E:{preserved:await verify(e.request,e.bundle),violated:await verify(broken.request,broken.bundle)},
  };
  const expected={A:{matching:'VERIFIED',wrong_commit:'CONTRADICTED'},B:{wrong_scope:'CONTRADICTED'},C:{compatible:'VERIFIED',incompatible:'CONTRADICTED'},D:{matching:'VERIFIED',mutated_retry:'CONTRADICTED'},E:{preserved:'VERIFIED',violated:'CONTRADICTED'}};
  const errors=[];
  for(const [demo,controls] of Object.entries(expected))for(const [control,status] of Object.entries(controls))if(reports[demo][control].overall!==status)errors.push(`${demo}.${control}: ${reports[demo][control].overall} != ${status}`);
  if(JSON.stringify(reports.C.compatible.layers.RECOMPUTATION.nativeResult)!==JSON.stringify(reports.C.incompatible.layers.RECOMPUTATION.nativeResult))errors.push('Native Trustless result changed with only caller claim');
  return {schema:'receiptos.verify.demos.v2',synthetic:true,expected,reports,errors,passed:errors.length===0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const output=await demosV2();await mkdir(new URL('../reports/v0.2/',import.meta.url),{recursive:true});
  await writeFile(new URL('../reports/v0.2/demos.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({passed:output.passed,errors:output.errors,results:Object.fromEntries(Object.entries(output.reports).map(([demo,controls])=>[demo,Object.fromEntries(Object.entries(controls).map(([control,report])=>[control,report.overall]))]))}));process.exitCode=output.passed?0:1;
}
