import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { verifyV2 } from '../src/core/verify-v2.mjs';
import { parseStrict } from '../src/core/strict-json.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const vectors = resolve(root, 'vectors', 'v0.2');
const reference = process.argv[2];
if (typeof reference !== 'string' || !reference || reference.includes('\0')
    || (/^[a-z][a-z0-9+.-]*:/i.test(reference) && !isAbsolute(reference))) throw new Error('VECTOR_REFERENCE_INVALID');
const path = /^[GI][0-9]{2}$/.test(reference) ? resolve(vectors, `${reference}.json`)
  : isAbsolute(reference) ? resolve(reference)
    : resolve(reference.startsWith('vectors/') || reference.startsWith('vectors\\') ? root : vectors, reference);
const inside = relative(vectors, path);
if (!inside || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside) || !path.endsWith('.json')) throw new Error('VECTOR_REFERENCE_OUTSIDE_V02_CORPUS');
const vector = parseStrict(await readFile(path));
process.stdout.write(`${JSON.stringify(await verifyV2(vector.request, vector.bundle))}\n`);
