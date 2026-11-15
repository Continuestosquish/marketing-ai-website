/**
 * Tranwrecks Studio account + Stripe subscription backend.
 * Deploy only after setting up D1, secrets, custom api domain, testing and HTTPS.
 * Do not use GitHub Pages or client JS to hold Stripe credentials.
 */
const enc=new TextEncoder();
const cookieName='tw_session';
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const sha=async text=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text))));
const rand=n=>b64(crypto.getRandomValues(new Uint8Array(n)));
const eq=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0};
const now=()=>Math.floor(Date.now()/1000);
function validEmail(s){return typeof s==='string'&&s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)}
async function derive(password,salt,pepper){const key=await crypto.subtle.importKey('raw',enc.encode(password+pepper),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:280000,hash:'SHA-256'},key,256);return b64(new Uint8Array(bits))}
function cookies(req){return Object.fromEntries((req.headers.get('cookie')||'').split(';').map(x=>{const i=x.indexOf('=');return i<0?['','']:[x.slice(0,i).trim(),x.slice(i+1).trim()]}))}
function secureCookie(val,seconds){return cookieName+'='+val+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+seconds}
async function member(req,env){const token=cookies(req)[cookieName];if(!token||token.length>200)return null;const hashed=await sha(token);return env.DB.prepare('SELECT u.id,u.email,u.customer_id,u.sub_status,u.plan,u.current_period_end,s.expires_at FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=?').bind(hashed).first().then(r=>r&&r.expires_at>now()?r:null)}
async function newSession(userId,env){const token=rand(32);const expires=now()+30*86400;await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(token),userId,expires,now()).run();return secureCookie(token,30*86400)}
function isActive(user){return !!user&&['active','trialing'].includes(user.sub_status)&&(user.current_period_end===null||user.current_period_end>now()-300)}
function publicUser(u){return {id:u.id,email:u.email,plan:isActive(u)?u.plan:null,status:u.sub_status||'none',active:isActive(u),current_period_end:u.current_period_end??null}}
function corsHeaders(env,origin){const expected=(env.SITE_ORIGIN||'https://tranwrecks.com').replace(/\/$/,'');return origin===expected?{'access-control-allow-origin':expected,'access-control-allow-credentials':'true','vary':'Origin'}:{}}
async function readBody(req){if(Number(req.headers.get('content-length')||0)>10000)throw Error('payload_too_large');return await req.json()}
async function stripe(env,path,method='GET',body){if(!env.STRIPE_SECRET_KEY)throw Error('Stripe not configured');const r=await fetch('https://api.stripe.com/v1/'+path,{method,headers:{authorization:'Bearer '+env.STRIPE_SECRET_KEY,...(body?{'content-type':'application/x-www-form-urlencoded'}:{})},body:body?body.toString():undefined});const d=await r.json();if(!r.ok)throw Error('Stripe '+r.status+': '+(d.error?.code||'request failed'));return d}
const planPrice=(env,plan)=>({starter:env.STRIPE_PRICE_STARTER,pro:env.STRIPE_PRICE_PRO,super:env.STRIPE_PRICE_SUPER})[plan]||null;
function planFromPrice(env,price){return Object.keys({starter:1,pro:1,super:1}).find(p=>planPrice(env,p)===price)||null}
async function syncSubscription(env,subId,userId){if(!subId)return;const sub=await stripe(env,'subscriptions/'+encodeURIComponent(subId));const first=sub.items?.data?.[0]?.price?.id||'';const p=planFromPrice(env,first);const expires=sub.items?.data?.[0]?.current_period_end||sub.current_period_end||null;await env.DB.prepare('UPDATE users SET customer_id=?,sub_id=?,sub_status=?,plan=?,current_period_end=?,updated_at=? WHERE id=?').bind(typeof sub.customer==='string'?sub.customer:sub.customer?.id||null,sub.id,sub.status,p,expires,now(),userId).run()}
async function verifyStripeSignature(raw,header,secret){const parts=Object.fromEntries((header||'').split(',').map(s=>s.trim().split('=')));const ts=Number(parts.t);if(!Number.isFinite(ts)||Math.abs(now()-ts)>300||!parts.v1)return false;const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const data=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(parts.t+'.'+raw)));const actual=[...data].map(x=>x.toString(16).padStart(2,'0')).join('');return eq(actual,parts.v1)}
async function webhook(req,env){if(!env.STRIPE_WEBHOOK_SECRET)return json({error:'Webhook not configured'},503);const raw=await req.text();if(!await verifyStripeSignature(raw,req.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET))return json({error:'Invalid Stripe signature'},400);const event=JSON.parse(raw);if(!event?.id)return json({error:'Missing event'},400);
const first=await env.DB.prepare('INSERT OR IGNORE INTO stripe_events(id,received_at) VALUES(?,?)').bind(event.id,now()).run();if(!first.meta?.changes)return json({received:true});
try{
 const obj=event.data?.object||{};
 if(event.type==='checkout.session.completed'&&obj.mode==='subscription'&&obj.subscription){const uid=obj.client_reference_id||obj.metadata?.user_id;if(uid){await env.DB.prepare('UPDATE users SET customer_id=?,updated_at=? WHERE id=?').bind(typeof obj.customer==='string'?obj.customer:null,now(),uid).run();await syncSubscription(env,typeof obj.subscription==='string'?obj.subscription:obj.subscription.id,uid)}}
 if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){let sub=obj;const userId=sub.metadata?.user_id;const u=userId?await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(userId).first():await env.DB.prepare('SELECT id FROM users WHERE customer_id=?').bind(typeof sub.customer==='string'?sub.customer:sub.customer?.id||'').first();if(u)await syncSubscription(env,sub.id,u.id)}
 if(event.type==='invoice.paid'||event.type==='invoice.payment_failed'){const cid=typeof obj.customer==='string'?obj.customer:obj.customer?.id;const u=cid?await env.DB.prepare('SELECT id,sub_id FROM users WHERE customer_id=?').bind(cid).first():null;if(u?.sub_id)await syncSubscription(env,u.sub_id,u.id)}
 return json({received:true});
}catch(e){await env.DB.prepare('DELETE FROM stripe_events WHERE id=?').bind(event.id).run();return json({error:'Processing failed'},500)}
}
async function route(req,env,url){
 const path=url.pathname,method=req.method,origin=req.headers.get('origin');
 if(path==='/api/health')return json({ok:true,accounts_configured:!!env.DB,billing_ready:env.BILLING_ENABLED==='true'&&!!env.STRIPE_SECRET_KEY});
 if(path==='/api/stripe/webhook'&&method==='POST')return webhook(req,env);
 if(method==='OPTIONS')return new Response(null,{status:204,headers:{...corsHeaders(env,origin),'access-control-allow-headers':'Content-Type','access-control-allow-methods':'GET,POST,OPTIONS'}});
 if(method==='POST'&&origin!==env.SITE_ORIGIN)return json({error:'Invalid request origin'},403);
 if(!env.DB||!env.AUTH_PEPPER)return json({error:'Service configuration incomplete'},503);
 if(path==='/api/auth/register'&&method==='POST'){
  const b=await readBody(req),email=String(b.email||'').trim().toLowerCase(),pass=String(b.password||'');
  if(!validEmail(email)||pass.length<12||pass.length>128)return json({error:'Use a valid email and a password of 12–128 characters'},400);
  const exists=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();if(exists)return json({error:'Account already exists. Please sign in.'},409);
  const id=crypto.randomUUID(),salt=rand(24),pw=await derive(pass,salt,env.AUTH_PEPPER);
  await env.DB.prepare('INSERT INTO users(id,email,password_salt,password_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,email,salt,pw,now(),now()).run();
  const cookie=await newSession(id,env);return json({user:{id,email,active:false,plan:null,status:'none'}},201,{'set-cookie':cookie})
 }
 if(path==='/api/auth/login'&&method==='POST'){
  const b=await readBody(req),email=String(b.email||'').trim().toLowerCase(),pass=String(b.password||'');
  if(!validEmail(email)||pass.length<1)return json({error:'Incorrect email or password'},401);
  const u=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
  if(!u)return json({error:'Incorrect email or password'},401);
  if(u.locked_until&&u.locked_until>now())return json({error:'Too many attempts. Try again later.'},429);
  const tested=await derive(pass,u.password_salt,env.AUTH_PEPPER);
  if(!eq(tested,u.password_hash)){const attempts=(u.failed_attempts||0)+1;await env.DB.prepare('UPDATE users SET failed_attempts=?,locked_until=? WHERE id=?').bind(attempts,attempts>=6?now()+900:null,u.id).run();return json({error:'Incorrect email or password'},401)}
  await env.DB.prepare('UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=?').bind(u.id).run();
  return json({user:publicUser(u)},200,{'set-cookie':await newSession(u.id,env)})
 }
 if(path==='/api/auth/logout'&&method==='POST'){const token=cookies(req)[cookieName];if(token)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(token)).run();return json({signed_out:true},200,{'set-cookie':secureCookie('',0)})}
 const u=await member(req,env);
 if(path==='/api/me'&&method==='GET')return json({user:u?publicUser(u):null});
 if(!u)return json({error:'Please sign in'},401);
 if(path==='/api/billing/checkout'&&method==='POST'){
  if(env.BILLING_ENABLED!=='true')return json({error:'Billing has not been activated yet'},503);
  const data=await readBody(req),plan=data.plan;
  if(!['starter','pro','super'].includes(plan)||!planPrice(env,plan))return json({error:'Plan not configured'},400);
  const q=new URLSearchParams({mode:'subscription',success_url:env.SITE_ORIGIN+'/account.html?session_id={CHECKOUT_SESSION_ID}',cancel_url:env.SITE_ORIGIN+'/checkout.html?plan='+plan,client_reference_id:u.id,'metadata[user_id]':u.id,'metadata[plan]':plan,'subscription_data[metadata][user_id]':u.id,'line_items[0][price]':planPrice(env,plan),'line_items[0][quantity]':'1','allow_promotion_codes':'true'});
  if(u.customer_id)q.set('customer',u.customer_id);else q.set('customer_email',u.email);
  const session=await stripe(env,'checkout/sessions','POST',q);
  return json({url:session.url});
 }
 if(path==='/api/billing/sync'&&method==='POST'){
  if(env.BILLING_ENABLED!=='true')return json({error:'Billing unavailable'},503);
  const data=await readBody(req);const sid=String(data.session_id||'');if(!/^cs_(test_)?[a-zA-Z0-9]{12,}$/.test(sid))return json({error:'Invalid checkout session'},400);
  const checkout=await stripe(env,'checkout/sessions/'+encodeURIComponent(sid));
  if(checkout.mode!=='subscription'||checkout.client_reference_id!==u.id||checkout.payment_status!=='paid')return json({error:'Payment is not verified for your account'},409);
  const sub=typeof checkout.subscription==='string'?checkout.subscription:checkout.subscription?.id;
  if(sub)await syncSubscription(env,sub,u.id);
  const latest=await member(req,env);return json({user:publicUser(latest)});
 }
 if(path==='/api/billing/portal'&&method==='POST'){
  if(env.BILLING_ENABLED!=='true'||!u.customer_id)return json({error:'Billing portal unavailable'},503);
  const q=new URLSearchParams({customer:u.customer_id,return_url:env.SITE_ORIGIN+'/account.html'});
  const p=await stripe(env,'billing_portal/sessions','POST',q);return json({url:p.url});
 }
 if(path==='/api/entitlement'&&method==='GET'){
  const allowances={starter:3,pro:15,super:50};return json({active:isActive(u),plan:isActive(u)?u.plan:null,monthly_campaign_allowance:isActive(u)?allowances[u.plan]||0:0,playbook:isActive(u),calendar:isActive(u)});
 }
 return json({error:'Not found'},404);
}
export default {async fetch(req,env){const origin=req.headers.get('origin'),cors=corsHeaders(env,origin);try{const url=new URL(req.url);const r=await route(req,env,url);const headers=new Headers(r.headers);Object.entries(cors).forEach(([k,v])=>headers.set(k,v));headers.set('x-content-type-options','nosniff');return new Response(r.body,{status:r.status,headers})}catch(e){return json({error:'Request could not be completed'},500,cors)}}};
