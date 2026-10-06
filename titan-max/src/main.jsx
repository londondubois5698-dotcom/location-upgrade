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
    <div className="halo h1"/><div className="halo h2"/><div className="halo h3"/>
    <div className="neural n1"/><div className="neural n2"/><div className="neural n3"/><div className="neural n4"/>
    <div className="head3d">
      <div className="brow browL"/><div className="brow browR"/>
      <div className="eyeShell eyeL"><div className="iris"><div className="pupil"/><div className="glint"/></div></div>
      <div className="eyeShell eyeR"><div className="iris"><div className="pupil"/><div className="glint"/></div></div>
      <div className="nose"/>
      <div className="mouth"><span/><span/><span/><span/><span/></div>
      <div className="cheek c1"/><div className="cheek c2"/>
    </div>
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

  const model=useMemo(()=>gateway.experimental_realtime('openai/gpt-realtime-2'),[]);
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
    if(!ownerKey)return {ok:false,error:'Owner key required'};
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
    if(!ownerKey){setSetupOpen(true);setNotice('Enter your Titan Owner Key once on this iPhone.');return}
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
    const v=ownerDraft.trim();if(!v){setError('Enter the Titan Owner Key.');return}
    localStorage.setItem(OWNER_STORAGE,v);setOwnerKey(v);setOwnerDraft('');setSetupOpen(false);setError('');setNotice('Owner key saved on this iPhone. Titan is ready.');
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
      <h2>Pair this iPhone once</h2>
      <p>Enter your private Titan Owner Key. Your AI Gateway key stays server-side and is not placed in GitHub.</p>
      <input type="password" value={ownerDraft} onChange={e=>setOwnerDraft(e.target.value)} placeholder="Titan Owner Key" autoCapitalize="none" autoCorrect="off"/>
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
