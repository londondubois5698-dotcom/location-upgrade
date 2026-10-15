import { gateway } from '@ai-sdk/gateway';
import { Experimental_AbstractRealtimeSession } from 'ai';

const sent = [];
let lastSocket;

class FakeAudioContext {
  constructor(){ this.state='running'; this.currentTime=0; this.destination={}; this.onstatechange=null; this.sampleRate=24000; }
  resume(){ this.state='running'; return Promise.resolve(); }
  close(){ this.state='closed'; return Promise.resolve(); }
  createBuffer(){ return { duration:0, getChannelData(){ return new Float32Array(0); } }; }
  createBufferSource(){ return { buffer:null,onended:null,connect(){},disconnect(){},start(){},stop(){} }; }
  createMediaStreamSource(){ return { connect(){},disconnect(){} }; }
  createScriptProcessor(){ return { onaudioprocess:null,connect(){},disconnect(){} }; }
}
globalThis.AudioContext=FakeAudioContext;
globalThis.webkitAudioContext=FakeAudioContext;

class FakeWebSocket {
  static CONNECTING=0; static OPEN=1; static CLOSING=2; static CLOSED=3;
  constructor(url,protocols){
    this.url=url; this.protocols=protocols; this.readyState=FakeWebSocket.CONNECTING;
    this.onopen=null; this.onmessage=null; this.onerror=null; this.onclose=null;
    lastSocket=this;
    queueMicrotask(()=>{ this.readyState=FakeWebSocket.OPEN; this.onopen?.(); });
  }
  send(data){
    const text=typeof data==='string'?data:new TextDecoder().decode(data);
    const event=JSON.parse(text);
    sent.push(event);
    if(event.type==='session-update'){
      queueMicrotask(()=>this.onmessage?.({data:JSON.stringify({type:'session-created'})}));
    }
  }
  close(){
    if(this.readyState===FakeWebSocket.CLOSED)return;
    this.readyState=FakeWebSocket.CLOSED;
    queueMicrotask(()=>this.onclose?.({code:1000,reason:'',wasClean:true}));
  }
}
globalThis.WebSocket=FakeWebSocket;

globalThis.fetch=async()=>new Response(JSON.stringify({
  token:'vcst_smoke_test',
  url:'wss://gateway-smoke.invalid/realtime'
}),{status:200,headers:{'content-type':'application/json'}});

class TestSession extends Experimental_AbstractRealtimeSession {
  constructor(options){ super(options); this.publicState={status:'disconnected',messages:[],events:[],isCapturing:false,isPlaying:false}; }
  setState(key,value){ this.publicState[key]=value; }
  get snapshot(){ return this.publicState; }
}

const model=gateway.experimental_realtime('openai/gpt-realtime-2.1');
const sessionConfig={
  instructions:'Titan smoke test',
  inputAudioTranscription:{},
  voice:'ash',
  turnDetection:{type:'server-vad'}
};

// Regression guard: this option is invalid for Titan's turn-based client-secret transport.
{
  const errors=[];
  const bad=new TestSession({
    model,
    api:{token:'https://example.invalid/token'},
    sessionConfig,
    maxPlaybackBufferSeconds:3,
    startupTimeoutMs:1500,
    onError:e=>errors.push(e)
  });
  await bad.connect({capture:false});
  await new Promise(r=>setTimeout(r,20));
  if(!errors.some(e=>String(e?.message||e).includes('maxPlaybackBufferSeconds is supported only for continuous PCM sessions'))){
    throw new Error('Smoke guard failed: SDK did not detect the known invalid playback-buffer option');
  }
}

// Current Titan config simulation: connect -> provider-ready -> first submission.
{
  sent.length=0;
  const errors=[];
  let ready=false;
  const live=new TestSession({
    model,
    api:{token:'https://example.invalid/token'},
    sessionConfig,
    startupTimeoutMs:1500,
    closeTimeoutMs:1000,
    maxEvents:250,
    onError:e=>errors.push(e),
    onEvent:e=>{ if(['session-created','session-updated','session-started'].includes(e?.type)) ready=true; }
  });

  await live.connect({capture:false});
  await new Promise(r=>setTimeout(r,40));

  if(errors.length) throw errors[0];
  if(!ready || live.snapshot.status!=='connected'){
    throw new Error('Smoke failed: realtime session never reached connected/provider-ready state');
  }

  live.sendTextMessage('Titan, executive AI ready.');
  await new Promise(r=>setTimeout(r,10));

  const types=sent.map(x=>x.type);
  for(const needed of ['session-update','conversation-item-create','response-create']){
    if(!types.includes(needed)) throw new Error('Smoke failed: missing realtime event '+needed+'; saw '+types.join(', '));
  }
  live.disconnect();
}

console.log('TITAN_REALTIME_SMOKE_OK');
console.log(JSON.stringify({connected:true,providerReady:true,firstSubmission:true,eventTypes:sent.map(x=>x.type)}));
