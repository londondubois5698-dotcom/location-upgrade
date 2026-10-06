
(function(){
'use strict';

let brain7=null;
let pendingObjection=null;
let softNoCount=0;
let pendingVisualCompliment='';
let lastVisualComplimentAt=0;
let visualTimer=null;
let visualStream=null;
let visualFrames=0;

const state={
  mode:'rapport',
  awaitingAreaConfirm:false,
  areaConfirmed:false,
  routeConfidence:'unknown',
  routeDistanceM:null,
  routeBlocked:false,
  decisionAsked:false,
  awaitingDecisionMaker:false,
  decisionMaker:'unknown',
  awaitingJoin:false,
  secondPersonJoined:false,
  workAsked:false,
  commuteAsked:false,
  awaitingCloseAnswer:false,
  sessionObjections:[],
  startedAt:Date.now()
};

const memory=load('sterling.sales.memory.v2',{
  sessions:0,
  outcomes:{sale:0,followup:0,noSale:0},
  objections:{},
  hourly:{}
});
memory.sessions=(memory.sessions||0)+1;
saveMemory();

function load(k,f){try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}}
function saveMemory(){try{localStorage.setItem('sterling.sales.memory.v2',JSON.stringify(memory))}catch{} updateSalesPanel()}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function norm(s){return String(s||'').toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ').trim()}
function yesLike(s){return /^(yes|yeah|yep|yup|correct|right|sure|okay|ok|i am|we are|that's right|that is right)\b/i.test(String(s).trim())}
function noLike(s){return /^(no|nope|nah|not really|wrong|incorrect)\b/i.test(String(s).trim())}
function firmStop(s){
  return /\b(leave|go away|stop talking|leave me alone|do not come back|don't come back|no soliciting|absolutely not|not happening|i said no|fuck off|get off my property)\b/i.test(s);
}
function irritated(s){
  return /\b(annoying|pushy|harassing|harassment|pissing me off|making me mad|you're not listening|you are not listening)\b/i.test(s);
}
function distanceM(a,b,c,d){
  const R=6371000,toR=x=>x*Math.PI/180;
  const dLat=toR(c-a),dLon=toR(d-b);
  const x=Math.sin(dLat/2)**2+Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function areaLabel(){
  return [routeContext.street,routeContext.city].filter(Boolean).join(', ')||routeContext.city||'this area';
}
function routeNeedsVerbalCheck(){
  return state.routeConfidence!=='high'&&!state.areaConfirmed;
}
function routeStatusText(){
  if(state.routeBlocked)return 'House: mismatch — blocked';
  if(state.routeConfidence==='high')return 'House: verified';
  if(state.routeConfidence==='medium')return 'House: confirm verbally';
  if(state.routeConfidence==='low')return 'House: location mismatch';
  return 'House: checking';
}
function updateRouteBadge(){
  const h=document.getElementById('helperstat');
  if(h)h.textContent=routeStatusText();
}
function safeSay(text){
  if(pendingVisualCompliment&&state.mode!=='qualification'&&Date.now()-lastVisualComplimentAt>90000){
    const c=pendingVisualCompliment;
    pendingVisualCompliment='';
    lastVisualComplimentAt=Date.now();
    return say(c+' '+text);
  }
  return say(text);
}

async function verifyRouteLocation(){
  const lat=Number(routeContext.latitude),lon=Number(routeContext.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)){
    state.routeConfidence=(routeContext.gpRouteStopId&&routeContext.street)?'medium':'low';
    updateRouteBadge();return;
  }
  if(!navigator.geolocation){
    state.routeConfidence='medium';updateRouteBadge();return;
  }
  state.routeConfidence='checking';updateRouteBadge();
  navigator.geolocation.getCurrentPosition(pos=>{
    const d=distanceM(lat,lon,pos.coords.latitude,pos.coords.longitude);
    state.routeDistanceM=Math.round(d);
    state.routeConfidence=d<=250?'high':d<=800?'medium':'low';
    updateRouteBadge();
  },()=>{
    state.routeConfidence='medium';updateRouteBadge();
  },{enableHighAccuracy:true,timeout:6500,maximumAge:45000});
}

function findObjection(text){
  const n=norm(text);
  for(const o of brain7?.objections||[]){
    if((o.match||[]).some(m=>n.includes(norm(m))))return o;
  }
  return null;
}
function recordObjection(id){
  if(!id)return;
  state.sessionObjections.push(id);
  const row=memory.objections[id]||(memory.objections[id]={seen:0,sale:0,followup:0,noSale:0});
  row.seen++;
  saveMemory();
}
function markOutcome(outcome){
  if(!['sale','followup','noSale'].includes(outcome))return;
  memory.outcomes[outcome]=(memory.outcomes[outcome]||0)+1;
  const hour=new Date().getHours(),bucket=hour<12?'morning':hour<17?'afternoon':'evening';
  memory.hourly[bucket]||(memory.hourly[bucket]={sale:0,followup:0,noSale:0});
  memory.hourly[bucket][outcome]=(memory.hourly[bucket][outcome]||0)+1;
  for(const id of new Set(state.sessionObjections)){
    const row=memory.objections[id]||(memory.objections[id]={seen:0,sale:0,followup:0,noSale:0});
    row[outcome]=(row[outcome]||0)+1;
  }
  saveMemory();
  $('live').textContent='Outcome saved locally for Sterling’s sales learning.';
}
function topObjection(){
  const rows=Object.entries(memory.objections||{}).sort((a,b)=>(b[1].seen||0)-(a[1].seen||0));
  return rows[0]?.[0]||'none yet';
}
function updateSalesPanel(){
  const el=document.getElementById('saleslearn');
  if(el)el.textContent='Sessions '+(memory.sessions||0)+' • Sales '+(memory.outcomes?.sale||0)+' • Top objection '+topObjection();
}

async function loadBrain7(){
  try{
    const r=await fetch('/brain-data.json',{cache:'no-store'});
    if(r.ok)brain7=await r.json();
  }catch{}
}
loadBrain7();

const oldSafeContext=safeContext;
safeContext=function(){
  const extra=[
    'Sales stage: '+state.mode,
    'House confidence: '+state.routeConfidence+(state.routeDistanceM!=null?' ('+state.routeDistanceM+'m from route coordinate)':''),
    state.decisionMaker!=='unknown'?'Decision maker status: '+state.decisionMaker:'',
    data.workUse?'Work/use context volunteered by customer: '+data.workUse:'',
    data.commuteUse?'Commute context volunteered by customer: '+data.commuteUse:'',
    data.visualCue?'Consented safe visual cue: '+data.visualCue:''
  ].filter(Boolean).join('\n');
  return oldSafeContext()+(extra?'\n'+extra:'');
};

const oldNext=next;
next=function(){
  const ns=fields.findIndex(f=>!confirmed.has(f));
  if(ns<0&&routeNeedsVerbalCheck()&&!state.awaitingAreaConfirm&&!state.routeBlocked){
    stage=4;render();
    state.awaitingAreaConfirm=true;
    const name=data.first||'quick';
    const template=brain7?.locationVerification?.fallbackPrompt||'{name}, quick question — I just want to make sure I’ve got the right house. You’re in the {area} area, right?';
    return say(template.replace('{name}',name).replace('{area}',areaLabel()));
  }
  return oldNext();
};

const oldCapture=captureQualification;
captureQualification=function(text){
  const t=String(text||'').trim();

  if(!data.currentCarrier){
    data.currentCarrier=t;
    return safeSay('Got it. About how many phone lines are on the account?'),true;
  }
  if(!data.lines){
    data.lines=t;
    state.decisionAsked=true;
    state.awaitingDecisionMaker=true;
    return safeSay(brain7?.spouse?.discoveryQuestion||'Does anyone else share the account or like to be involved before you change phone service?'),true;
  }
  if(state.awaitingDecisionMaker){
    state.awaitingDecisionMaker=false;
    if(/\b(wife|husband|spouse|partner|girlfriend|boyfriend|fiance|fiancée|mother|father|mom|dad|someone else|my daughter|my son)\b/i.test(t)){
      state.decisionMaker='shared';
      if(/\b(here|right here|with me|inside|grab|getting|one sec|hold on)\b/i.test(t)){
        state.awaitingJoin=true;
        return safeSay(brain7?.spouse?.playfulInvite||'Oh my megabytes — this is one I want both of you to hear because it affects the whole account. Can we grab them for sixty seconds?'),true;
      }
      return safeSay((brain7?.spouse?.invite||'Since this affects the whole account, I’d rather both of you hear the same numbers.')+' While we’re lining that up, roughly what are you paying each month for wireless?'),true;
    }
    state.decisionMaker='solo';
    return safeSay('Perfect. Roughly what are you paying each month for wireless?'),true;
  }
  if(state.awaitingJoin){
    state.awaitingJoin=false;
    if(/\b(hi|hello|hey|this is|i'm|im |my name is)\b/i.test(t)){
      state.secondPersonJoined=true;
      return safeSay((brain7?.spouse?.newPersonGreeting||'So nice to meet you. I would’ve dressed for the occasion if I knew you were joining us.')+' London is just getting the same numbers in front of both of you. Roughly what is the wireless bill each month?'),true;
    }
    // If nobody actually joins, treat the next answer as the bill rather than trapping the flow.
    data.bill=t;
    return safeSay('Got it. Are you mainly trying to lower the bill, upgrade phones, improve service, or some combination of those?'),true;
  }
  if(!data.bill){
    data.bill=t;
    return safeSay('Got it. Are you mainly trying to lower the bill, upgrade phones, improve service, or some combination of those?'),true;
  }
  if(!data.device){
    data.device=t;
    state.workAsked=true;
    return safeSay((brain7?.rapport?.workQuestions||[])[0]||'Do you mostly use your phone around home, or are you on it a lot for work too?'),true;
  }
  if(!data.workUse){
    data.workUse=t;
    state.commuteAsked=true;
    const qs=brain7?.rapport?.commuteQuestions||[];
    const q=qs.length?qs[Math.abs(new Date().getMinutes())%qs.length]:'Any part of your commute where calls, maps, or streaming tend to act up?';
    return safeSay('Got it. '+q),true;
  }
  if(!data.commuteUse){
    data.commuteUse=t;
    state.awaitingCloseAnswer=true;
    return safeSay('That gives London a real picture. If he can show a meaningful improvement on price, coverage, or phones without making the switch a headache, are you open to seeing the numbers?'),true;
  }
  return oldCapture(text);
};

const oldHandle=handle;
handle=async function(text){
  text=String(text||'').trim();
  if(!text)return;
  await loadBrain7();

  if(firmStop(text)||irritated(text)){
    state.mode='exit';
    paused=true;
    halt();
    return say('Absolutely. I hear you — we’ll stop here. Thanks for your time.',false);
  }

  if(state.awaitingAreaConfirm){
    state.awaitingAreaConfirm=false;
    if(yesLike(text)){
      state.areaConfirmed=true;
      state.routeBlocked=false;
      updateRouteBadge();
      return say('Perfect — thank you. Who do you currently have for wireless service?');
    }
    if(noLike(text)||/\b(wrong|different|not this|moved|other address)\b/i.test(text)){
      state.routeBlocked=true;
      updateRouteBadge();
      const b=document.getElementById('salesforcesend');if(b)b.disabled=true;
      const c=document.getElementById('salesforcecopy');if(c)c.disabled=true;
      return say((brain7?.locationVerification?.mismatchResponse||'No problem. I’m not changing anything yet. Let’s get the address right first.')+' London, pull up the correct house before we send anything.');
    }
  }

  const nt=norm(text);
  if((brain7?.qualificationCues||[]).some(c=>nt.includes(norm(c)))){
    state.mode='qualification';
    const lines=brain7?.qualificationTransition||[];
    const line=lines.length?lines[Math.abs(new Date().getSeconds())%lines.length]:'Alright — serious mode for a minute. Qualification time.';
    return say(line);
  }

  if(state.awaitingCloseAnswer){
    state.awaitingCloseAnswer=false;
    if(yesLike(text))return say('Perfect. Then let’s keep going and make sure the numbers are actually worth your time.');
    if(noLike(text)){
      softNoCount++;
      if(softNoCount>1){paused=true;return say('Fair enough. I won’t push it. Thanks for giving London a minute.',false);}
      return say('Fair enough. What would have to be different for it to even be worth looking at — price, service, phones, or nothing right now?');
    }
  }

  if(pendingObjection){
    const o=pendingObjection;pendingObjection=null;
    if(firmStop(text)){paused=true;return say('Understood. We’ll stop here. Thanks for your time.',false);}
    return safeSay('That helps. '+(o.close||'Does that address the concern enough to look at the next step?'));
  }

  if(stage>=4&&!pending){
    const o=findObjection(text);
    if(o){
      if(o.id==='not_interested'){
        softNoCount++;
        if(softNoCount>1){paused=true;return say('Got it. I won’t keep working the objection. Thanks for your time.',false);}
      }
      recordObjection(o.id);
      pendingObjection=o;
      return safeSay((o.ack||'I hear you.')+' '+(o.diagnose||'What part matters most to you?'));
    }
  }

  return oldHandle(text);
};

async function enableVisual(){
  if(visualStream){stopVisual();return}
  try{
    visualStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:384},height:{ideal:384}},audio:false});
    const v=document.getElementById('visualpreview');
    v.srcObject=visualStream;await v.play();
    document.getElementById('visualstate').textContent='Camera context ON • visible consent indicator';
    document.getElementById('visualtoggle').textContent='Turn visual context off';
    visualFrames=0;
    await captureVisual();
    visualTimer=setInterval(()=>{if(!document.hidden&&visualFrames<3)captureVisual();},25000);
  }catch{
    document.getElementById('visualstate').textContent='Camera permission was not granted.';
  }
}
function stopVisual(){
  if(visualTimer){clearInterval(visualTimer);visualTimer=null}
  if(visualStream){visualStream.getTracks().forEach(t=>t.stop());visualStream=null}
  const v=document.getElementById('visualpreview');if(v)v.srcObject=null;
  const st=document.getElementById('visualstate');if(st)st.textContent='Visual context OFF';
  const b=document.getElementById('visualtoggle');if(b)b.textContent='Enable visual context';
}
async function captureVisual(){
  if(!visualStream||visualFrames>=3)return;
  const v=document.getElementById('visualpreview');
  if(!v||!v.videoWidth)return;
  const c=document.createElement('canvas'),size=320;c.width=size;c.height=size;
  const ctx=c.getContext('2d');
  const side=Math.min(v.videoWidth,v.videoHeight),sx=(v.videoWidth-side)/2,sy=(v.videoHeight-side)/2;
  ctx.drawImage(v,sx,sy,side,side,0,0,size,size);
  visualFrames++;
  try{
    const r=await fetch('/api/vision',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image:c.toDataURL('image/jpeg',0.52)})});
    const j=await r.json();
    if(r.ok&&j.cue){
      data.visualCue=String(j.cue).slice(0,160);
      if(j.compliment)pendingVisualCompliment=String(j.compliment).slice(0,180);
      document.getElementById('visualstate').textContent='Camera context ON • '+visualFrames+'/3 low-cost cues used';
    }
  }catch{}
  if(visualFrames>=3&&visualTimer){clearInterval(visualTimer);visualTimer=null}
}

