import test from 'node:test';
import assert from 'node:assert/strict';
import { auditMutantsV1 } from '../tools/mutation-harness-v1.mjs';
import { mutations } from '../mutations/catalog.mjs';
const verify = 'export async function verify(requestInput,bundleInput) {';
const mutation = (id,from,to,file='src/core/verify.mjs',positive='V01',witness='V04') => ({id,file,positive,witness,changes:[[from,to]]});
test('v1 release mutation gate refuses zero inventory',async()=>{
  await assert.rejects(auditMutantsV1([]),/ZERO_MUTANTS/);
});
test('v1 release mutation gate refuses unapplied and no-op changes',async()=>{
  const r=await auditMutantsV1([mutation('UNAPPLIED','SOURCE_LOCATION_NOT_PRESENT','any'),mutation('NOOP',verify,verify)]);
  assert.equal(r.passed,false);assert.equal(r.counts.KILLED,0);assert.equal(r.counts.NOT_APPLIED,2);
});
test('v1 release mutation gate refuses an outer process crash',async()=>{
  const r=await auditMutantsV1([mutation('CRASH',verify,verify+'\n process.exit(7);')]);
  assert.equal(r.passed,false);assert.equal(r.counts.KILLED,0);assert.equal(r.counts.CRASHED,1);
});
test('v1 release mutation gate refuses invalid outer JSON despite exit zero',async()=>{
  const r=await auditMutantsV1([mutation('NULL',verify,verify+'\n return null;')]);
  assert.equal(r.passed,false);assert.equal(r.counts.KILLED,0);assert.equal(r.counts.INVALID_OUTPUT,1);
});
test('v1 release mutation gate refuses a damaged positive control',async()=>{
  const r=await auditMutantsV1([mutation('POSITIVE',"return result('VERIFIED',reasons);","return result('CONTRADICTED',['BROKEN_POSITIVE']);",'src/projection/project.mjs')]);
  assert.equal(r.passed,false);assert.equal(r.counts.KILLED,0);assert.equal(r.counts.CONTROL_BROKEN,1);
});
const marker="    request = native.parse_json_bytes(data, 'bridge stdin')";
for(const [name,body,status] of [['crash','sys.exit(7)','CRASHED'],['null','print("null"); sys.exit(0)','INVALID_OUTPUT']]) {
  test(`v1 release mutation gate refuses inner-native ${name} with preserved positive`,async()=>{
    const to=marker+"\n    if request.get('operation') == 'recompute' and request['input']['originalBundle']['canonicalResult']['outcome'] == 'REFUTED':\n        "+body;
    const r=await auditMutantsV1([mutation('INNER-'+name,marker,to,'src/adapters/native/rvr-bridge.py','V01','V07')]);
    assert.equal(r.passed,false);assert.equal(r.counts.KILLED,0);assert.equal(r.counts[status],1);
    assert.equal(r.rows[0].applied,true);assert.equal(r.rows[0].positive_preserved,true);
    assert.equal(r.rows[0].mutant_projection,'CANNOT_RECOMPUTE');
  });
}
test('v1 fixed crash baseline still witnesses false semantic refutation',async()=>{
  const r=await auditMutantsV1([mutations.find(item=>item.id==='count-crash-as-semantic-refutation')]);
  assert.equal(r.passed,true);assert.equal(r.counts.KILLED,1);assert.equal(r.rows[0].expected_fault_preserved,true);
  assert.equal(r.rows[0].baseline_projection,'CANNOT_RECOMPUTE');assert.equal(r.rows[0].mutant_projection,'CONTRADICTED');
});
