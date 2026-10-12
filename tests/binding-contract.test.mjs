import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectBindingContract, validateBindingContract } from '../src/core/binding-contract.mjs';
import { adapterProtocol } from '../src/adapters/protocol.mjs';

const required = ['receipt_root','claim','subject','submitting_account','transaction','network','ledger_checkpoint'];
function fixture() {
  const descriptor = {profileId:'binding-test-v1',sourceCommit:'a'.repeat(40),maturity:'EXPERIMENTAL',binding_contract:{version:1,required:[...required]}};
  const evidence = {};
  const bindings = {};
  for (const name of required) {
    const expected = {identity:name,version:1};
    evidence[`${name}.expected`] = structuredClone(expected);
    evidence[`${name}.observed`] = structuredClone(expected);
    bindings[name] = {status:'VERIFIED',relation:'EXACT',expected,observed:structuredClone(expected),evidence:[`${name}.expected`,`${name}.observed`]};
  }
  return {descriptor,report:{version:1,profileId:descriptor.profileId,bindings},evidence};
}
const verify = value => validateBindingContract(value.descriptor,value.report,value.evidence);

test('binding contract accepts all declared independently equal native relations without a product verdict', () => {
  const actual = verify(fixture());
  assert.equal(actual.status,'VERIFIED');
  assert.deepEqual(actual.reasonCodes,[]);
  assert.equal(actual.overall,undefined);
  assert.deepEqual(actual.missing,[]);
  assert.deepEqual(Object.keys(actual.bindings),required);
});

for (const name of required) {
  test(`required ${name} omission fails completeness even if adapter names agree`, () => {
    const value = fixture();
    const request = {adapter:value.descriptor.profileId};
    const statement = {adapter:value.descriptor.profileId};
    assert.equal(request.adapter,statement.adapter);
    delete value.report.bindings[name];
    const actual = verify(value);
    assert.equal(actual.status,'INSUFFICIENT_EVIDENCE');
    assert.deepEqual(actual.missing,[name]);
    assert.equal(actual.failures[0].binding,name);
    assert.equal(actual.failures[0].status,'INSUFFICIENT_EVIDENCE');
    assert.ok(actual.reasonCodes.includes('REQUIRED_BINDING_MISSING'));
  });
  test(`required ${name} cannot report VERIFIED when source snapshots disagree`, () => {
    const value = fixture();
    value.evidence[`${name}.observed`] = {identity:'different',version:1};
    value.report.bindings[name].observed = structuredClone(value.evidence[`${name}.observed`]);
    const actual = verify(value);
    assert.equal(actual.status,'CONTRADICTED');
    assert.equal(actual.bindings[name].status,'CONTRADICTED');
    assert.ok(actual.reasonCodes.includes('BINDING_RELATION_MISMATCH'));
  });
  test(`required ${name} cannot hide unequal evidence by copying expected into observed`, () => {
    const value = fixture();
    value.evidence[`${name}.observed`] = {identity:'different',version:1};
    const actual = verify(value);
    assert.equal(actual.status,'REJECTED_MALFORMED');
    assert.ok(actual.reasonCodes.includes('BINDING_EVIDENCE_UNBACKED'));
  });
}

for (const [label,change,code] of [
  ['null result', value => {value.report.bindings.claim=null;},'BINDING_RESULT_MALFORMED'],
  ['unknown state', value => {value.report.bindings.claim.status='ESTABLISHED';},'BINDING_RESULT_MALFORMED'],
  ['Boolean state', value => {value.report.bindings.claim.status=true;},'BINDING_RESULT_MALFORMED'],
  ['null expected relation', value => {value.report.bindings.claim.expected=null;},'BINDING_RESULT_MALFORMED'],
  ['null observed relation', value => {value.report.bindings.claim.observed=null;},'BINDING_RESULT_MALFORMED'],
  ['unknown relation', value => {value.report.bindings.claim.relation='TRUST_STATUS';},'BINDING_RESULT_MALFORMED'],
  ['unknown result member', value => {value.report.bindings.claim.complete=true;},'BINDING_RESULT_MALFORMED'],
  ['empty evidence', value => {value.report.bindings.claim.evidence=[];},'BINDING_RESULT_MALFORMED'],
  ['only one evidence ref', value => {value.report.bindings.claim.evidence=['claim.expected'];},'BINDING_RESULT_MALFORMED'],
  ['same evidence ref twice', value => {value.report.bindings.claim.evidence=['claim.expected','claim.expected'];},'BINDING_RESULT_MALFORMED'],
  ['nonstring evidence ref', value => {value.report.bindings.claim.evidence=[1,'claim.observed'];},'BINDING_RESULT_MALFORMED'],
  ['missing expected ref', value => {delete value.evidence['claim.expected'];},'BINDING_EVIDENCE_UNBACKED'],
  ['missing observed ref', value => {delete value.evidence['claim.observed'];},'BINDING_EVIDENCE_UNBACKED'],
  ['null evidence ref', value => {value.evidence['claim.observed']=null;},'BINDING_EVIDENCE_UNBACKED'],
  ['unknown binding name', value => {value.report.bindings.surprise=structuredClone(value.report.bindings.claim);},'UNDECLARED_BINDING'],
  ['descriptor/result profile disagreement', value => {value.report.profileId='another-adapter';},'BINDING_REPORT_MALFORMED'],
  ['descriptor/result version disagreement', value => {value.report.version=2;},'BINDING_REPORT_MALFORMED'],
  ['unknown report member', value => {value.report.complete=true;},'BINDING_REPORT_MALFORMED'],
  ['null report', value => {value.report=null;},'BINDING_REPORT_MALFORMED'],
  ['native PASS is not a binding report', value => {value.report={status:'PASS'};},'BINDING_REPORT_MALFORMED'],
  ['non-JSON evidence', value => {value.evidence['claim.observed']=NaN;},'BINDING_EVIDENCE_MALFORMED'],
]) {
  test(`binding admission rejects ${label}`, () => {
    const value=fixture();change(value);
    const actual=verify(value);
    assert.equal(actual.status,'REJECTED_MALFORMED');
    assert.ok(actual.reasonCodes.includes(code));
  });
}

