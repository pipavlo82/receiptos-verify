// Independent audit runner. Does not import candidate corpus/harness/result validators.
import {readFile} from 'node:fs/promises';
import {verify} from './src/core/verify.mjs';
const vector=JSON.parse(await readFile(process.argv[2],'utf8'));
const result=await verify(vector.request,vector.bundle);
process.stdout.write(JSON.stringify(result)+'\n');
