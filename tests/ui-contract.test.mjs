import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { runInNewContext } from 'node:vm';
import { startServer } from '../src/server.mjs';
import { verify } from '../src/core/verify.mjs';
import { validateSchema } from '../src/core/schemas.mjs';
import { readVector } from '../tools/corpus.mjs';

// Logic harness only: it evaluates the actual app source with a minimal DOM.
// This is not a rendered-browser, accessibility or cross-browser assessment.
const appSource = await readFile(new URL('../web/app.mjs', import.meta.url), 'utf8');
const positive = await readVector('V01'), wrong = await readVector('V02');
const positiveReport = await verify(positive.request, positive.bundle);
assert.equal(positiveReport.overall, 'VERIFIED');
const copy = x => structuredClone(x);

class Element {
  constructor(id = '') { this.id = id; this.value = ''; this.textContent = ''; this.className = ''; this.disabled = id === 'download'; this.children = []; }
  append(...children) { this.children.push(...children); if (this.id === 'vector' && !this.value) this.value = children[0]?.value ?? ''; }
  replaceChildren(...children) { this.children = children; }
  async click() { if (!this.disabled) return this.onclick?.({target:this}); }
}
async function app() {
  const ids = ['vector','request','bundle','context','verdict','explanation','layers','download','verify','load','wrong','error','request-file','bundle-file'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element(id)]));
  const state = { elements, posts: [], response: async () => ({ok:true,json:async()=>copy(positiveReport)}) };
  const fetch = async (url, options) => {
    if (options?.method === 'POST') { const body = JSON.parse(options.body); state.posts.push(body); return state.response(body); }
    if (url === '/api/vectors') return {json:async()=>({vectors:[{id:'V01',title:positive.title},{id:'V02',title:wrong.title}]})};
    if (url === '/api/vectors/V01' || url === '/api/vectors/V02') return {json:async()=>copy(url.endsWith('V01') ? positive : wrong)};
    if (url === '/api/vectors/V08') return {json:async()=>readVector('V08')};
    throw new Error('Unexpected UI request: ' + url);
  };
  const document = {getElementById:id=>elements[id],createElement:()=>new Element()};
  await runInNewContext('(async()=>{' + appSource + '\n})()', {document,fetch,JSON,URL,Blob,TextDecoder,console}, {timeout:5000});
  state.edit = (id, text) => { elements[id].value = text; elements[id].oninput?.({target:elements[id]}); };
  state.assertInactive = () => { assert.notEqual(elements.verdict.textContent, 'VERIFIED'); assert.ok(!elements.verdict.className.split(' ').includes('good')); assert.equal(elements.download.disabled,true); assert.equal(elements.layers.children.length,0); };
  return state;
}

test('loading a synthetic package is neutral until verification', async () => {
  const h = await app(); h.assertInactive(); assert.equal(h.posts.length,0);
});

test('Verify sends textarea strings verbatim, including duplicate keys and numeric tokens', async () => {
  const h = await app(), rawRequest = ' {"schema":"first","schema":"second","n":1e0} ', rawBundle = '\n{"x":1,"x":2}\n';
  h.edit('request',rawRequest); h.edit('bundle',rawBundle);
  h.response = async body => ({ok:true,json:async()=>verify(body.request,body.bundle)});
  await h.elements.verify.click();
  assert.deepEqual(h.posts[0],{request:rawRequest,bundle:rawBundle});
  assert.equal(h.elements.verdict.textContent,'REJECTED_MALFORMED');
});

for (const kind of ['request','bundle']) test(`${kind} edit invalidates the prior green report and download`, async () => {
  const h = await app(); await h.elements.verify.click(); assert.equal(h.elements.verdict.textContent,'VERIFIED');
  h.edit(kind,h.elements[kind].value+' '); h.assertInactive(); assert.equal(h.elements.wrong.disabled,true);
});

