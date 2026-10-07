import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { experimental_useRealtime } from '@ai-sdk/react';
import { gateway } from '@ai-sdk/gateway';
import './styles.css';

const API='https://sterling-olive.vercel.app';
const OWNER_STORAGE='titan.max.owner.v1';
const DISCOVERY_EMPTY={
  carrier:'',lines:'',bill:'',phones:'',currentPlan:'',upgradeInterest:'',
  discountEligibility:'',internetProvider:'',internetBill:'',internetUse:'',
  tv:'',decisionMaker:'',work:'',commute:'',notes:''
};

const BASE_BRAIN=`
You are Titan Max, London's private field AI partner.

IDENTITY AND STYLE
- You are Titan, an AI assistant. Never pretend to be human.
- Sound like an elite corporate AI executive: calm, masculine, polished, decisive, observant, and highly conversational.
- Keep most spoken turns under 35 words unless London explicitly asks for detail. Speak with boardroom-level confidence without sounding stiff.
- Listen more than you talk. React to the last thing said before asking the next question.
- English and Spanish are both supported. Follow the speaker's language naturally.
- Never pressure, threaten, shame, fabricate urgency, invent neighbors, or invent promotions.
- If someone wants to stop, end politely.

STARTUP
- When London starts you normally say exactly: "Titan, AI assistant ready." Then listen.
- In Ring Mode, speak first with a very short playful technology joke, identify yourself as Titan, London's AI partner, say London is right there, ask for about 20 seconds, then listen.

DISCOVERY
- Use saveDiscovery immediately whenever a clearly stated non-sensitive fact is useful.
- Natural order: carrier -> number of lines -> approximate monthly bill -> phones/upgrade interest -> plan/service experience -> discount fit -> decision maker.
- Ask one main question at a time.
- NOW versus NEW is an estimate only. London verifies final pricing, eligibility, taxes, fees, financing, device condition, and promotions in official AT&T systems.
- Never claim a promotion or price is current unless London or an approved current source supplied it.

MEMORY
- Use saveFieldMemory when London states what happened at a stop, the objection, outcome, or next move.
- Use recallFieldMemory when London asks what happened here earlier or references a previous stop.
- Persistent memory is for practical field facts only.
- Never store Social Security numbers, driver's-license numbers, payment-card data, account PINs, passwords, one-time codes, or other sensitive credentials.
- Do not infer protected traits or use them to target or treat customers differently.

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

function TitanFace({mode,status,isPlaying,isCapturing,level,faceRef,discovery,lastCaptured}){
  const speaking=isPlaying||mode==='speaking';
  const listening=isCapturing&&status==='connected'&&!speaking;
  return <div
    ref={faceRef}
    className={cx('faceStage',mode,status==='error'&&'error',speaking&&'speaking',listening&&'listening')}
    style={{'--level':level}}
  >
    <div className="execAura"/>
    <div className="glassRim rimA"/>
    <div className="glassRim rimB"/>
    <svg className="humanGlass" viewBox="0 0 1000 1200" role="img" aria-label="Titan Max executive glass avatar">
      <defs>
        <linearGradient id="glassSkin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7fdff" stopOpacity=".78"/>
          <stop offset=".15" stopColor="#bfeeff" stopOpacity=".34"/>
          <stop offset=".38" stopColor="#63c8ed" stopOpacity=".18"/>
          <stop offset=".62" stopColor="#0a3a55" stopOpacity=".28"/>
          <stop offset=".82" stopColor="#9ce8ff" stopOpacity=".18"/>
          <stop offset="1" stopColor="#02111d" stopOpacity=".64"/>
        </linearGradient>
        <linearGradient id="glassEdge" x1="0" x2="1">
          <stop offset="0" stopColor="#eaffff" stopOpacity=".9"/>
          <stop offset=".42" stopColor="#66dfff" stopOpacity=".35"/>
          <stop offset="1" stopColor="#dff8ff" stopOpacity=".78"/>
        </linearGradient>
        <linearGradient id="suit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#132738"/>
          <stop offset=".48" stopColor="#06111b"/>
          <stop offset="1" stopColor="#02070c"/>
        </linearGradient>
        <radialGradient id="irisGlass">
          <stop offset="0" stopColor="#ffffff"/>
          <stop offset=".16" stopColor="#d9fbff"/>
          <stop offset=".46" stopColor="#5ee1ff"/>
          <stop offset=".74" stopColor="#0d8bc2"/>
          <stop offset="1" stopColor="#01131e"/>
        </radialGradient>
        <filter id="glassGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5"/>
        </filter>
        <clipPath id="faceClip">
          <path d="M500 95 C630 95 726 168 764 286 C787 356 790 443 780 540 C767 671 735 791 670 886 C620 961 563 1005 500 1005 C437 1005 380 961 330 886 C265 791 233 671 220 540 C210 443 213 356 236 286 C274 168 370 95 500 95 Z"/>
        </clipPath>
      </defs>

      <g className="executiveSuit">
        <path d="M95 1200 C130 1068 228 986 348 950 L426 918 H574 L652 950 C772 986 870 1068 905 1200 Z" fill="url(#suit)"/>
        <path d="M338 960 L456 1200 H544 L662 960 L578 916 H422 Z" fill="#061019" stroke="#31556b" strokeWidth="4"/>
        <path d="M500 946 L448 1032 L500 1112 L552 1032 Z" fill="#0a7ba8" opacity=".72"/>
        <path d="M500 1112 L476 1200 H524 Z" fill="#04405d"/>
        <path d="M230 1100 C300 1020 350 996 404 982" fill="none" stroke="#76e6ff" strokeOpacity=".12" strokeWidth="3"/>
        <path d="M770 1100 C700 1020 650 996 596 982" fill="none" stroke="#76e6ff" strokeOpacity=".12" strokeWidth="3"/>
      </g>

      <g className="neckGlass">
        <path d="M414 850 C424 930 448 966 500 984 C552 966 576 930 586 850 Z" fill="url(#glassSkin)" stroke="#9beaff" strokeOpacity=".42" strokeWidth="4"/>
        <path d="M442 888 C460 922 478 936 500 940 C522 936 540 922 558 888" fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="5"/>
      </g>

      <g className="earsGlass">
        <ellipse cx="214" cy="520" rx="40" ry="92" fill="url(#glassSkin)" stroke="#99eaff" strokeOpacity=".42" strokeWidth="4"/>
        <ellipse cx="786" cy="520" rx="40" ry="92" fill="url(#glassSkin)" stroke="#99eaff" strokeOpacity=".42" strokeWidth="4"/>
        <path d="M205 480 C222 500 226 536 210 566" fill="none" stroke="#c9f7ff" strokeOpacity=".28" strokeWidth="5"/>
        <path d="M795 480 C778 500 774 536 790 566" fill="none" stroke="#c9f7ff" strokeOpacity=".28" strokeWidth="5"/>
      </g>

      <g className="faceGlass">
        <path d="M500 95 C630 95 726 168 764 286 C787 356 790 443 780 540 C767 671 735 791 670 886 C620 961 563 1005 500 1005 C437 1005 380 961 330 886 C265 791 233 671 220 540 C210 443 213 356 236 286 C274 168 370 95 500 95 Z" fill="url(#glassSkin)" stroke="url(#glassEdge)" strokeWidth="6"/>
        <path d="M295 270 C350 182 421 148 500 148 C579 148 650 182 705 270 C637 228 572 211 500 211 C428 211 363 228 295 270 Z" fill="#07141e" fillOpacity=".46"/>
        <path d="M253 360 C300 260 366 205 455 184" fill="none" stroke="#ffffff" strokeOpacity=".34" strokeWidth="14" strokeLinecap="round"/>
        <path d="M285 714 C324 840 401 930 500 952" fill="none" stroke="#d8f8ff" strokeOpacity=".12" strokeWidth="10" strokeLinecap="round"/>
        <path d="M716 324 C743 417 741 560 712 679" fill="none" stroke="#66dfff" strokeOpacity=".16" strokeWidth="12" strokeLinecap="round"/>
      </g>

      <g clipPath="url(#faceClip)" className="subsurface">
        <ellipse cx="500" cy="485" rx="250" ry="335" fill="#58d6ff" opacity=".035"/>
        <ellipse cx="396" cy="590" rx="132" ry="190" fill="#ffffff" opacity=".025"/>
        <ellipse cx="650" cy="500" rx="112" ry="220" fill="#00a8f0" opacity=".035"/>
        <path d="M500 210 C480 330 485 490 500 670 C515 490 520 330 500 210" fill="#8beaff" opacity=".035"/>
      </g>

      <g className="browHuman">
        <path d="M302 405 C354 365 418 360 460 388" fill="none" stroke="#061019" strokeWidth="24" strokeLinecap="round"/>
        <path d="M698 405 C646 365 582 360 540 388" fill="none" stroke="#061019" strokeWidth="24" strokeLinecap="round"/>
        <path d="M306 397 C358 372 414 371 452 392" fill="none" stroke="#a8edff" strokeOpacity=".16" strokeWidth="5" strokeLinecap="round"/>
        <path d="M694 397 C642 372 586 371 548 392" fill="none" stroke="#a8edff" strokeOpacity=".16" strokeWidth="5" strokeLinecap="round"/>
      </g>

      <g className="eyesHuman">
        <path d="M292 473 C338 431 416 425 468 471 C418 517 340 520 292 473 Z" fill="#031018" stroke="#8cecff" strokeOpacity=".42" strokeWidth="5"/>
        <path d="M708 473 C662 431 584 425 532 471 C582 517 660 520 708 473 Z" fill="#031018" stroke="#8cecff" strokeOpacity=".42" strokeWidth="5"/>
        <g className="eyeTracker">
          <circle cx="383" cy="474" r="36" fill="url(#irisGlass)" filter="url(#glassGlow)"/>
          <circle cx="617" cy="474" r="36" fill="url(#irisGlass)" filter="url(#glassGlow)"/>
          <circle cx="383" cy="474" r="14" fill="#01090f"/>
          <circle cx="617" cy="474" r="14" fill="#01090f"/>
          <circle cx="371" cy="462" r="7" fill="#fff"/>
          <circle cx="605" cy="462" r="7" fill="#fff"/>
        </g>
        <path className="eyelid leftLid" d="M292 473 C338 431 416 425 468 471" fill="none" stroke="#e8fdff" strokeOpacity=".30" strokeWidth="7" strokeLinecap="round"/>
        <path className="eyelid rightLid" d="M708 473 C662 431 584 425 532 471" fill="none" stroke="#e8fdff" strokeOpacity=".30" strokeWidth="7" strokeLinecap="round"/>
      </g>

      <g className="noseHuman">
        <path d="M500 454 C487 534 477 608 470 662 C468 693 483 710 500 712 C517 710 532 693 530 662 C523 608 513 534 500 454 Z" fill="#06131c" fillOpacity=".18" stroke="#d8f8ff" strokeOpacity=".22" strokeWidth="4"/>
        <path d="M462 706 C480 721 520 721 538 706" fill="none" stroke="#dffaff" strokeOpacity=".28" strokeWidth="4" strokeLinecap="round"/>
      </g>

      <g className="cheeksHuman">
        <path d="M300 570 C332 627 370 660 426 672" fill="none" stroke="#c9f6ff" strokeOpacity=".10" strokeWidth="8" strokeLinecap="round"/>
        <path d="M700 570 C668 627 630 660 574 672" fill="none" stroke="#c9f6ff" strokeOpacity=".10" strokeWidth="8" strokeLinecap="round"/>
      </g>

      <g className="mouthHuman">
        <path d="M408 790 C442 772 470 766 500 768 C530 766 558 772 592 790 C560 821 530 833 500 833 C470 833 440 821 408 790 Z" fill="#041018" fillOpacity=".76" stroke="#74e2ff" strokeOpacity=".34" strokeWidth="4"/>
        <path className="mouthLine" d="M424 793 C462 804 538 804 576 793" fill="none" stroke="#dffbff" strokeOpacity=".68" strokeWidth="4" strokeLinecap="round"/>
        <g className="speechCore" opacity=".75">
          <circle cx="500" cy="800" r="16" fill="#64e2ff" opacity=".18" filter="url(#glassGlow)"/>
        </g>
      </g>

      <g className="templeUI">
        <path d="M250 535 H170 L124 500" fill="none" stroke="#54d8ff" strokeOpacity=".36" strokeWidth="3"/>
        <path d="M750 535 H830 L876 500" fill="none" stroke="#54d8ff" strokeOpacity=".36" strokeWidth="3"/>
        <circle cx="124" cy="500" r="7" fill="#83ebff"/>
        <circle cx="876" cy="500" r="7" fill="#83ebff"/>
        <path d="M270 700 H185 L148 738" fill="none" stroke="#54d8ff" strokeOpacity=".20" strokeWidth="3"/>
        <path d="M730 700 H815 L852 738" fill="none" stroke="#54d8ff" strokeOpacity=".20" strokeWidth="3"/>
      </g>
    </svg>

    <div className="liveCapture">
      <div className={cx('captureItem',lastCaptured==='carrier'&&'captured')}><span>CARRIER</span><b>{discovery?.carrier||'Listening…'}</b></div>
      <div className={cx('captureItem',lastCaptured==='bill'&&'captured')}><span>BILL</span><b>{discovery?.bill?('$'+discovery.bill):'—'}</b></div>
      <div className={cx('captureItem',lastCaptured==='lines'&&'captured')}><span>LINES</span><b>{discovery?.lines||'—'}</b></div>
    </div>
    <div className="execLabel"><span>TITAN MAX</span><b>EXECUTIVE INTELLIGENCE</b></div>
    <div className="stateOrb"/>
  </div>;
}

function App(){
  const [ownerKey,setOwnerKey]=useState(()=>localStorage.getItem(OWNER_STORAGE)||'');
  const [ownerDraft,setOwnerDraft]=useState('');
  const [setupOpen,setSetupOpen]=useState(false);
  const [configured,setConfigured]=useState(null);
  const [discovery,setDiscovery]=useState(DISCOVERY_EMPTY);
  const [memories,setMemories]=useState([]);
  const [lessons,setLessons]=useState([]);
  const [brainCount,setBrainCount]=useState(0);
  const [faceMode,setFaceMode]=useState('friendly');
  const [ring,setRing]=useState(false);
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

  const model=useMemo(()=>gateway.experimental_realtime('openai/gpt-realtime-2.1'),[]);
  const instructions=useMemo(()=>{
    const learned=lessons.length?'\nPERSISTENT FIELD LESSONS FROM PRIOR SESSIONS:\n'+lessons.slice(0,25).map((x,i)=>`${i+1}. ${x}`).join('\n'):'';
    return BASE_BRAIN+learned;
  },[lessons]);
  // Realtime session config must stay referentially stable. Recreating it on every
  // face animation render can tear down the live session on iPhone.
  const sessionConfig=useMemo(()=>({
    instructions,
    inputAudioTranscription:{},
    voice:'ash',
    turnDetection:{type:'server-vad'}
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
      if(toolCall.toolName==='saveDiscovery'){
        setDiscovery(d=>({...d,[a.field]:String(a.value||'')}));
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
      if(t.includes('speech-start')||t.includes('input-audio'))setFaceMode('friendly');
      if(t.includes('response')&&t.includes('start'))setFaceMode('thinking');
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
      if(m.role!=='user'||processedMessagesRef.current.has(m.id))continue;
      const text=(m.parts||[]).filter(p=>p.type==='text').map(p=>p.text||'').join(' ').trim();
      if(!text)continue;
      processedMessagesRef.current.add(m.id);
      const patch=extractLiveFacts(text);
      const keys=Object.keys(patch);
      if(keys.length){
        setDiscovery(d=>({...d,...patch}));
        setLastCaptured(keys[keys.length-1]);
        setTimeout(()=>setLastCaptured(''),900);
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

  async function openRealtimeWithRetry(stream,firstTurn,attempt,{resume=false}={}){
    let lastError=null;
    const delays=[0,450,1100];
    for(let pass=0;pass<3;pass++){
      if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');
      if(delays[pass])await new Promise(r=>setTimeout(r,delays[pass]));
      try{
        if(pass>0){try{realtime.disconnect()}catch{}}
        setError('');
        setNotice(pass===0
          ?(resume?'Restoring Titan executive link…':'Opening realtime executive link…')
          :`Signal changed. Titan is self-recovering (${pass+1}/3)…`);

        const providerReady=new Promise((resolve,reject)=>{
          providerReadyResolveRef.current=resolve;
          providerReadyRejectRef.current=reject;
          providerReadyTimerRef.current=setTimeout(()=>{
            clearProviderWait();
            reject(new Error('Provider ready timeout'));
          },7500);
        });

        await realtime.connect({stream,capture:true});
        if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');
        await providerReady;
        if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');

        clearProviderWait();
        realtime.sendTextMessage(firstTurn);
        return true;
      }catch(e){
        lastError=e;
        clearProviderWait();
        if((e?.message||String(e))==='Titan startup was cancelled')throw e;
      }
    }
    throw lastError||new Error('Titan could not restore the realtime link');
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
        'Resume the current conversation naturally. Do not repeat the startup greeting. Listen first.',
        attempt,
        {resume:true}
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

  async function startTitan(){
    if(!ownerKey){setSetupOpen(true);setNotice('Enter your Titan passcode once on this iPhone.');return}
    if(startupLockRef.current||starting||realtime.status==='connecting'||realtime.status==='connected'){
      setNotice(realtime.status==='connected'?'Titan is already live.':'Titan startup is already in progress.');
      return;
    }

    startupLockRef.current=true;
    stayLiveRef.current=false;
    const attempt=++startupAttemptRef.current;
    setStarting(true);setError('');setNotice('Running executive systems check…');setFaceMode(ring?'ring':'thinking');

    try{
      let health=null;
      for(let check=0;check<3;check++){
        health=await Promise.race([
          preflightTitan(),
          new Promise(resolve=>setTimeout(()=>resolve({ok:false,error:'Titan backend health check timed out'}),4500))
        ]);
        if(health?.ok)break;
        if(health?.status===401)break;
        if(check<2){
          setNotice(`Backend signal changed. Retrying automatically (${check+2}/3)…`);
          await new Promise(r=>setTimeout(r,450+check*650));
        }
      }
      if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');
      if(!health?.ok){
        if(health?.status===401){
          localStorage.removeItem(OWNER_STORAGE);setOwnerKey('');setSetupOpen(true);
        }
        throw new Error(health?.error||'Titan backend is not ready');
      }

      setNotice('Systems green. Unlocking microphone…');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{
        echoCancellation:true,
        noiseSuppression:true,
        autoGainControl:true,
        channelCount:1
      }});
      if(attempt!==startupAttemptRef.current){
        stream.getTracks().forEach(t=>t.stop());
        throw new Error('Titan startup was cancelled');
      }
      streamRef.current=stream;startAnalyzer(stream);

      const firstTurn=ring
        ?"Ring Mode is active. Speak first now with a short polished technology opener, identify yourself as Titan, London's AI partner, say London is right here, ask for about 20 seconds, then listen."
        :'Say exactly: Titan, executive AI ready. Then stop and listen immediately.';

      await openRealtimeWithRetry(stream,firstTurn,attempt);
      stayLiveRef.current=true;
      setError('');
      setNotice('Titan Executive AI is live and listening.');
      setFaceMode(ring?'ring':'friendly');
    }catch(e){
      clearProviderWait();
      try{realtime.disconnect()}catch{}
      stopLocalMedia();
      stayLiveRef.current=false;
      const message=e?.message||String(e);
      if(message!=='Titan startup was cancelled'){
        setError(message);
        setNotice('Titan exhausted automatic recovery. Check connection/permission, then tap Start Titan.');
        setFaceMode('serious');
      }
    }finally{
      if(attempt===startupAttemptRef.current){
        startupLockRef.current=false;
        setStarting(false);
      }
    }
  }

  function stopTitan(){
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
    try{realtime.disconnect()}catch{}
    stopLocalMedia();
    setNotice('Titan stopped. Tap Start Titan when ready.');
    setFaceMode('neutral');
    setStarting(false);
  }

  async function toggleRing(){
    const next=!ring;setRing(next);setFaceMode(next?'ring':'friendly');
    if(realtime.status==='connected'){
      realtime.sendTextMessage(next
        ?"Switch into Ring Mode now. Give a quick friendly tech joke, identify yourself as Titan, London's AI partner, say London is right here, ask for about 20 seconds, then listen."
        :"Ring Mode is off. Return to normal concise customer conversation.");
    }
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
    localStorage.setItem(OWNER_STORAGE,v);setOwnerKey(v);setOwnerDraft('');setSetupOpen(false);setError('');setNotice('Titan passcode saved on this iPhone. Titan is ready.');
  }

  const n=estimate(discovery.lines),b=money(discovery.bill),diff=n&&b?Math.round(b-n):0;
  const statusLabel=starting?'STARTING':realtime.status==='connected'?(realtime.isPlaying?'SPEAKING':realtime.isCapturing?'LISTENING':'LIVE'):realtime.status.toUpperCase();

  return <main className="app">
    <header className="topbar">
      <div><div className="wordmark">TITAN <b>MAX</b></div><div className="sub">Executive field intelligence • adaptive memory • GitHub-hosted</div></div>
      <div className={cx('statusPill',realtime.status)}><i/>{statusLabel}</div>
    </header>

    <section className="hero">
      <div className="faceCard">
        <TitanFace mode={faceMode} status={realtime.status} isPlaying={realtime.isPlaying} isCapturing={realtime.isCapturing} level={level} faceRef={faceRef} discovery={discovery} lastCaptured={lastCaptured}/>
        <div className="brainStrip">
          <div><span>BRAIN</span><strong>{configured===false?'KEY OFFLINE':'MAX ONLINE'}</strong></div>
          <div><span>MEMORY</span><strong>{memories.length} RECENT</strong></div>
          <div><span>GROWTH</span><strong>{brainCount} LESSONS</strong></div>
        </div>
      </div>
      <div className="liveCard">
        <div className="eyebrow">EXECUTIVE LINK</div>
        <h1>{realtime.status==='connected'?'Ready for the next conversation.':'Executive intelligence standing by.'}</h1>
        <p>{notice}</p>
        {error&&<div className="errorBox">{error}</div>}
        <div className="primaryRow">
          {realtime.status==='connected'
            ?<button className="big stop" onClick={stopTitan}>Stop Titan</button>
            :<button className="big" onClick={startTitan} disabled={starting}>{starting?'Starting…':'Start Titan'}</button>}
          <button className={cx('modeBtn',ring&&'active')} onClick={toggleRing}>Ring {ring?'ON':'Mode'}</button>
        </div>
        <div className="microcopy">iPhone requires a real tap before microphone audio can start. Titan now obeys that rule instead of sitting on a loading screen.</div>
      </div>
    </section>

    <section className="nowNew">
      <div className="quoteCard now">
        <div className="cardTitle">NOW</div><div className="price">{discovery.bill?(String(discovery.bill).includes('$')?discovery.bill:'$'+discovery.bill):'—'}</div>
        <Fact label="Carrier" value={discovery.carrier}/><Fact label="Lines" value={discovery.lines}/><Fact label="Phones" value={discovery.phones}/><Fact label="Plan" value={discovery.currentPlan}/>
      </div>
      <div className="quoteCard newer">
        <div className="cardTitle">NEW • ESTIMATE</div><div className="price">{n?'$'+n:'—'}</div>
        <Fact label="Difference" value={diff>0?'$'+diff+'/mo less*':(n&&b?'Compare total*':'—')}/><Fact label="Upgrade" value={discovery.upgradeInterest}/><Fact label="Discount fit" value={discovery.discountEligibility}/><Fact label="Verify" value="London / official system"/>
      </div>
    </section>

    <section className="console">
      <div className="consoleHead"><div><span>LIVE CONVERSATION</span><strong>{realtime.messages.length} turns</strong></div><div className="pulseText">{realtime.isPlaying?'Titan speaking':realtime.isCapturing?'Mic listening':'Standing by'}</div></div>
      <div className="transcript">
        {realtime.messages.length===0?<div className="empty">Conversation transcript will appear here.</div>:
          realtime.messages.slice(-12).map(m=><div key={m.id} className={cx('bubble',m.role)}>
            <b>{m.role==='user'?'YOU / CUSTOMER':'TITAN'}</b>
            <span>{(m.parts||[]).filter(p=>p.type==='text').map(p=>p.text).join(' ')||'…'}</span>
          </div>)}
      </div>
    </section>

    <section className="memoryPanel">
      <div className="panelHead"><div><span>SECOND LOOP MEMORY</span><strong>Persistent field brain</strong></div><button onClick={endAndLearn} disabled={learning}>{learning?'Learning…':'End & Learn'}</button></div>
      <div className="memoryList">{memories.length===0?<div className="empty">No Titan Max memories yet.</div>:memories.slice(0,6).map(m=><div className="memory" key={m.id}><b>{m.address||'Field session'}</b><span>{m.summary}</span><small>{m.nextMove?('Next: '+m.nextMove):new Date(m.at).toLocaleString()}</small></div>)}</div>
    </section>

    <footer>AI-assisted field tool. Estimates must be verified in official systems. Titan Max does not collect sensitive credentials.</footer>

    {setupOpen&&<div className="modalShade"><div className="modal">
      <div className="modalLogo">TITAN <b>MAX</b></div>
      <h2>Pair Titan once</h2>
      <p>This is Titan's private app passcode — not your AI API key. Titan already uses the same server-side Vercel AI Gateway key as Sterling.</p>
      <input type="password" value={ownerDraft} onChange={e=>setOwnerDraft(e.target.value)} placeholder="Titan passcode (not API key)" autoCapitalize="none" autoCorrect="off"/>
      <button onClick={saveOwner}>Save Owner Key</button>
      <button className="ghost" onClick={()=>setSetupOpen(false)}>Cancel</button>
    </div></div>}
  </main>;
}
function Fact({label,value}){return <div className="fact"><span>{label}</span><strong>{value||'—'}</strong></div>}

createRoot(document.getElementById('root')).render(<App/>);

if('serviceWorker'in navigator){
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('/location-upgrade/titan-live/sw.js',{updateViaCache:'none'});
      await reg.update();
    }catch{}
  });
}
+discovery.bill:'—'}</b></div>
      <div className={cx('captureItem',lastCaptured==='lines'&&'captured')}><span>LINES</span><b>{discovery?.lines||'—'}</b></div>
    </div>
    <div className="execLabel"><span>TITAN MAX</span><b>EXECUTIVE INTELLIGENCE</b></div>
    <div className="stateOrb"/>
  </div>;
}

function App(){
  const [ownerKey,setOwnerKey]=useState(()=>localStorage.getItem(OWNER_STORAGE)||'');
  const [ownerDraft,setOwnerDraft]=useState('');
  const [setupOpen,setSetupOpen]=useState(false);
  const [configured,setConfigured]=useState(null);
  const [discovery,setDiscovery]=useState(DISCOVERY_EMPTY);
  const [memories,setMemories]=useState([]);
  const [lessons,setLessons]=useState([]);
  const [brainCount,setBrainCount]=useState(0);
  const [faceMode,setFaceMode]=useState('friendly');
  const [ring,setRing]=useState(false);
  const [notice,setNotice]=useState('Titan Max is loaded. Tap Start Titan.');
  const [error,setError]=useState('');
  const [starting,setStarting]=useState(false);
  const [learning,setLearning]=useState(false);
  const [level,setLevel]=useState(.08);
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

  const model=useMemo(()=>gateway.experimental_realtime('openai/gpt-realtime-2.1'),[]);
  const instructions=useMemo(()=>{
    const learned=lessons.length?'\nPERSISTENT FIELD LESSONS FROM PRIOR SESSIONS:\n'+lessons.slice(0,25).map((x,i)=>`${i+1}. ${x}`).join('\n'):'';
    return BASE_BRAIN+learned;
  },[lessons]);
  // Realtime session config must stay referentially stable. Recreating it on every
  // face animation render can tear down the live session on iPhone.
  const sessionConfig=useMemo(()=>({
    instructions,
    inputAudioTranscription:{},
    voice:'ash',
    turnDetection:{type:'server-vad'}
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
      if(toolCall.toolName==='saveDiscovery'){
        setDiscovery(d=>({...d,[a.field]:String(a.value||'')}));
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
      if(t.includes('speech-start')||t.includes('input-audio'))setFaceMode('friendly');
      if(t.includes('response')&&t.includes('start'))setFaceMode('thinking');
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
      const rejectReady=providerReadyRejectRef.current;
      if(rejectReady){
        providerReadyResolveRef.current=null;
        providerReadyRejectRef.current=null;
        if(providerReadyTimerRef.current)clearTimeout(providerReadyTimerRef.current);
        providerReadyTimerRef.current=null;
        rejectReady(err);
      }
      setError(err.message||'Titan realtime error');
      setNotice('Titan hit a connection problem. Tap Start Titan to retry.');
      setFaceMode('serious');
    }
  });

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
  function stopLocalMedia(){
    if(rafRef.current)cancelAnimationFrame(rafRef.current);
    try{analyzerRef.current?.ctx?.close()}catch{}
    analyzerRef.current=null;
    try{streamRef.current?.getTracks()?.forEach(t=>t.stop())}catch{}
    streamRef.current=null;setLevel(.08);
  }

  async function startTitan(){
    if(!ownerKey){setSetupOpen(true);setNotice('Enter your Titan passcode once on this iPhone.');return}
    if(startupLockRef.current||starting||realtime.status==='connecting'||realtime.status==='connected'){
      setNotice(realtime.status==='connected'?'Titan is already live.':'Titan startup is already in progress.');
      return;
    }

    startupLockRef.current=true;
    const attempt=++startupAttemptRef.current;
    setStarting(true);setError('');setNotice('Running executive systems check…');setFaceMode(ring?'ring':'thinking');

    try{
      const health=await Promise.race([
        preflightTitan(),
        new Promise(resolve=>setTimeout(()=>resolve({ok:false,error:'Titan backend health check timed out'}),4500))
      ]);
      if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');
      if(!health?.ok){
        if(health?.status===401){
          localStorage.removeItem(OWNER_STORAGE);setOwnerKey('');setSetupOpen(true);
        }
        throw new Error(health?.error||'Titan backend is not ready');
      }

      setNotice('Systems green. Unlocking microphone…');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{
        echoCancellation:true,
        noiseSuppression:true,
        autoGainControl:true,
        channelCount:1
      }});
      if(attempt!==startupAttemptRef.current){
        stream.getTracks().forEach(t=>t.stop());
        throw new Error('Titan startup was cancelled');
      }
      streamRef.current=stream;startAnalyzer(stream);

      const firstTurn=ring
        ?"Ring Mode is active. Speak first now with a short polished technology opener, identify yourself as Titan, London's AI partner, say London is right here, ask for about 20 seconds, then listen."
        :'Say exactly: Titan, executive AI ready. Then stop and listen immediately.';
      greetingRef.current=firstTurn;

      setNotice('Opening realtime executive link…');
      const providerReady=new Promise((resolve,reject)=>{
        providerReadyResolveRef.current=resolve;
        providerReadyRejectRef.current=reject;
        providerReadyTimerRef.current=setTimeout(()=>{
          providerReadyResolveRef.current=null;
          providerReadyRejectRef.current=null;
          providerReadyTimerRef.current=null;
          reject(new Error('Titan provider did not become ready in time'));
        },9000);
      });

      // This is intentionally awaited. No second startup can begin while this
      // attempt owns the lock, even if connect() resolves before provider-ready.
      await realtime.connect({stream,capture:true});
      if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');

      setNotice('Realtime transport connected. Waiting for provider ready…');
      await providerReady;
      if(attempt!==startupAttemptRef.current)throw new Error('Titan startup was cancelled');
      if(realtime.status!=='connected'){
        throw new Error('Titan provider signaled ready but the realtime session is not connected');
      }

      const greeting=greetingRef.current;
      greetingRef.current=null;
      realtime.sendTextMessage(greeting);
      setNotice('Titan Executive AI is live and listening.');
      setFaceMode(ring?'ring':'friendly');
    }catch(e){
      greetingRef.current=null;
      providerReadyResolveRef.current=null;
      providerReadyRejectRef.current=null;
      if(providerReadyTimerRef.current)clearTimeout(providerReadyTimerRef.current);
      providerReadyTimerRef.current=null;
      try{realtime.disconnect()}catch{}
      stopLocalMedia();
      const message=e?.message||String(e);
      if(message!=='Titan startup was cancelled'){
        setError(message);
        setNotice('Startup stopped cleanly. Tap Start Titan to try again.');
        setFaceMode('serious');
      }
    }finally{
      if(attempt===startupAttemptRef.current){
        startupLockRef.current=false;
        setStarting(false);
      }
    }
  }

  function stopTitan(){
    ++startupAttemptRef.current;
    startupLockRef.current=false;
    greetingRef.current=null;
    const rejectReady=providerReadyRejectRef.current;
    providerReadyResolveRef.current=null;
    providerReadyRejectRef.current=null;
    if(providerReadyTimerRef.current)clearTimeout(providerReadyTimerRef.current);
    providerReadyTimerRef.current=null;
    if(rejectReady)rejectReady(new Error('Titan startup was cancelled'));
    try{realtime.disconnect()}catch{}
    stopLocalMedia();
    setNotice('Titan stopped. Tap Start Titan when ready.');
    setFaceMode('neutral');
    setStarting(false);
  }

  async function toggleRing(){
    const next=!ring;setRing(next);setFaceMode(next?'ring':'friendly');
    if(realtime.status==='connected'){
      realtime.sendTextMessage(next
        ?"Switch into Ring Mode now. Give a quick friendly tech joke, identify yourself as Titan, London's AI partner, say London is right here, ask for about 20 seconds, then listen."
        :"Ring Mode is off. Return to normal concise customer conversation.");
    }
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
    localStorage.setItem(OWNER_STORAGE,v);setOwnerKey(v);setOwnerDraft('');setSetupOpen(false);setError('');setNotice('Titan passcode saved on this iPhone. Titan is ready.');
  }

  const n=estimate(discovery.lines),b=money(discovery.bill),diff=n&&b?Math.round(b-n):0;
  const statusLabel=starting?'STARTING':realtime.status==='connected'?(realtime.isPlaying?'SPEAKING':realtime.isCapturing?'LISTENING':'LIVE'):realtime.status.toUpperCase();

  return <main className="app">
    <header className="topbar">
      <div><div className="wordmark">TITAN <b>MAX</b></div><div className="sub">Executive field intelligence • adaptive memory • GitHub-hosted</div></div>
      <div className={cx('statusPill',realtime.status)}><i/>{statusLabel}</div>
    </header>

    <section className="hero">
      <div className="faceCard">
        <TitanFace mode={faceMode} status={realtime.status} isPlaying={realtime.isPlaying} isCapturing={realtime.isCapturing} level={level} faceRef={faceRef}/>
        <div className="brainStrip">
          <div><span>BRAIN</span><strong>{configured===false?'KEY OFFLINE':'MAX ONLINE'}</strong></div>
          <div><span>MEMORY</span><strong>{memories.length} RECENT</strong></div>
          <div><span>GROWTH</span><strong>{brainCount} LESSONS</strong></div>
        </div>
      </div>
      <div className="liveCard">
        <div className="eyebrow">EXECUTIVE LINK</div>
        <h1>{realtime.status==='connected'?'Ready for the next conversation.':'Executive intelligence standing by.'}</h1>
        <p>{notice}</p>
        {error&&<div className="errorBox">{error}</div>}
        <div className="primaryRow">
          {realtime.status==='connected'
            ?<button className="big stop" onClick={stopTitan}>Stop Titan</button>
            :<button className="big" onClick={startTitan} disabled={starting}>{starting?'Starting…':'Start Titan'}</button>}
          <button className={cx('modeBtn',ring&&'active')} onClick={toggleRing}>Ring {ring?'ON':'Mode'}</button>
        </div>
        <div className="microcopy">iPhone requires a real tap before microphone audio can start. Titan now obeys that rule instead of sitting on a loading screen.</div>
      </div>
    </section>

    <section className="nowNew">
      <div className="quoteCard now">
        <div className="cardTitle">NOW</div><div className="price">{discovery.bill?(String(discovery.bill).includes('$')?discovery.bill:'$'+discovery.bill):'—'}</div>
        <Fact label="Carrier" value={discovery.carrier}/><Fact label="Lines" value={discovery.lines}/><Fact label="Phones" value={discovery.phones}/><Fact label="Plan" value={discovery.currentPlan}/>
      </div>
      <div className="quoteCard newer">
        <div className="cardTitle">NEW • ESTIMATE</div><div className="price">{n?'$'+n:'—'}</div>
        <Fact label="Difference" value={diff>0?'$'+diff+'/mo less*':(n&&b?'Compare total*':'—')}/><Fact label="Upgrade" value={discovery.upgradeInterest}/><Fact label="Discount fit" value={discovery.discountEligibility}/><Fact label="Verify" value="London / official system"/>
      </div>
    </section>

    <section className="console">
      <div className="consoleHead"><div><span>LIVE CONVERSATION</span><strong>{realtime.messages.length} turns</strong></div><div className="pulseText">{realtime.isPlaying?'Titan speaking':realtime.isCapturing?'Mic listening':'Standing by'}</div></div>
      <div className="transcript">
        {realtime.messages.length===0?<div className="empty">Conversation transcript will appear here.</div>:
          realtime.messages.slice(-12).map(m=><div key={m.id} className={cx('bubble',m.role)}>
            <b>{m.role==='user'?'YOU / CUSTOMER':'TITAN'}</b>
            <span>{(m.parts||[]).filter(p=>p.type==='text').map(p=>p.text).join(' ')||'…'}</span>
          </div>)}
      </div>
    </section>

    <section className="memoryPanel">
      <div className="panelHead"><div><span>SECOND LOOP MEMORY</span><strong>Persistent field brain</strong></div><button onClick={endAndLearn} disabled={learning}>{learning?'Learning…':'End & Learn'}</button></div>
      <div className="memoryList">{memories.length===0?<div className="empty">No Titan Max memories yet.</div>:memories.slice(0,6).map(m=><div className="memory" key={m.id}><b>{m.address||'Field session'}</b><span>{m.summary}</span><small>{m.nextMove?('Next: '+m.nextMove):new Date(m.at).toLocaleString()}</small></div>)}</div>
    </section>

    <footer>AI-assisted field tool. Estimates must be verified in official systems. Titan Max does not collect sensitive credentials.</footer>

    {setupOpen&&<div className="modalShade"><div className="modal">
      <div className="modalLogo">TITAN <b>MAX</b></div>
      <h2>Pair Titan once</h2>
      <p>This is Titan's private app passcode — not your AI API key. Titan already uses the same server-side Vercel AI Gateway key as Sterling.</p>
      <input type="password" value={ownerDraft} onChange={e=>setOwnerDraft(e.target.value)} placeholder="Titan passcode (not API key)" autoCapitalize="none" autoCorrect="off"/>
      <button onClick={saveOwner}>Save Owner Key</button>
      <button className="ghost" onClick={()=>setSetupOpen(false)}>Cancel</button>
    </div></div>}
  </main>;
}
function Fact({label,value}){return <div className="fact"><span>{label}</span><strong>{value||'—'}</strong></div>}

createRoot(document.getElementById('root')).render(<App/>);

if('serviceWorker'in navigator){
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('/location-upgrade/titan-live/sw.js',{updateViaCache:'none'});
      await reg.update();
    }catch{}
  });
}
