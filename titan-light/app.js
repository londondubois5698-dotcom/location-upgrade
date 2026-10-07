import {OPENERS,NAME_RIFFS,RING_OPENERS,SOFT_REJECTION_LADDER,EXITS,BANTER,OBJECTIONS,DISCOVERY_PROMPTS,CONTACT_JOKES,PRICE_SNAPSHOT} from './brain.js';

const $=id=>document.getElementById(id);
const STORAGE='titan.light.v1';
const LEARNED='titan.light.learned.v1';
const WINNERS='titan.light.winners.v1';
const SESSIONS='titan.light.sessions.v1';

const state={
  mode:'talk',active:false,outdoor:true,stage:'idle',softRejects:0,
  used:new Set(),lastTitan:'',lastIntent:'',
  contact:{first:'',last:'',phone:'',email:''},
  discovery:{carrier:'',lines:'',bill:'',phones:'',painPoint:'',upgradeInterest:'',decisionMaker:'',plan:'Extra 2.0'},
  transcript:[],sessionStarted:Date.now()
};

let recognition=null;
let speaking=false;

function rand(arr,key=''){
  const pool=arr.filter((_,i)=>!state.used.has(key+i));
  const use=pool.length?pool:arr;
  const item=use[Math.floor(Math.random()*use.length)];
  const idx=arr.indexOf(item);state.used.add(key+idx);
  return item;
}
function pickFn(arr,arg,key=''){const fn=rand(arr,key);return typeof fn==='function'?fn(arg):fn}
function clean(s){return String(s||'').trim()}
function money(v){const m=String(v||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);return m?Number(m[0]):0}
function phonePretty(v){const d=String(v||'').replace(/\D/g,'');return d.length===10?`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`:String(v||'')}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function load(){
  try{
    const live=JSON.parse(localStorage.getItem(STORAGE)||'null');
    if(live){
      Object.assign(state.discovery,live.discovery||{});
      Object.assign(state.contact,live.contact||{});
      state.mode=live.mode||state.mode;
      state.outdoor=live.outdoor!==false;
    }
  }catch{}
  render();
  updateStats();
}
function save(){
  localStorage.setItem(STORAGE,JSON.stringify({discovery:state.discovery,contact:state.contact,mode:state.mode,outdoor:state.outdoor}));
}
function learned(){try{return JSON.parse(localStorage.getItem(LEARNED)||'[]')}catch{return[]}}
function winners(){try{return JSON.parse(localStorage.getItem(WINNERS)||'{}')}catch{return{}}}
function sessions(){try{return JSON.parse(localStorage.getItem(SESSIONS)||'[]')}catch{return[]}}
function updateStats(){
  $('sessionCount').textContent=sessions().length;
  $('lessonCount').textContent=learned().length;
  $('winnerCount').textContent=Object.keys(winners()).length;
}