test('vector selection, loading and wrong-commit control clear stale success', async () => {
  const h = await app(); await h.elements.verify.click();
  await h.elements.wrong.click(); h.assertInactive(); assert.equal(JSON.parse(h.elements.request.value).subject.commit,wrong.request.subject.commit);
  await h.elements.load.click(); h.assertInactive();
  await h.elements.verify.click(); h.elements.vector.value='V02'; h.elements.vector.onchange(); h.assertInactive();
});

test('manual malformed text disables demo transformation without normalizing it', async () => {
  const h = await app(), raw='{"schema":1,"schema":2}'; h.edit('request',raw);
  await h.elements.wrong.click(); assert.equal(h.elements.request.value,raw); h.assertInactive();
});

test('file upload preserves raw bytes as text and invalidates stale success', async () => {
  const h = await app(); await h.elements.verify.click(); const raw=' {"schema":1,"schema":2}\n';
  await h.elements['request-file'].onchange({target:{files:[new Blob([raw])]}});
  assert.equal(h.elements.request.value,raw); h.assertInactive();
});

for(const kind of ['request','bundle']) test(`${kind} file rejects invalid UTF-8 rather than repairing signed identifiers`,async()=>{
  const h=await app();await h.elements.verify.click();assert.equal(h.elements.verdict.textContent,'VERIFIED');
  const bytes=Buffer.from('{"subject":"audit-\ufffd"}');const i=bytes.indexOf(Buffer.from('\ufffd'));
  const invalid=Buffer.concat([bytes.subarray(0,i),Buffer.from([255]),bytes.subarray(i+3)]);
  assert.equal(new TextDecoder().decode(invalid),bytes.toString('utf8'),'replacement decoder would repair the input');
  await h.elements[kind+'-file'].onchange({target:{files:[new Blob([invalid])]}});
  assert.equal(h.elements[kind].value,'');assert.match(h.elements.error.textContent,/INVALID_UTF8/);h.assertInactive();
  h.response=async body=>({ok:true,json:async()=>verify(body.request,body.bundle)});await h.elements.verify.click();
  assert.equal(h.elements.verdict.textContent,'REJECTED_MALFORMED');
});

test('file intake preserves valid Unicode and BOM bytes for strict parser admission',async()=>{
  const h=await app();const raw='\ufeff{"id":"\ufffdé😀"}';
  await h.elements['request-file'].onchange({target:{files:[new Blob([raw])]}});
  assert.equal(h.elements.request.value,raw);h.assertInactive();
});

test('UI cannot silently run a checker-fault control without its isolated execution setup',async()=>{
  const h=await app();await h.elements.verify.click();h.elements.vector.value='V08';await h.elements.load.click();
  h.assertInactive();assert.equal(h.elements.verify.disabled,true);assert.equal(h.elements.request.value,'');
  assert.equal(h.elements.bundle.value,'');assert.match(h.elements.context.textContent,/isolated CLI runner/);
  assert.equal(h.elements.verdict.textContent,'CLI CONTROL REQUIRED');
  const posts=h.posts.length;await h.elements.verify.click();assert.equal(h.posts.length,posts);
  h.elements.vector.value='V01';await h.elements.load.click();assert.equal(h.elements.verify.disabled,false);
  await h.elements.verify.click();assert.equal(h.elements.verdict.textContent,'VERIFIED');
});

test('network failure after prior success leaves no current green report', async () => {
  const h = await app(); await h.elements.verify.click(); h.response=async()=>{throw new Error('Synthetic network failure');};
  await h.elements.verify.click(); h.assertInactive(); assert.match(h.elements.error.textContent,/network failure/);
});

test('an old successful response cannot paint edited inputs green', async () => {
  const h=await app(); let release; h.response=()=>new Promise(resolve=>{release=resolve;});
  const pending=h.elements.verify.click(); assert.equal(typeof release,'function');
  h.edit('request','{"schema":"changed"}'); release({ok:true,json:async()=>copy(positiveReport)}); await pending; h.assertInactive();
});

