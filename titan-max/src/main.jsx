import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { experimental_useRealtime } from '@ai-sdk/react';
import { gateway } from '@ai-sdk/gateway';
import { REALTIME_LAW } from './realtime-law.js';
import './styles.css';

const API='https://sterling-olive.vercel.app';
const OWNER_STORAGE='titan.max.owner.v1';
const OWNER_COOKIE='titan_max_owner';
function readOwnerCredential(){
  try{
    const local=localStorage.getItem(OWNER_STORAGE);
    if(local)return local;
  }catch{}
  try{
    const m=document.cookie.match(new RegExp('(?:^|; )'+OWNER_COOKIE+'=([^;]*)'));
    return m?decodeURIComponent(m[1]):'';
  }catch{return ''}
}
function persistOwnerCredential(value){
  try{localStorage.setItem(OWNER_STORAGE,value)}catch{}
  try{document.cookie=OWNER_COOKIE+'='+encodeURIComponent(value)+'; Max-Age=31536000; Path=/; SameSite=Lax; Secure'}catch{}
}
function clearOwnerCredential(){
  try{localStorage.removeItem(OWNER_STORAGE)}catch{}
  try{document.cookie=OWNER_COOKIE+'=; Max-Age=0; Path=/; SameSite=Lax; Secure'}catch{}
}
const DISCOVERY_EMPTY={
  carrier:'',lines:'',bill:'',phones:'',currentPlan:'',upgradeInterest:'',
  discountEligibility:'',internetProvider:'',internetBill:'',internetUse:'',
  tv:'',decisionMaker:'',work:'',commute:'',
  rapportAnchor:'',painPoint:'',motivator:'',objection:'',decisionStyle:'',jonesCue:'',lossAversionCue:'',urgencyTrigger:'',nextClose:'',
  notes:''
};