function localVoice(){
  const voices=speechSynthesis.getVoices();
  const preferred=['Reed','Eddy','Rocko','Daniel','Aaron','Alex','Fred'];
  for(const name of preferred){const v=voices.find(x=>x.name.includes(name)&&x.lang.startsWith('en'));if(v)return v}
  return voices.find(v=>v.lang==='en-US')||voices.find(v=>v.lang.startsWith('en'))||voices[0];
}
function speak(text){
  state.lastTitan=text;addLine('titan',text);saveSessionLine();
  if(!('speechSynthesis'in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  const v=localVoice();if(v)u.voice=v;
  u.volume=1;u.rate=state.outdoor?1.02:.98;u.pitch=.9;
  u.onstart=()=>{speaking=true;$('statusText').textContent='Titan speaking';$('fullState').textContent='SPEAKING'};
  u.onend=()=>{speaking=false;$('statusText').textContent=state.active?'Listening':'Standing by';$('fullState').textContent=state.active?'LISTENING':'OFFLINE READY';if(state.active)startListening()};
  u.onerror=()=>{speaking=false;if(state.active)startListening()};
  speechSynthesis.speak(u);
}
function addLine(role,text){
  state.transcript.push({role,text,at:Date.now()});if(state.transcript.length>80)state.transcript.shift();
  const div=document.createElement('div');div.className='line '+role;div.textContent=(role==='user'?'Customer: ':'Titan: ')+text;
  $('transcript').appendChild(div);$('transcript').scrollTop=$('transcript').scrollHeight;
}
function saveSessionLine(){
  const ss=sessions();
  const cur={id:state.sessionStarted,at:Date.now(),mode:state.mode,contact:state.contact,discovery:state.discovery,transcript:state.transcript.slice(-30)};
  const i=ss.findIndex(x=>x.id===cur.id);if(i>=0)ss[i]=cur;else ss.unshift(cur);
  localStorage.setItem(SESSIONS,JSON.stringify(ss.slice(0,120)));
  updateStats();
}

function initRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return false;
  recognition=new SR();recognition.lang='en-US';recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
  recognition.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript;if(t)hear(t)};
  recognition.onerror=e=>{
    if(['aborted','no-speech'].includes(e.error))return;
    voiceWarning('iPhone voice recognition may require Apple network services. Titan Light itself is offline; use Type or quick buttons when voice input is unavailable.');
  };
  recognition.onend=()=>{if(state.active&&!speaking)setTimeout(startListening,220)};
  return true;
}
function startListening(){
  if(!state.active||speaking)return;
  if(!recognition&&!initRecognition()){voiceWarning('This browser does not expose speech recognition. Titan Light still works fully offline with Type + quick response buttons.');return}
  try{recognition.start();$('statusText').textContent='Listening';$('liveText').textContent='Local brain active • no backend calls'}catch{}
}
function stopListening(){try{recognition?.abort()}catch{}}
function voiceWarning(t){$('voiceNotice').textContent=t;$('voiceNotice').hidden=false;setTimeout(()=>{$('voiceNotice').hidden=true},6500)}

