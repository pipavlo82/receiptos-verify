import { readFile } from 'node:fs/promises';
import { verify } from '../src/core/verify.mjs';
const vector=JSON.parse(await readFile(process.argv[2],'utf8'));
process.stdout.write(JSON.stringify(await verify(vector.request,vector.bundle))+'\n');
