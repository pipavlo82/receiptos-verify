import * as nativeLens from '/lens-native.js';

// Implements the existing recompute-lens Recipe interface (fields, loadExample,
// run, selfTest). Its native receipt function executes unchanged in this browser.
// Claim verification remains in the existing ReceiptOS Verify loopback host.
export const recipe={
  id:'agent-action-receipt.v0',label:'Local agent action',profile:'agent-action-receipt.v0',
  blurb:'Check the requested action, replay the local change and inspect its evidence.',
  fields:[{key:'request',label:'Caller request',placeholder:'JSON',area:true},{key:'package',label:'Evidence package',placeholder:'JSON',area:true}],
  loadExample:()=>({request:'',package:''}),
  selfTest:()=>nativeLens.selfTest(),
  async run(fields){
    try{
      const response=await fetch('/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)});
      if(!response.ok)throw new Error('LOCAL_VERIFIER_UNAVAILABLE');
      const report=await response.json();
      let browserNative=null;
      try{
        const req=JSON.parse(fields.request),pkg=JSON.parse(fields.package);
        browserNative=await nativeLens.recompute(pkg.receipt,req.expected_receipt_root);
      }catch{}
      let status=report.status,reason=report.reason;
      if(status==='VERIFIED'&&browserNative?.verdict!=='verified-good'){
        status='UNVERIFIABLE';reason='BROWSER_HOST_IDENTITY_DISAGREEMENT';
      }
      return {profile:recipe.profile,log:browserNative?.log??[],
        verdict:{VERIFIED:'verified-good',REFUTED:'verified-bad',UNVERIFIABLE:'unverifiable'}[status]??'unverifiable',
        reason,vantageLimitation:report.limitations.join(' '),
        reproduce:{rows:[{label:'Canonical UTF-8',value:browserNative?.canonical??'Unavailable'},
          {label:'Canonical hex',value:browserNative?.canonicalHex??'Unavailable'},
          {label:'Recomputed receipt identity',value:browserNative?.recomputedRoot??'Unavailable'}],
          commands:'node research/agent-action-browser-verify-v0/tools/run-cases.mjs replay'},
        product:{status,reason,projection_version:'agent-action.browser-projection.v0'},native_lens:browserNative,native_host:report};
    }catch(error){
      return {error:error.message,product:{status:'UNVERIFIABLE',reason:error.message,projection_version:'agent-action.browser-projection.v0'}};
    }
  }
};
export {nativeLens};
