/* Marketing AI Studio v4: functional, local preview features.
   SECURITY: client-side UI is NOT a subscription enforcement system. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tactics = window.MARKETING_TACTICS || [];
  const byId = id => tactics.find(t => t.id === id);
  const clean = str => String(str ?? '').trim();
  const escapeHtml = str => clean(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const notify = msg => { const n = $('toast'); n.textContent=msg; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),2300); };
  const storageKey = 'marketingAI.v4.selectedTactics';
  let selected = [];
  try { const old = JSON.parse(localStorage.getItem(storageKey) || '[]'); if(Array.isArray(old)) selected=old.filter(id=>byId(id)).slice(0,5); } catch {}
  let currentPlan = '';
  function saveSelection() { try { localStorage.setItem(storageKey,JSON.stringify(selected)); } catch {} }
  function showSelected() {
    const target = $('tacticSelection');
    if(!target) return;
    target.textContent = 'Selected tactics ('+selected.length+'/5): ';
    const chips=document.createElement('span'); chips.className='tactic-list-used';
    selected.forEach(id=>{
      const btn=document.createElement('button');btn.type='button';btn.className='tactic-chip';
      btn.textContent=byId(id).title+' ×';btn.title='Remove from campaign';
      btn.addEventListener('click',()=>{selected=selected.filter(v=>v!==id);saveSelection();showSelected();notify('Removed tactic');});
      chips.appendChild(btn);
    });
    target.appendChild(chips);
  }
  showSelected();
  const grid=$('tacticGrid');
  function addActionButtons() {
    grid.querySelectorAll('.tactic-card').forEach(card=>{
      if(card.querySelector('.apply-tactic')) return;
      const id=card.querySelector('[data-save]')?.getAttribute('data-save');
      if(!id||!byId(id)) return;
      const btn=document.createElement('button');btn.type='button';btn.className='apply-tactic';btn.dataset.apply=id;
      btn.textContent='Use in campaign ↗';card.appendChild(btn);
    });
  }
  new MutationObserver(addActionButtons).observe(grid,{childList:true});
  addActionButtons();
  grid.addEventListener('click',event=>{
    const btn=event.target.closest('[data-apply]');
    if(!btn)return;
    const id=btn.dataset.apply;
    if(!selected.includes(id)){
      if(selected.length>=5){notify('Choose up to 5 tactics per campaign');return;}
      selected.push(id);saveSelection();
    }
    showSelected();
    notify('Added to campaign brief');
    $('planner').scrollIntoView({behavior:'smooth',block:'start'});
  });
  const plans={
    starter:{name:'Starter',price:9,quota:3,features:'3 campaigns/month, tactic library, KPI calculator, marketing audit'},
    pro:{name:'Pro',price:29,quota:30,features:'30 campaigns/month, exports, multichannel planning, advanced audit tools'},
    super:{name:'Super Pro Plus',price:79,quota:150,features:'150 campaigns/month, multiple brands, experiment tracking, agency workflow'}
  };
  document.getElementById('plans').addEventListener('click',event=>{
    const btn=event.target.closest('[data-plan]');if(!btn)return;
    const p=plans[btn.dataset.plan];
    $('planDetails').textContent=p.name+' — proposed $'+p.price+'/month, up to '+p.quota+' campaigns/month. Includes: '+p.features+'. This is a product preview. Subscriptions are NOT being sold or enforced yet. You will not be charged.';
    $('planDetails').scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  const methods={
    Awareness:{hook:'Help people recognize and remember '+ '{brand}',angle:'Distinctive story + recognizable brand assets',channels:['Short-form organic video','Creator collaborations','Searchable educational content'],metrics:['Qualified reach','Branded search growth','Message recall']},
    'Lead Generation':{hook:'Help {audience} solve a meaningful problem',angle:'Practical lead magnet + credible evidence',channels:['Search intent pages','Educational lead magnet','Email opt-in nurturing'],metrics:['Qualified leads','Cost per qualified lead','Appointments booked']},
    Conversion:{hook:'Make the next purchase decision feel clear and justified',angle:'Product evidence + objection handling + friction reduction',channels:['High-intent search','Landing page A/B test','Consent-based remarketing'],metrics:['Conversion rate','Cost per acquisition','Attributed sales']},
    Retention:{hook:'Make customers feel supported after the purchase',angle:'Helpful onboarding + recognition + loyalty',channels:['Customer email series','Community engagement','Relevant product education'],metrics:['Repeat purchases','Churn rate','Customer lifetime value']},
    Engagement:{hook:'Give {audience} a reason to participate',angle:'Community contribution + shared identity',channels:['Social interaction','Partner activations','Customer-generated stories'],metrics:['Meaningful participation','Shares and saves','Referral leads']}
  };
  const channelsForTactic= t => {
    const s=t.channel.toLowerCase();
    if(s.includes('seo')||s.includes('search'))return 'Search/SEO';
    if(s.includes('email')||s.includes('crm'))return 'Email/CRM';
    if(s.includes('social')||s.includes('video'))return 'Social/video';
    if(s.includes('partner'))return 'Partnerships';
    return t.channel;
  };
  function build(brief) {
    const method=methods[brief.objective]||methods.Awareness;
    const tacticObjects=selected.map(byId).filter(Boolean);
    const campaignTitle=brief.brand+' — '+brief.objective+' Growth Campaign';
    const candidates=[
      {name:'Emotion-first',detail:'Build attention around the customer’s aspiration, identity or desired change. Back it with verifiable proof.'},
      {name:'Proof-first',detail:'Demonstrate clear benefits with practical examples, transparent limitations and authentic customer evidence.'},
      {name:'Education-first',detail:'Offer useful guidance before asking for a purchase. Lead with a real customer question.'}
    ];
    const weeks=Math.max(4,Math.ceil(brief.duration/7));
    let text=[
      'MARKETING AI STUDIO · CAMPAIGN STRATEGY',
      'Campaign: '+campaignTitle,
      'Industry: '+brief.industry,
      'Audience: '+brief.audience,
      'Goal: '+brief.objective,
      'Monthly media budget (planning only): $'+brief.budget.toLocaleString('en-US'),
      'Duration: '+brief.duration+' days',
      '',
      'CUSTOMER PROMISE',method.hook.replace('{brand}',brief.brand).replace('{audience}',brief.audience),
      'POSITIONING',method.angle,
      '',
      'THREE CREATIVE DIRECTIONS',
      ...candidates.map((x,i)=>(i+1)+'. '+x.name+': '+x.detail),
      '',
      'SELECTED MARKETING TACTICS',
      ...(tacticObjects.length?tacticObjects.map((x,i)=>(i+1)+'. '+x.title+' — '+x.category+'; test via '+channelsForTactic(x)+'.'):['No tactics selected. Explore the library and click “Use in campaign”.']),
      '',
      'CHANNEL PLAN',
      ...method.channels.map((x,i)=>(i+1)+'. '+x),
      '',
      'EXECUTION ROADMAP',
      'Week 1: Interview target customers, verify current benchmarks and select campaign hypothesis.',
      'Week 2: Write three messages, create assets, establish attribution and get creative approvals.',
      'Week 3: Run the approved pilot and monitor conversion quality and spend.',
      'Week 4: Analyze results; compare creative and channels; document next experiment.',
      ...Array.from({length:Math.max(0,weeks-4)},(_,i)=>'Week '+(i+5)+': Iterate based on verified learning; review budget and campaign quality.'),
      '',
      'TESTING FRAMEWORK',
      'Hypothesis: The selected value proposition will increase qualified response among '+brief.audience+'.',
      'Variant A: Emotion-first positioning.',
      'Variant B: Evidence-first positioning.',
      'Use an agreed primary KPI, enough sample size to interpret direction and appropriate consent.',
      '',
      'KPIs',
      ...method.metrics.map(x=>'- '+x),
      '',
      'SAFETY AND REALITY CHECK',
      'This is a rule-based campaign plan, not output from a live AI model.',
      'All tactics are ideas until tested. Marketing spend and publishing require separate approval.'
    ].join('\n');
    return text;
  }
  const form=$('plannerForm');
  form.addEventListener('submit',event=>{
    // Capture handler prevents the older, generic template from producing an unrelated output.
    event.preventDefault();event.stopImmediatePropagation();
    if(!form.reportValidity())return;
    const brief={
      brand:clean($('brandName').value).slice(0,80),
      audience:clean($('audience').value).slice(0,180),
      industry:$('industry').value,objective:$('objective').value,
      budget:Number($('budget').value),duration:Number($('duration').value)
    };
    if(!brief.brand||!brief.audience||!Number.isFinite(brief.budget)||brief.budget<0)return notify('Check your campaign inputs');
    currentPlan=build(brief);
    const output=$('plannerOutput');
    output.replaceChildren();
    const section=document.createElement('div');section.className='blueprint';
    section.innerHTML='<span class="bp-label">CAMPAIGN PREVIEW · RULE-BASED</span><h3>'+escapeHtml(brief.brand)+'</h3><p>'+escapeHtml(brief.objective)+' · '+brief.duration+' days · '+selected.length+' tactics applied</p><div class="v4-notice">Preview access: free during development. Proposed paid plans are not active. This is not a paid AI campaign.</div><pre id="v4Plan" style="white-space:pre-wrap;overflow-wrap:anywhere;color:#d6e3f3;line-height:1.7;font:inherit"></pre><div class="export-row"><button type="button" id="v4Copy">Copy Campaign</button><button type="button" id="v4Download">Download Plan</button></div>';
    output.appendChild(section);
    $('v4Plan').textContent=currentPlan;
    output.scrollIntoView({behavior:'smooth',block:'nearest'});
  },true);
  $('plannerOutput').addEventListener('click',async event=>{
    if(event.target.id==='v4Download') {
      const blob=new Blob([currentPlan],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download='marketing-ai-campaign.txt';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    if(event.target.id==='v4Copy') {
      try { await navigator.clipboard.writeText(currentPlan);notify('Campaign copied'); }
      catch {notify('Use Download Plan instead');}
    }
  });
  const questions=[
    ['Positioning','Is your brand’s unique promise clear and specific?','Clarify who you serve, what changes for them, and why they should believe you.'],
    ['Customer insights','Do you regularly collect and review customer feedback?','Interview customers and review their actual objections before planning creative.'],
    ['Website conversion','Does your website have a compelling next step and measurable conversion events?','Improve the primary CTA and test key landing-page steps.'],
    ['Search visibility','Can customers discover your business through relevant searches?','Publish useful search-intent pages and verify business listings.'],
    ['Content engine','Is your content consistent, relevant and distinguishable?','Build a practical content calendar from real customer questions.'],
    ['Distribution','Do you measure channel performance rather than merely posting everywhere?','Assign goals, budgets and attribution to each channel.'],
    ['CRM follow-up','Are leads recorded and followed up with permission and a clear process?','Build a consent-aware CRM pipeline with response responsibilities.'],
    ['Measurement','Do you track outcomes beyond reach and likes?','Connect cost, lead quality, sales and retention in a consistent scorecard.']
  ];
  const q=$('auditQuestions');
  questions.forEach(([name,question],i)=>{
    const div=document.createElement('div');div.className='audit-question';
    const label=document.createElement('label');label.htmlFor='auditQ'+i;label.textContent=(i+1)+'. '+question;
    const select=document.createElement('select');select.id='auditQ'+i;select.required=true;
    [['','Choose an answer'],['0','Not started'],['1','Partially in place'],['2','Consistently implemented']].forEach(([value,text])=>{
      const o=document.createElement('option');o.value=value;o.textContent=text;select.appendChild(o);
    });
    div.append(label,select);q.appendChild(div);
  });
  let auditReport='';
  $('auditForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(!$('auditForm').reportValidity())return;
    const business=clean($('auditBusiness').value);
    const results=questions.map(([name,question,recommendation],i)=>({name,score:Number($('auditQ'+i).value),recommendation}));
    const score=results.reduce((sum,x)=>sum+x.score,0);
    const pct=Math.round(100*score/(questions.length*2));
    const weak=results.sort((a,b)=>a.score-b.score).slice(0,4);
    auditReport='MARKETING HEALTH AUDIT — '+business+'\nReadiness Score: '+pct+'/100\n\nPriority Actions:\n'+weak.map((x,i)=>(i+1)+'. '+x.name+': '+x.recommendation).join('\n')+'\n\nSelf-assessment only. Confirm performance with real data.';
    const out=$('auditOutput');
    out.replaceChildren();
    const wrap=document.createElement('div');wrap.className='blueprint';
    wrap.innerHTML='<span class="bp-label">MARKETING HEALTH SCORE</span><h3>'+escapeHtml(business)+'</h3><div class="audit-score">'+pct+'/100</div><div class="audit-bar"><span style="width:'+pct+'%"></span></div><h4>Four priority improvements</h4><ol class="audit-actions"></ol><div class="export-row"><button type="button" id="auditDownload">Download Audit</button></div><p>Based on answers supplied, not an independent website scan.</p>';
    const list=wrap.querySelector('ol');
    weak.forEach(item=>{const li=document.createElement('li');li.textContent=item.name+': '+item.recommendation;list.appendChild(li);});
    out.appendChild(wrap);
  });
  $('auditOutput').addEventListener('click',event=>{
    if(event.target.id!=='auditDownload')return;
    const url=URL.createObjectURL(new Blob([auditReport],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='marketing-audit.txt';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
})();