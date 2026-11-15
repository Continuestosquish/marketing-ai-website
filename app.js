(()=>{'use strict';
const $=id=>document.getElementById(id), tactics=window.MARKETING_TACTICS||[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;',"'":'&#39;'}[c]));
let saved=new Set(),shown=9,lastPlan='';
try{saved=new Set(JSON.parse(localStorage.getItem('marketingAI.saved')||'[]'))}catch{}
const toast=msg=>{const x=$('toast');if(!x)return;x.textContent=msg;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2200)};
const cat=$('categoryFilter');
cat.innerHTML='<option value="all">All categories</option>'+[...new Set(tactics.map(x=>x.category))].map(x=>'<option>'+esc(x)+'</option>').join('')+'<option value="saved">★ Saved ideas</option>';
function render(){const q=$('tacticSearch').value.trim().toLowerCase(),c=cat.value;const hits=tactics.filter(x=>(c==='all'||(c==='saved'?saved.has(x.id):x.category===c))&&[x.title,x.category,x.objective,x.note].join(' ').toLowerCase().includes(q));
$('resultsCount').textContent='Showing '+Math.min(shown,hits.length)+' of '+hits.length+' tactics';$('savedCount').textContent=saved.size;
$('tacticGrid').innerHTML=hits.slice(0,shown).map(x=>'<article class="tactic-card"><div class="tactic-card-head"><span class="tactic-id">'+esc(x.id)+' · IDEA / HYPOTHESIS</span><button type="button" class="save-btn" data-save="'+esc(x.id)+'" aria-label="Save idea">'+(saved.has(x.id)?'★':'☆')+'</button></div><span class="tactic-pill">'+esc(x.category)+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.note)+'</p><div class="tactic-foot"><span>'+esc(x.objective)+'</span><span>'+esc(x.channel)+'</span></div></article>').join('')||'<p>No matching ideas.</p>';
$('loadMore').hidden=shown>=hits.length}
$('tacticGrid').addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;const id=b.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('marketingAI.saved',JSON.stringify([...saved]))}catch{}render();toast('Shortlist updated')});
$('tacticSearch').addEventListener('input',()=>{shown=9;render()});cat.addEventListener('change',()=>{shown=9;render()});
$('resetFilters').addEventListener('click',()=>{cat.value='all';$('tacticSearch').value='';shown=9;render()});$('loadMore').addEventListener('click',()=>{shown+=9;render()});render();
$('mobileMenu').addEventListener('click',()=>{const active=$('mobileMenu').getAttribute('aria-expanded')!=='true';document.querySelector('.nav').classList.toggle('open',active);$('mobileMenu').setAttribute('aria-expanded',String(active))});
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.nav').classList.remove('open')));
const apiBase=String(window.MARKETING_PAYMENT_API||"").replace(/\/$/,"");
function showPlan(plan){
 lastPlan=plan;
 $('plannerOutput').innerHTML='<div class="blueprint"><span class="bp-label">PURCHASED CAMPAIGN · VERIFIED</span><h3>Your campaign blueprint</h3><pre id="purchasedPlan" style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.65;color:#d9e4f4"></pre><div class="bp-actions"><button type="button" id="copyPlan">Copy plan</button><button type="button" id="downloadPlan">Download .txt</button></div></div>';
 $('purchasedPlan').textContent=plan;
}
$('plannerForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(!apiBase){toast('Checkout setup is pending. No payment was taken.');return}
 const brand=$('brandName').value.trim(),audience=$('audience').value.trim();
 const budget=Number($('budget').value);
 if(!brand||!audience||!Number.isFinite(budget)||budget<0){toast('Complete your campaign brief');return}
 const btn=$('checkoutBtn');btn.disabled=true;btn.textContent='Opening secure checkout…';
 try{
  const response=await fetch(apiBase+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brand,audience,industry:$('industry').value,objective:$('objective').value,budget,duration:Number($('duration').value)})});
  const data=await response.json();
  if(!response.ok||!/^https:\/\/checkout\.stripe\.com\//.test(data.checkoutUrl||''))throw Error(data.error||'Checkout unavailable');
  location.assign(data.checkoutUrl);
 }catch(err){toast('Checkout unavailable. No charge made.');btn.disabled=false;btn.innerHTML='Unlock Campaign — $9.00 <span>↗</span>'}
});
async function redeemPurchase(){
 const url=new URL(location.href),sessionId=url.searchParams.get('session_id');
 if(!sessionId)return;
 if(!apiBase){toast('Payment verification not connected yet.');return}
 $('plannerOutput').textContent='Verifying payment securely…';
 try{
  const response=await fetch(apiBase+'/redeem?session_id='+encodeURIComponent(sessionId));
  const data=await response.json();
  if(!response.ok||typeof data.plan!=='string')throw Error(data.error||'Unable to verify payment');
  showPlan(data.plan);
  url.searchParams.delete('session_id');history.replaceState(null,'',url.pathname+url.search+url.hash);
 }catch(err){$('plannerOutput').textContent='We could not verify this purchase yet. Keep your checkout reference and contact support; do not pay again.';}
}
redeemPurchase();
$('plannerOutput').addEventListener('click',async e=>{if(e.target.id==='copyPlan'){try{await navigator.clipboard.writeText(lastPlan);toast('Copied')}catch{toast('Use download instead')}}if(e.target.id==='downloadPlan'){const u=URL.createObjectURL(new Blob([lastPlan],{type:'text/plain'}));const a=document.createElement('a');a.href=u;a.download='marketing-ai-plan.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}});
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
function calc(){const spend=Math.max(0,Number($('adSpend').value)||0),leads=Math.max(0,Number($('leads').value)||0),customers=Math.max(0,Number($('customers').value)||0),revenue=Math.max(0,Number($('revenue').value)||0);$('cpl').textContent=leads?money(spend/leads):'—';$('cac').textContent=customers?money(spend/customers):'—';$('conversion').textContent=leads?(100*customers/leads).toFixed(1)+'%':'—';$('roas').textContent=spend?(revenue/spend).toFixed(2)+'×':'—'}['adSpend','leads','customers','revenue'].forEach(x=>$(x).addEventListener('input',calc));calc();
})();