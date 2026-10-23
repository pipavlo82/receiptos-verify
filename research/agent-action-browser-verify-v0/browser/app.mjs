import {recipe} from './recipe.mjs';
const byId=id=>document.getElementById(id);
const cases=await fetch('/fixtures').then(r=>r.json());
for(const c of cases){const option=document.createElement('option');option.value=c.case_id;option.textContent=c.case_id+' · '+c.title;byId('scenario').append(option);}
const explanation={VERIFIED:'The supplied record matches the selected action and the local transition was reproduced. The caller’s selected evidence checks passed.',
  REFUTED:'A concrete mismatch was found in the selected claim or its evidence. Inspect the reason and separate checks below.',
  UNVERIFIABLE:'The selected guarantee could not be established from the supplied evidence. This is not a finding that the action never happened.'};
byId('verify').disabled=false;
byId('scenario').addEventListener('change',()=>{byId('result').hidden=true;delete window.lastVerification;});
byId('verify').addEventListener('click',async()=>{
  byId('verify').disabled=true;byId('verify').textContent='Verifying…';
  const selected=cases.find(c=>c.case_id===byId('scenario').value);
  const result=await recipe.run({request:JSON.stringify(selected.caller),package:JSON.stringify(selected.package)});
  window.lastVerification=result;
  const status=result.product.status;byId('status').textContent=status;byId('result').dataset.status=status;
  byId('explanation').textContent=explanation[status];
  const host=result.native_host;
  const dimensions=[['Receipt bytes',host?.receipt_identity.status??'NOT_CHECKED'],['Requested claim',host?.claim_compatibility.status??'NOT_CHECKED'],
    ['Local replay',host?.local_recomputation.status??'NOT_CHECKED'],['Selected log',host?.log_inclusion.status??'NOT_CHECKED']];
  byId('dimensions').replaceChildren(...dimensions.map(([label,value])=>{
    const d=document.createElement('div');d.className='dimension';const l=document.createElement('span'),v=document.createElement('strong');l.textContent=label;v.textContent=value;d.append(l,v);return d;
  }));
  byId('technical').textContent=JSON.stringify({caller:selected.caller,evidence:selected.package,result},null,2);
  byId('result').hidden=false;byId('verify').disabled=false;byId('verify').textContent='Verify';
});
