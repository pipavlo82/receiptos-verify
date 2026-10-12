import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { descriptor, evaluateXrplAnchor, evaluateXrplClaim } from '../src/adapters/xrpl-anchor.mjs';
import { validateBindingContract } from '../src/core/binding-contract.mjs';

// All observations below reuse the original public transaction. No wallet,
// signature generation, faucet, submission, or network lookup is performed.
const ROOT = new URL('../', import.meta.url);
const captureBytes = readFileSync(new URL('reports/xrpl-poc/testnet-capture.json', ROOT));
const capture = JSON.parse(captureBytes);
const policy = JSON.parse(readFileSync(new URL('profiles/xrpl-poc-testnet-policy.json', ROOT), 'utf8'));
const required = ['receipt_root','claim','subject','submitting_account','transaction','network','ledger_checkpoint'];
const TRANSACTION = '375AE7E0F1D1405E2356BD9ACB4EC0B59B9665E01CB1B10A95E4CDDE6AA98633';
const clone = value => structuredClone(value);
function fresh() {
  return {
    input: {profile:capture.profile,receipt:clone(capture.receipt),claim_preimage:clone(capture.claim_preimage),observation:clone(capture.observation)},
    trust: {basis:'ACCEPTED_CAPTURE_REPLAY',endpoint:policy.endpoint,network_id:policy.network_id,
      checkpoint:clone(policy.checkpoint),account:policy.account,transaction_hash:policy.transaction_hash,required_transaction_result:null,
      claim_context:{verification_time:policy.verification_time,established_assumptions:[],dependency_results:[],evidence_basis:['receipt-root']}},
  };
}
let positive;
before(async () => {const value=fresh();positive=await evaluateXrplAnchor(value.input,value.trust);});

test('binding hardening preserves the exact public capture and seven declared relations', () => {
  assert.equal(createHash('sha256').update(captureBytes).digest('hex'),'7f7fa0ad162a5d619ff594e0aa562beb361fdd0d275821f7d1f0b2d54e7231ce');
  assert.equal(capture.observation.hash,TRANSACTION);
  assert.deepEqual(descriptor.binding_contract,{version:1,required});
  assert.equal(positive.anchor_native,'ANCHOR_MATCH');
  assert.equal(positive.adapter_anchor_native,'ANCHOR_MATCH');
  assert.equal(positive.binding_contract.status,'VERIFIED');
  assert.deepEqual(positive.binding_contract.failures,[]);
});
test('declared XRPL contract cannot be shrunk through mutable exported descriptor state', () => {
  assert.equal(Object.isFrozen(descriptor.binding_contract),true);
  assert.equal(Object.isFrozen(descriptor.binding_contract.required),true);
  assert.throws(()=>descriptor.binding_contract.required.pop(),TypeError);
  assert.throws(()=>{descriptor.binding_contract.required=['receipt_root'];},TypeError);
  assert.deepEqual(descriptor.binding_contract.required,required);
});

for (const name of required) {
  test(`public anchor does not establish omitted ${name} even with matching adapter IDs`, () => {
    const report=clone(positive.binding_report);
    assert.equal(report.profileId,descriptor.profileId);
    delete report.bindings[name];
    const actual=validateBindingContract(descriptor,report,positive.binding_evidence);
    assert.equal(actual.status,'INSUFFICIENT_EVIDENCE');
    assert.deepEqual(actual.missing,[name]);
    assert.deepEqual(actual.failures,[{binding:name,status:'INSUFFICIENT_EVIDENCE',reasonCodes:['REQUIRED_BINDING_MISSING']}]);
  });
  test(`public anchor does not establish null ${name}`, () => {
    const report=clone(positive.binding_report);report.bindings[name]=null;
    const actual=validateBindingContract(descriptor,report,positive.binding_evidence);
    assert.equal(actual.status,'REJECTED_MALFORMED');
    assert.equal(actual.failures[0].binding,name);
  });
  test(`public anchor cannot claim ${name} when copied snapshots hide unequal evidence`, () => {
    const report=clone(positive.binding_report),evidence=clone(positive.binding_evidence);
    evidence[report.bindings[name].evidence[1]]={counterfactual:'different'};
    const actual=validateBindingContract(descriptor,report,evidence);
    assert.equal(actual.status,'REJECTED_MALFORMED');
    assert.equal(actual.failures[0].binding,name);
    assert.ok(actual.reasonCodes.includes('BINDING_EVIDENCE_UNBACKED'));
  });
}

test('same public anchor A retains compatible continuation after structural hardening', async () => {
  const value=fresh();const actual=await evaluateXrplClaim(value.input,clone(capture.request_a),value.trust);
  assert.equal(actual.anchor_native,'ANCHOR_MATCH');
  assert.equal(actual.binding_contract.status,'VERIFIED');
  assert.equal(actual.claim_relation.status,'COMPATIBLE');
  assert.equal(actual.overall,'CONTINUE_REQUIRED_LAYERS');
  assert.equal(actual.transaction_hash,TRANSACTION);
});
test('same public anchor B remains a semantic contradiction with complete native bindings', async () => {
  const value=fresh();const actual=await evaluateXrplClaim(value.input,clone(capture.request_b),value.trust);
  assert.equal(actual.anchor_native,'ANCHOR_MATCH');
  assert.equal(actual.binding_contract.status,'VERIFIED');
  assert.equal(actual.claim_relation.status,'CONTRADICTED');
  assert.equal(actual.overall,'CONTRADICTED');
  assert.equal(actual.transaction_hash,TRANSACTION);
});
test('coherent later caller checkpoint cannot replace the checkpoint inside the committed claim', async () => {
  const value=fresh();const middle=value.input.observation.history[1];
  assert.equal(middle.ledger_index,21488207);
  value.trust.checkpoint={ledger_index:middle.ledger_index,ledger_hash:middle.ledger_hash.toLowerCase()};
  value.input.observation.history=value.input.observation.history.slice(1);
  // The actual tx, account, final ledger, Memo, R/C and committed preimage stay
  // fixed; only independently selected checkpoint/history-window changes.
  const actual=await evaluateXrplClaim(value.input,clone(capture.request_a),value.trust);
  assert.equal(actual.anchor_native,'ANCHOR_MISMATCH');
  assert.equal(actual.claim_relation.status,'COMPATIBLE');
  assert.equal(actual.overall,'CONTRADICTED');
  assert.ok(actual.reason_codes.includes('XRPL_NETWORK_CHECKPOINT_MISMATCH'));
  assert.equal(value.input.observation.hash,TRANSACTION);
  assert.deepEqual(value.input.observation.tx_blob,capture.observation.tx_blob);
});
test('core independently rejects checkpoint mismatch even when native reporter claims VERIFIED', () => {
  const report=clone(positive.binding_report),evidence=clone(positive.binding_evidence);
  const binding=report.bindings.ledger_checkpoint;
  const observed=clone(binding.observed);
  observed.checkpoint={ledger_index:21488207,ledger_hash:capture.observation.history[1].ledger_hash.toLowerCase()};
  evidence[binding.evidence[1]]=observed;binding.observed=observed;
  const actual=validateBindingContract(descriptor,report,evidence);
  assert.equal(actual.status,'CONTRADICTED');
  assert.deepEqual(actual.failures.map(row=>row.binding),['ledger_checkpoint']);
  assert.deepEqual(actual.reasonCodes,['BINDING_RELATION_MISMATCH']);
});