function parseFacts(text){
  const raw=text.replace(/,/g,' ');
  const d=state.discovery,c=state.contact;
  const carriers=[['Verizon',/\bverizon\b/i],['T-Mobile',/\b(?:t[- ]?mobile|tmobile)\b/i],['AT&T',/\b(?:at&t|att)\b/i],['Spectrum',/\bspectrum\b/i],['Xfinity',/\bxfinity\b/i],['Cricket',/\bcricket\b/i],['Boost',/\bboost\b/i],['Visible',/\bvisible\b/i],['Mint',/\bmint\b/i]];
  for(const [n,re] of carriers)if(re.test(raw)){d.carrier=n;break}
  let m=raw.match(/\b(?:bill|pay|paying|spend|spending)(?:\s+(?:is|about|around|roughly|like))?\s*\$?\s*(\d{2,4})\b/i)||raw.match(/\$\s*(\d{2,4})/);if(m)d.bill=m[1];
  m=raw.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s+(?:phone\s+)?lines?\b/i);
  if(m){const words={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};d.lines=String(words[m[1].toLowerCase()]||Number(m[1]))}
  const phones=raw.match(/\b(?:iphone\s*(?:1[1-9]|\d)(?:\s*(?:pro|max|plus|air|e))?|galaxy\s*[a-z]?\d{2}(?:\s*(?:ultra|plus|fe))?|pixel\s*\d{1,2}(?:\s*(?:pro|xl|a))?)\b/ig);if(phones)d.phones=[...new Set(phones)].slice(0,4).join(', ');
  if(/\b(?:bill|price|expensive|cost|overpay)/i.test(raw))d.painPoint='Bill';
  else if(/\b(?:service|signal|bars|coverage|drop|dead zone)/i.test(raw))d.painPoint='Service';
  else if(/\b(?:upgrade|old phone|battery|new phone)/i.test(raw))d.painPoint='Phones';
  if(/\b(?:upgrade|new iphone|new samsung|new pixel)/i.test(raw))d.upgradeInterest='Yes';

  const email=raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);if(email)c.email=email[0].toLowerCase();
  const phone=raw.replace(/[^0-9]/g,'');if(phone.length===10)c.phone=phone;else if(phone.length===11&&phone[0]==='1')c.phone=phone.slice(1);

  if(!c.first){
    const nm=raw.match(/\b(?:i'm|i am|my name is|this is)\s+([A-Za-z][A-Za-z'-]{1,24})(?:\s+([A-Za-z][A-Za-z'-]{1,30}))?/i);
    if(nm){c.first=nm[1];if(nm[2]&&!['with','from','and'].includes(nm[2].toLowerCase()))c.last=nm[2]}
  }
  save();render();
  if(c.first&&c.last&&c.phone&&c.email)showContact();
}

function intent(text){
  const t=text.toLowerCase();
  const custom=learned().find(x=>t.includes(x.trigger.toLowerCase()));if(custom)return {type:'custom',reply:custom.reply};
  if(/\b(stop|leave|go away|bye|do not come back|don't come back)\b/.test(t))return {type:'hardStop'};
  if(/not interested|no thanks|nah i'm good|we'?re good/.test(t))return {type:'softReject'};
  if(/not home|away from home|at work right now/.test(t))return {type:'notHome'};
  if(/\b(busy|in a rush|can't talk|can not talk)\b/.test(t))return {type:'busy'};
  if(/what do you want|what can i do for you|why are you here|what is this/.test(t))return {type:'whatWant'};
  if(/\bhello\b.*\bhello\b|hello\?/.test(t))return {type:'helloLoop'};
  if(/\b(dog|puppy|pitbull|poodle|labrador|retriever|frenchie|bulldog)\b/.test(t))return {type:'banter',topic:'dog'};
  if(/\b(car|truck|suv|ford|chevy|tesla|honda|toyota)\b/.test(t))return {type:'banter',topic:'car'};
  if(/\b(school|teacher|teen|teenager|high school|middle school)\b/.test(t))return {type:'banter',topic:'school'};
  if(/\b(traffic|commute|jammed|interstate)\b/.test(t))return {type:'banter',topic:'traffic'};
  if(/\b(work|job|shift|office|warehouse)\b/.test(t))return {type:'banter',topic:'work'};
  if(/\b(rain|hot|cold|weather|storm|humid)\b/.test(t))return {type:'banter',topic:'weather'};
  if(/\b(game|football|basketball|baseball|team|nfl|nba)\b/.test(t))return {type:'banter',topic:'sports'};
  if(/\b(food|cook|dinner|lunch|breakfast|pizza|grill)\b/.test(t))return {type:'banter',topic:'food'};
  if(/\b(yard|grass|lawn|garden)\b/.test(t))return {type:'banter',topic:'yard'};
  if(/\b(kid|kids|child|children|daughter|son)\b/.test(t))return {type:'banter',topic:'kids'};
  if(/\b(phone|iphone|samsung|pixel)\b/.test(t))return {type:'banter',topic:'phone'};
  if(/\b(wifi|wi-fi|internet|router|modem)\b/.test(t))return {type:'banter',topic:'internet'};
  if(/wife|husband|spouse|partner/.test(t))return {type:'objection',topic:'spouse'};
  if(/coverage|signal|bars|dead zone/.test(t))return {type:'objection',topic:'coverage'};
  if(/expensive|price|cost|too much/.test(t))return {type:'objection',topic:'price'};
  if(/love verizon|love t-mobile|been with.*years|loyal/.test(t))return {type:'objection',topic:'loyalty'};
  if(/think about|think on it|need to think/.test(t))return {type:'objection',topic:'think'};
  if(/looks right|that's right|correct|all good/.test(t)&&state.contact.first&&state.contact.email)return {type:'contactOK'};
  return {type:'general'};
}

function nextPrompt(){
  const d=state.discovery;
  if(!d.carrier)return "Who's handling the phones right now — Verizon, T-Mobile, or somebody else?";
  if(!d.lines)return "How many phone lines are we talking about?";
  if(!d.bill)return "About what does the wireless bill land at each month?";
  if(!d.painPoint)return "If you could fix one thing about what you've got now, what would it be — the bill, the service, or the phones?";
  if(!d.phones)return "What phones are everybody using now?";
  return "Okay, now we're actually comparing something real. Which matters more if London can make it work — lowering the monthly number or getting the upgrades right?";
}

function contactFlow(text){
  const c=state.contact;
  if(!c.first)return null;
  if(state.stage==='idle'||state.stage==='rapport'){
    state.stage='contactLast';
    return pickFn(NAME_RIFFS,c.first,'name')+" Okay "+c.first+", what's your last name?";
  }
  if(state.stage==='contactLast'&&!c.last){
    const words=text.trim().split(/\s+/);if(words.length<=3)c.last=words[words.length-1].replace(/[^A-Za-z'-]/g,'');
    if(c.last){state.stage='contactPhone';save();return pickFn(CONTACT_JOKES.last,c.last,'last')+" Last thing for the card after this — what's the best phone number?"}
  }
  if(state.stage==='contactPhone'&&!c.phone){
    const d=text.replace(/\D/g,'');if(d.length>=10)c.phone=d.slice(-10);
    if(c.phone){state.stage='contactEmail';save();return rand(CONTACT_JOKES.phone,'phone')+" And what's the best email?"}
  }
  if(state.stage==='contactEmail'&&!c.email){
    const e=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);if(e)c.email=e[0].toLowerCase();
    if(c.email){state.stage='review';save();setTimeout(showContact,150);return pickFn(CONTACT_JOKES.email,c.first,'email')+" "+c.first+", I'm usually 99.2 percent right, but check that contact card before I hand it back to London."}
  }
  return null;
}

function respond(text){
  parseFacts(text);
  const cf=contactFlow(text);if(cf)return cf;
  const it=intent(text);state.lastIntent=it.type;

  if(it.type==='custom')return it.reply;
  if(it.type==='hardStop'){state.active=false;stopListening();return rand(EXITS,'exit')}
  if(it.type==='contactOK'){$('contactOverlay').hidden=true;state.stage='discovery';return "Perfect. Card locked locally. Now let's get to the part that actually matters — "+nextPrompt()}
  if(state.mode==='ring'){
    if(it.type==='helloLoop')return "Shhhhh... don't let Alexa know I'm over here talking to you. You know she still mad I didn't get her that upgraded Echo for her birthday.";
    if(it.type==='whatWant')return "I want a four-terabyte hard drive and for London to relax with the security check-ins. He acts like I'm gonna run off with some supercomputer. Since you're asking — HEY SIRI — tell this generous human what you think I need.";
    if(it.type==='notHome')return "That actually works. If you've got twenty seconds, I can give you the quick version right here through the camera. No download. What's been more annoying lately — the phone bill, the service, or the phones?";
    if(it.type==='softReject'){
      if(state.softRejects<3)return SOFT_REJECTION_LADDER[state.softRejects++];
      state.active=false;stopListening();return rand(EXITS,'exit');
    }
  }else if(it.type==='softReject'){
    if(state.softRejects===0){state.softRejects++;return "I hear you. Before I turn into a loading screen, one thing — what's the bigger reason: happy with what you've got, bad timing, or you just don't want another sales conversation?"}
    state.active=false;stopListening();return rand(EXITS,'exit');
  }

  if(it.type==='busy')return rand(OBJECTIONS.busy,'busy')+" "+nextPrompt();
  if(it.type==='banter')return rand(BANTER[it.topic],it.topic)+" "+(Math.random()<.65?nextPrompt():"");
  if(it.type==='objection')return rand(OBJECTIONS[it.topic],it.topic)+" "+(it.topic==='price'||it.topic==='coverage'?nextPrompt():"");
  if(!state.contact.first&&state.stage!=='contactLast')return rand(OPENERS,'opener')+" By the way, what's your first name?";
  return nextPrompt();
}

function hear(text){
  text=clean(text);if(!text)return;
  addLine('user',text);saveSessionLine();
  $('liveText').textContent='Heard: '+text.slice(0,60);
  const r=respond(text);render();if(r)speak(r);
}

function render(){
  const d=state.discovery;
  $('carrierValue').textContent=d.carrier||'—';$('linesValue').textContent=d.lines||'—';$('phonesValue').textContent=d.phones||'—';$('painValue').textContent=d.painPoint||'Discovering…';
  $('nowBill').innerHTML=(d.bill?'$'+money(d.bill):'—')+'<em>/mo</em>';
  $('nowCarrier').textContent=d.carrier?d.carrier.toUpperCase():'NOW';
  $('nowCard').classList.remove('verizon','tmobile');if(/verizon/i.test(d.carrier))$('nowCard').classList.add('verizon');if(/t-?mobile/i.test(d.carrier))$('nowCard').classList.add('tmobile');

  const lines=Number(d.lines)||0;const plan=d.plan||'Extra 2.0';let total=0;
  if(lines){
    const rates=PRICE_SNAPSHOT[plan]||PRICE_SNAPSHOT['Extra 2.0'];
    const per=lines<=4?rates[lines]:rates[4];
    total=per*lines;
  }
  $('planValue').textContent=plan;$('newBill').innerHTML=(total?'$'+total:'—')+'<em>/mo</em>';
  const saveAmt=money(d.bill)&&total?Math.max(0,money(d.bill)-total):0;$('saveValue').textContent=saveAmt?'$'+saveAmt+'/mo':'—';
  $('upgradeValue').textContent=d.upgradeInterest||'Discovering…';

  $('talkBtn').classList.toggle('active',state.mode==='talk'&&state.active);
  $('ringBtn').classList.toggle('active',state.mode==='ring'&&state.active);
  $('outdoorBtn').classList.toggle('active',state.outdoor);
  $('outdoorBtn').querySelector('small').textContent=state.outdoor?'MAX':'Normal';
  save();
}

function showContact(){
  $('cFirst').textContent=state.contact.first||'—';$('cLast').textContent=state.contact.last||'—';$('cPhone').textContent=phonePretty(state.contact.phone)||'—';$('cEmail').textContent=state.contact.email||'—';$('contactOverlay').hidden=false;
}

function startMode(mode){
  state.mode=mode;state.active=true;state.softRejects=0;state.stage=state.contact.first?'rapport':'idle';render();
  if(mode==='talk'){speak("Hey! How are you doing?")}
  else{$('statusText').textContent='Ring armed • listening';$('liveText').textContent='Silent until the homeowner speaks';startListening()}
}
function stop(){state.active=false;stopListening();speechSynthesis?.cancel();$('statusText').textContent='Standing by';$('liveText').textContent='Offline brain saved on this phone';render()}

$('talkBtn').onclick=()=>startMode('talk');$('ringBtn').onclick=()=>startMode('ring');$('stopBtn').onclick=stop;
$('outdoorBtn').onclick=()=>{state.outdoor=!state.outdoor;render()};
$('typeBtn').onclick=()=>{document.querySelector('.repDrawer').open=true;$('manualInput').focus()};
$('sendManual').onclick=()=>{const v=$('manualInput').value;$('manualInput').value='';hear(v)};
$('manualInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('sendManual').click()});
document.querySelectorAll('#quickChips button').forEach(b=>b.onclick=()=>hear(b.dataset.say));
$('teachBtn').onclick=()=>{const trigger=clean($('teachTrigger').value),reply=clean($('teachReply').value);if(!trigger||!reply)return;const a=learned();a.unshift({trigger,reply,at:Date.now()});localStorage.setItem(LEARNED,JSON.stringify(a.slice(0,250)));$('teachTrigger').value='';$('teachReply').value='';updateStats();voiceWarning('Titan Light learned that phrase on this device.')};
$('markWinner').onclick=()=>{if(!state.lastTitan)return;const w=winners();w[state.lastTitan]=(w[state.lastTitan]||0)+1;localStorage.setItem(WINNERS,JSON.stringify(w));updateStats();voiceWarning('Saved as a winning line. Titan Light will keep it in local memory.')};
$('newSession').onclick=()=>{state.sessionStarted=Date.now();state.contact={first:'',last:'',phone:'',email:''};state.discovery={carrier:'',lines:'',bill:'',phones:'',painPoint:'',upgradeInterest:'',decisionMaker:'',plan:'Extra 2.0'};state.transcript=[];state.stage='idle';state.softRejects=0;$('transcript').innerHTML='';$('contactOverlay').hidden=true;render();voiceWarning('New customer session started. Previous sessions remain saved locally.')};
$('closeContact').onclick=()=>{$('contactOverlay').hidden=true};
$('expandFace').onclick=()=>{$('faceOverlay').hidden=false;document.body.style.overflow='hidden'};
$('closeFace').onclick=()=>{$('faceOverlay').hidden=true;document.body.style.overflow=''};

window.addEventListener('online',()=>{$('netState').textContent='ONLINE • STILL LOCAL'});
window.addEventListener('offline',()=>{$('netState').textContent='OFFLINE READY'});
$('netState').textContent=navigator.onLine?'ONLINE • STILL LOCAL':'OFFLINE READY';

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
speechSynthesis?.getVoices?.();
load();
