(()=>{'use strict';
const plans={
starter:{name:'Starter',cents:499,allowance:3,features:['3 campaign blueprints per month (upon paid feature activation)','Marketing tactics and strategy basics','Performance calculator','10-chapter Marketing Playbook included','30-day Content Calendar Generator included','Marketing Hook Generator included']},
pro:{name:'Pro',cents:999,allowance:15,features:['15 campaign blueprints per month (upon paid feature activation)','Advanced tactic suggestions','Downloadable strategy reports','10-chapter Marketing Playbook included','30-day Content Calendar Generator included','Marketing Hook Generator included']},
super:{name:'Super Pro Plus',cents:1599,allowance:null,features:['Unlimited campaign blueprints (upon paid feature activation)','Higher-volume planning','Premium marketing workflow designs','10-chapter Marketing Playbook included','30-day Content Calendar Generator included','Marketing Hook Generator included']}
};
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let selected=Object.hasOwn(plans,params.get('plan'))?params.get('plan'):'starter';
const base=String(window.TRANWRECKS_CHECKOUT_API||'').replace(/\/$/,'');
const status=$('checkoutNotice');
const destinations={campaign:'./campaign.html',book:'./playbook.html',calendar:'./content-calendar.html',hooks:'./hook-generator.html',recommend:'./#recommend',tactics:'./#library',analytics:'./#analytics',platform:'./#platform'};
const wanted=params.get('next');
const demo=destinations[wanted]||'./campaign.html';
$('demoLink').setAttribute('href',demo);

function display(){
const p=plans[selected],list=$('options');list.replaceChildren();
for(const [id,v] of Object.entries(plans)){const b=document.createElement('button');b.type='button';b.className='option';b.setAttribute('aria-pressed',String(id===selected));b.innerHTML='<span><strong>'+v.name+'</strong><small>'+v.allowance+' campaign blueprints / month (after activation)</small></span><span class="price">$'+(v.cents/100).toFixed(2)+'</span>';b.addEventListener('click',()=>{selected=id;history.replaceState(null,'','?plan='+encodeURIComponent(id));display()});list.appendChild(b);}
$('planName').textContent=p.name;$('allowance').textContent=p.allowance+' / month';$('planPrice').textContent='$'+(p.cents/100).toFixed(2);
$('features').replaceChildren();p.features.forEach(s=>{const li=document.createElement('li');li.textContent=s;$('features').appendChild(li)});
}
$('checkoutBtn').addEventListener('click',async ()=>{
 if(!base){status.textContent='Secure subscription checkout is not active. No payment has been taken. You may use the free development preview below to try the tool without a subscription.';return;}
 const btn=$('checkoutBtn');btn.disabled=true;btn.textContent='Opening Stripe…';
 try{
  const res=await fetch(base+'/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({plan:selected})});
  const payload=await res.json();
  if(!res.ok || typeof payload.url!=='string')throw Error('Unavailable');
  const dest=new URL(payload.url);
  if(dest.protocol!=='https:'||!(dest.hostname==='checkout.stripe.com'||dest.hostname.endsWith('.checkout.stripe.com')))throw Error('Unsafe destination');
  location.assign(dest.href);
 }catch(e){status.textContent='Checkout is unavailable. Please try again after billing is activated. No payment has been taken on this page.';btn.disabled=false;btn.textContent='Continue to secure checkout →';}
});
display();
})();