test('reproduced native negative remains red at the overall UI boundary', async () => {
  const h=await app(), negative=await readVector('V07'), report=await verify(negative.request,negative.bundle);
  assert.equal(report.overall,'CONTRADICTED'); h.response=async()=>({ok:true,json:async()=>report});
  await h.elements.verify.click(); assert.equal(h.elements.verdict.textContent,'CONTRADICTED'); assert.match(h.elements.verdict.className,/bad/);
  assert.ok(h.elements.layers.children.some(detail=>detail.children[1]?.textContent.includes('REFUTED')));
});

let server, base;
test.before(async()=>{server=startServer(0);await once(server,'listening');base='http://127.0.0.1:'+server.address().port;});
test.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
const post = body => fetch(base+'/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});

for (const kind of ['request','bundle']) test(`server preserves duplicate keys inside raw ${kind} text and returns a schema-valid rejection`, async()=>{
  const pair={request:JSON.stringify(positive.request),bundle:JSON.stringify(positive.bundle)};
  pair[kind]=pair[kind].replace('{','{"schema":"duplicate preceding key",');
  const response=await post(pair); assert.equal(response.status,200); const report=await response.json();
  assert.equal(report.overall,'REJECTED_MALFORMED'); assert.ok(report.reason_codes.includes('DUPLICATE_JSON_KEY')); assert.equal(validateSchema('report',report),true);
});

test('server preserves forbidden exponent tokens in raw request text',async()=>{
  const raw=JSON.stringify(positive.request).replace('"verification_time":1','"verification_time":1e0');
  const response=await post({request:raw,bundle:JSON.stringify(positive.bundle)}); assert.equal(response.status,200);
  const report=await response.json(); assert.equal(report.overall,'REJECTED_MALFORMED'); assert.equal(validateSchema('report',report),true);
});

test('malformed policy admission returns a report, distinct from malformed transport envelope',async()=>{
  const request=copy(positive.request);request.policy.required_layers={};
  const response=await post({request:JSON.stringify(request),bundle:JSON.stringify(positive.bundle)});assert.equal(response.status,200);
  const report=await response.json();assert.equal(report.overall,'REJECTED_MALFORMED');assert.equal(validateSchema('report',report),true);
  const envelope=await post('{"request":{},"request":{},"bundle":{}}');assert.equal(envelope.status,400);assert.equal((await envelope.json()).error,'DUPLICATE_JSON_KEY');
});

for(const [name,assumptions] of [
  ['one long missing premise',['X'.repeat(2000)]],
  ['many missing premises',Array.from({length:300},(_,i)=>'missing-'+i)],
  ['long explanation from bounded premise names',Array.from({length:32},(_,i)=>'missing-'+i+'-'+'X'.repeat(100))],
]) test(`${name} cannot produce an invalid report document`,async()=>{
  const request=copy(positive.request);request.semantic_requirement.assumptions=assumptions;
  const response=await post({request,bundle:positive.bundle});assert.equal(response.status,200);const report=await response.json();
  assert.notEqual(report.overall,'VERIFIED');assert.equal(validateSchema('report',report),true);
});

test('delayed request bodies cannot bypass the two-verifier concurrency bound',async()=>{
  const body=JSON.stringify({request:positive.request,bundle:positive.bundle}), requests=[];
  for(let i=0;i<3;i++) {
    let started;
    const ready=new Promise(resolve=>{started=resolve;});
    const result=new Promise((resolve,reject)=>{
      const req=httpRequest(base+'/api/verify',{method:'POST',headers:{'Content-Type':'application/json'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
      req.on('error',reject);req.flushHeaders();req.write(body.slice(0,1));requests.push(req);started();
    });
    requests[i].result=result;await ready;
  }
  await new Promise(resolve=>setTimeout(resolve,40));
  for(const req of requests)req.end(body.slice(1));
  const statuses=await Promise.all(requests.map(req=>req.result));
  assert.ok(statuses.includes(429),'At least the third verifier must be busy: '+statuses.join(','));
});
