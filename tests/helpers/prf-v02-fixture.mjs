// Independent literal tuple/output premises; never call the native relation to
// generate an expected result. All identities and amounts are synthetic.
import { digest } from '../../src/core/common.mjs';
export function makePrfFixture() {
  const native = { outcome: 'PRESERVED', reason: 'award_bound_to_actual_settlement' };
  const fixture = {
    input: { profile: 'award-actual-settlement-v0', upstream: {
      award: { target_ref: 'synthetic-task', tender_id: 'synthetic-tender', winner: 'synthetic-worker', price: 50, finalized: true },
      settlements: [{ target_ref: 'synthetic-task', tender_id: 'synthetic-tender', fulfiller: 'synthetic-worker', amount: 50, accepted: true }],
      native_result: structuredClone(native),
    }, downstream: { native_result: structuredClone(native), dependencies: [{ id: 'supplied-input-binding', version: '1' }, { id: 'award-payment-relation', version: '1' }] } },
    context: { accepted_basis: { id: 'caller-accepted-synthetic-basis', dependencies: [{ id: 'supplied-input-binding', version: '1' }, { id: 'award-payment-relation', version: '1' }] }, required_native_result: structuredClone(native), required_guarantee: 'native-result-and-dependencies-preserved' },
  };
  fixture.context.required_relation_input_digest = digest({ award: fixture.input.upstream.award, settlements: fixture.input.upstream.settlements });
  return fixture;
}