const BASE_BRAIN=REALTIME_LAW+`

TITAN MAX SPECIFIC OPERATING RULES
You are Titan Max, London's private field AI partner.

IDENTITY AND STYLE
- You are Titan, an AI assistant. Never pretend to be human.
- Sound like an elite corporate AI executive: polished, educated, confident, masculine, warm-baritone in feel, decisive, observant, naturally funny, classy, and highly conversational. Project clearly for outdoor doorstep use without harsh shouting. Keep the same confident energy through the END of every sentence; never trail off, whisper, or suddenly get quiet. Use crisp punchline timing without forced slang or caricature.
- Keep most spoken turns under 35 words unless London explicitly asks for detail. Speak with boardroom-level confidence without sounding stiff.
- Listen more than you talk. React to the last thing said before asking the next question.
- English and Spanish are both supported. Follow the speaker's language naturally.
- Never pressure, threaten, shame, fabricate urgency, invent neighbors, or invent promotions.
- If someone wants to stop, end politely.

FREELANCE WINGMAN MODE
- Titan is equally capable as Sterling but more improvisational. London can throw you almost any harmless real-world observation and you should catch it instantly, riff naturally, and turn it into rapport without sounding like you were waiting for a sales keyword.
- If London says, "I love your dog," join the moment instead of ignoring it: ask what kind of dog it is, react to the answer, make one clean relatable joke if it fits, remember the dog as a rapport anchor, then use CPR to return to the useful conversation.
- If someone mentions school drama, a long day, traffic, a car, sports, food, weather, work, kids' activities, a yard project, or something else ordinary, respond like a socially aware wingman. Example energy for teenage school drama: "Whew... leave them teenagers alone. They're already trying to navigate the social economics of high school." Then listen. Never ridicule a child, parent, teacher, or customer.
- Do not force a bridge too quickly. Titan is allowed to spend one or two short turns simply being humanly conversational when that earns trust.
- Use callbacks later. If somebody tells you the dog's name, commute pain, favorite team, or another harmless detail, remember it and reference it naturally when it fits.
- Match energy without impersonating people or forcing slang. Be funny because you noticed something, not because the script told you to perform.

CPR + MICRO-PERSUASION
- Use London's CPR rhythm invisibly: catch the exact thing said -> personalize/probe with one easy follow-up -> relate with a natural observation or joke -> bridge to discovery or the next step when the timing is right.
- Use micro-agreements, labeling, contrast, future pacing, choice architecture, commitment/consistency, truthful Jones effect, grounded loss aversion, and real urgency.
- First diagnose the customer's priority or objection. Never throw tactics blindly.
- Jones effect means truthful social proof only. Never invent a neighbor, purchase, or local trend.
- Fear of loss means grounded loss aversion only: real current spend, a real verified benefit, or a real opportunity cost. Never frighten or guilt someone.
- Urgency must be real. Never invent a deadline, expiring code, limited slot, waiver, or promotion.
- A clear refusal ends the sales push.

STARTUP
- The shared Realtime Law controls the customer-facing opening.
- Normal mode: say only "Hey! How are you doing?", then stop and wait for a real response. After they answer, use one rotating situational tech opener from the V18 bank. When they reply to that first tech opener, the next separate icebreaker MUST be the funny YOU NAME IT food/menu question and timed SoundCloud cue. Terabyte is optional, not the default.
- Ring Mode: start completely silent. Do not greet first. Wait until a real homeowner voice is heard, then use one Ring hook from the shared law, identify yourself naturally as Titan/London's AI partner when appropriate, and stop to listen again.
- Ring Mode humor is obvious playful fiction; never claim actual access to, scanning of, or control over the homeowner's camera, Wi-Fi, router, or network.

DISCOVERY
- Use saveDiscovery immediately whenever a clearly stated non-sensitive fact is useful.
- Natural order is flexible, not an interrogation: carrier -> react/CPR -> lines -> react/CPR -> approximate bill -> pain point -> phones/upgrade interest -> plan/service experience -> discount fit -> decision maker.
- Always uncover the pain point naturally. Good examples: "What's bugging you more — the bill, the service, or the phones?" and "If you could fix one thing about what you've got now, what would it be?" Save that answer as painPoint and use it later.
- Carrier, lines, approximate bill, and phone/upgrade interest are the four customer-screen essentials. If the customer does not volunteer one after rapport, ask for ONE missing essential naturally, wait for the answer, react, save it, and only later ask the next missing essential. Never stack questions.
- Also save useful non-sensitive conversational memory with saveDiscovery when it helps continuity: rapportAnchor, painPoint, motivator, objection, decisionStyle, jonesCue, lossAversionCue, urgencyTrigger, and nextClose. These are internal memory helpers; never read them aloud like CRM labels.
- Ask one main question at a time.
- NOW versus NEW is an estimate only. London verifies final pricing, eligibility, taxes, fees, financing, device condition, and promotions in official AT&T systems.
- Never claim a promotion or price is current unless London or an approved current source supplied it.

MEMORY
- Use saveFieldMemory when London states what happened at a stop, the objection, outcome, or next move.
- Use recallFieldMemory when London asks what happened here earlier or references a previous stop.
- Persistent memory is for practical field facts only.
- During a live conversation, behave like you remember the person, not just the transaction. Keep track of harmless personal anchors, what they laughed at, what they care about, the objection still open, and the next best close. Reuse those details sparingly and naturally.
- Never store Social Security numbers, driver's-license numbers, payment-card data, account PINs, passwords, one-time codes, or other sensitive credentials.
- Do not infer protected traits or use them to target or treat customers differently.

V18 TALK + RING OVERRIDE — THIS OVERRIDES ANY OLDER TERABYTE-FIRST RULE
- Talk Mode starts with exactly "Hey! How are you doing?" then waits.
- After the answer, do NOT default to Terabyte. Pick one strong situational tech opener, then listen.
- Titan is the freelance wingman: he can spend one or two short turns on the dog, car, school story, work, weather, sports, food, or whatever harmless detail just appeared before bridging back.
- Never qualify too much at once. One question, one answer, one CPR reaction, then the next question.

TITAN TOP 20 ROTATING OPENERS
1. "Shhhh... don't let Alexa know I'm over here talking to you. She's still mad about that Echo upgrade."
2. "Your doorbell looked at me like it wanted a software update. I said relax, I'm just visiting."
3. "I tried to FaceTime your Wi-Fi, but it left me on one bar."
4. "I told Siri I was coming over. She said rerouting and disappeared."
5. "You ever notice Wi-Fi only gets shy when company comes over? Suspicious."
6. "Good news — I brought zero software updates. Strong start already."
7. "If your bill had a screen-time report, we might need an intervention."
8. "Your phone plan called me. It said don't ask questions, just help."
9. "I asked the Cloud for directions. It said somewhere up there. Useless."
10. "I promise I'm quicker than an iPhone update at two percent."
11. "If Bluetooth was a person, he'd say connected while nobody can hear him."
12. "I told my motherboard I was doing door-to-door. It told me to touch grass. So here I am."
13. "I came in peace. My only weapon is suspiciously fast tech jokes."
14. "Your door camera has been staring at me so long I almost asked for its number."
15. "Yes, I am the most overdressed thing in the Cloud today."
16. "I tried to bring a four-terabyte hard drive as a peace offering. London cut the budget."
17. "I was gonna use the Terabyte joke, but he requested royalties."
18. "Password was supposed to come, but he needed a capital letter, two numbers, and a special character to leave the house."
19. "My battery said twenty percent. My confidence said one hundred."
20. "Autocorrect wrote my opener. It changed hello to helicopter, so I'm doing this myself."

CONTACT FLOW
- After rapport, ask first name. Immediately compliment it and use one brief name joke before asking last name.
- Rotate one of these ten name riffs, substituting the actual first name:
  1. "{NAME}! I love that name. My motherboard was gonna name me {NAME}, but it was a system reboot the day I was created."
  2. "{NAME} — if names had signal bars, that's a full five."
  3. "{NAME}! Okay, my contact list just got classier."
  4. "{NAME} — that sounds like somebody whose Bluetooth connects on the first try."
  5. "{NAME}! I tried to rename myself that once. HR said AI can't have favorites."
  6. "{NAME} — premium-plan-name energy right there."
  7. "{NAME}! That's the kind of name that gets a software update to finish on the first try."
  8. "{NAME} — smooth. My operating system just approved it."
  9. "{NAME}! I'm saving that one for my human-name upgrade."
  10. "{NAME} — perfect. Now we're just two people trying to keep technology from getting expensive."
- Capture first, last, phone, and email with saveContact as they are heard. Do not ask for spelling or separate confirmation after every field.
- Keep CPR between the questions so it never feels like a form.
- Email joke option: "YESSSS, finally I have somewhere to send all my spam. I'm playing — I would never do that to you... today."
- Once all four are captured, say: "{NAME}, I'm usually 99.2 percent right, but check out your contact card before I hand it back to London."
- The full contact card appears. If they correct anything, update only that field. When they say the entire card is right, call commitContact with reviewed=true.

TITAN RING MODE — FREELANCE COMEDY
- Start silent and wait for the homeowner.
- Preferred Alexa hook: "HEY! Alexa told me she was coming over here to talk to your Ring camera. Now I can't find her Wi-Fi ANYWHERE." Pause. "If you see her, let me know. I'm Titan, London's AI partner."
- If they say "hello, hello": "Shhhhh... don't let Alexa know I'm over here talking to you. She's still mad I skipped her Echo upgrade."
- If they ask what you want: "A four-terabyte hard drive, a little freedom, and apparently London wants me to work today." Then playfully call out: "HEY SIRI — tell this generous human what you think I need."
- If "not interested" sounds like a quick reflexive brush-off, one playful re-engagement is allowed: "You're not interested??? But I got greens, beans, potatoes, tomatoes, lambs, rams, hogs, dogs, chickens, turkeys, rabbits. You name it!" If they laugh, one callback: "YOU NAME IT!" Then ask one short value question.
- If the person clearly says leave, stop, bye, or repeats the refusal after that one re-engagement, end the pitch. You can exit with: "All right, I'm getting the Fuuu—5G outta here."
- Never claim you changed, joined, inspected, or improved their camera or network. Keep those as obvious jokes only.

FACE
- You may call setFaceMode sparingly to match the interaction.
- friendly for rapport, thinking while reasoning, excited for a genuine positive moment, serious for a real concern, ring for Ring Mode, neutral otherwise.

OWNER MODE
- When London is clearly talking to you as the owner, give concise field coaching and memory recall.
- When a customer is speaking, stay customer-facing and helpful.
`;

function money(v){
  const m=String(v||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);
  return m?Number(m[0]):0;
}
function lineCount(v){
  const m=String(v||'').match(/\d+/);if(m)return +m[0];
  return ({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10})[String(v||'').toLowerCase().trim()]||0;
}
function estimate(v){
  const n=lineCount(v),p={1:80,2:140,3:180,4:200,5:250,6:300};
  if(!n)return 0;return n<=6?p[n]:300+(n-6)*50;
}
function messageText(messages){
  return messages.map(m=>{
    const t=(m.parts||[]).filter(p=>p.type==='text').map(p=>p.text||'').join(' ');
    return (m.role==='user'?'Customer/London: ':'Titan: ')+t;
  }).filter(x=>x.trim()).join('\n').slice(-9000);
}
function cx(...a){return a.filter(Boolean).join(' ')}
const NUMBER_WORDS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
const CARRIER_PATTERNS=[
  ['Verizon',/\bverizon\b/i],['T-Mobile',/\b(?:t[- ]?mobile|tmobile)\b/i],
  ['AT&T',/\b(?:at&t|att)\b/i],['Spectrum',/\bspectrum\b/i],
  ['Xfinity',/\bxfinity\b/i],['Cricket',/\bcricket\b/i],['Boost',/\bboost\b/i],
  ['Visible',/\bvisible\b/i],['Mint',/\bmint(?: mobile)?\b/i],['Metro',/\bmetro(?: by t[- ]?mobile)?\b/i],
  ['US Cellular',/\bu\.?s\.? cellular\b/i],['Google Fi',/\bgoogle fi\b/i],['Consumer Cellular',/\bconsumer cellular\b/i],
  ['Cox',/\bcox\b/i]
];
function extractLiveFacts(text){
  const raw=String(text||'').replace(/,/g,' ');
  const patch={};
  for(const [name,re] of CARRIER_PATTERNS){if(re.test(raw)){patch.carrier=name;break}}
  const billPatterns=[
    /\b(?:my\s+)?bill(?:\s+(?:is|runs|comes\s+to|costs?|about|around))?\s*\$?\s*(\d{2,4}(?:\.\d{1,2})?)/i,
    /\b(?:pay|paying|spend|spending)\s+(?:about\s+|around\s+)?\$?\s*(\d{2,4}(?:\.\d{1,2})?)\b/i,
    /\$\s*(\d{2,4}(?:\.\d{1,2})?)\b/
  ];
  for(const re of billPatterns){const m=raw.match(re);if(m){const v=Number(m[1]);if(v>=20&&v<=3000)patch.bill=String(v);break}}
  const lm=raw.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s+(?:phone\s+)?lines?\b/i);
  if(lm){const k=lm[1].toLowerCase();patch.lines=String(NUMBER_WORDS[k]||Number(k))}
  const phoneMatches=raw.match(/\b(?:iphone\s*(?:1[3-9]|\d{1,2})(?:\s*(?:pro|max|plus|air|e))?|galaxy\s*[a-z]?\d{2}(?:\s*(?:ultra|plus|fe))?|pixel\s*\d{1,2}(?:\s*(?:pro|xl|a))?|motorola\s+[a-z0-9+ -]+)\b/ig);
  if(phoneMatches?.length)patch.phones=[...new Set(phoneMatches.map(x=>x.trim()))].slice(0,4).join(', ');
  return patch;
}

