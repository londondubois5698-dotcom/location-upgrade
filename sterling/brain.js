
(function(){
'use strict';

const COMMON_VOICE=new Set([
  'What’s your first name?',
  'And your last name?',
  'What’s the best phone number for London to reach you?',
  'What’s your email address?',
  'Got it. About how many phone lines are on the account?',
  'Thanks. Roughly what are you paying each month for wireless before any device payoff amounts?',
  'Got it. Are you mainly looking to lower the bill, upgrade phones, improve service, or some combination of those?',
  'That helps. Is there a specific phone or upgrade you already have in mind?'
]);

let brain={firstNameSpecial:{},firstNameTemplates:[],social:[]};
let stats=load('sterling.brain.stats.v1',{localReplies:0,aiCalls:0,voiceCacheHits:0});
let style=load('sterling.brain.style.v1',{humor:1,direct:0});

function load(k,f){try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}}
function save(){
  try{
    localStorage.setItem('sterling.brain.stats.v1',JSON.stringify(stats));
    localStorage.setItem('sterling.brain.style.v1',JSON.stringify(style));
  }catch{}
  updatePanel();
}
function updatePanel(){
  const a=document.getElementById('brainlocal'),b=document.getElementById('brainai'),c=document.getElementById('brainvoice');
  if(a)a.textContent=stats.localReplies||0;
  if(b)b.textContent=stats.aiCalls||0;
  if(c)c.textContent=stats.voiceCacheHits||0;
}
fetch('/brain-data.json',{cache:'force-cache'}).then(r=>r.ok?r.json():null).then(j=>{if(j)brain=j}).catch(()=>{});

function observe(text){
  const t=String(text).toLowerCase();
  if(/\b(lol|haha|funny|joke|that was good|you got jokes)\b/.test(t))style.humor=Math.min(5,(style.humor||0)+1);
  if(/\b(no jokes|be serious|just get to it|straight to the point)\b/.test(t)){
    style.direct=Math.min(5,(style.direct||0)+2);
    style.humor=Math.max(0,(style.humor||0)-2);
  }
  save();
}
function localSocial(text){
  const t=' '+String(text).toLowerCase().replace(/[^\p{L}\p{N}\s']/gu,' ').replace(/\s+/g,' ').trim()+' ';
  for(const row of brain.social||[]){
    if((row.match||[]).some(m=>t.includes(' '+String(m).toLowerCase().trim()+' ')))return row.reply;
  }
  return '';
}
function nameBanter(name){
  const n=String(name||'').trim(),key=n.toLowerCase();
  if((style.direct||0)>=(style.humor||0)+2)return n+' — got it. And your last name?';
  if(brain.firstNameSpecial?.[key])return brain.firstNameSpecial[key];
  const arr=brain.firstNameTemplates?.length?brain.firstNameTemplates:['{name} — got it. And your last name?'];
  let h=0;for(const ch of key)h=(h*31+ch.charCodeAt(0))>>>0;
  return arr[h%arr.length].replaceAll('{name}',n);
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
async function getVoice(text){
  const cacheable=COMMON_VOICE.has(text)&&('caches'in window);
  const key='/__sterling_voice_v2__/'+hash(text);
  if(cacheable){
    try{
      const c=await caches.open('sterling-voice-v2'),hit=await c.match(key);
      if(hit){
        stats.voiceCacheHits=(stats.voiceCacheHits||0)+1;save();
        return {buf:await hit.arrayBuffer(),type:hit.headers.get('content-type')||'audio/mpeg'};
      }
    }catch{}
  }
  const r=await fetch('/api/tts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});
  if(!r.ok)throw Error('voice');
  if(cacheable){try{const c=await caches.open('sterling-voice-v2');await c.put(key,r.clone())}catch{}}
  return {buf:await r.arrayBuffer(),type:r.headers.get('content-type')||'audio/mpeg'};
}

const oldCloudSpeak=cloudSpeak;
cloudSpeak=async function(text,thenListen,token){
  status('VOICE LOADING');$('live').textContent='Sterling is getting his voice ready…';
  try{
    const vr=await getVoice(text),buf=vr.buf;
    if(token!==speechToken)return;
    const ctx=await ensureAudio();
    if(ctx){
      const decoded=await ctx.decodeAudioData(buf.slice(0));
      if(token!==speechToken)return;
      const src=ctx.createBufferSource(),gain=ctx.createGain();
      gain.gain.value=Number($('boost')?.value||1.35);
      src.buffer=decoded;src.connect(gain);gain.connect(ctx.destination);currentSource=src;
      src.onended=()=>{if(token!==speechToken)return;currentSource=null;speaking=false;if(thenListen)scheduleListen();else status('READY')};
      status('SPEAKING');$('live').textContent='Sterling is speaking. Your turn comes next.';src.start(0);return;
    }
    const blob=new Blob([buf],{type:vr.type}),a=new Audio(URL.createObjectURL(blob));
    currentAudio=a;a.volume=1;
    a.onended=()=>{if(token!==speechToken)return;currentAudio=null;speaking=false;if(thenListen)scheduleListen();else status('READY')};
    a.onerror=()=>deviceSpeak(text,thenListen,token);
    status('SPEAKING');$('live').textContent='Sterling is speaking. Your turn comes next.';await a.play();
  }catch{
    if(token!==speechToken)return;
    deviceSpeak(text,thenListen,token);
  }
};

const oldNext=next;
next=function(){
  stage=fields.findIndex(f=>!confirmed.has(f));
  if(stage===1&&confirmed.has('first')&&!confirmed.has('last')){
    stats.localReplies=(stats.localReplies||0)+1;save();
    render();return say(nameBanter(data.first));
  }
  return oldNext();
};

const oldAiReply=aiReply;
aiReply=async function(message){
  observe(message);
  const local=localSocial(message);
  if(local){stats.localReplies=(stats.localReplies||0)+1;save();return say(local)}
  stats.aiCalls=(stats.aiCalls||0)+1;save();
  return oldAiReply(message);
};

const oldHandle=handle;
handle=async function(text){
  observe(text);
  if(stage<4&&!pending){
    const local=localSocial(text);
    if(local){
      stats.localReplies=(stats.localReplies||0)+1;save();
      return say(local+' '+questions[stage]);
    }
  }
  return oldHandle(text);
};

function routePacket(){
  return {
    version:2,createdAt:Date.now(),expiresAt:Date.now()+12*60*60*1000,
    first:data.first||'',last:data.last||'',phone:data.phone||'',email:data.email||'',
    routeId:routeContext.routeId||'',gpRouteStopId:routeContext.gpRouteStopId||'',
    street:routeContext.street||'',city:routeContext.city||'',postalcode:routeContext.postalcode||'',state:routeContext.state||''
  };
}
function savePending(){
  if(fields.every(f=>confirmed.has(f))){try{localStorage.setItem('sterling.pending.v2',JSON.stringify(routePacket()))}catch{}}
}
const oldRender=render;
render=function(){oldRender();savePending();updatePanel()};

const sf=document.getElementById('salesforcecopy');
if(sf)sf.onclick=async()=>{
  savePending();
  const raw='STERLING_ROUTE_V2\n'+JSON.stringify(routePacket());
  try{await navigator.clipboard.writeText(raw)}catch{}
  status('ROUTE PACKET READY');
  $('delivery').textContent=routeContext.street
    ?'Saved for '+routeContext.street+'. Return to that ICL/Salesforce tab and tap Sterling Helper. Clipboard is only a fallback.'
    :'Saved on this device. Return to the active ICL/Salesforce house and tap Sterling Helper. Clipboard is only a fallback.';
};

const reset=document.getElementById('reset');
if(reset)reset.addEventListener('click',()=>{try{localStorage.removeItem('sterling.pending.v2')}catch{}},true);

function addPanel(){
  const voice=document.querySelector('summary')?.parentElement;
  if(!voice||document.getElementById('brainpanel'))return;
  const d=document.createElement('details');d.id='brainpanel';
  d.innerHTML='<summary>Sterling Brain & token saver</summary><p class="hint">Routine conversation runs locally before live AI. Sterling remembers only lightweight conversation-style signals on this device — not raw voice recordings or a voiceprint.</p><div class="rep-row"><span>Local brain replies</span><span id="brainlocal">0</span></div><div class="rep-row"><span>Live AI calls</span><span id="brainai">0</span></div><div class="rep-row"><span>Saved voice replays</span><span id="brainvoice">0</span></div><div class="controls"><button id="resetbrain" class="quiet">Reset local brain</button><a class="action" href="/helper.html" target="_blank" rel="noopener">Install Route Helper</a></div>';
  voice.insertAdjacentElement('afterend',d);
  document.getElementById('resetbrain').onclick=()=>{stats={localReplies:0,aiCalls:0,voiceCacheHits:0};style={humor:1,direct:0};try{localStorage.removeItem('sterling.brain.stats.v1');localStorage.removeItem('sterling.brain.style.v1')}catch{}save();$('live').textContent='Local brain statistics and style memory reset.'};
  updatePanel();
}
addPanel();
const stat=document.getElementById('status');if(stat)stat.textContent='READY • V6';
const foot=document.querySelector('.footer');if(foot)foot.textContent=foot.textContent.replace('V5','V6');
})();
