/* Local-only, non-authoritative practice checkout. Never use for paid entitlements. */
(()=>{'use strict';const key='tranwrecks_demo_membership_v1';
const plans={
starter:{name:'Starter',price:'$4.99',allowance:'3 campaign blueprints/month',blurb:'Essentials',features:['3 campaign blueprints per month (example)','Marketing Hook Generator','30-Day Content Calendar','10-chapter Marketing Playbook']},
pro:{name:'Pro',price:'$9.99',allowance:'10 campaign blueprints/month',blurb:'More tools',features:['Everything in Starter','10 campaign blueprints per month (example)','Caption & Hashtag Builder','Marketing tactic library','Performance calculator']},
super:{name:'Super Pro Plus',price:'$15.99',allowance:'Unlimited campaigns',blurb:'Full toolkit',features:['Everything in Pro','Unlimited campaign blueprints (example)','Advanced tactic suggestions (planned)','Downloadable strategy reports (planned)']}
};
const valid=plan=>Object.prototype.hasOwnProperty.call(plans,plan);
function activate(plan){if(!valid(plan))return false;try{sessionStorage.setItem(key,JSON.stringify({plan,demo:true}));return true}catch{return false}}
function read(){try{const raw=JSON.parse(sessionStorage.getItem(key)||'null');return raw?.demo===true&&valid(raw.plan)?{plan:raw.plan}:null}catch{return null}}
function clear(){try{sessionStorage.removeItem(key)}catch{}}
window.TranwrecksDemo=Object.freeze({plans:Object.freeze(plans),valid,activate,read,clear});
})();