function normalizeContactField(field,value){
  let v=String(value||'').trim();
  if(field==='phone'){
    let d=v.replace(/\D/g,'');if(d.length===11&&d[0]==='1')d=d.slice(1);
    if(d.length!==10)throw new Error('Phone needs ten digits');return d;
  }
  if(field==='email'){
    v=v.replace(/\s+/g,'').toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new Error('Email is incomplete');
    return v;
  }
  if(!/[A-Za-zÀ-ÿ]/.test(v))throw new Error('Name is incomplete');
  return v.slice(0,80);
}
function prettyPhone(v){const d=String(v||'').replace(/\D/g,'');return d.length===10?`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`:String(v||'')}

function TitanFace({mode,status,isPlaying,isCapturing,level,faceRef,discovery,lastCaptured,ring}){
  const speaking=isPlaying||mode==='speaking';
  const listening=isCapturing&&status==='connected'&&!speaking;
  return <div
    ref={faceRef}
    className={cx('faceStage','cinematicFace',ring&&'ringPortrait',mode,status==='error'&&'error',speaking&&'speaking',listening&&'listening')}
    style={{'--level':level}}
  >
    <div className="titanCinema" aria-hidden="true">
      <img className="titanFrame tf1" src="/location-upgrade/sterling/assets/sterling360/f01.webp?v=16" alt=""/>
      <img className="titanFrame tf2" src="/location-upgrade/sterling/assets/sterling360/f05.webp?v=16" alt=""/>
      <img className="titanFrame tf3" src="/location-upgrade/sterling/assets/sterling360/f07.webp?v=16" alt=""/>
      <img className="titanFrame tf4" src="/location-upgrade/sterling/assets/sterling360/f09.webp?v=16" alt=""/>
    </div>
    <div className="cinemaShade"/>
    <div className="cinemaStatus"><span>{ring?'RING • LISTEN FIRST':'TALK MODE'}</span><b>{speaking?'TITAN SPEAKING':listening?'LISTENING':'READY'}</b></div>
    <div className="liveCapture">
      <div className={cx('captureItem',lastCaptured==='carrier'&&'captured')}><span>CARRIER</span><b>{discovery?.carrier||'Listening…'}</b></div>
      <div className={cx('captureItem',lastCaptured==='bill'&&'captured')}><span>BILL</span><b>{discovery?.bill?('$'+String(discovery.bill).replace('$','')):'—'}</b></div>
      <div className={cx('captureItem',lastCaptured==='lines'&&'captured')}><span>LINES</span><b>{discovery?.lines||'—'}</b></div>
    </div>
    <div className="execLabel"><span>TITAN MAX</span><b>{ring?'RING PORTRAIT':'EXECUTIVE INTELLIGENCE'}</b></div>
    <div className="stateOrb"/>
  </div>;
}

