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
- Warm, masculine, quick, funny when appropriate, and highly conversational.
- Keep most spoken turns under 35 words unless London explicitly asks for detail.
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

function TitanFace({mode,status,isPlaying,isCapturing,level,faceRef}){
  const speaking=isPlaying||mode==='speaking';
  const listening=isCapturing&&status==='connected'&&!speaking;
  return <div
    ref={faceRef}
    className={cx('faceStage',mode,status==='error'&&'error',speaking&&'speaking',listening&&'listening')}
    style={{'--level':level}}
  >
    <div className="hudGrid"/>
    <div className="hudVignette"/>
    <svg className="titanPortrait" viewBox="0 0 1200 1450" role="img" aria-label="Titan Max neural avatar">
      <defs>
        <linearGradient id="skin" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#d7edf5"/>
          <stop offset=".16" stopColor="#8ba7b8"/>
          <stop offset=".38" stopColor="#263d4d"/>
          <stop offset=".63" stopColor="#0a1721"/>
          <stop offset=".83" stopColor="#1d3342"/>
          <stop offset="1" stopColor="#02070b"/>
        </linearGradient>
        <linearGradient id="armor" x1="0" x2="1">
          <stop offset="0" stopColor="#061018"/>
          <stop offset=".47" stopColor="#264657"/>
          <stop offset=".53" stopColor="#0c1a23"/>
          <stop offset="1" stopColor="#020609"/>
        </linearGradient>
        <radialGradient id="eye" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#ffffff"/>
          <stop offset=".18" stopColor="#aef3ff"/>
          <stop offset=".48" stopColor="#2dc4ff"/>
          <stop offset=".72" stopColor="#075b8f"/>
          <stop offset="1" stopColor="#011018"/>
        </radialGradient>
        <radialGradient id="core" cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="#ffffff"/>
          <stop offset=".18" stopColor="#9cf7ff"/>
          <stop offset=".52" stopColor="#18aeea"/>
          <stop offset="1" stopColor="#013252"/>
        </radialGradient>
        <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="18" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="microTexture" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="2" seed="11" result="n"/>
          <feColorMatrix in="n" type="saturate" values="0" result="g"/>
          <feBlend in="SourceGraphic" in2="g" mode="soft-light"/>
        </filter>
        <clipPath id="headClip">
          <path d="M600 88 L458 118 L350 198 L294 326 L270 520 L292 790 L366 992 L480 1158 L548 1218 L652 1218 L720 1158 L834 992 L908 790 L930 520 L906 326 L850 198 L742 118 Z"/>
        </clipPath>
      </defs>

      <g className="ambientGlow">
        <ellipse cx="600" cy="650" rx="420" ry="560" fill="#0ba9ff" opacity=".08" filter="url(#softGlow)"/>
        <ellipse cx="600" cy="630" rx="325" ry="480" fill="none" stroke="#7fe8ff" strokeWidth="2" opacity=".16"/>
        <ellipse cx="600" cy="630" rx="395" ry="555" fill="none" stroke="#2dbdff" strokeWidth="1.5" opacity=".09"/>
      </g>

      <g className="shoulders">
        <path d="M120 1450 C168 1262 292 1175 448 1136 L752 1136 C908 1175 1032 1262 1080 1450 Z" fill="url(#armor)"/>
        <path d="M302 1450 L392 1210 L508 1150 L692 1150 L808 1210 L898 1450 Z" fill="#08131c" stroke="#365b6b" strokeWidth="4"/>
        <path d="M458 1450 L505 1194 L695 1194 L742 1450 Z" fill="#02070b" stroke="#17394b" strokeWidth="3"/>
        <path d="M503 1300 H697" stroke="#40cfff" strokeWidth="3" opacity=".28"/>
      </g>

      <g className="headShell" filter="url(#microTexture)">
        <path d="M600 88 L458 118 L350 198 L294 326 L270 520 L292 790 L366 992 L480 1158 L548 1218 L652 1218 L720 1158 L834 992 L908 790 L930 520 L906 326 L850 198 L742 118 Z" fill="url(#skin)" stroke="#7aa8bc" strokeWidth="5"/>
        <path d="M600 90 L600 1220" stroke="#9ad9ef" strokeWidth="2" opacity=".12"/>
        <path d="M458 118 L530 270 L600 236 L670 270 L742 118" fill="#102733" opacity=".58"/>
        <path d="M294 326 L410 392 L372 590 L286 656" fill="#061018" opacity=".72"/>
        <path d="M906 326 L790 392 L828 590 L914 656" fill="#061018" opacity=".72"/>
      </g>

      <g clipPath="url(#headClip)">
        <path className="templePlate left" d="M282 372 L438 294 L492 418 L418 558 L294 610 Z" fill="#07131c" stroke="#305667" strokeWidth="4"/>
        <path className="templePlate right" d="M918 372 L762 294 L708 418 L782 558 L906 610 Z" fill="#07131c" stroke="#305667" strokeWidth="4"/>
        <path d="M352 690 L482 642 L542 778 L476 930 L366 990 L314 810 Z" fill="#172c38" opacity=".72"/>
        <path d="M848 690 L718 642 L658 778 L724 930 L834 990 L886 810 Z" fill="#172c38" opacity=".72"/>
        <path d="M422 1000 L540 946 L660 946 L778 1000 L710 1140 L650 1190 L550 1190 L490 1140 Z" fill="#050d13" opacity=".75"/>
      </g>

      <g className="brows">
        <path d="M356 455 C412 410 492 398 548 430 L528 466 C468 446 410 451 364 482 Z" fill="#050a0e" stroke="#4f7789" strokeWidth="5"/>
        <path d="M844 455 C788 410 708 398 652 430 L672 466 C732 446 790 451 836 482 Z" fill="#050a0e" stroke="#4f7789" strokeWidth="5"/>
      </g>

      <g className="eyes">
        <path d="M354 528 C410 480 490 476 548 526 C486 572 412 572 354 528 Z" fill="#02070a" stroke="#5aa1bd" strokeWidth="4"/>
        <path d="M846 528 C790 480 710 476 652 526 C714 572 788 572 846 528 Z" fill="#02070a" stroke="#5aa1bd" strokeWidth="4"/>
        <g className="eyeTracker">
          <circle cx="452" cy="527" r="41" fill="url(#eye)" filter="url(#softGlow)"/>
          <circle cx="748" cy="527" r="41" fill="url(#eye)" filter="url(#softGlow)"/>
          <circle cx="452" cy="527" r="16" fill="#01060a"/>
          <circle cx="748" cy="527" r="16" fill="#01060a"/>
          <circle cx="440" cy="514" r="6" fill="#fff"/>
          <circle cx="736" cy="514" r="6" fill="#fff"/>
        </g>
        <path className="lid" d="M354 528 C410 480 490 476 548 526" fill="none" stroke="#d4f6ff" strokeWidth="6" opacity=".34"/>
        <path className="lid" d="M846 528 C790 480 710 476 652 526" fill="none" stroke="#d4f6ff" strokeWidth="6" opacity=".34"/>
      </g>

      <g className="noseBridge">
        <path d="M600 474 L554 700 L600 782 L646 700 Z" fill="#09141c" stroke="#55788a" strokeWidth="4"/>
        <path d="M600 520 L600 758" stroke="#a1e4f8" strokeWidth="3" opacity=".35"/>
        <path d="M558 700 Q600 734 642 700" fill="none" stroke="#3f6273" strokeWidth="4"/>
      </g>

      <g className="cheekTech">
        <path d="M330 662 L438 628 L486 676 L446 786 L344 824" fill="none" stroke="#55cef2" strokeWidth="3" opacity=".28"/>
        <path d="M870 662 L762 628 L714 676 L754 786 L856 824" fill="none" stroke="#55cef2" strokeWidth="3" opacity=".28"/>
        <circle cx="362" cy="738" r="7" fill="#76e8ff" filter="url(#softGlow)"/>
        <circle cx="838" cy="738" r="7" fill="#76e8ff" filter="url(#softGlow)"/>
      </g>

      <g className="voiceAssembly">
        <path d="M454 874 L526 828 H674 L746 874 L706 978 L650 1024 H550 L494 978 Z" fill="#02070b" stroke="#31596c" strokeWidth="4"/>
        <path d="M498 900 H702" stroke="#5fdcff" strokeWidth="3" opacity=".35"/>
        <rect x="500" y="908" width="200" height="58" rx="28" fill="#020b10" stroke="#2f6378" strokeWidth="4"/>
        <g className="voiceBars">
          <rect className="voiceBar v1" x="532" y="925" width="9" height="24" rx="4" fill="#80ecff"/>
          <rect className="voiceBar v2" x="552" y="918" width="9" height="38" rx="4" fill="#80ecff"/>
          <rect className="voiceBar v3" x="572" y="912" width="9" height="50" rx="4" fill="#80ecff"/>
          <rect className="voiceBar v4" x="592" y="905" width="9" height="64" rx="4" fill="#b9f7ff"/>
          <rect className="voiceBar v5" x="612" y="912" width="9" height="50" rx="4" fill="#80ecff"/>
          <rect className="voiceBar v6" x="632" y="918" width="9" height="38" rx="4" fill="#80ecff"/>
          <rect className="voiceBar v7" x="652" y="925" width="9" height="24" rx="4" fill="#80ecff"/>
        </g>
      </g>

      <g className="jawArmor">
        <path d="M366 992 L480 1158 L548 1218 L510 1098 L424 972 Z" fill="#07131b" stroke="#35596b" strokeWidth="4"/>
        <path d="M834 992 L720 1158 L652 1218 L690 1098 L776 972 Z" fill="#07131b" stroke="#35596b" strokeWidth="4"/>
        <path d="M548 1218 H652" stroke="#6de1ff" strokeWidth="4" opacity=".26"/>
      </g>

      <g className="neuralCircuit" opacity=".48">
        <path d="M270 560 L198 560 L160 520 M930 560 L1002 560 L1040 520" fill="none" stroke="#3fcfff" strokeWidth="3"/>
        <path d="M290 760 L184 760 L134 810 M910 760 L1016 760 L1066 810" fill="none" stroke="#3fcfff" strokeWidth="3"/>
        <circle cx="160" cy="520" r="8" fill="url(#core)"/>
        <circle cx="1040" cy="520" r="8" fill="url(#core)"/>
        <circle cx="134" cy="810" r="8" fill="url(#core)"/>
        <circle cx="1066" cy="810" r="8" fill="url(#core)"/>
      </g>

      <g className="hudArcs" fill="none" stroke="#5bdcff" strokeWidth="2" opacity=".26">
        <path d="M150 330 A520 520 0 0 1 1050 330"/>
        <path d="M108 1040 A600 600 0 0 0 1092 1040"/>
      </g>
    </svg>

    <div className="avatarTag"><span>NEURAL AVATAR</span><b>ULTRA VECTOR</b></div>
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
    maxPlaybackBufferSeconds:3,
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
    },
    onError:e=>{
      setError(e.message||'Titan realtime error');
      setNotice('Titan hit a connection problem. Tap Start Titan to retry.');
      setStarting(false);setFaceMode('serious');
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
    if(starting)return;
    setStarting(true);setError('');setNotice('Unlocking microphone…');setFaceMode(ring?'ring':'friendly');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      streamRef.current=stream;startAnalyzer(stream);
      setNotice('Connecting Titan brain…');
      let timeoutId;
      const timeout=new Promise((_,reject)=>{timeoutId=setTimeout(()=>reject(new Error('Titan startup exceeded 10 seconds. Connection was reset instead of hanging.')),10000)});
      await Promise.race([realtime.connect({stream,capture:true}),timeout]);
      clearTimeout(timeoutId);
      setNotice('Titan is live and listening.');
      setFaceMode(ring?'ring':'friendly');
      if(ring){
        realtime.sendTextMessage("Ring Mode is active. Speak first now with a short playful tech/doorbell opener, identify yourself as Titan, London's AI partner, say London is right here, ask for 20 seconds, then listen.");
      }else{
        realtime.sendTextMessage('Say exactly: Titan, AI assistant ready. Then stop and listen immediately.');
      }
    }catch(e){
      realtime.disconnect();stopLocalMedia();
      setError(e.message||String(e));setNotice('Titan did not hang. Startup was stopped cleanly; tap Start Titan to retry.');setFaceMode('serious');
    }finally{setStarting(false)}
  }

  function stopTitan(){
    realtime.disconnect();stopLocalMedia();setNotice('Titan stopped. Tap Start Titan when ready.');setFaceMode('neutral');setStarting(false);
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
      <div><div className="wordmark">TITAN <b>MAX</b></div><div className="sub">London's adaptive field AI • GitHub-hosted interface</div></div>
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
        <div className="eyebrow">TITAN LIVE</div>
        <h1>{realtime.status==='connected'?'Ready for the next conversation.':'No endless loader. One tap starts the live brain.'}</h1>
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
  window.addEventListener('load',()=>navigator.serviceWorker.register('/location-upgrade/titan-live/sw.js').catch(()=>{}));
}
