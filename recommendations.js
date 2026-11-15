(() => {
'use strict';
const t = window.MARKETING_TACTICS || [];
const $ = id => document.getElementById(id);
const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const goals = {
 awareness:{terms:['Emotional Marketing','Brand Positioning','Viral & Social','Influencer'],objectives:['Awareness','Discovery'],channels:['Social','Brand','Partner']},
 leads:{terms:['Content & Inbound','SEO & AI Discovery','Growth & Performance','AI & Predictive'],objectives:['Lead Generation','Qualified leads','Discovery'],channels:['Search','Content','SEO']},
 sales:{terms:['Growth & Performance','AI & Predictive','Experiential'],objectives:['Conversion','Experimentation'],channels:['Paid','Growth','AI']},
 engagement:{terms:['Viral & Social','Community & Advocacy','Experiential'],objectives:['Engagement'],channels:['Social','Community','Events']},
 retention:{terms:['Loyalty & CRM','Community & Advocacy','AI & Predictive'],objectives:['Retention'],channels:['CRM','Email','Community']}
};
const score=(x,g,channels)=> {
 const p=goals[g]||goals.awareness;
 let s=0;
 p.terms.forEach((term,i)=>{if(x.category.toLowerCase().includes(term.toLowerCase()))s+=16-i*3});
 p.objectives.forEach(term=>{if(x.objective.toLowerCase().includes(term.toLowerCase()))s+=12});
 p.channels.forEach(term=>{if(x.channel.toLowerCase().includes(term.toLowerCase()))s+=4});
 channels.forEach(term=>{if(x.channel.toLowerCase().includes(term.toLowerCase()))s+=3});
 return s;
};
function current(){try{return JSON.parse(sessionStorage.getItem('mai.wizard.v1')||'{}')}catch{return {}}}
function build(){
 const goal=$('recommendGoal').value;
 const channel=$('recommendChannel').value;
 const channels=channel==='all'?[]:[channel];
 const picks=t.map(x=>({...x,_score:score(x,goal,channels)})).sort((a,b)=>b._score-a._score || a.id.localeCompare(b.id)).slice(0,6);
 const box=$('recommendedGrid');
 box.replaceChildren();
 for(const [i,x] of picks.entries()){
  const item=document.createElement('article');item.className='recommend-card';
  item.innerHTML='<div class="rec-kicker">RECOMMENDATION '+(i+1)+' <span class="rec-score">Goal match</span></div><h3>'+safe(x.title)+'</h3><p>'+safe(x.note)+'</p><span class="rec-category">'+safe(x.category)+'</span><button type="button" class="rec-apply" data-recommend="'+safe(x.id)+'">Add to campaign ↗</button>';
  box.appendChild(item);
 }
 $('recommendSummary').textContent='Recommended based on your selected marketing goal and channel. These are planning hypotheses, not measured performance predictions.';
}
$('recommendGoal').addEventListener('change',build);
$('recommendChannel').addEventListener('change',build);
$('recommendedGrid').addEventListener('click',event=>{
 const b=event.target.closest('[data-recommend]'); if(!b)return;
 const obj=current(),id=b.dataset.recommend;
 const selected=Array.isArray(obj.tactics)?obj.tactics.filter(x=>typeof x==='string'):[];
 if(!selected.includes(id)&&selected.length<3)selected.push(id);
 obj.tactics=selected;
 const goalsMap={awareness:'Awareness',leads:'Leads',sales:'Sales',engagement:'Engagement',retention:'Retention'};
 obj.goal=goalsMap[$('recommendGoal').value];
 if($('recommendChannel').value!=='all'){
  const value=$('recommendChannel').value;
  obj.channels=Array.isArray(obj.channels)?obj.channels:[];
  const channelMap={Social:'Instagram',Search:'Google Search',Email:'Email',Video:'YouTube',Community:'Facebook'};
  const mapped=channelMap[value]||value;
  if(!obj.channels.includes(mapped))obj.channels.push(mapped);
 }
 try{sessionStorage.setItem('mai.wizard.v1',JSON.stringify(obj))}catch{}
 location.href='./campaign.html';
});
build();
})();