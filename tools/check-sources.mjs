import { readdir,readFile,writeFile,lstat } from 'node:fs/promises';
import { sha256 } from '../src/core/common.mjs';
const root=new URL('../',import.meta.url);
const excluded=new Set(['.git','node_modules','reports','.cache']);
async function inventory(folder=root,prefix='') {
  const files=[];
  for(const entry of await readdir(folder,{withFileTypes:true})) {
    if(excluded.has(entry.name)||entry.name==='source-lock.json')continue;
    const path=prefix+entry.name,url=new URL(entry.name+(entry.isDirectory()?'/':''),folder);
    if((await lstat(url)).isSymbolicLink()) throw new Error('SYMLINK_NOT_IN_LOCK_CONTRACT: '+path);
    if(entry.isDirectory()) files.push(...await inventory(url,path+'/'));
    else if(entry.isFile()) {const bytes=await readFile(url);files.push({path,bytes:bytes.length,sha256:sha256(bytes)});}
  }
  return files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
const files=await inventory();
if(process.argv.includes('--write')) {await writeFile(new URL('source-lock.json',root),JSON.stringify({schema:'receiptos.verify.source-lock.v1',scope:'All product source/docs/schemas/profiles/vectors/vendor/provenance/package-lock; reports and installed dependencies excluded.',files},null,2)+'\n');console.log(JSON.stringify({locked:files.length}));}
else {
  const lock=JSON.parse(await readFile(new URL('source-lock.json',root),'utf8'));
  if(lock.schema!=='receiptos.verify.source-lock.v1'||!Array.isArray(lock.files)||lock.files.length<50||JSON.stringify(lock.files)!==JSON.stringify(files)) throw new Error('SOURCE_CLOSURE_MISMATCH');
  const errors=[];
  for(const file of files.filter(f=>!f.path.startsWith('vendor/'))) {
    const bytes=await readFile(new URL(file.path,root));
    if(bytes.includes(13)||bytes.subarray(0,3).equals(Buffer.from([239,187,191]))) errors.push(file.path);
  }
  if(errors.length) throw new Error('LF_OR_BOM_VIOLATION: '+errors.join(', '));
  console.log(JSON.stringify({status:'PASS',files:files.length,sourceLockDigest:sha256(await readFile(new URL('source-lock.json',root)))}));
}
