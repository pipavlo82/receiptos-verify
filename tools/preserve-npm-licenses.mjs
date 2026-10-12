import { readFile,readdir,mkdir,writeFile } from 'node:fs/promises';
import { sha256 } from '../src/core/common.mjs';
const root=new URL('../',import.meta.url),lock=JSON.parse(await readFile(new URL('package-lock.json',root),'utf8')),rows=[];
const previous=JSON.parse(await readFile(new URL('provenance/npm-licenses.json',root),'utf8'));
const previousByPath=new Map(previous.packages.map(row=>[row.packagePath??'node_modules/'+row.name,row]));
const packagePattern=/^node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+(?:\/node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+)*$/;
for(const [path,entry] of Object.entries(lock.packages)) {
  if(!path)continue;if(!packagePattern.test(path))throw new Error('INVALID_PACKAGE_PATH');
  const name=path.slice(path.lastIndexOf('node_modules/')+'node_modules/'.length);
  const slug=path.slice('node_modules/'.length).replaceAll('/node_modules/','__nested__').replaceAll('/','__'),folder=new URL(path+'/',root);
  const installed=JSON.parse(await readFile(new URL('package.json',folder),'utf8'));
  if(installed.name!==name||installed.version!==entry.version||installed.license!==entry.license)throw new Error('INSTALLED_PACKAGE_IDENTITY_MISMATCH: '+path);
  const files=(await readdir(folder)).filter(n=>/^(licen[cs]e|copying|notice)(\.|$)/i.test(n)).sort();
  if(!files.length)throw new Error('DEPENDENCY_LEGAL_FILE_MISSING: '+name);
  await mkdir(new URL('vendor/licenses/'+slug+'/',root),{recursive:true});
  const legal=[];
  for(const file of files) {
    const productPath='vendor/licenses/'+slug+'/'+file,bytes=await readFile(new URL(file,folder));
    let saved;try{saved=await readFile(new URL(productPath,root));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(saved&&!saved.equals(bytes))throw new Error('PRESERVED_LICENSE_WOULD_CHANGE: '+productPath);
    if(!saved)await writeFile(new URL(productPath,root),bytes);
    legal.push({path:productPath,sha256:sha256(bytes)});
  }
  const record={name,version:entry.version,license:entry.license,resolved:entry.resolved,integrity:entry.integrity,legal};
  const prior=previousByPath.get(path);
  if(prior&&!prior.packagePath) {
    if(JSON.stringify(prior)!==JSON.stringify(record))throw new Error('HISTORICAL_NPM_IDENTITY_CHANGED: '+path);
    rows.push(prior);
  }else rows.push({...record,packagePath:path});
}
await writeFile(new URL('provenance/npm-licenses.json',root),JSON.stringify({schema:'receiptos.verify.npm-license-preservation.v1',packages:rows},null,2)+'\n');console.log(JSON.stringify({packages:rows.length,licenses:rows.reduce((n,r)=>n+r.legal.length,0)}));
