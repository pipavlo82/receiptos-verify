import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {research,support,source} from '../lib/paths.mjs';
const checkout=source('trustless-ai/recompute-lens');
const expectedSha='70b44d854a32c867b756fa1272b194d4ae8f1ce0';
const expectedFile='ec85b664699203e3147438230d967639243a9c34659c3fb8324c4401c1c8c2ef';
const input=readFileSync(resolve(checkout,'src/recompute/receiptos-c14n-v0.ts'));
const hash=(b:any)=>createHash('sha256').update(b).digest('hex');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:checkout,encoding:'utf8'}).trim()!==expectedSha||hash(input)!==expectedFile)
  throw new Error('PINNED_LENS_SOURCE_MISMATCH');
const out=resolve(support,'browser-build');mkdirSync(out,{recursive:true});
// Local transient compilation of the original dependency. No upstream source or
// compiled copy is committed, included in the evidence archive, or redistributed.
const compiled=new Bun.Transpiler({loader:'ts',target:'browser'}).transformSync(input.toString('utf8'));
writeFileSync(resolve(out,'lens-native.js'),compiled);
const assets=['index.html','app.mjs','recipe.mjs','style.css'];
const manifest:any={profile:'agent-action.browser-build.v0',lens_source_sha:expectedSha,lens_file_sha256:expectedFile,
  lens_compiled_sha256:hash(compiled),lens_license:'NO_REDISTRIBUTION_GRANT_ESTABLISHED',bun:Bun.version,assets:{}};
for(const asset of assets){const b=readFileSync(resolve(research,'browser',asset));writeFileSync(resolve(out,asset),b);manifest.assets[asset]=hash(b);}
writeFileSync(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest));
