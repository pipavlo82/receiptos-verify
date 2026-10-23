import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {research,support} from '../lib/paths.mjs';
import {verifyAgentAction,semanticReport} from '../lib/profile.mjs';
import {parseStrict} from '../../../src/core/strict-json.mjs';
const build=resolve(support,'browser-build'),manifest=JSON.parse(readFileSync(resolve(build,'manifest.json')));
const assets={'/':['index.html','text/html'],'/app.mjs':['app.mjs','text/javascript'],'/recipe.mjs':['recipe.mjs','text/javascript'],
  '/style.css':['style.css','text/css'],'/lens-native.js':['lens-native.js','text/javascript']};
const bytes=new Map();
for(const [route,[path,type]]of Object.entries(assets)){
  const content=readFileSync(resolve(build,path)),expected=path==='lens-native.js'?manifest.lens_compiled_sha256:manifest.assets[path];
  if(createHash('sha256').update(content).digest('hex')!==expected)throw new Error('BROWSER_ASSET_DIGEST_MISMATCH:'+path);
  bytes.set(route,[content,type]);
}
const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'self'");
  const send=(status,value,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8'});res.end(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));};
  try{
    // This is a loopback laboratory service. It exposes no general command runner,
    // file path access, provider calls, key store, or action-execution endpoint.
    const address=server.address(),authority='127.0.0.1:'+address.port;
    if(req.headers.host!==authority)return send(403,{error:'LOOPBACK_HOST_REQUIRED'});
    if(req.headers.origin&&req.headers.origin!=='http://'+authority)return send(403,{error:'SAME_ORIGIN_REQUIRED'});
    if(req.method==='GET'&&bytes.has(req.url)){const [b,t]=bytes.get(req.url);return send(200,b,t);}
    if(req.method==='GET'&&req.url==='/fixtures')return send(200,readFileSync(resolve(research,'fixtures/actions.json')));
    if(req.method==='GET'&&req.url==='/canonical-fixtures')return send(200,readFileSync(resolve(research,'fixtures/canonicalization.json')));
    if(req.method==='GET'&&req.url==='/build-manifest')return send(200,manifest);
    if(req.method==='POST'&&req.url==='/verify'){
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>4*1024*1024)return send(413,{error:'REQUEST_TOO_LARGE'});chunks.push(chunk);}
      const fields=parseStrict(Buffer.concat(chunks));
      if(Object.keys(fields).sort().join(',')!=='package,request'||typeof fields.request!=='string'||typeof fields.package!=='string')return send(400,{error:'RECIPE_FIELDS_MALFORMED'});
      return send(200,semanticReport(await verifyAgentAction(fields.request,fields.package)));
    }
    return send(404,{error:'NOT_FOUND'});
  }catch(error){return send(400,{error:error.code??error.message});}
});
server.listen(Number(process.env.AGENT_ACTION_PORT??8787),'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port,profile:'agent-action-receipt.v0',build:manifest.lens_source_sha})));
