// Cloudflare Worker: Stripe Checkout + paid campaign fulfillment.
// Secrets: STRIPE_SECRET_KEY (wrangler secret put). D1 binding: DB.
// SITE_URL and ALLOWED_ORIGIN: https://tranwrecks.com; PRICE_CENTS: 900.
// Deliberately creates a structured *rule-based* marketing brief, not an AI-generated campaign.
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...extra}});
const code=()=>crypto.randomUUID();
const directions={
 Awareness:["Distinctive positioning and memorable brand assets","Founder/customer story and short-form brand video","Organic social, creator partnerships, educational search","Qualified reach, branded search trend, recall"],
 "Lead Generation":["Solve a clearly defined customer problem","Lead magnet, credible testimonials, straightforward CTA","Search, educational content, opt-in email","Qualified leads, CPL, consultation rate"],
 Conversion:["Address objections and reduce purchase friction","Comparison guide, product proof, simple offer","High-intent search and landing-page testing","Conversion rate, CAC, attributed revenue"],
 Retention:["Continue delivering value after the sale","Onboarding, loyalty content, useful tips","Lifecycle email and community","Repeat rate, retention rate, LTV"],
 Engagement:["Invite audience participation and recognition","Community stories, polls and authentic challenges","Social communities, events, creators","Meaningful engagement, referrals"]
};
function validate(input){
 if(!input||typeof input!=="object")throw Error("Invalid campaign brief");
 const brand=String(input.brand||"").trim().slice(0,80);
 const audience=String(input.audience||"").trim().slice(0,180);
 const industry=String(input.industry||"").trim().slice(0,80);
 const objective=String(input.objective||"").trim();
 const duration=Number(input.duration),budget=Number(input.budget);
 if(!brand||!audience||!industry||!directions[objective]||![30,60,90].includes(duration)||!Number.isFinite(budget)||budget<0||budget>1e9)throw Error("Invalid campaign fields");
 return {brand,audience,industry,objective,duration,budget};
}
function makePlan(b){
 const d=directions[b.objective],weeks=Math.ceil(b.duration/7);
 return [
 "MARKETING AI STUDIO — PAID CAMPAIGN BLUEPRINT",
 "Brand: "+b.brand,"Industry: "+b.industry,"Audience: "+b.audience,
 "Objective: "+b.objective,"Suggested duration: "+b.duration+" days",
 "Customer media budget (not charged by Marketing AI): $"+b.budget+" monthly",
 "",
 "1. POSITIONING AND STRATEGY",d[0],
 "Focus on: "+b.audience+". Validate customer pain points through interviews and search data.",
 "",
 "2. CREATIVE AND EMOTIONAL DIRECTION",d[1],
 "Test benefit-led, proof-led, and emotional variations; avoid unsupported claims.",
 "",
 "3. DISTRIBUTION",d[2],
 "Choose channels based on available resources and customer research.",
 "",
 "4. EXECUTION ROADMAP",
 "Week 1: Define customer profile, baseline and campaign hypothesis.",
 "Week 2: Develop assets, approval checklist and landing-page measurement.",
 "Week 3: Launch only after approval; monitor quality and spend.",
 "Week 4: Evaluate and adjust; repeat as appropriate for "+weeks+" weeks.",
 "",
 "5. MEASUREMENT",d[3],
 "Review incremental contribution, conversion rates and attributable revenue, not vanity metrics.",
 "",
 "6. RISK CONTROLS",
 "Respect consent, privacy, advertising disclosures and platform rules.",
 "This is a rule-based starting brief. It is not live AI output or a guaranteed result."
 ].join("\n");
}
function cors(origin,env){
 const allowed=(env.ALLOWED_ORIGIN||env.SITE_URL||"https://tranwrecks.com").replace(/\/$/,"");
 return origin===allowed?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}:{};
}
async function stripe(env,path,opts={}){
 const res=await fetch("https://api.stripe.com/v1/"+path,{...opts,headers:{Authorization:"Bearer "+env.STRIPE_SECRET_KEY,...opts.headers}});
 const data=await res.json();
 if(!res.ok)throw Error(data?.error?.message||"Payment provider error");
 return data;
}
export default {
 async fetch(request,env){
  const origin=request.headers.get("Origin")||"";
  const headers=cors(origin,env);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
  const url=new URL(request.url);
  if(url.pathname==="/health"&&request.method==="GET")return json({status:"ok",checkoutConfigured:Boolean(env.STRIPE_SECRET_KEY&&env.DB)},200,headers);
  if(!headers["Access-Control-Allow-Origin"])return json({error:"Origin not allowed"},403);
  if(!env.STRIPE_SECRET_KEY||!env.DB)return json({error:"Payments are not configured yet"},503,headers);
  try{
   if(url.pathname==="/checkout"&&request.method==="POST"){
    if(Number(request.headers.get("content-length")||0)>12000)return json({error:"Request too large"},413,headers);
    const brief=validate(await request.json());
    const draftId=code();
    await env.DB.prepare("INSERT INTO drafts (id, brief) VALUES (?, ?)").bind(draftId,JSON.stringify(brief)).run();
    const amount=Number(env.PRICE_CENTS||900);
    if(!Number.isInteger(amount)||amount<50||amount>100000)return json({error:"Invalid checkout configuration"},503,headers);
    const site=(env.SITE_URL||"https://tranwrecks.com").replace(/\/$/,"");
    const form=new URLSearchParams({
      mode:"payment",
      "payment_method_types[0]":"card",
      "line_items[0][price_data][currency]":"usd",
      "line_items[0][price_data][unit_amount]":String(amount),
      "line_items[0][price_data][product_data][name]":"Marketing AI Campaign Blueprint",
      "line_items[0][quantity]":"1",
      success_url:site+"/?session_id={CHECKOUT_SESSION_ID}#planner",
      cancel_url:site+"/#planner",
      client_reference_id:draftId,
      "metadata[draft_id]":draftId
    });
    const session=await stripe(env,"checkout/sessions",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form});
    await env.DB.prepare("UPDATE drafts SET session_id=? WHERE id=?").bind(session.id,draftId).run();
    return json({checkoutUrl:session.url},200,headers);
   }
   if(url.pathname==="/redeem"&&request.method==="GET"){
    const id=url.searchParams.get("session_id")||"";
    if(!/^cs_(test_|live_)[A-Za-z0-9]+$/.test(id))return json({error:"Invalid checkout reference"},400,headers);
    const s=await stripe(env,"checkout/sessions/"+encodeURIComponent(id));
    const price=Number(env.PRICE_CENTS||900);
    if(s.payment_status!=="paid"||s.status!=="complete"||s.currency!=="usd"||s.amount_total!==price||s.mode!=="payment")return json({error:"Payment not verified"},402,headers);
    const row=await env.DB.prepare("SELECT id, brief, result FROM drafts WHERE session_id=?").bind(id).first();
    if(!row||row.id!==s.client_reference_id||row.id!==s.metadata?.draft_id)return json({error:"No matching campaign"},404,headers);
    if(row.result)return json({plan:row.result,previouslyGenerated:true},200,headers);
    const plan=makePlan(validate(JSON.parse(row.brief)));
    await env.DB.prepare("UPDATE drafts SET result=? WHERE id=? AND result IS NULL").bind(plan,row.id).run();
    return json({plan},200,headers);
   }
   return json({error:"Not found"},404,headers);
  }catch(err){return json({error:err instanceof SyntaxError?"Invalid JSON":"Unable to process request. Please try again."},500,headers)}
 }
};