for (const state of ['CONTRADICTED','INSUFFICIENT_EVIDENCE','REJECTED_MALFORMED','UNSUPPORTED_PROFILE']) {
  test(`required binding ${state} is never promoted to VERIFIED`, () => {
    const value=fixture();value.report.bindings.claim.status=state;
    assert.equal(verify(value).status,state);
  });
}

for (const [label,change] of [
  ['null contract', value => {value.descriptor.binding_contract=null;}],
  ['empty required inventory', value => {value.descriptor.binding_contract.required=[];}],
  ['duplicate required name', value => {value.descriptor.binding_contract.required.push('claim');}],
  ['malformed required name', value => {value.descriptor.binding_contract.required.push('Claim / future');}],
  ['extra contract member', value => {value.descriptor.binding_contract.complete=true;}],
]) {
  test(`contract admission rejects ${label}`, () => {
    const value=fixture();change(value);
    const actual=verify(value);
    assert.equal(actual.status,'REJECTED_MALFORMED');
    assert.deepEqual(actual.reasonCodes,['BINDING_CONTRACT_MALFORMED']);
  });
}

test('unknown contract version is explicitly unsupported', () => {
  const value=fixture();value.descriptor.binding_contract.version=2;
  assert.equal(verify(value).status,'UNSUPPORTED_PROFILE');
});
test('missing contract on a new-interface path is not inferred established', () => {
  const value=fixture();delete value.descriptor.binding_contract;
  assert.equal(verify(value).status,'UNSUPPORTED_PROFILE');
  assert.deepEqual(verify(value).reasonCodes,['BINDING_CONTRACT_REQUIRED']);
});
test('exact relation is member-order independent without Unicode/case normalization', () => {
  const value=fixture();
  value.evidence['claim.observed']={version:1,identity:'claim'};
  value.report.bindings.claim.observed={version:1,identity:'claim'};
  assert.equal(verify(value).status,'VERIFIED');
  value.evidence['claim.observed'].identity='CLAIM';
  value.report.bindings.claim.observed.identity='CLAIM';
  assert.equal(verify(value).status,'CONTRADICTED');
});
test('empty report binding inventory is insufficient rather than vacuously verified', () => {
  const value=fixture();value.report.bindings={};
  assert.equal(verify(value).status,'INSUFFICIENT_EVIDENCE');
  assert.deepEqual(verify(value).missing,required);
});
test('undeclared extra binding rejection is deterministic across object order', () => {
  const value=fixture();value.report.bindings.extra=structuredClone(value.report.bindings.claim);
  const one=verify(value);
  value.report.bindings=Object.fromEntries(Object.entries(value.report.bindings).reverse());
  assert.deepEqual(verify(value),one);
});
test('legacy protocol operations remain usable with an explicit non-contract classification', () => {
  const value=fixture();delete value.descriptor.binding_contract;
  const adapter=adapterProtocol(value.descriptor,{inspect:()=>({status:'PRESENT'})});
  assert.equal(adapter.bindingInterface.status,'LEGACY_NOT_DECLARED');
  assert.equal(adapter.inspect().status,'PRESENT');
  assert.equal(adapter.bind_subject().status,'UNSUPPORTED');
  assert.throws(()=>adapterProtocol(value.descriptor,{}, {requireBindingContract:true}),/ADAPTER_BINDING_CONTRACT_REQUIRED/);
});
test('versioned protocol explicitly declares its completeness obligations', () => {
  const value=fixture();const adapter=adapterProtocol(value.descriptor,{}, {requireBindingContract:true});
  assert.equal(adapter.bindingInterface.status,'DECLARED');
  assert.deepEqual(adapter.bindingInterface.required,required);
  assert.equal(inspectBindingContract(value.descriptor).status,'DECLARED');
});
test('protocol rejects malformed or unsupported contract descriptors', () => {
  const value=fixture();value.descriptor.binding_contract.required=[];
  assert.throws(()=>adapterProtocol(value.descriptor),/ADAPTER_BINDING_CONTRACT_MALFORMED/);
  value.descriptor.binding_contract={version:2,required:['claim']};
  assert.throws(()=>adapterProtocol(value.descriptor),/ADAPTER_BINDING_CONTRACT_MALFORMED/);
});
