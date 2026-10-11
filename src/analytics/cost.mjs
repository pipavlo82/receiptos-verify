function exactByteCount(entries, sizeOf) {
  const total = entries.reduce((sum, entry) => sum + BigInt(sizeOf(entry)), 0n);
  return total <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(total) : total.toString(10);
}

export function evidenceCost(inspected, executions = []) {
  const committed = exactByteCount(inspected.manifest, (entry) => entry.size);
  const available = exactByteCount(inspected.entries, (entry) => entry.bytes.length);
  return {
    schema: 'receiptos.verify.evidence-cost.v1',
    committed_bytes: committed,
    available_bytes: available,
    byte_count_encoding: {
      committed_bytes: typeof committed === 'number' ? 'SAFE_INTEGER' : 'DECIMAL_STRING',
      available_bytes: typeof available === 'number' ? 'SAFE_INTEGER' : 'DECIMAL_STRING',
    },
    committed_members: inspected.manifest.length,
    native_processes_completed: executions.filter((entry) => entry?.status === 'COMPLETED').length,
    assumptions: ['Counts describe this supplied evidence inventory and local process observations only.'],
    establishes_security_guarantee: false,
  };
}
