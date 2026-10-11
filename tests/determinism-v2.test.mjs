import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReportForDeterminism, reportIdentityV2, validateNativeDeterminismWitness } from '../tools/determinism-v2.mjs';

test('v0.2 deterministic report identity excludes only nested execution.argv',()=>{
  const baseline={layers:{RECOMPUTATION:{status:'REPRODUCED',execution:{argv:['python','/one/path'],stdoutSha256:'unchanged'},nativeResult:{argv:['material-evidence']}}}};
  const other=structuredClone(baseline);other.layers.RECOMPUTATION.execution.argv=['python','/another/path'];
  assert.equal(reportIdentityV2(baseline),reportIdentityV2(other));
  assert.equal(Object.hasOwn(normalizeReportForDeterminism(baseline).layers.RECOMPUTATION.execution,'argv'),false);
  assert.deepEqual(normalizeReportForDeterminism(baseline).layers.RECOMPUTATION.nativeResult.argv,['material-evidence']);
  assert.deepEqual(baseline.layers.RECOMPUTATION.execution.argv,['python','/one/path']);
});
test('v0.2 determinism identity preserves statuses, reasons, native data, evidence, policy, grade and pins',()=>{
  const baseline={status:'VERIFIED',reasonCodes:['EXACT_RELATION'],nativeResult:{verdict:'NO_FINDING'},evidence:['bytes'],policy:{version:'1'},evidenceGrade:'REPRODUCED',sourcePin:'full-source-identity',execution:{argv:['/path'],cwd:'/material-location'}};
  for(const field of ['status','reasonCodes','nativeResult','evidence','policy','evidenceGrade','sourcePin']){
    const other=structuredClone(baseline);other[field]='changed';assert.notEqual(reportIdentityV2(baseline),reportIdentityV2(other));
  }
  const changed=structuredClone(baseline);changed.execution.cwd='/different-material-location';assert.notEqual(reportIdentityV2(baseline),reportIdentityV2(changed));
});
test('v0.2 native determinism cannot certify an empty, errored or merely successful JSON process',()=>{
  for(const id of ['rvr-bridge','trustless-bridge','trustless-native-cli','prf-native-relation']){
    for(const value of [null,{},[],{ok:true},{ok:false},{exitCode:0}])assert.throws(()=>validateNativeDeterminismWitness(id,value));
  }
  assert.equal(validateNativeDeterminismWitness('trustless-bridge',{ok:true,native_result:{subject_bound_check:'CONTRADICTED'},runner_result:{verdict:'PASS'}}),true);
});
