import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { startServer } from '../src/server.mjs';
import { readVector } from '../tools/corpus.mjs';
test('local UI serves real verification; hostile origin and paths fail',async()=>{
 const server=startServer(0);await once(server,'listening');const url='http://127.0.0.1:'+server.address().port;
 try {
  const index=await fetch(url);assert.equal(index.status,200);assert.match(await index.text(),/ReceiptOS Verify/);
  const v=await readVector('V02');const response=await fetch(url+'/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request:v.request,bundle:v.bundle})});assert.equal(response.status,200);assert.equal((await response.json()).overall,'CONTRADICTED');
  assert.equal((await fetch(url+'/api/verify',{method:'POST',headers:{Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(url+'/api/vectors/../../package.json')).status,404);
  assert.equal((await fetch(url+'/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"request":{},"request":{},"bundle":{}}'})).status,400);
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
