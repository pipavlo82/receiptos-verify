import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {research,support,host} from '../lib/paths.mjs';
const pw=process.env.PLAYWRIGHT_MODULE??'C:/Users/msi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(pathToFileURL(pw).href);
const label=process.argv[2]??'normal',out=resolve(support,'browser',label);mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,[resolve(research,'tools/serve.mjs')],{cwd:host,env:{...process.env,AGENT_ACTION_PORT:'0'},windowsHide:true});
let serverLog='',serverError='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverError+=b);
const url=await new Promise((yes,no)=>{
  const timer=setTimeout(()=>no(new Error('SERVER_START_TIMEOUT')),10000);
  server.once('exit',code=>{clearTimeout(timer);no(new Error('SERVER_START_FAILED:'+code+serverError));});
  server.stdout.on('data',()=>{try{const info=JSON.parse(serverLog.trim());clearTimeout(timer);yes(info.url);}catch{}});
});
let browser;const checks=[],errors=[];
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1160,height:1100}});
  page.on('pageerror',e=>errors.push(e.message));
  const external=[];page.on('request',req=>{if(!req.url().startsWith(url+'/'))external.push(req.url());});
  await page.goto(url);await page.waitForFunction(()=>!document.getElementById('verify').disabled);
  const cases=JSON.parse(readFileSync(resolve(research,'fixtures/actions.json')));
  let positive;
  for(const c of cases){
    await page.selectOption('#scenario',c.case_id);await page.click('#verify');
    await page.waitForFunction(()=>window.lastVerification!==undefined);
    const result=await page.evaluate(()=>window.lastVerification);
    const passed=result.product.status===c.expected.status&&result.product.reason===c.expected.reason;
    checks.push({case_id:c.case_id,expected:c.expected,actual:result.product,passed});
    writeFileSync(resolve(out,c.case_id+'.json'),JSON.stringify(result,null,2)+'\n');
    if(c.case_id==='A'){positive=result;await page.screenshot({path:resolve(out,'desktop-positive.png'),fullPage:true});}
    if(c.case_id==='G')await page.screenshot({path:resolve(out,'untrusted-checkpoint.png'),fullPage:true});
  }
  const canonical=await page.evaluate(async()=>{
    const native=await import('/lens-native.js'),cases=await fetch('/canonical-fixtures').then(r=>r.json());
    const rows=[];
    for(const c of cases){
      let actual=null;
      try{actual=(await native.recompute(JSON.parse(c.raw),null)).canonical;}catch{}
      rows.push({case_id:c.case_id,expected:c.expected.lens,actual,passed:actual===c.expected.lens});
    }
    return {self_test:await native.selfTest(),rows};
  });
  writeFileSync(resolve(out,'canonicalization.json'),JSON.stringify(canonical,null,2)+'\n');
  await page.route('**/verify',route=>route.abort());
  await page.selectOption('#scenario','A');await page.click('#verify');await page.waitForFunction(()=>window.lastVerification!==undefined);
  const unavailable=await page.evaluate(()=>window.lastVerification);
  checks.push({case_id:'browser-host-unavailable',expected:'UNVERIFIABLE',actual:unavailable.product.status,passed:unavailable.product.status==='UNVERIFIABLE'});
  await page.unroute('**/verify');
  await page.route('**/verify',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(positive.native_host)}));
  await page.selectOption('#scenario','E');await page.click('#verify');await page.waitForFunction(()=>window.lastVerification!==undefined);
  const disagreement=await page.evaluate(()=>window.lastVerification);
  checks.push({case_id:'browser-host-identity-disagreement',expected:'BROWSER_HOST_IDENTITY_DISAGREEMENT',actual:disagreement.product,
    passed:disagreement.product.status==='UNVERIFIABLE'&&disagreement.product.reason==='BROWSER_HOST_IDENTITY_DISAGREEMENT'});
  await page.unroute('**/verify');
  await page.setViewportSize({width:390,height:844});await page.selectOption('#scenario','A');await page.click('#verify');await page.waitForFunction(()=>window.lastVerification!==undefined);
  await page.screenshot({path:resolve(out,'mobile-positive.png'),fullPage:true});
  checks.push({case_id:'mobile-no-horizontal-overflow',passed:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)});
  const response=await fetch(url+'/verify',{method:'POST',headers:{Origin:'https://not-the-local-app.invalid','Content-Type':'application/json'},body:'{}'});
  checks.push({case_id:'cross-origin-refused',actual:response.status,expected:403,passed:response.status===403});
  const result={schema:'agent-action.browser-test.v0',browser:browser.version(),checks,canonical_cases:canonical.rows.length,
    canonical_passed:canonical.rows.filter(c=>c.passed).length,lens_golden:canonical.self_test.ok,
    page_errors:errors,external_requests:external,build_manifest:await fetch(url+'/build-manifest').then(r=>r.json())};
  writeFileSync(resolve(out,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,canonical_cases:canonical.rows.length,
    canonical_passed:result.canonical_passed,page_errors:errors,external_requests:external,
    results_sha256:createHash('sha256').update(readFileSync(resolve(out,'results.json'))).digest('hex')}));
  process.exitCode=checks.some(c=>!c.passed)||canonical.rows.some(c=>!c.passed)||!result.lens_golden||errors.length||external.length?1:0;
}finally{await browser?.close();server.kill();writeFileSync(resolve(out,'server.stdout.txt'),serverLog);writeFileSync(resolve(out,'server.stderr.txt'),serverError);}
