// Expected pair truth, observed adapter result, and backend conformance are
// separate values. No field aliases the oracle as though it were observation.
export const PAIR = { PRESERVED: "PRESERVED", VIOLATED: "VIOLATED", UNVERIFIABLE: "UNVERIFIABLE" };
export const BACKEND = { PASS: "PASS", FAIL: "FAIL", CANNOT_CHECK: "CANNOT_CHECK" };

// Evaluate one vector against one adapter.
//   vector : { id, relation, oracle: expected pair outcome, fixture }
//   adapter: { name, observe(vector) -> observed pair outcome | null }
export function evaluate(vector, adapter) {
  const expectedPair = vector.oracle;
  let observedPair;
  try {
    observedPair = adapter.observe(vector);
  } catch {
    observedPair = null;
  }

  if (observedPair == null || !Object.values(PAIR).includes(observedPair)) {
    return {
      relation: vector.relation,
      vector: vector.id,
      adapter: adapter.name,
      expected_pair: expectedPair,
      observed_pair: PAIR.UNVERIFIABLE,
      backend_conformance: BACKEND.CANNOT_CHECK,
    };
  }

  if (observedPair === expectedPair) {
    return {
      relation: vector.relation,
      vector: vector.id,
      adapter: adapter.name,
      expected_pair: expectedPair,
      observed_pair: observedPair,
      backend_conformance: BACKEND.PASS,
    };
  }

  return {
    relation: vector.relation,
    vector: vector.id,
    adapter: adapter.name,
    expected_pair: expectedPair,
    observed_pair: observedPair,
    backend_conformance: BACKEND.FAIL,
    witness: {
      relation: vector.relation,
      vector: vector.id,
      adapter: adapter.name,
      expected_pair: expectedPair,
      observed_pair: observedPair,
      backend_conformance: BACKEND.FAIL,
      minimal: `expected pair ${expectedPair}, backend observed ${observedPair} — protected relation collapsed`,
    },
  };
}

// Run every vector across every adapter and tally each value independently.
export function run(vectors, adapters) {
  const rows = [];
  const witnesses = [];
  const tally = {
    expected_pair: { PRESERVED: 0, VIOLATED: 0, UNVERIFIABLE: 0 },
    observed_pair: { PRESERVED: 0, VIOLATED: 0, UNVERIFIABLE: 0 },
    backend_conformance: { PASS: 0, FAIL: 0, CANNOT_CHECK: 0 },
  };
  for (const vector of vectors) {
    for (const adapter of adapters) {
      const result = evaluate(vector, adapter);
      rows.push(result);
      tally.expected_pair[result.expected_pair]++;
      tally.observed_pair[result.observed_pair]++;
      tally.backend_conformance[result.backend_conformance]++;
      if (result.witness) witnesses.push(result.witness);
    }
  }
  return { rows, witnesses, tally };
}
