(() => {
'use strict';
const tactics = Array.isArray(window.MARKETING_TACTICS) ? window.MARKETING_TACTICS : [];
const $ = id => document.getElementById(id);
const html = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const matches = {
 awareness:{categories:['Emotional Marketing','Brand Positioning & Differentiation','Viral & Social Marketing','Influencer & Partnerships'],objectives:['Awareness','Discovery'],hints:['Social','Brand','Influencer']},
 leads:{categories:['Content & Inbound Marketing','SEO & AI Discovery','Growth & Performance Marketing','AI & Predictive Marketing'],objectives:['Lead Generation','Qualified leads','Discovery'],hints:['Search','SEO','Content']},
 sales:{categories:['Growth & Performance Marketing','AI & Predictive Marketing','Influencer & Partnerships','Brand Positioning & Differentiation'],objectives:['Conversion','Experimentation'],hints:['Growth','Paid','Partner']},
 engagement:{categories:['Viral & Social Marketing','Community & Advocacy','Experiential & Guerrilla Marketing'],objectives:['Engagement'],hints:['Social','Community','Events']},
 retention:{categories:['Loyalty & CRM','Community & Advocacy','AI & Predictive Marketing'],objectives:['Retention'],hints:['CRM','Email','Community']}
};
const channelKeywords={all:[],Social:['Social','Video','Influencer','Community'],Search:['Search','SEO','Content'],Email:['Email','CRM','Lifecycle'],Video:['Video','Social','Creator'],Community:['Community','Events','Partner']};
const weights={};
const reason=(t,goal,channel)=> {
 const cfg=matches[goal]||matches.awareness;
 const cat=cfg.categories.find(x=>t.category.toLowerCase().includes(x.toLowerCase()));
 const obj=cfg.objectives.some(x=>t.objective.toLowerCase()===x.toLowerCase());
 const ch=(channelKeywords[channel]||[]).some(x=>(t.channel+' '+t.category).toLowerCase().includes(x.toLowerCase()));
 if(cat&&ch)return 'Matches your goal and preferred channel';
 if(cat)return 'Matches your campaign goal';
 if(obj&&ch)return 'Supports your goal and distribution channel';
 return 'Useful supporting tactic';
};
function rank(t,goal,channel){
 const cfg=matches[goal]||matches.awareness;
 const ci=cfg.categories.findIndex(x=>t.category.toLowerCase().includes(x.toLowerCase()));
 const channelHit=(channelKeywords[channel]||[]).some(x=>(t.channel+' '+t.category).toLowerCase().includes(x.toLowerCase()));
 return (ci>=0?80-ci*12:0)+(cfg.objectives.some(x=>t.objective.toLowerCase()===x.toLowerCase())?25:0)+(channelHit?45:0);
}
function render(){
 const goal=$('recommendGoal')?.value, channel=$('recommendChannel')?.value;
 const grid=$('recommendedGrid'),summary=$('recommendSummary');
 if(!goal||!channel||!grid||!summary)return;
 if(!tactics.length){summary.textContent='Marketing tactics are currently unavailable. Refresh the page to try again.';grid.replaceChildren();return;}
 const ranked=tactics.map(t=>({t,score:rank(t,goal,channel)}))
 .sort((a,b)=>b.score-a.score||a.t.id.localeCompare(b.t.id));
 // Diverse categories and genuine relevance.
 const chosen=[],seen=new Set();
 for(const item of ranked){
  if(item.score<=0)break;
  if(!seen.has(item.t.category)){chosen.push(item);seen.add(item.t.category)}
  if(chosen.length===6)break;
 }
 for(const item of ranked){
  if(chosen.length===6)break;
  if(!chosen.some(x=>x.t.id===item.t.id))chosen.push(item);
 }
 grid.replaceChildren();
 for(const [i,{t,score}] of chosen.entries()){
  const card=document.createElement('article');card.className='recommend-card';
  const goalReason=reason(t,goal,channel);
  card.innerHTML='<div class="rec-kicker"><span>TACTIC '+String(i+1).padStart(2,'0')+'</span><span class="rec-score">Recommended</span></div><h3>'+html(t.title)+'</h3><p>'+html(goalReason)+'. '+html(t.note)+'</p><span class="rec-category">'+html(t.category)+'</span><button class="rec-apply" type="button" data-recommend="'+html(t.id)+'">Use this tactic →</button>';
  grid.appendChild(card);
 }
 summary.textContent='Showing '+chosen.length+' recommended tactics based on your goal and channel. Recommendations are rules-based suggestions, not guaranteed outcomes.';
}
function saveChoice(id){
 const t=tactics.find(x=>x.id===id);if(!t)return;
 let draft={};
 try{draft=JSON.parse(sessionStorage.getItem('mai.wizard.v1')||'{}')||{}}catch{}
 const old=Array.isArray(draft.tactics)?draft.tactics.filter(x=>typeof x==='string'):[];
 draft.tactics=[id,...old.filter(x=>x!==id)].slice(0,3);
 const names={awareness:'Awareness',leads:'Leads',sales:'Sales',engagement:'Engagement',retention:'Retention'};
 draft.goal=names[$('recommendGoal').value]||'Awareness';
 const channelMap={Social:'Instagram',Search:'Google Search',Email:'Email',Video:'YouTube',Community:'Facebook'};
 const ch=channelMap[$('recommendChannel').value];
 if(ch)draft.channels=[...new Set([...(Array.isArray(draft.channels)?draft.channels:[]),ch])];
 try{sessionStorage.setItem('mai.wizard.v1',JSON.stringify(draft))}catch{}
}
$('recommendGoal')?.addEventListener('change',render);
$('recommendChannel')?.addEventListener('change',render);
$('recommendedGrid')?.addEventListener('click',e=>{
 const button=e.target.closest('[data-recommend]');if(!button)return;
 saveChoice(button.dataset.recommend);
 location.assign('./checkout.html?next=campaign&source=recommendation');
});
render();
})();