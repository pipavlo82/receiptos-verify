import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { startServer } from '../src/server.mjs';
import { validateV2Schema } from '../src/core/admission-v2.mjs';
import { validateSchema } from '../src/core/schemas.mjs';

const copy = value => structuredClone(value);
const appSource = await readFile(new URL('../web/app.mjs', import.meta.url), 'utf8');
const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../web/style.css', import.meta.url), 'utf8');
let server, base;
const vectors = new Map(), reports = new Map();
test.before(async () => {
  server = startServer(0); await once(server, 'listening'); base = 'http://127.0.0.1:' + server.address().port;
  for (const id of ['G10', 'G12', 'G14', 'G21', 'G24', 'G30', 'V02']) {
    const vectorResponse = await fetch(base + '/api/vectors/' + id);
    assert.equal(vectorResponse.status, 200);
    const vector = await vectorResponse.json(); vectors.set(id, vector);
    const response = await fetch(base + '/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: vector.request, bundle: vector.bundle }) });
    assert.equal(response.status, 200); reports.set(id, await response.json());
  }
});
test.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });

test('v0.2 UI API advertises all 68 unique controls without deleting original vectors', async () => {
  const response = await fetch(base + '/api/vectors'); assert.equal(response.status, 200);
  const index = await response.json(), ids = index.vectors.map(value => value.id);
  assert.equal(ids.length, 68); assert.equal(new Set(ids).size, 68);
  assert.equal(ids.filter(id => /^V\d{2}$/.test(id)).length, 30);
  assert.equal(ids.filter(id => /^G\d{2}$/.test(id)).length, 30);
  assert.equal(ids.filter(id => /^I\d{2}$/.test(id)).length, 8);
});

