import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { isolatedCopy } from '../tools/corpus.mjs';
test('concurrent original crash/mutation controls use distinct complete copies',async()=>{
  const [a,b]=await Promise.all([isolatedCopy('same-control'),isolatedCopy('same-control')]);
  assert.notEqual(a.href,b.href);
  const path='src/adapters/recompute_kit.mjs';
  assert.equal(await readFile(new URL(path,a),'utf8'),await readFile(new URL(path,b),'utf8'));
  await writeFile(new URL(path,a),'throw new Error("isolated control");\n');
  assert.notEqual(await readFile(new URL(path,a),'utf8'),await readFile(new URL(path,b),'utf8'));
});