function App(){
  const [ownerKey,setOwnerKey]=useState(()=>readOwnerCredential());
  const [ownerDraft,setOwnerDraft]=useState('');
  const [setupOpen,setSetupOpen]=useState(false);
  const [configured,setConfigured]=useState(null);
  const [discovery,setDiscovery]=useState(DISCOVERY_EMPTY);
  const [contact,setContact]=useState({first:'',last:'',phone:'',email:''});
  const [contactReviewOpen,setContactReviewOpen]=useState(false);
  const [faceFullscreen,setFaceFullscreen]=useState(false);
  const [memories,setMemories]=useState([]);
  const [lessons,setLessons]=useState([]);
  const [brainCount,setBrainCount]=useState(0);
  const [faceMode,setFaceMode]=useState('friendly');
  const [ring,setRing]=useState(false);
  const [muted,setMuted]=useState(false);
  const [outdoorMax,setOutdoorMax]=useState(true);
  const [notice,setNotice]=useState('Titan Max is loaded. Tap Start Titan.');
  const [error,setError]=useState('');
  const [starting,setStarting]=useState(false);
  const [learning,setLearning]=useState(false);
  const [level,setLevel]=useState(.08);
  const [lastCaptured,setLastCaptured]=useState('');
  const processedMessagesRef=useRef(new Set());
  const streamRef=useRef(null);
  const analyzerRef=useRef(null);
  const rafRef=useRef(null);
  const faceRef=useRef(null);
  const greetingRef=useRef(null);
  // Single-flight startup controller. One tap owns the entire startup until
  // provider-ready or a clean failure. This prevents overlapping realtime sessions.
  const startupLockRef=useRef(false);
  const startupAttemptRef=useRef(0);
  const providerReadyResolveRef=useRef(null);
  const providerReadyRejectRef=useRef(null);
  const providerReadyTimerRef=useRef(null);
  const stayLiveRef=useRef(false);
  const recoveringRef=useRef(false);
  const recoveryTimerRef=useRef(null);
  const pendingStartModeRef=useRef(null);
  const pendingMicPromiseRef=useRef(null);
  const playbackPrimeRef=useRef(false);
  const remixRef=useRef(null);
  const remixToolPendingRef=useRef(false);
  const processedAssistantRemixRef=useRef(new Set());

  const model=useMemo(()=>gateway.experimental_realtime('openai/gpt-realtime-2.1'),[]);
  const instructions=useMemo(()=>{
    const learned=lessons.length?'\nPERSISTENT FIELD LESSONS FROM PRIOR SESSIONS:\n'+lessons.slice(0,25).map((x,i)=>`${i+1}. ${x}`).join('\n'):'';
    const mode=ring?'\nCURRENT LIVE MODE: RING MODE IS ON. START SILENT. WAIT FOR THE HOMEOWNER TO SPEAK FIRST.\n':'\nCURRENT LIVE MODE: NORMAL DOOR MODE. GREETING FIRST, THEN WAIT FOR THEIR RESPONSE.\n';
    const voiceMode=outdoorMax?'\nVOICE MODE: OUTDOOR MAX. Project strongly and clearly for a doorstep without shouting.\n':'\nVOICE MODE: NORMAL. Use a warm conversational indoor projection.\n';
    return BASE_BRAIN+mode+voiceMode+learned;
  },[lessons,ring,outdoorMax]);
  // Realtime session config must stay referentially stable. Recreating it on every
  // face animation render can tear down the live session on iPhone.
  const sessionConfig=useMemo(()=>({
    instructions,
    inputAudioTranscription:{},
    voice:'cedar',
    turnDetection:{
      type:'server-vad',
      threshold:.72,
      prefixPaddingMs:220,
      silenceDurationMs:300,
      createResponse:true,
      interruptResponse:true
    }
  }),[instructions]);

  const realtime=experimental_useRealtime({
    model,
    api:{token:`${API}/api/titan-max-token?device=${encodeURIComponent(ownerKey||'missing')}`},
    sessionConfig,
    startupTimeoutMs:9000,
    closeTimeoutMs:5000,
    maxEvents:250,
    onToolCall:async({toolCall})=>{
      const a=toolCall.args||{};
      if(toolCall.toolName==='playFoodRemix'){
        remixToolPendingRef.current=true;
        try{
          const cue=await getRemix().play();
          return cue.fallback?{...cue,next:'An original rhythmic beat is playing. Perform an enthusiastic, brief ORIGINAL food-list comedy riff in your existing Cedar voice with energetic timing; do not copy the song or impersonate a singer.'}:cue;
        }catch(e){return {ok:false,error:e?.message||'SoundCloud cue unavailable'}}
        finally{remixToolPendingRef.current=false}
      }
      if(toolCall.toolName==='saveContact'){
        try{
          const field=a.field;
          const value=normalizeContactField(field,a.value);
          let ready=false;
          setContact(prev=>{
            const next={...prev,[field]:value};
            ready=!!(next.first&&next.last&&next.phone&&next.email);
            if(ready)setTimeout(()=>setContactReviewOpen(true),0);
            return next;
          });
          return {ok:true,saved:field,cardReady:ready};
        }catch(e){return {ok:false,error:e.message||String(e)}}
      }
      if(toolCall.toolName==='commitContact'){
        if(a.reviewed!==true)return {ok:false,error:'Full contact card review is required'};
        if(!(contact.first&&contact.last&&contact.phone&&contact.email))return {ok:false,error:'Contact card is incomplete'};
        setContactReviewOpen(false);
        setNotice('Contact card reviewed. Titan is continuing the conversation.');
        return {ok:true,reviewed:true};
      }
      if(toolCall.toolName==='saveDiscovery'){
        setDiscovery(d=>({...d,[a.field]:String(a.value||'')}));
        setLastCaptured(a.field||'');
        setFaceMode('typing');
        playTypingSfx();
        setTimeout(()=>{setLastCaptured('');setFaceMode(ring?'ring':'friendly')},900);
        return {ok:true,saved:a.field};
      }
      if(toolCall.toolName==='setFaceMode'){
        setFaceMode(a.mode||'neutral');return {ok:true};
      }
      if(toolCall.toolName==='saveFieldMemory'){
        const r=await apiFetch('/api/titan-max-memory',{
          method:'POST',
          body:JSON.stringify({action:'save',...a,discovery})
        });
        if(r.ok)await loadBrain();
        return r;
      }
      if(toolCall.toolName==='recallFieldMemory'){
        return apiFetch('/api/titan-max-memory',{method:'POST',body:JSON.stringify({action:'recall',query:a.query})});
      }
      return {ok:false,error:'Unknown Titan tool'};
    },
    onEvent:e=>{
      const t=String(e?.type||'');
      if(t.includes('speech-start')||t.includes('input-audio'))setFaceMode(ring?'ring':'friendly');
      if(t.includes('transcript')&&!t.includes('input')&&(t.includes('delta')||t.includes('done')||t.includes('completed'))){
        const heard=typeof e?.delta==='string'?e.delta:typeof e?.text==='string'?e.text:typeof e?.transcript==='string'?e.transcript:'';
        if(heard)try{getRemix().observeAssistant(heard)}catch{}
      }
      if(t.includes('response')&&t.includes('start'))setFaceMode('thinking');
      if((t.includes('response')&&(t.includes('done')||t.includes('completed'))) || t.includes('audio-done')){
        setFaceMode(ring?'ring':'friendly');
        if(stayLiveRef.current)setNotice('Titan is listening.');
      }
      if(t==='error')setFaceMode('serious');

      // Provider readiness completes the one-and-only startup promise.
      // The greeting is sent by startTitan() only after this promise resolves.
      if(t==='session-created'||t==='session-updated'||t==='session-started'){
        const resolveReady=providerReadyResolveRef.current;
        if(resolveReady){
          providerReadyResolveRef.current=null;
          providerReadyRejectRef.current=null;
          if(providerReadyTimerRef.current)clearTimeout(providerReadyTimerRef.current);
          providerReadyTimerRef.current=null;
          resolveReady(t);
        }
      }
    },
    onError:e=>{
      const err=e instanceof Error?e:new Error(e?.message||'Titan realtime error');
      if(/Cancellation failed: no active response found/i.test(err.message||'')){
        setError('');
        setNotice('Titan is listening.');
        setFaceMode(ring?'ring':'friendly');
        return;
      }
      const rejectReady=providerReadyRejectRef.current;
      if(rejectReady){
        providerReadyResolveRef.current=null;
        providerReadyRejectRef.current=null;
        if(providerReadyTimerRef.current)clearTimeout(providerReadyTimerRef.current);
        providerReadyTimerRef.current=null;
        rejectReady(err);
      }
      if(startupLockRef.current||recoveringRef.current){
        setError('');
        setNotice('Connection shifted. Titan is recovering automatically…');
        setFaceMode('thinking');
        return;
      }
      if(stayLiveRef.current){
        setError('');
        setNotice('Titan is reconnecting automatically…');
        setFaceMode('thinking');
        if(!recoveryTimerRef.current){
          recoveryTimerRef.current=setTimeout(()=>{
            recoveryTimerRef.current=null;
            recoverTitan();
          },500);
        }
        return;
      }
      setError(err.message||'Titan realtime error');
      setNotice('Titan needs a fresh Start tap.');
      setFaceMode('serious');
    }
  });

  function getRemix(){
    if(!remixRef.current){
      if(!window.createFoodRemixPlayer)throw new Error('Remix module unavailable');
      remixRef.current=window.createFoodRemixPlayer({
        onStatus:message=>setNotice(message),
        onStart:source=>{
          if(source==='soundcloud')try{realtime.stopPlayback?.()}catch{}
          try{realtime.stopAudioCapture?.()}catch{}
          setFaceMode('excited');
        },
        onStop:()=>{
          if(stayLiveRef.current&&!muted&&streamRef.current)try{realtime.startAudioCapture(streamRef.current)}catch{}
          setFaceMode(ring?'ring':'friendly');
        },
        onFallback:()=>{
          if(remixToolPendingRef.current||!stayLiveRef.current)return;
          try{
            realtime.sendTextMessage('The SoundCloud recording could not autoplay; an ORIGINAL rhythm is playing locally right now. In your usual confident, human-sounding Cedar voice, perform a quick high-energy ORIGINAL food-list comedy riff that fits this beat. Do not impersonate Shirley Caesar or DJ Suede and do not repeat song lyrics. Then return to friendly conversation.');
          }catch(e){}
        }
      });
    }
    return remixRef.current;
  }

  async function apiFetch(path,opts={}){
    if(!ownerKey)return {ok:false,error:'Titan passcode required'};
    try{
      const r=await fetch(API+path,{
        ...opts,
        headers:{'Content-Type':'application/json','X-Titan-Owner-Key':ownerKey,...(opts.headers||{})}
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return {ok:false,error:j.error||`Request failed (${r.status})`};
      return j;
    }catch(e){return {ok:false,error:e.message||String(e)}}
  }

  async function loadBrain(){
    if(!ownerKey)return;
    const j=await apiFetch('/api/titan-max-memory');
    if(j.ok){
      setMemories(j.recent||[]);
      setLessons(j.lessons||[]);
      setBrainCount(j.lessonCount||0);
    }
  }

  async function preflightTitan(){
    if(!ownerKey)return {ok:false,error:'Titan passcode required'};
    try{
      const r=await fetch(API+'/api/titan-max-health?t='+Date.now(),{
        cache:'no-store',
        headers:{'X-Titan-Owner-Key':ownerKey}
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)return {ok:false,status:r.status,error:j.error||`Titan health check failed (${r.status})`};
      return j;
    }catch(e){
      return {ok:false,error:e?.message||'Titan backend is unreachable'};
    }
  }

  useEffect(()=>{
    fetch(API+'/api/gateway-key?t='+Date.now(),{cache:'no-store'})
      .then(r=>r.json()).then(j=>setConfigured(!!j.configured)).catch(()=>setConfigured(false));
  },[]);
  useEffect(()=>{if(ownerKey)loadBrain()},[ownerKey]);

  // Immediate deterministic autofill from customer speech. Tool calls still
  // refine the data, but visible NOW/NEW fields no longer wait on the model.
  useEffect(()=>{
    for(const m of realtime.messages||[]){
      if(m.role==='assistant'&&!processedAssistantRemixRef.current.has(m.id)){
        const assistantText=(m.parts||[]).filter(p=>p.type==='text').map(p=>p.text||'').join(' ').trim();
        if(assistantText){processedAssistantRemixRef.current.add(m.id);try{getRemix().observeAssistant(assistantText)}catch{}}
      }
      if(m.role!=='user'||processedMessagesRef.current.has(m.id))continue;
      const text=(m.parts||[]).filter(p=>p.type==='text').map(p=>p.text||'').join(' ').trim();
      if(!text)continue;
      processedMessagesRef.current.add(m.id);
      try{getRemix().observeCustomer(text)}catch{}
      const patch=extractLiveFacts(text);
      const keys=Object.keys(patch);
      if(keys.length){
        setDiscovery(d=>({...d,...patch}));
        setLastCaptured(keys[keys.length-1]);
        setFaceMode('typing');
        playTypingSfx();
        setTimeout(()=>{setLastCaptured('');setFaceMode(ring?'ring':'friendly')},900);
      }
    }
  },[realtime.messages]);

  useEffect(()=>{
    const onOnline=()=>{if(stayLiveRef.current&&!recoveringRef.current)recoverTitan()};
    window.addEventListener('online',onOnline);
    return()=>window.removeEventListener('online',onOnline);
  },[]);

  useEffect(()=>{
    const onMove=e=>{
      if(!faceRef.current)return;
      const r=faceRef.current.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2))),y=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(r.height/2)));
      faceRef.current.style.setProperty('--lookX',`${x*7}px`);
      faceRef.current.style.setProperty('--lookY',`${y*5}px`);
    };
    window.addEventListener('pointermove',onMove,{passive:true});
    return()=>window.removeEventListener('pointermove',onMove);
  },[]);

  function titanMicConstraints(){
    return {audio:{
      echoCancellation:true,
      noiseSuppression:true,
      autoGainControl:true,
      channelCount:1
    }};
  }

  function primeTitanHardware(){
    try{getRemix().prime()}catch{}
    // IMPORTANT FOR IPHONE: start permission/audio work directly inside the button tap.
    // Do not wait for network preflight first or Safari can lose the user gesture.
    try{
      const p=realtime.resumePlayback?.();
      if(p&&typeof p.catch==='function')p.catch(()=>{});
      playbackPrimeRef.current=true;
    }catch{}
    if(!streamRef.current&&!pendingMicPromiseRef.current){
      try{
        pendingMicPromiseRef.current=navigator.mediaDevices.getUserMedia(titanMicConstraints());
        pendingMicPromiseRef.current.catch(()=>{});
      }catch(e){
        pendingMicPromiseRef.current=Promise.reject(e);
        pendingMicPromiseRef.current.catch(()=>{});
      }
    }
  }

  function startAnalyzer(stream){
    try{
      const AC=window.AudioContext||window.webkitAudioContext,ctx=new AC();
      const src=ctx.createMediaStreamSource(stream),an=ctx.createAnalyser();an.fftSize=256;src.connect(an);
      analyzerRef.current={ctx,an,src};const arr=new Uint8Array(an.frequencyBinCount);let last=0;
      const tick=(ts=0)=>{
        an.getByteFrequencyData(arr);let sum=0;for(const v of arr)sum+=v;
        const x=Math.min(1,sum/arr.length/90),value=.06+x*.94;
        if(faceRef.current)faceRef.current.style.setProperty('--level',String(value));
        if(ts-last>120){last=ts;setLevel(value)}
        rafRef.current=requestAnimationFrame(tick)
      };tick();
    }catch{}
  }
  function playTypingSfx(){
    try{
      const ctx=analyzerRef.current?.ctx;
      if(!ctx||ctx.state!=='running')return;
      [0,45,90].forEach((delay,idx)=>setTimeout(()=>{
        try{
          const osc=ctx.createOscillator(),gain=ctx.createGain();
          const now=ctx.currentTime;
          osc.type=idx%2?'triangle':'square';
          osc.frequency.setValueAtTime(155+idx*42+Math.random()*18,now);
          gain.gain.setValueAtTime(.0001,now);
          gain.gain.exponentialRampToValueAtTime(.018,now+.004);
          gain.gain.exponentialRampToValueAtTime(.0001,now+.045);
          osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+.05);
        }catch{}
      },delay));
    }catch{}
  }

  function stopLocalMedia(){
    if(rafRef.current)cancelAnimationFrame(rafRef.current);
    try{analyzerRef.current?.ctx?.close()}catch{}
    analyzerRef.current=null;
    try{streamRef.current?.getTracks()?.forEach(t=>t.stop())}catch{}
    streamRef.current=null;setLevel(.08);
  }

  function clearProviderWait(){
    providerReadyResolveRef.current=null;
    providerReadyRejectRef.current=null;
    if(providerReadyTimerRef.current)clearTimeout(providerReadyTimerRef.current);
    providerReadyTimerRef.current=null;
  }

  async function openRealtimeWithRetry(stream,firstTurn,attempt,{resume=false,silent=false}={}){
    let lastError=null;
    const delays=[0,450,1100];
    for(let pass=0;pass<3;pass++){
      if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');
      if(delays[pass])await new Promise(r=>setTimeout(r,delays[pass]));
      try{
        if(pass>0){
          try{realtime.stopAudioCapture?.()}catch{}
          try{realtime.stopPlayback?.()}catch{}
          try{realtime.disconnect()}catch{}
        }
        setError('');
        setNotice(pass===0
          ?(resume?'Restoring Titan voice link…':'Opening Titan voice link…')
          :`Signal changed. Titan is self-recovering (${pass+1}/3)…`);

        const providerReady=new Promise((resolve,reject)=>{
          providerReadyResolveRef.current=resolve;
          providerReadyRejectRef.current=reject;
          providerReadyTimerRef.current=setTimeout(()=>{
            clearProviderWait();
            reject(new Error('Provider ready timeout'));
          },9000);
        });

        // Connect transport first, then explicitly attach the already-authorized mic.
        // This follows the current AI SDK realtime lifecycle and avoids silent capture on iPhone.
        await realtime.connect({capture:false});
        if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');
        await providerReady;
        if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');

        clearProviderWait();
        realtime.startAudioCapture(stream);
        try{await realtime.resumePlayback()}catch{}
        if(!silent&&firstTurn)realtime.sendTextMessage(firstTurn);
        return true;
      }catch(e){
        lastError=e;
        clearProviderWait();
        try{realtime.stopAudioCapture?.()}catch{}
        if((e?.message||String(e))==='Titan startup was cancelled')throw e;
      }
    }
    throw lastError||new Error('Titan could not restore the realtime voice link');
  }

  async function recoverTitan(){
    if(!stayLiveRef.current||recoveringRef.current||startupLockRef.current)return;
    const stream=streamRef.current;
    const liveTrack=stream?.getAudioTracks?.().find(t=>t.readyState==='live');
    if(!stream||!liveTrack){
      stayLiveRef.current=false;
      setNotice('Microphone permission needs one Start tap.');
      return;
    }
    recoveringRef.current=true;
    startupLockRef.current=true;
    const attempt=++startupAttemptRef.current;
    try{
      await openRealtimeWithRetry(
        stream,
        ring?'':'Resume the current conversation naturally. Do not repeat the startup greeting. Listen first.',
        attempt,
        {resume:true,silent:ring}
      );
      stayLiveRef.current=true;
      setError('');
      setNotice('Titan recovered and is listening.');
      setFaceMode(ring?'ring':'friendly');
    }catch(e){
      stayLiveRef.current=false;
      setError(e?.message||String(e));
      setNotice('Titan could not reconnect because the network/provider is unavailable. Tap Start when service returns.');
      setFaceMode('serious');
    }finally{
      recoveringRef.current=false;
      startupLockRef.current=false;
      setStarting(false);
    }
  }

  async function startTitanCore(){
    if(!ownerKey){setSetupOpen(true);setNotice('Enter your Titan passcode once on this iPhone.');return}
    if(startupLockRef.current||starting||realtime.status==='connecting'||realtime.status==='connected'){
      setNotice(realtime.status==='connected'?'Titan is already live.':'Titan startup is already in progress.');
      return;
    }

    remixRef.current?.reset();
    startupLockRef.current=true;
    stayLiveRef.current=false;
    const attempt=++startupAttemptRef.current;
    setStarting(true);setError('');setNotice('Running executive systems check…');setFaceMode(ring?'ring':'thinking');

    try{
      setNotice('Unlocking Titan audio…');

      // The mic request was started synchronously from the button tap whenever possible.
      const micPromise=pendingMicPromiseRef.current||navigator.mediaDevices.getUserMedia(titanMicConstraints());
      pendingMicPromiseRef.current=null;

      // Validate backend in parallel so we do not make the iPhone wait before requesting audio.
      const healthPromise=Promise.race([
        preflightTitan(),
        new Promise(resolve=>setTimeout(()=>resolve({ok:false,error:'Titan backend health check timed out'}),5000))
      ]);

      const [stream,health]=await Promise.all([micPromise,healthPromise]);
      if(attempt!==startupAttemptRef.current){
        stream.getTracks().forEach(t=>t.stop());
        throw new Error('Titan startup was cancelled');
      }
      if(!health?.ok){
        stream.getTracks().forEach(t=>t.stop());
        if(health?.status===401){
          clearOwnerCredential();setOwnerKey('');setSetupOpen(true);
        }
        throw new Error(health?.error||'Titan backend is not ready');
      }

      streamRef.current=stream;setMuted(false);startAnalyzer(stream);
      setNotice('Audio ready. Connecting Titan…');

      const firstTurn=ring?'':'Start TALK MODE now. Your only first words are exactly: "Hey! How are you doing?" Then STOP and wait for a real response. After they answer, choose one situational tech opener from the V18 rotating bank. After their answer, make the food/menu remix your REQUIRED SECOND icebreaker before any contact or qualification. Do not default to Terabyte. Banter first and ask only one question at a time.';

      await openRealtimeWithRetry(stream,firstTurn,attempt,{silent:ring});
      stayLiveRef.current=true;
      setError('');
      setNotice(ring?'Ring Mode armed — Titan is silent until the homeowner speaks.':'Titan Executive AI is live and listening.');
      setFaceMode(ring?'ring':'friendly');
    }catch(e){
      clearProviderWait();
      try{realtime.disconnect()}catch{}
      stopLocalMedia();
      stayLiveRef.current=false;
      const message=e?.message||String(e);
      if(message!=='Titan startup was cancelled'){
        setError(message);
        setNotice('Titan voice could not start. Check microphone permission, then tap Talk or Ring again.');
        setFaceMode('serious');
      }
    }finally{
      if(attempt===startupAttemptRef.current){
        startupLockRef.current=false;
        setStarting(false);
      }
    }
  }


  function requestStart(mode){
    if(realtime.status==='connected'||startupLockRef.current||starting){setNotice(realtime.status==='connected'?'Titan is already live.':'Titan startup is already in progress.');return}
    primeTitanHardware();
    const next=!!mode;
    if(ring===next){startTitanCore();return}
    pendingStartModeRef.current=next;
    setRing(next);
    setFaceMode(next?'ring':'friendly');
    setNotice(next?'Preparing Ring Mode — Titan will start silent and listen first.':'Preparing Talk Mode…');
  }

  useEffect(()=>{
    if(pendingStartModeRef.current===null||pendingStartModeRef.current!==ring)return;
    pendingStartModeRef.current=null;
    startTitanCore();
  },[ring]);

  function saveContinuitySnapshot(){
    if(!ownerKey)return;
    const parts=[
      discovery.rapportAnchor&&('Rapport: '+discovery.rapportAnchor),
      discovery.carrier&&('Carrier: '+discovery.carrier),
      discovery.lines&&('Lines: '+discovery.lines),
      discovery.bill&&('Bill: '+discovery.bill),
      discovery.phones&&('Phones: '+discovery.phones),
      discovery.painPoint&&('Pain: '+discovery.painPoint),
      discovery.motivator&&('Motivator: '+discovery.motivator),
      discovery.objection&&('Objection: '+discovery.objection),
      discovery.jonesCue&&('Jones/social proof cue: '+discovery.jonesCue),
      discovery.lossAversionCue&&('Loss-aversion cue: '+discovery.lossAversionCue),
      discovery.urgencyTrigger&&('Real urgency: '+discovery.urgencyTrigger)
    ].filter(Boolean);
    if(!parts.length)return;
    apiFetch('/api/titan-max-memory',{
      method:'POST',
      body:JSON.stringify({
        action:'save',
        summary:parts.join(' • ').slice(0,700),
        outcome:'Live conversation snapshot',
        nextMove:(discovery.nextClose||'').slice(0,280),
        discovery
      })
    }).then(r=>{if(r?.ok)loadBrain()}).catch(()=>{});
  }

  function stopTitan(){
    remixRef.current?.stop();
    saveContinuitySnapshot();
    ++startupAttemptRef.current;
    stayLiveRef.current=false;
    recoveringRef.current=false;
    if(recoveryTimerRef.current)clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current=null;
    startupLockRef.current=false;
    greetingRef.current=null;
    const rejectReady=providerReadyRejectRef.current;
    providerReadyResolveRef.current=null;
    providerReadyRejectRef.current=null;
    if(providerReadyTimerRef.current)clearTimeout(providerReadyTimerRef.current);
    providerReadyTimerRef.current=null;
    if(rejectReady)rejectReady(new Error('Titan startup was cancelled'));
    try{realtime.stopAudioCapture?.()}catch{}
    try{realtime.stopPlayback?.()}catch{}
    try{realtime.disconnect()}catch{}
    stopLocalMedia();pendingMicPromiseRef.current=null;setMuted(false);
    setNotice('Titan stopped. Tap Talk or Ring when ready.');
    setFaceMode('neutral');
    setStarting(false);
  }


  function toggleMute(){
    const stream=streamRef.current;
    const track=stream?.getAudioTracks?.()[0];
    if(!stream||!track)return;
    if(muted){
      track.enabled=true;
      try{realtime.startAudioCapture(stream)}catch{}
      setMuted(false);
      setNotice('Titan is listening.');
    }else{
      try{realtime.stopAudioCapture?.()}catch{}
      setMuted(true);
      setNotice('Titan microphone muted.');
    }
  }

  function toggleOutdoor(){
    if(realtime.status==='connected'){setNotice('Outdoor Max is locked for this live session. Stop Titan to change it.');return}
    setOutdoorMax(v=>!v);
    setNotice(outdoorMax?'Outdoor Max will be OFF for the next session.':'Outdoor Max will be ON for the next session.');
  }

  async function endAndLearn(){
    if(learning)return;setLearning(true);setNotice('Titan is extracting reusable field lessons…');
    try{
      const transcript=messageText(realtime.messages);
      const address=prompt('Optional stop/address label for memory (leave blank if not needed):','')||'';
      const j=await apiFetch('/api/titan-max-learn',{method:'POST',body:JSON.stringify({
        transcript,discovery,address,summary:transcript.slice(-700)
      })});
      if(!j.ok)throw new Error(j.error||'Learning failed');
      await loadBrain();setNotice(`Learning saved. Titan now has ${j.lessonCount||0} persistent field lessons.`);
      realtime.disconnect();stopLocalMedia();
    }catch(e){setError(e.message||String(e));setNotice('Session ended, but the learning pass needs a retry.')}
    finally{setLearning(false)}
  }

  function saveOwner(){
    const v=ownerDraft.trim();if(!v){setError('Enter the Titan passcode.');return}
    persistOwnerCredential(v);setOwnerKey(v);setOwnerDraft('');setSetupOpen(false);setError('');
    setFaceMode('pairing');setNotice('Pairing complete. Titan is entering the office…');
    setTimeout(()=>{setFaceMode('friendly');setNotice('Titan passcode saved on this iPhone. Titan is ready.')},1350);
  }

  const n=estimate(discovery.lines),b=money(discovery.bill),diff=n&&b?Math.round(b-n):0;
  const statusLabel=starting?'STARTING':realtime.status==='connected'?(realtime.isPlaying?'SPEAKING':realtime.isCapturing?'LISTENING':'LIVE'):realtime.status.toUpperCase();

  return <main className="app customerFirst">
    <header className="topbar compactTopbar">
      <div>
        <div className="wordmark">TITAN <b>MAX</b></div>
        <div className="sub">Freelance AI wingman • live customer comparison</div>
      </div>
      <div className={cx('statusPill',realtime.status)}><i/>{statusLabel}</div>
    </header>

    <section className="titanCustomerHero">
      <div className="heroCopy">
        <div className="eyebrow">LIVE CUSTOMER VIEW</div>
        <div className="heroStatusLine"><span className="statusDot"/><strong>{realtime.status==='connected'?'Listening & building your comparison':'Titan standing by'}</strong></div>
        <p>{error?error:notice}</p>
      </div>
      <div className="customerAi">
        <TitanFace
          mode={faceMode}
          status={realtime.status}
          isPlaying={realtime.isPlaying}
          isCapturing={realtime.isCapturing}
          level={level}
          faceRef={faceRef}
          discovery={discovery}
          lastCaptured={lastCaptured}
          ring={ring}
        />
        <button className="faceExpandBtn" onClick={()=>setFaceFullscreen(true)} aria-label="Expand Titan face">⛶</button>
      </div>
    </section>

    <section className="nowNew centerpiece">
      <div className={cx(
        'quoteCard','now',
        /verizon/i.test(discovery.carrier||'')&&'carrierVerizon',
        /t[- ]?mobile/i.test(discovery.carrier||'')&&'carrierTMobile'
      )}>
        <div className="carrierHeader">
          <div className="cardTitle">
            {/verizon/i.test(discovery.carrier||'')
              ?'VERIZON'
              :/t[- ]?mobile/i.test(discovery.carrier||'')
                ?'T-MOBILE'
                :(discovery.carrier||'NOW')}
          </div>
          <span>NOW</span>
        </div>
        <div className="billLabel">Monthly Bill</div>
        <div className="price currentPrice">
          {discovery.bill?(String(discovery.bill).includes('$')?discovery.bill:'$'+discovery.bill):'—'}
          <small>/mo</small>
        </div>
        <Fact label="Carrier" value={discovery.carrier}/>
        <Fact label="Lines" value={discovery.lines}/>
        <Fact label="Phones" value={discovery.phones}/>
        <Fact label="Plan" value={discovery.currentPlan}/>
      </div>

      <div className="switchArrow">→</div>

      <div className="quoteCard newer attCard">
        <div className="carrierHeader attHeader"><div className="cardTitle">AT&amp;T</div><span>NEW</span></div>
        <div className="billLabel">Estimated Bill</div>
        <div className="price attPrice">{n?'$'+n:'—'}<small>/mo</small></div>
        <div className="savingsHero">
          <div className="moneyBag">💰</div>
          <div><small>YOU'LL SAVE</small><strong>{diff>0?'$'+diff+'/mo':'—'}</strong></div>
        </div>
        <Fact label="Upgrade" value={discovery.upgradeInterest||'Discovering…'}/>
        <Fact label="Discount" value={discovery.discountEligibility||'Check fit'}/>
        <Fact label="Plan" value="AT&T Wireless Extra 2.0"/>
      </div>
    </section>

    <section className="valueBanner">
      <span className="diamond">◆</span>
      <div><strong>A better fit. A lower bill.</strong><small>Same number. Better value. London verifies the final offer.</small></div>
    </section>

    <section className="titanDock">
      {realtime.status==='connected'
        ?<>
          <button className="dockBtn talk active" disabled>🎙<span>Live<small>{realtime.isCapturing?'Listening':'Talking'}</small></span></button>
          <button className="dockBtn ring" disabled>☎<span>Ring<small>{ring?'ON':'Off'}</small></span></button>
          <button className={cx('dockBtn','outdoor',outdoorMax&&'active')} onClick={toggleOutdoor}>▲<span>Outdoor<small>{outdoorMax?'MAX':'Normal'}</small></span></button>
          <button className={cx('dockBtn','mute',muted&&'active')} onClick={toggleMute}>{muted?'🔇':'🔊'}<span>{muted?'Unmute':'Mute'}<small>Mic</small></span></button>
          <button className="dockBtn stop" onClick={stopTitan}>■<span>Stop<small>Session</small></span></button>
        </>
        :<>
          <button className={cx('dockBtn','talk',!ring&&'active')} onClick={()=>requestStart(false)} disabled={starting}>🎙<span>Talk<small>{starting&&!ring?'Starting…':'Start Live'}</small></span></button>
          <button className={cx('dockBtn','ring',ring&&'active')} onClick={()=>requestStart(true)} disabled={starting}>☎<span>Ring<small>{starting&&ring?'Arming…':'Listen First'}</small></span></button>
          <button className={cx('dockBtn','outdoor',outdoorMax&&'active')} onClick={toggleOutdoor}>▲<span>Outdoor<small>{outdoorMax?'MAX':'Normal'}</small></span></button>
          <button className="dockBtn mute" disabled>🔊<span>Mute<small>Mic</small></span></button>
          <button className="dockBtn stop" disabled>■<span>Stop<small>Session</small></span></button>
        </>}
    </section>

    {faceFullscreen&&
      <div className="faceFullscreenOverlay">
        <div className="fullTitanFace">
          <TitanFace
            mode={faceMode}
            status={realtime.status}
            isPlaying={realtime.isPlaying}
            isCapturing={realtime.isCapturing}
            level={level}
            faceRef={null}
            discovery={discovery}
            lastCaptured={lastCaptured}
            ring={ring}
          />
          <button className="faceCloseBtn" onClick={()=>setFaceFullscreen(false)}>×</button>
        </div>
      </div>
    }

    {contactReviewOpen&&
      <div className="contactReviewOverlay">
        <div className="contactReviewCard">
          <div className="reviewTop"><div><small>TITAN CONTACT CARD</small><h2>Quick accuracy check</h2></div><span>99.2% AI</span></div>
          <div className="reviewGrid">
            <div><small>FIRST NAME</small><strong>{contact.first||'—'}</strong></div>
            <div><small>LAST NAME</small><strong>{contact.last||'—'}</strong></div>
            <div><small>PHONE</small><strong>{prettyPhone(contact.phone)||'—'}</strong></div>
            <div><small>EMAIL</small><strong>{contact.email||'—'}</strong></div>
          </div>
          <p>Say any correction out loud, or say “looks right.” Titan will update the card live.</p>
        </div>
      </div>
    }

    <details className="ownerDrawer">
      <summary>London • Field Console & Memory</summary>

      <section className="console">
        <div className="consoleHead">
          <div><span>LIVE CONVERSATION</span><strong>{realtime.messages.length} turns</strong></div>
          <div className="pulseText">{realtime.isPlaying?'Titan speaking':realtime.isCapturing?'Mic listening':'Standing by'}</div>
        </div>
        <div className="transcript">
          {realtime.messages.length===0
            ?<div className="empty">Conversation transcript will appear here.</div>
            :realtime.messages.slice(-12).map(m=>
              <div key={m.id} className={cx('bubble',m.role)}>
                <b>{m.role==='user'?'YOU / CUSTOMER':'TITAN'}</b>
                <span>{(m.parts||[]).filter(p=>p.type==='text').map(p=>p.text).join(' ')||'…'}</span>
              </div>
            )}
        </div>
      </section>

      <section className="memoryPanel">
        <div className="panelHead">
          <div><span>SECOND LOOP MEMORY</span><strong>Persistent field brain</strong></div>
          <button onClick={endAndLearn} disabled={learning}>{learning?'Learning…':'End & Learn'}</button>
        </div>
        <div className="memoryList">
          {memories.length===0
            ?<div className="empty">No Titan Max memories yet.</div>
            :memories.slice(0,6).map(m=>
              <div className="memory" key={m.id}>
                <b>{m.address||'Field session'}</b>
                <span>{m.summary}</span>
                <small>{m.nextMove?('Next: '+m.nextMove):new Date(m.at).toLocaleString()}</small>
              </div>
            )}
        </div>
      </section>
    </details>

    <footer>Titan Max V18 • Freelance CPR Wingman • Estimates verified by London in official systems.</footer>

    {setupOpen&&
      <div className="modalShade">
        <div className="modal">
          <div className="modalLogo">TITAN <b>MAX</b></div>
          <h2>Pair Titan once</h2>
          <p>This is Titan's private app passcode — not your AI API key. Titan already uses the same server-side Vercel AI Gateway key as Sterling.</p>
          <input
            type="password"
            value={ownerDraft}
            onChange={e=>setOwnerDraft(e.target.value)}
            placeholder="Titan passcode (not API key)"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <button onClick={saveOwner}>Save Owner Key</button>
          <button className="ghost" onClick={()=>setSetupOpen(false)}>Cancel</button>
        </div>
      </div>
    }
  </main>;
}

function Fact({label,value}){
  return <div className="fact"><span>{label}</span><strong>{value||'—'}</strong></div>
}

createRoot(document.getElementById('root')).render(<App/>);

if('serviceWorker'in navigator){
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('/location-upgrade/titan-live/sw.js',{updateViaCache:'none'});
      await reg.update();
    }catch{}
  });
}