function addV7Panel(){
  if(document.getElementById('v7panel'))return;
  const card=document.querySelector('.conversation');
  if(!card)return;
  const d=document.createElement('details');d.id='v7panel';
  d.innerHTML=
    '<summary>Sales brain V7</summary>'+
    '<p class="hint">Sterling handles common objections locally, learns anonymized outcome patterns on this device, verifies the active house, and uses live AI for genuinely new situations.</p>'+
    '<div class="rep-row"><span>Sales learning</span><span id="saleslearn"></span></div>'+
    '<div class="rep-row"><span>House verification</span><span id="housestate">'+esc(routeStatusText())+'</span></div>'+
    '<div class="controls"><button id="verifyhouse" class="quiet">Verify house location</button></div>'+
    '<p class="hint">Optional visual context uses the front camera only after consent, shows a visible indicator, and sends at most 3 small snapshots per customer session.</p>'+
    '<div class="controls"><button id="visualtoggle" class="quiet">Enable visual context</button></div>'+
    '<video id="visualpreview" muted playsinline style="display:block;width:120px;height:90px;object-fit:cover;border-radius:12px;margin-top:10px;background:#03101d"></video>'+
    '<div id="visualstate" class="hint">Visual context OFF</div>'+
    '<div class="controls"><button id="outsale">Mark sale</button><button id="outfollow" class="quiet">Mark follow-up</button><button id="outno" class="quiet">Mark no sale</button></div>';
  card.appendChild(d);
  document.getElementById('verifyhouse').onclick=verifyRouteLocation;
  document.getElementById('visualtoggle').onclick=enableVisual;
  document.getElementById('outsale').onclick=()=>markOutcome('sale');
  document.getElementById('outfollow').onclick=()=>markOutcome('followup');
  document.getElementById('outno').onclick=()=>markOutcome('noSale');
  updateSalesPanel();updateRouteBadge();
}

const startBtn=document.getElementById('start');
if(startBtn)startBtn.addEventListener('click',()=>verifyRouteLocation(),{capture:true});

const oldUpdateRouteBadge=updateRouteBadge;
updateRouteBadge=function(){
  oldUpdateRouteBadge();
  const e=document.getElementById('housestate');if(e)e.textContent=routeStatusText();
};

addV7Panel();
verifyRouteLocation();
const stat=document.getElementById('status');if(stat)stat.textContent='READY • V7';
const foot=document.querySelector('.footer');if(foot)foot.textContent=foot.textContent.replace('V6','V7');
window.addEventListener('pagehide',stopVisual);
})();
