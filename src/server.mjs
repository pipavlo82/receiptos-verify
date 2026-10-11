import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { verify } from './core/verify.mjs';
import { parseStrict } from './core/strict-json.mjs';
const root=new URL('../',import.meta.url);
export function startServer(port=8808) {
  let active=0;
  const server=http.createServer(async(req,res)=>{
    const localHost=/^(?:127\.0\.0\.1|localhost):\d+$/.test(req.headers.host??'');
    const expected='http://'+req.headers.host;
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
    const send=(status,body,type=headers['Content-Type'])=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(body);};
    if(!localHost||(req.headers.origin&&req.headers.origin!==expected)) return send(403,'{"error":"LOCAL_ORIGIN_REQUIRED"}');
    try {
      if(req.method==='GET'&&['/','/app.mjs','/style.css'].includes(req.url)) {const file=req.url==='/'?'index.html':req.url.slice(1);return send(200,await readFile(new URL('web/'+file,root)),file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');}
      if(req.method==='GET'&&req.url==='/api/vectors') return send(200,await readFile(new URL('vectors/index.json',root)));
      if(req.method==='GET'&&/^\/api\/vectors\/V\d{2}$/.test(req.url)) return send(200,await readFile(new URL('vectors/'+req.url.slice(-3)+'.json',root)));
      if(req.method!=='POST'||req.url!=='/api/verify') return send(404,'{"error":"NOT_FOUND"}');
      if(!req.headers['content-type']?.startsWith('application/json')) return send(415,'{"error":"JSON_REQUIRED"}');
      if(active>=2) return send(429,'{"error":"VERIFIER_BUSY"}');
      const chunks=[];let size=0;
      for await(const chunk of req) {size+=chunk.length;if(size>4*1024*1024) return send(413,'{"error":"INPUT_TOO_LARGE"}');chunks.push(chunk);}
      const input=parseStrict(Buffer.concat(chunks));
      if(Object.keys(input).sort().join(',')!=='bundle,request') return send(400,'{"error":"REQUEST_AND_BUNDLE_REQUIRED"}');
      if(active>=2) return send(429,'{"error":"VERIFIER_BUSY"}');
      active++;
      try {return send(200,JSON.stringify(await verify(input.request,input.bundle)));} finally {active--;}
    } catch(error) {return send(error.code==='ENOENT'?404:400,JSON.stringify({error:error.code??'INVALID_INPUT',message:error.message}));}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  server.listen(port,'127.0.0.1');return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {const server=startServer();server.on('listening',()=>console.log('ReceiptOS Verify: http://127.0.0.1:8808/ — local only'));}
