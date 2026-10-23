// Executes the actual external modules; no copied canonicalization implementation.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { research, host, source } from '../lib/paths.mjs';
const crystalRoot = source('pipavlo82/crystal-receipt');
const lensRoot = source('trustless-ai/recompute-lens');
const crystal = await import(pathToFileURL(resolve(crystalRoot,'src/receiptos/canon/canonicalize.ts')).href);
const root = await import(pathToFileURL(resolve(crystalRoot,'src/receiptos/canon/receipt-root.ts')).href);
const lens = await import(pathToFileURL(resolve(lensRoot,'src/recompute/receiptos-c14n-v0.ts')).href);
const strict = await import(pathToFileURL(resolve(host,'src/core/strict-json.mjs')).href);
const nativeCanon = await import(pathToFileURL(resolve(host,'vendor/crystal/src/receiptos/canon/canonicalize.ts')).href);
const nativeRoot = await import(pathToFileURL(resolve(host,'vendor/crystal/src/receiptos/canon/receipt-root.ts')).href);
const cases = JSON.parse(readFileSync(resolve(research,'fixtures/canonicalization.json'),'utf8'));
const rows=[];
for(const c of cases) {
  for(const engine of ['crystal','lens','host_root','host_content']) {
    try {
      const value=engine.startsWith('host_')?strict.parseStrict(c.raw):JSON.parse(c.raw);
      let canonical, receiptRoot=null;
      if(engine==='lens') { const r=await lens.recompute(value,null); canonical=r.canonical; receiptRoot=r.recomputedRoot; }
      else if(engine==='crystal') { canonical=crystal.canonicalize(root.stripAnchor(value)); receiptRoot=root.computeReceiptRoot(value); }
      else if(engine==='host_root') { canonical=nativeCanon.canonicalize(nativeRoot.stripAnchor(value)); receiptRoot=nativeRoot.computeReceiptRoot(value); }
      else canonical=strict.canonicalize(value).toString('utf8');
      rows.push({case_id:c.case_id,engine,status:'ACCEPTED',canonical_hex:Buffer.from(canonical,'utf8').toString('hex'),receipt_root:receiptRoot});
    } catch(error) { rows.push({case_id:c.case_id,engine,status:'REJECTED',canonical_hex:null,receipt_root:null,error_class:error.code??error.name}); }
  }
}
console.log(JSON.stringify({rows,lens_golden:await lens.selfTest()}));
