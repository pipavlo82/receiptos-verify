import { readFile,readdir,mkdir,copyFile,writeFile } from 'node:fs/promises';
import { sha256 } from '../src/core/common.mjs';
const root=new URL('../',import.meta.url),lock=JSON.parse(await readFile(new URL('package-lock.json',root),'utf8')),rows=[];
for(const [path,entry] of Object.entries(lock.packages)) {
  if(!path)continue;if(!/^node_modules\/(?:@[a-z0-9-]+\/)?[a-z0-9-]+$/.test(path))throw new Error('INVALID_PACKAGE_PATH');
  const name=path.slice('node_modules/'.length),slug=name.replaceAll('/','__'),folder=new URL(path+'/',root);
  const files=(await readdir(folder)).filter(n=>/^(license|copying|notice)(\.|$)/i.test(n));
  if(!files.length)throw new Error('DEPENDENCY_LEGAL_FILE_MISSING: '+name);
  await mkdir(new URL('vendor/licenses/'+slug+'/',root),{recursive:true});
  const legal=[];
  for(const file of files) {const productPath='vendor/licenses/'+slug+'/'+file;await copyFile(new URL(file,folder),new URL(productPath,root));legal.push({path:productPath,sha256:sha256(await readFile(new URL(productPath,root)))});}
  rows.push({name,version:entry.version,license:entry.license,resolved:entry.resolved,integrity:entry.integrity,legal});
}
await writeFile(new URL('provenance/npm-licenses.json',root),JSON.stringify({schema:'receiptos.verify.npm-license-preservation.v1',packages:rows},null,2)+'\n');console.log(JSON.stringify({packages:rows.length,licenses:rows.reduce((n,r)=>n+r.legal.length,0)}));