test('v0.2 UI API accepts only exact G/I vector paths', async () => {
  for (const id of ['I01', 'I05', 'I08', 'G01', 'G28']) {
    const response = await fetch(base + '/api/vectors/' + id); assert.equal(response.status, 200);
    assert.equal((await response.json()).id, id);
  }
  for (const path of ['/api/vectors/g10', '/api/vectors/G1', '/api/vectors/G010', '/api/vectors/I09', '/api/vectors/G10.json', '/api/vectors/G10/extra', '/api/vectors/G10?path=package.json', '/api/vectors/%2e%2e/package.json']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});

test('v0.2 UI API G10 exposes scope contradiction despite valid integrity/authenticity', () => {
  const report = reports.get('G10');
  assert.equal(report.schema, 'receiptos.verify.report.v2');
  assert.equal(report.overall, 'CONTRADICTED');
  assert.equal(report.layers.INTEGRITY.status, 'VERIFIED');
  assert.equal(report.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(report.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(report.layers.SEMANTIC_COMPATIBILITY.status, 'CONTRADICTED');
  assert.ok(report.reason_codes.includes('SCOPE_MISMATCH'));
  assert.equal(validateV2Schema('report', report), true);
});

test('v0.2 UI API G12 preserves reproduced negative native Trustless result', () => {
  const report = reports.get('G12');
  assert.equal(report.overall, 'CONTRADICTED');
  assert.equal(report.layers.RECOMPUTATION.status, 'REPRODUCED');
  assert.equal(report.layers.RECOMPUTATION.nativeResult.verdict, 'PASS');
  assert.equal(report.layers.RECOMPUTATION.nativeResult.semanticVerdict, 'CONTRADICTED');
  assert.equal(report.layers.RECOMPUTATION.semanticOutcome, 'REFUTED');
  assert.equal(validateV2Schema('report', report), true);
});

test('v0.2 UI API G14 exposes the changed signed retry action', () => {
  const report = reports.get('G14');
  assert.equal(report.overall, 'CONTRADICTED');
  assert.equal(report.layers.AUTHENTICITY.status, 'VERIFIED');
  assert.equal(report.layers.DOMAIN_ADAPTERS.status, 'CONTRADICTED');
  assert.ok(report.reason_codes.some(code => /RETRY/.test(code)));
  assert.equal(validateV2Schema('report', report), true);
});

test('v0.2 UI API G21 withholds PRF guarantee on unavailable relation', () => {
  const report = reports.get('G21');
  assert.equal(report.overall, 'INSUFFICIENT_EVIDENCE');
  assert.equal(report.layers.GUARANTEE_PRESERVATION.status, 'UNVERIFIABLE');
  assert.equal(validateV2Schema('report', report), true);
});

test('v0.2 UI API G24 retains bounded native positive and product success', () => {
  const report = reports.get('G24');
  assert.equal(report.overall, 'VERIFIED');
  assert.equal(report.layers.RECOMPUTATION.nativeResult.verdict, 'PASS');
  assert.equal(report.layers.RECOMPUTATION.nativeResult.semanticVerdict, 'NO_FINDING');
  assert.equal(validateV2Schema('report', report), true);
});

test('v0.2 UI API G30 retains preserved negative PRF transfer without certifying success', () => {
  const report = reports.get('G30');
  assert.equal(report.overall, 'CONTRADICTED');
  assert.equal(report.layers.GUARANTEE_PRESERVATION.status, 'PRESERVED');
  assert.equal(report.layers.GUARANTEE_PRESERVATION.nativeResult.recomputed.outcome, 'VIOLATED');
  assert.equal(report.layers.GUARANTEE_PRESERVATION.productProjection.status, 'CONTRADICTED');
  assert.equal(validateV2Schema('report', report), true);
});

test('v0.2 UI API preserves original v0.1 V02 schema and wrong-commit outcome', () => {
  const report = reports.get('V02');
  assert.equal(report.schema, 'receiptos.verify.report.v1');
  assert.equal(report.projection_version, 'receiptos.verify.projection.v1');
  assert.equal(report.overall, 'CONTRADICTED');
  assert.equal(report.layers.SUBJECT_BINDING.status, 'CONTRADICTED');
  assert.equal(validateSchema('report', report), true);
});

test('v0.2 UI API preserves duplicate raw request members for strict rejection', async () => {
  const vector = vectors.get('G24');
  const rawRequest = JSON.stringify(vector.request).replace('{', '{"subject":{},');
  const response = await fetch(base + '/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: rawRequest, bundle: JSON.stringify(vector.bundle) }) });
  assert.equal(response.status, 200); const report = await response.json();
  assert.equal(report.overall, 'REJECTED_MALFORMED');
  assert.ok(report.reason_codes.includes('DUPLICATE_JSON_KEY'));
});

// Actual application source in a minimal DOM logic harness. These assertions
// assess state/text/classes; a rendered browser smoke is a separate root gate.
class Element {
  constructor(id = '') { this.id = id; this.value = ''; this.textContent = ''; this.className = ''; this.disabled = id === 'download'; this.children = []; }
  append(...children) { this.children.push(...children); if (this.id === 'vector' && !this.value) this.value = children[0]?.value ?? ''; }
  replaceChildren(...children) { this.children = children; }
  async click() { if (!this.disabled) return this.onclick?.({ target: this }); }
}
async function app(id) {
  const ids = ['vector', 'request', 'bundle', 'context', 'verdict', 'explanation', 'layers', 'download', 'verify', 'load', 'wrong', 'error', 'request-file', 'bundle-file'];
  const elements = Object.fromEntries(ids.map(name => [name, new Element(name)]));
  const posts = [];
  const fetch = async (url, options) => {
    if (options?.method === 'POST') { posts.push(JSON.parse(options.body)); return { ok: true, json: async () => copy(reports.get(id)) }; }
    if (url === '/api/vectors') return { json: async () => ({ vectors: [{ id, title: vectors.get(id).title }] }) };
    if (url === '/api/vectors/' + id) return { json: async () => copy(vectors.get(id)) };
    throw new Error('Unexpected UI request: ' + url);
  };
  const document = { getElementById: name => elements[name], createElement: () => new Element() };
  await runInNewContext('(async()=>{' + appSource + '\n})()', { document, fetch, JSON, URL, Blob, TextDecoder, console }, { timeout: 5000 });
  return { elements, posts, layer: name => elements.layers.children.find(detail => detail.children[0].children[0].textContent === name)?.children[0].children[1] };
}

test('v0.2 actual UI renders overall scope contradiction red while integrity/auth/replay remain green', async () => {
  const h = await app('G10'); await h.elements.verify.click();
  assert.equal(h.elements.verdict.textContent, 'CONTRADICTED'); assert.match(h.elements.verdict.className, /\bbad\b/);
  for (const name of ['INTEGRITY', 'AUTHENTICITY', 'RECOMPUTATION']) assert.match(h.layer(name).className, /\bgood\b/);
  assert.equal(h.layer('SEMANTIC_COMPATIBILITY').textContent, 'CONTRADICTED');
  assert.match(h.layer('SEMANTIC_COMPATIBILITY').className, /\bbad\b/);
  assert.match(h.elements.explanation.textContent, /SCOPE_MISMATCH/);
});

test('v0.2 actual UI keeps native PASS/reproduced negative red overall', async () => {
  const h = await app('G12'); await h.elements.verify.click();
  assert.equal(h.elements.verdict.textContent, 'CONTRADICTED'); assert.match(h.elements.verdict.className, /\bbad\b/);
  assert.equal(h.layer('RECOMPUTATION').textContent, 'REPRODUCED');
  assert.ok(h.elements.layers.children.some(detail => detail.children[1].textContent.includes('"semanticVerdict": "CONTRADICTED"')));
});

test('v0.2 actual UI separates preserved transfer from the negative PRF outcome', async () => {
  const h = await app('G30'); await h.elements.verify.click();
  assert.equal(h.elements.verdict.textContent, 'CONTRADICTED');
  assert.match(h.elements.verdict.className, /\bbad\b/);
  assert.equal(h.layer('GUARANTEE_PRESERVATION').textContent, 'PRESERVED');
  assert.match(h.layer('GUARANTEE_PRESERVATION').className, /\bgood\b/);
  assert.ok(h.elements.layers.children.some(detail => detail.children[1].textContent.includes('"outcome": "VIOLATED"')));
  assert.match(h.elements.explanation.textContent, /PRF_REPRODUCED_NEGATIVE_TRANSFER_PRESERVED/);
});

test('v0.2 actual UI distinguishes the changed retry domain from valid signature', async () => {
  const h = await app('G14'); await h.elements.verify.click();
  assert.equal(h.elements.verdict.textContent, 'CONTRADICTED');
  assert.match(h.layer('AUTHENTICITY').className, /\bgood\b/);
  assert.match(h.layer('DOMAIN_ADAPTERS').className, /\bbad\b/);
});

test('v0.2 actual UI gives insufficient/unverifiable guarantee a neutral overall state', async () => {
  const h = await app('G21'); await h.elements.verify.click();
  assert.equal(h.elements.verdict.textContent, 'INSUFFICIENT_EVIDENCE'); assert.match(h.elements.verdict.className, /\bneutral\b/);
  assert.equal(h.layer('GUARANTEE_PRESERVATION').textContent, 'UNVERIFIABLE');
  assert.doesNotMatch(h.layer('GUARANTEE_PRESERVATION').className, /\bgood\b/);
});

test('v0.2 actual UI shows bounded positive only after explicit verification', async () => {
  const h = await app('G24');
  assert.doesNotMatch(h.elements.verdict.className, /\bgood\b/); assert.equal(h.elements.download.disabled, true);
  await h.elements.verify.click();
  assert.equal(h.elements.verdict.textContent, 'VERIFIED'); assert.match(h.elements.verdict.className, /\bgood\b/);
  assert.equal(h.elements.download.disabled, false);
});

for (const kind of ['request', 'bundle']) test(`v0.2 ${kind} file intake stays visible outside collapsed JSON details`, () => {
  let depth = 0, found = 0;
  for (const token of html.matchAll(/<\/?details\b[^>]*>|<input\b[^>]*>/gi)) {
    if (/^<\/details/i.test(token[0])) depth--;
    else if (/^<details/i.test(token[0])) depth++;
    else if (new RegExp(`\\bid="${kind}-file"`).test(token[0])) {
      found++; assert.equal(depth, 0); assert.match(token[0], /type="file"/); assert.doesNotMatch(token[0], /\bhidden\b/);
    }
  }
  assert.equal(found, 1); assert.match(html, new RegExp(`for="${kind}-file"`));
  assert.match(css, /\.upload-grid input\s*\{[^}]*display:\s*block/s);
});

for (const kind of ['request', 'bundle']) test(`v0.2 actual UI uploads ${kind} JSON text without normalization`, async () => {
  const h = await app('G10'), raw = ' {"scope":{},"scope":{"target":"B"}}\n';
  await h.elements[kind + '-file'].onchange({ target: { files: [new Blob([raw])] } });
  assert.equal(h.elements[kind].value, raw);
  assert.doesNotMatch(h.elements.verdict.className, /\bgood\b/);
  await h.elements.verify.click(); assert.equal(h.posts[0][kind], raw);
});
