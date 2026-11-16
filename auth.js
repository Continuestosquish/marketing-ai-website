(()=>{'use strict';
const api=String(window.TRANWRECKS_API_BASE||'').trim().replace(/\/$/,'');
const $=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
const allowedNext=()=>{const n=query.get('next');if(!n)return './account.html';try{const url=new URL(n,location.href);return url.origin===location.origin&&url.pathname.startsWith('/')?url.pathname+url.search+url.hash:'./account.html';}catch{return './account.html'}};
function notice(message,error=true){const n=$('authNotice');if(!n)return;n.textContent=message;n.hidden=false;n.className='auth-notice'+(error?' is-error':'');}
async function request(path,options={}){if(!api)throw Error('Account service is not active yet. Registration and sign-in are unavailable until secure hosting is configured.');
const response=await fetch(api+path,{...options,credentials:'include',headers:{'content-type':'application/json',...(options.headers||{})}});
let data={};try{data=await response.json()}catch{}if(!response.ok)throw Error(data.error||'Account service unavailable. Please try again later.');return data;}
const form=$('authForm');if(form){
const mode=$('authMode');const reg=$('registerExtra');const pw=$('password');const show=$('showPassword');const submit=$('authSubmit');
const change=()=>{const isReg=mode.value==='register';reg.hidden=!isReg;pw.autocomplete=isReg?'new-password':'current-password';pw.minLength=isReg?12:1;submit.textContent=isReg?'Create account':'Sign in';$('authHeading').textContent=isReg?'Create your account':'Welcome back';$('authDetails').textContent=isReg?'Start with a free account. A paid membership is optional.':'Sign in to your Tranwrecks Studio account.';$('authNotice').hidden=true;};
mode.addEventListener('change',change);if(query.get('mode')==='register')mode.value='register';change();
show.addEventListener('change',()=>{pw.type=show.checked?'text':'password'});
if(!api)notice('Secure account registration and sign-in are being set up. No accounts or passwords can be submitted yet.');
form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;
const isReg=mode.value==='register';if(isReg&&pw.value!==$('confirmPassword').value){notice('The passwords do not match.');return;}
const email=$('email').value.trim().toLowerCase();submit.disabled=true;submit.textContent=isReg?'Creating account…':'Signing in…';
try{const result=await request(isReg?'/api/auth/register':'/api/auth/login',{method:'POST',body:JSON.stringify({email,password:pw.value})});
if(!result.user)throw Error('Unable to verify account.');location.assign(allowedNext());}
catch(err){notice(err.message)}finally{submit.disabled=false;submit.textContent=isReg?'Create account':'Sign in';}});
}
const account=$('accountView');if(account){
const signout=$('signOut');const portal=$('manageBilling');
async function initialize(){if(!api){$('accountLoading').hidden=true;$('accountOffline').hidden=false;return;}
try{const result=await request('/api/me');$('accountLoading').hidden=true;if(!result.user){$('accountSignedOut').hidden=false;return;}
$('accountSignedIn').hidden=false;const user=result.user;$('accountEmail').textContent=user.email;
$('accountPlan').textContent=user.active&&user.plan?({starter:'Starter',pro:'Pro',super:'Super Pro Plus'}[user.plan]||user.plan):'No active membership';
$('accountStatus').textContent=user.active?'Active':'Free account · No active subscription';
if(user.active){portal.hidden=false;} }catch(e){$('accountLoading').hidden=true;$('accountOffline').hidden=false;$('accountOffline').textContent=e.message;}}
signout.addEventListener('click',async()=>{signout.disabled=true;try{await request('/api/auth/logout',{method:'POST',body:'{}'});location.assign('./login.html');}catch(err){$('accountError').textContent=err.message;signout.disabled=false;}});
portal.addEventListener('click',async()=>{portal.disabled=true;try{const data=await request('/api/billing/portal',{method:'POST',body:'{}'});const url=new URL(data.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.stripe.com'))throw Error('Invalid billing link');location.assign(url.href);}catch(err){$('accountError').textContent=err.message;portal.disabled=false;}});
initialize();
}
})();