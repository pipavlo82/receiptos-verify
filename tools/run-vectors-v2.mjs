import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readVector, runVector, discrepancies } from './corpus.mjs';
import { readVectorV2, runVectorV2, discrepanciesV2 } from './corpus-v2.mjs';

const oldIndex = JSON.parse(await readFile(new URL('../vectors/index.json', import.meta.url), 'utf8'));
const newIndex = JSON.parse(await readFile(new URL('../vectors/v0.2/index.json', import.meta.url), 'utf8'));
for (const [name, index] of [['v0.1', oldIndex], ['v0.2', newIndex]]) {
  if (!Array.isArray(index.vectors) || index.vectors.length === 0) throw new Error(`EMPTY_CORPUS:${name}`);
  if (index.count !== undefined && index.count !== index.vectors.length) throw new Error(`CORPUS_COUNT_MISMATCH:${name}`);
  if (new Set(index.vectors.map((entry) => entry.id)).size !== index.vectors.length) throw new Error(`DUPLICATE_VECTOR:${name}`);
}
const requiredOld = Array.from({ length: 30 }, (_, i) => `V${String(i + 1).padStart(2, '0')}`);
const requiredNew = [...Array.from({ length: 20 }, (_, i) => `G${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, i) => `I${String(i + 1).padStart(2, '0')}`)];
if (requiredOld.some((id) => !oldIndex.vectors.some((entry) => entry.id === id))) throw new Error('V01_REGRESSION_CORPUS_INCOMPLETE');
if (requiredNew.some((id) => !newIndex.vectors.some((entry) => entry.id === id))) throw new Error('V02_REQUIRED_CORPUS_INCOMPLETE');
const rows = [];
for (const [version, index, read, run, compare] of [
  ['v0.1', oldIndex, readVector, runVector, discrepancies],
  ['v0.2', newIndex, readVectorV2, runVectorV2, discrepanciesV2],
]) {
  for (const entry of index.vectors) {
    const vector = await read(entry.id);
    if (vector.id !== entry.id) throw new Error(`VECTOR_INDEX_ID_MISMATCH:${entry.id}`);
    const report = await run(vector);
    rows.push({ id: entry.id, version, expected: vector.expected,
      observed: { overall: report.overall, layers: Object.fromEntries(Object.entries(report.layers).map(([name, layer]) => [name, layer.status])), reason_codes: report.reason_codes },
      report, errors: compare(vector, report) });
  }
}
const summarize = (selected) => ({ count: selected.length, passed: selected.filter((row) => row.errors.length === 0).length, failed: selected.filter((row) => row.errors.length !== 0).length });
const output = { schema: 'receiptos.verify.corpus-report.v2', ...summarize(rows),
  versions: Object.fromEntries(['v0.1','v0.2'].map((version) => [version, summarize(rows.filter((row) => row.version === version))])), rows };
const path = process.argv[2] ? pathToFileURL(resolve(process.argv[2])) : new URL('../reports/v0.2/vectors.json', import.meta.url);
await mkdir(new URL('./', path), { recursive: true });
await writeFile(path, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ count: output.count, passed: output.passed, failed: output.failed, versions: output.versions,
  failures: rows.filter((row) => row.errors.length).map((row) => ({ id: row.id, errors: row.errors })) }));
process.exitCode = output.failed ? 1 : 0;
