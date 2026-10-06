(function(){
'use strict';

var APP='https://sterling-olive.vercel.app';
var VERSION='13.0';
var POLL_MS=450;
var state={
  active:false, connected:false, connecting:false, muted:false, updateBusy:false,
  socket:null, current:null, candidateKey:'', candidateCount:0,
  contact:{first:'',last:'',phone:'',email:''}, stage:'rapport',
  orderId:'', mismatch:false, lastError:'', reconnects:0,
  tetherId:'', pairCode:'', phoneSeen:false, tetherActive:false, lastCommandId:''
};

function clean(v){return String(v==null?'':v).trim()}
function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]/g,'')}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function arr(x){return Array.prototype.slice.call(x||[])}
function text(el){return clean(el&&(el.innerText||el.textContent))}
function isVisible(el){
  try{
    if(!el||typeof el.getBoundingClientRect!=='function')return false;
    var r=el.getBoundingClientRect();
    var w=el.ownerDocument&&el.ownerDocument.defaultView?el.ownerDocument.defaultView:window;
    var cs=w.getComputedStyle? w.getComputedStyle(el):null;
    return (!cs||((cs.display!=='none')&&(cs.visibility!=='hidden')&&(Number(cs.opacity)!==0))) && r.width>0 && r.height>0;
  }catch(e){return false}
}
function safeClick(el){try{el.click();return true}catch(e){try{el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click',{bubbles:true,cancelable:true}));return true}catch(_){return false}}}

function allDocs(){
  var out=[],seen=[];
  function addWindow(w){
    try{
      var d=w.document;
      if(!d||seen.indexOf(d)>=0)return;
      seen.push(d);out.push(d);
      arr(d.querySelectorAll('iframe')).forEach(function(f){try{if(f.contentWindow)addWindow(f.contentWindow)}catch(e){}});
    }catch(e){}
  }
  addWindow(window);
  try{if(top&&top!==window)addWindow(top)}catch(e){}
  return out;
}

var ADDRESS_RE=/(\d{1,6}\s+[^,\n]{2,90}),\s*([A-Za-z .'\-]{2,60}),\s*(Virginia|VA)\s+(\d{5}(?:-\d{4})?)/ig;

function detectFromDoc(d){
  try{
    var body=d.body;if(!body)return null;
    var full=body.innerText||body.textContent||'';
    if(!full)return null;
    var cut=full.search(/Previous\s+Opportunity\s*:/i);
    var head=full.slice(0,cut>0?Math.min(cut,6000):Math.min(full.length,6000));
    ADDRESS_RE.lastIndex=0;
    var m,best=null;
    while((m=ADDRESS_RE.exec(head))){
      var before=head.slice(Math.max(0,m.index-220),m.index);
      var score=5000-m.index;
      if(/Prospective\s+Customer/i.test(before))score+=900;
      if(/Stage\s*:\s*Opportunity/i.test(head.slice(0,1800)))score+=250;
      if(m.index<900)score+=800;
      if(!best||score>best.score){
        best={street:clean(m[1]),city:clean(m[2]),state:'Virginia',postalcode:clean(m[4]),score:score,doc:d,source:'document-text'};
      }
    }

    var els=arr(d.querySelectorAll('div,span,p,a,strong,h1,h2,h3,td'));
    for(var i=0;i<els.length;i++){
      var el=els[i];if(!isVisible(el))continue;
      var t=text(el);if(!t||t.length>220)continue;
      ADDRESS_RE.lastIndex=0;var em=ADDRESS_RE.exec(t);if(!em)continue;
      var r=el.getBoundingClientRect();
      var eScore=0;
      if(r.top>=0&&r.top<110)eScore+=2200;
      else if(r.top<220)eScore+=1200;
      else if(r.top<360)eScore+=300;
      var local=t;
      var p=el.parentElement,depth=0;
      while(p&&depth<2){
        var pt=text(p);
        if(pt&&pt.length<420)local+=' '+pt;
        p=p.parentElement;depth++;
      }
      if(/Previous\s+Opportunity|Next\s+Opportunity/i.test(local))eScore-=4000;
      if(/Prospective\s+Customer/i.test(local))eScore+=1000;
      eScore+=400-Math.min(t.length,400);
      if(eScore>0 && (!best||eScore>best.score)){
        best={street:clean(em[1]),city:clean(em[2]),state:'Virginia',postalcode:clean(em[4]),score:eScore,doc:d,element:el,source:'visible-header'};
      }
    }
    return best;
  }catch(e){return null}
}

function detectCurrent(){
  var docs=allDocs(),best=null;
  for(var i=0;i<docs.length;i++){
    var c=detectFromDoc(docs[i]);
    if(c&&(!best||c.score>best.score))best=c;
  }
  if(!best)return null;
  best.key=norm(best.street)+'|'+norm(best.city)+'|'+norm(best.postalcode);
  best.label=[best.street,best.city,best.state,best.postalcode].filter(Boolean).join(', ');
  return best;
}

function bindClicks(){
  allDocs().forEach(function(d){
    if(d.__sterlingOneBound)return;
    try{
      d.__sterlingOneBound=true;
      d.addEventListener('click',function(e){
        var t=e.target,lab='';
        try{
          lab=clean((t&&t.innerText)||'')+' '+clean(t&&t.getAttribute&&t.getAttribute('aria-label'))+' '+clean(t&&t.getAttribute&&t.getAttribute('title'));
        }catch(_){}
        if(/\bNext\b/i.test(lab)||/\bPrevious\b/i.test(lab)){
          setTimeout(scanHouse,100);setTimeout(scanHouse,500);setTimeout(scanHouse,1100);setTimeout(scanHouse,2200);
        }
      },true);
    }catch(e){}
  });
}

function resetForHouse(next){
  state.current=next;
  state.contact={first:'',last:'',phone:'',email:''};
  state.stage='rapport';state.orderId='';state.mismatch=false;
  render();
  setStatus('HOUSE UPDATED','good');
  publishHouse();
}

function scanHouse(){
  bindClicks();
  var c=detectCurrent();
  if(!c)return;
  if(c.key!==state.candidateKey){state.candidateKey=c.key;state.candidateCount=1;return}
  state.candidateCount++;
  if(state.candidateCount<2)return;
  if(!state.current||c.key!==state.current.key)resetForHouse(c);
  else{
    state.current=c;
    renderAddress();
  }
}

var host=document.createElement('div');
host.id='sterling-one-v12';
host.style.cssText='position:fixed;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';
(document.documentElement||document.body).appendChild(host);
var sh=host.attachShadow({mode:'open'});
sh.innerHTML=
'<style>'+
'*{box-sizing:border-box}.pill{display:flex;align-items:center;gap:8px;background:#061425;color:white;border:1px solid #24567f;border-radius:999px;padding:8px 9px;box-shadow:0 12px 34px #0008;max-width:min(420px,calc(100vw - 20px))}.dot{width:10px;height:10px;border-radius:50%;background:#6c7d8f;flex:none}.dot.live{background:#26dc87;box-shadow:0 0 0 5px #26dc8724}.addr{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}.pill button,.panel button{border:0;border-radius:999px;background:#0b75ca;color:#fff;font:inherit;font-weight:850;min-height:36px;padding:8px 12px;touch-action:manipulation}.panel{display:none;width:min(380px,calc(100vw - 20px));background:#061425;color:#fff;border:1px solid #24567f;border-radius:18px;box-shadow:0 18px 50px #0009;overflow:hidden}.head{display:flex;justify-content:space-between;align-items:center;padding:12px 13px;background:#0b2845}.title{font-weight:900}.title b{color:#59baff}.ver{font-size:10px;color:#8cb0ce}.body{padding:13px}.route{font-size:13px;line-height:1.4;background:#0b2037;border-radius:12px;padding:10px;color:#d5ebff}.status{font-size:12px;margin:10px 0;color:#9ac9ef}.good{color:#77efb3}.bad{color:#ffabab}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.full{grid-column:1/-1}.secondary{background:#193a59!important}.danger{background:#7c2930!important}.contact{font-size:11px;line-height:1.45;color:#b6cee3;margin-top:10px}.code{display:none;font-size:22px;font-weight:900;text-align:center;color:#79efb6;background:#0a2036;border-radius:12px;padding:11px;margin-top:10px}.mini{font-size:10px;color:#7792aa;line-height:1.4;margin-top:10px}@media(max-width:600px){.panel{width:calc(100vw - 16px)}.addr{max-width:155px}}</style>'+
'<div class="pill" id="pill"><span class="dot" id="dot"></span><span class="addr" id="pillAddr">Detecting house…</span><button id="pillStart">Start</button><button id="open" class="secondary">Open</button></div>'+
'<div class="panel" id="panel">'+
'<div class="head"><div><div class="title"><b>Sterling</b> ONE</div><div class="ver">V13 • iPad Salesforce tether</div></div><button id="close" class="secondary">Minimize</button></div>'+
'<div class="body"><div class="route" id="route">Detecting current Salesforce house…</div><div class="status" id="status">READY</div>'+
'<div class="grid"><button class="full" id="start">Start iPad Tether</button><button class="secondary full" id="pairPhone">Pair Phone</button><button class="danger full" id="stop" style="display:none">Stop Tether</button><button class="secondary full" id="voiceSetup" style="display:none">Voice setup belongs on phone</button></div>'+
'<div class="contact" id="contact">No confirmed customer details yet.</div><div class="code" id="code"></div>'+
'<div class="mini">Keep this Salesforce page open on the iPad. Your phone handles the live Sterling conversation. This tether watches the current house, receives confirmed customer details from the phone, verifies the house again, updates Salesforce, and returns the Partner Order ID.</div>'+
'</div></div>';

function $(id){return sh.getElementById(id)}
function setStatus(msg,kind){
  state.lastError=kind==='bad'?msg:'';
  $('status').textContent=msg;
  $('status').className='status '+(kind||'');
}
function renderAddress(){
  var label=state.current?state.current.label:'Address not detected';
  $('route').textContent='Current house: '+label;
  $('pillAddr').textContent=state.current?state.current.street:'Detecting house…';
}
function render(){
  renderAddress();
  $('dot').className='dot'+(state.phoneSeen?' live':'');
  $('pillStart').textContent=state.phoneSeen?'PHONE LINKED':(state.tetherActive?'TETHER':'START');
  $('start').style.display=state.tetherActive?'none':'block';
  $('pairPhone').style.display='block';
  $('stop').style.display=state.tetherActive?'block':'none';
  var c=state.contact;
  var bits=[];
  if(c.first)bits.push(c.first);
  if(c.last)bits.push(c.last);
  if(c.phone)bits.push(c.phone);
  if(c.email)bits.push(c.email);
  $('contact').textContent=bits.length?('Confirmed from phone: '+bits.join(' • ')):(state.phoneSeen?'Phone connected. Waiting for customer details.':'Phone not linked yet.');
  if(state.pairCode){$('code').style.display='block';$('code').textContent='PAIR CODE: '+state.pairCode}
  else if(state.orderId){$('code').style.display='block';$('code').textContent='Partner Order ID: '+state.orderId}
  else{$('code').style.display='none';$('code').textContent=''}
}
function openPanel(){$('pill').style.display='none';$('panel').style.display='block'}
function closePanel(){$('panel').style.display='none';$('pill').style.display='flex'}
$('open').onclick=openPanel;$('close').onclick=closePanel;$('pillStart').onclick=function(){openPanel();if(!state.tetherActive)startTether()};$('start').onclick=startTether;$('pairPhone').onclick=pairNewPhone;$('stop').onclick=stopTether;$('voiceSetup').onclick=function(){window.open(APP+'/phone.html?v=13','sterling-phone')};


function housePacket(){
  if(!state.current)return null;
  return {street:state.current.street,city:state.current.city,state:state.current.state,postalcode:state.current.postalcode,key:state.current.key,label:state.current.label};
}
async function tetherPost(body){
  var r=await fetch(APP+'/api/tether',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  var j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Tether request failed');return j;
}
async function tetherGet(part){
  var r=await fetch(APP+'/api/tether?tetherId='+encodeURIComponent(state.tetherId)+'&part='+encodeURIComponent(part)+'&t='+Date.now(),{cache:'no-store'});
  var j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Tether request failed');return j;
}
async function pairNewPhone(){
  openPanel();setStatus('CREATING PHONE PAIR CODE…');
  try{
    var j=await tetherPost({action:'pair-create'});
    state.tetherId=j.tetherId;state.pairCode=j.code;state.phoneSeen=false;state.lastCommandId='';
    try{localStorage.setItem('sterling.tetherId.v1',state.tetherId);localStorage.removeItem('sterling.lastCommand.v1')}catch(e){}
    state.tetherActive=true;state.active=true;render();setStatus('ENTER THIS CODE ON YOUR PHONE: '+j.code,'good');
    await publishHouse();await tetherHeartbeat();
  }catch(e){setStatus(e.message||String(e),'bad')}
}
async function startTether(){
  openPanel();
  if(!state.tetherId){await pairNewPhone();return}
  state.tetherActive=true;state.active=true;render();setStatus('IPAD TETHER ACTIVE','good');
  await publishHouse();await tetherHeartbeat();pollTether();
}
function stopTether(){state.tetherActive=false;state.active=false;state.phoneSeen=false;render();setStatus('TETHER STOPPED')}
async function publishHouse(){
  if(!state.tetherId||!state.tetherActive||!state.current)return;
  try{await tetherPost({action:'ipad-heartbeat',tetherId:state.tetherId,house:housePacket(),version:VERSION})}catch(e){}
}
async function tetherHeartbeat(){
  if(!state.tetherId||!state.tetherActive)return;
  try{await tetherPost({action:'ipad-heartbeat',tetherId:state.tetherId,house:housePacket(),version:VERSION})}catch(e){}
}
async function sendTetherResult(id,result){
  try{await tetherPost({action:'result',tetherId:state.tetherId,id:id,result:result})}catch(e){}
}
async function processTetherCommand(packet){
  if(!packet||!packet.id||packet.id===state.lastCommandId)return;
  state.lastCommandId=packet.id;
  try{localStorage.setItem('sterling.lastCommand.v1',packet.id)}catch(e){}
  var cmd=packet.command||{};
  if(cmd.type!=='commitContact'){await sendTetherResult(packet.id,{ok:false,error:'Unknown tether command'});return}
  if(state.updateBusy){await sendTetherResult(packet.id,{ok:false,error:'Salesforce update already in progress'});return}
  if(!state.current){await sendTetherResult(packet.id,{ok:false,error:'Current Salesforce house is not detected'});return}
  if(cmd.expectedHouseKey!==state.current.key){
    setStatus('HOUSE MISMATCH — UPDATE BLOCKED','bad');
    await sendTetherResult(packet.id,{ok:false,error:'Phone expected '+clean(cmd.expectedHouseLabel)+' but iPad is on '+state.current.label});
    return;
  }
  var c=cmd.contact||{};
  if(!(c.first&&c.last&&c.phone&&c.email)){await sendTetherResult(packet.id,{ok:false,error:'Confirmed contact packet is incomplete'});return}
  state.contact={first:clean(c.first),last:clean(c.last),phone:clean(c.phone),email:clean(c.email)};
  state.updateBusy=true;render();setStatus('PHONE CONFIRMED CUSTOMER • UPDATING SALESFORCE…','good');
  try{
    var result=await updateSalesforce();
    state.updateBusy=false;
    state.orderId=result&&result.orderId?result.orderId:'';
    state.pairCode='';
    render();setStatus('ORDER ID CAPTURED • SENT BACK TO PHONE','good');
    await sendTetherResult(packet.id,{ok:true,orderId:state.orderId,houseKey:state.current.key,houseLabel:state.current.label});
  }catch(e){
    state.updateBusy=false;render();setStatus(e.message||String(e),'bad');
    await sendTetherResult(packet.id,{ok:false,error:e.message||String(e),houseKey:state.current&&state.current.key,houseLabel:state.current&&state.current.label});
  }
}
async function pollTether(){
  if(!state.tetherId||!state.tetherActive)return;
  try{
    var j=await tetherGet('status'),server=j.serverTime||Date.now();
    state.phoneSeen=!!(j.phone&&server-j.phone.lastSeen<7000);
    render();
    if(state.phoneSeen&&state.pairCode){state.pairCode='';render();setStatus('PHONE LINKED • READY','good')}
    if(j.command)await processTetherCommand(j.command);
  }catch(e){}
}
setInterval(tetherHeartbeat,2200);
setInterval(pollTether,650);
try{
  state.tetherId=localStorage.getItem('sterling.tetherId.v1')||'';
  state.lastCommandId=localStorage.getItem('sterling.lastCommand.v1')||'';
}catch(e){}
if(state.tetherId){state.tetherActive=true;state.active=true;setTimeout(function(){publishHouse();tetherHeartbeat();pollTether()},450)}

var micStream=null,captureCtx=null,captureSource=null,captureProcessor=null,playCtx=null,playTime=0,playingSources=[];
function ensurePlay(){
  if(!playCtx){
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)throw new Error('This browser does not support realtime audio.');
    try{playCtx=new AC({sampleRate:24000})}catch(e){playCtx=new AC()}
  }
  return playCtx.resume();
}
function encodePCM(samples){
  var b=new ArrayBuffer(samples.length*2),v=new DataView(b);
  for(var i=0;i<samples.length;i++){var s=Math.max(-1,Math.min(1,samples[i]));v.setInt16(i*2,s<0?s*32768:s*32767,true)}
  var bytes=new Uint8Array(b),bin='',chunk=0x8000;
  for(var j=0;j<bytes.length;j+=chunk)bin+=String.fromCharCode.apply(null,bytes.subarray(j,j+chunk));
  return btoa(bin);
}
function decodePCM(b64){
  var bin=atob(b64),u=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  var i16=new Int16Array(u.buffer),out=new Float32Array(i16.length);
  for(var j=0;j<i16.length;j++)out[j]=i16[j]/32768;
  return out;
}
function resample(input,inRate,outRate){
  if(inRate===outRate)return new Float32Array(input);
  var ratio=inRate/outRate,len=Math.round(input.length/ratio),out=new Float32Array(len);
  for(var i=0;i<len;i++){var x=i*ratio,a=Math.floor(x),b=Math.min(a+1,input.length-1),f=x-a;out[i]=input[a]*(1-f)+input[b]*f}
  return out;
}
function stopPlayback(){
  for(var i=0;i<playingSources.length;i++)try{playingSources[i].stop()}catch(e){}
  playingSources=[];if(playCtx)playTime=playCtx.currentTime;
}
function playAudio(b64){
  try{
    var samples=decodePCM(b64);if(!samples.length)return;
    var ctx=playCtx;if(!ctx)return;
    var rate=24000;
    var buf=ctx.createBuffer(1,samples.length,rate);buf.getChannelData(0).set(samples);
    var src=ctx.createBufferSource();src.buffer=buf;src.connect(ctx.destination);
    var st=Math.max(playTime,ctx.currentTime);src.start(st);playTime=st+buf.duration;playingSources.push(src);
    src.onended=function(){playingSources=playingSources.filter(function(x){return x!==src})};
  }catch(e){setStatus('Audio playback error: '+(e.message||e),'bad')}
}
async function prepareMic(){
  await ensurePlay();
  if(micStream)return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Safari microphone access is unavailable on this page.');
  micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  var AC=window.AudioContext||window.webkitAudioContext;
  captureCtx=new AC();
  await captureCtx.resume();
  captureSource=captureCtx.createMediaStreamSource(micStream);
  captureProcessor=captureCtx.createScriptProcessor(1024,1,1);
  captureProcessor.onaudioprocess=function(ev){
    if(!state.connected||state.muted||!state.socket||state.socket.readyState!==WebSocket.OPEN)return;
    var samples=resample(ev.inputBuffer.getChannelData(0),captureCtx.sampleRate,24000);
    send({type:'input-audio-append',audio:encodePCM(samples)});
  };
  captureSource.connect(captureProcessor);captureProcessor.connect(captureCtx.destination);
}
function releaseMic(){
  try{if(captureProcessor)captureProcessor.onaudioprocess=null}catch(e){}
  try{if(captureProcessor)captureProcessor.disconnect()}catch(e){}
  try{if(captureSource)captureSource.disconnect()}catch(e){}
  try{if(captureCtx)captureCtx.close()}catch(e){}
  try{if(micStream)micStream.getTracks().forEach(function(t){t.stop()})}catch(e){}
  captureProcessor=null;captureSource=null;captureCtx=null;micStream=null;
}
function send(obj){try{if(state.socket&&state.socket.readyState===WebSocket.OPEN)state.socket.send(JSON.stringify(obj))}catch(e){}}

function isGatewaySetupError(msg){return /client secrets can only be minted with a Gateway API key|needs a Vercel AI Gateway API key|AI Gateway API key/i.test(String(msg||''))}
function showVoiceSetup(msg){setStatus(msg||'Voice runs on the paired phone in V13.','bad')}

function routeContext(){
  return 'Current live Salesforce house: '+(state.current?state.current.label:'not detected')+'. Treat this as the only active household. If not detected, confirm the area before any CRM update.';
}

async function connectSocket(){
  if(!state.active||state.connecting)return;
  state.connecting=true;state.connected=false;render();setStatus('CONNECTING…');
  try{
    var r=await fetch(APP+'/api/realtime-token?v=12.2&t='+Date.now(),{method:'GET',mode:'cors',cache:'no-store'});
    var setup=await r.json();
    if(!r.ok||!setup.token||!setup.url)throw new Error(setup.error||'Realtime setup failed');
    var protocols=(setup.protocols&&setup.protocols.length)?setup.protocols:['ai-gateway-realtime.v1','ai-gateway-auth.'+setup.token];
    var ws=new WebSocket(setup.url,protocols);
    state.socket=ws;
    var greeted=false;
    ws.onopen=function(){
      state.connecting=false;
      send({type:'session-update',config:{
        instructions:setup.instructions,
        voice:'marin',
        outputModalities:['audio'],
        inputAudioFormat:{type:'audio/pcm',rate:24000},
        outputAudioFormat:{type:'audio/pcm',rate:24000},
        turnDetection:{type:'server-vad',threshold:0.45,prefixPaddingMs:300,silenceDurationMs:550},
        tools:setup.tools||[]
      }});
    };
    ws.onmessage=function(ev){
      var m;try{m=JSON.parse(ev.data)}catch(e){return}
      if(m.type==='session-created'||m.type==='session-started'||m.type==='session-updated'){
        state.connected=true;state.connecting=false;state.reconnects=0;$('voiceSetup').style.display='none';render();setStatus('LIVE • LISTENING','good');
        send({type:'context-append',content:routeContext(),delegationId:null});
        if(!greeted){
          greeted=true;
          send({type:'conversation-item-create',item:{type:'text-message',role:'user',text:"Start the live doorway conversation now. Introduce yourself briefly as Sterling, London's assistant, then ask for the customer's first name."}});
          send({type:'response-create',options:{modalities:['audio']}});
        }
      }else if(m.type==='speech-started'){
        stopPlayback();send({type:'response-cancel'});setStatus('LISTENING','good');
      }else if(m.type==='speech-stopped'){
        setStatus('THINKING…');
      }else if(m.type==='audio-delta'||m.type==='audio-chunk'){
        playAudio(m.delta||'');setStatus('STERLING SPEAKING','good');
      }else if(m.type==='function-call-arguments-done'){
        handleTool(m);
      }else if(m.type==='error'){
        if(isGatewaySetupError(m.message)){showVoiceSetup(m.message);try{ws.close()}catch(e){};return}
        setStatus(m.message||'Realtime error','bad');
      }
    };
    ws.onerror=function(){setStatus('Realtime connection error','bad')};
    ws.onclose=function(){
      state.connected=false;state.connecting=false;render();
      if(state.active){
        state.reconnects++;
        var delay=Math.min(6000,1000*state.reconnects);
        setStatus('RECONNECTING…');
        setTimeout(connectSocket,delay);
      }else setStatus('STOPPED');
    };
  }catch(e){
    var msg=e&&e.message?e.message:String(e);
    if(isGatewaySetupError(msg)){showVoiceSetup(msg);return}
    state.connecting=false;state.connected=false;render();setStatus(msg,'bad');
    if(state.active){state.reconnects++;setTimeout(connectSocket,Math.min(6000,1000*state.reconnects))}
  }
}

async function startSterling(){
  if(state.active){openPanel();return}
  openPanel();setStatus('REQUESTING MICROPHONE…');
  try{
    await prepareMic();
    state.active=true;state.muted=false;render();
    await connectSocket();
  }catch(e){
    state.active=false;render();setStatus(e.message||String(e),'bad');
    releaseMic();
  }
}
function stopSterling(){
  state.active=false;state.connected=false;state.connecting=false;
  try{if(state.socket)state.socket.close()}catch(e){}
  state.socket=null;releaseMic();stopPlayback();render();setStatus('STOPPED');
}
function toggleMute(){state.muted=!state.muted;render();setStatus(state.muted?'MIC MUTED':'LIVE • LISTENING',state.muted?'':'good')}


function toolReply(callId,name,obj){
  send({type:'conversation-item-create',item:{type:'function-call-output',callId:callId,name:name,output:JSON.stringify(obj)}});
  send({type:'response-create',options:{modalities:['audio']}});
}
function normalizeContact(field,value){
  var v=clean(value);
  if(field==='phone'){
    var d=v.replace(/\D/g,'');if(d.length===11&&d.charAt(0)==='1')d=d.slice(1);
    if(d.length!==10)throw new Error('Phone must have ten digits');return d;
  }
  if(field==='email'){
    v=v.replace(/\s+/g,'').toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new Error('Email is incomplete');
    return v;
  }
  if(!/[A-Za-zÀ-ÿ]/.test(v))throw new Error('Name is incomplete');
  return v.slice(0,80);
}
async function handleTool(m){
  var a={};try{a=JSON.parse(m.arguments||'{}')}catch(e){}
  try{
    if(m.name==='saveContact'){
      if(a.confirmed!==true)throw new Error('Customer has not confirmed that field yet');
      var f=a.field;if(['first','last','phone','email'].indexOf(f)<0)throw new Error('Unknown contact field');
      state.contact[f]=normalizeContact(f,a.value);render();
      toolReply(m.callId,m.name,{ok:true,saved:f});
      return;
    }
    if(m.name==='setStage'){
      state.stage=a.stage||state.stage;render();toolReply(m.callId,m.name,{ok:true,stage:state.stage});return;
    }
    if(m.name==='flagAddressMismatch'){
      state.mismatch=true;setStatus('ADDRESS MISMATCH • OPEN CORRECT HOUSE','bad');
      toolReply(m.callId,m.name,{ok:true,blocked:true,current:state.current?state.current.label:null});return;
    }
    if(m.name==='commitContact'){
      var c=state.contact;
      if(!(c.first&&c.last&&c.phone&&c.email))throw new Error('All four confirmed contact fields are required');
      if(!state.current)throw new Error('Current Salesforce house is not detected');
      if(state.mismatch)throw new Error('Address mismatch is blocking the CRM update');
      if(state.updateBusy){toolReply(m.callId,m.name,{ok:true,alreadyRunning:true});return}
      state.updateBusy=true;setStatus('UPDATING SALESFORCE…','good');
      toolReply(m.callId,m.name,{ok:true,started:true,currentHouse:state.current.label});
      updateSalesforce().then(function(result){
        state.updateBusy=false;
        if(result&&result.orderId){
          state.orderId=result.orderId;render();setStatus('ORDER ID CAPTURED','good');
          send({type:'context-append',content:'Salesforce update succeeded for '+state.current.label+'. Partner Order ID: '+result.orderId+'.',delegationId:null});
        }
      }).catch(function(e){
        state.updateBusy=false;setStatus(e.message||String(e),'bad');
        send({type:'context-append',content:'Salesforce automation stopped safely. Reason: '+(e.message||String(e))+'. Do not claim the CRM was updated.',delegationId:null});
      });
      return;
    }
    toolReply(m.callId,m.name,{ok:false,error:'Unknown tool'});
  }catch(e){toolReply(m.callId,m.name,{ok:false,error:e.message||String(e)})}
}

function docs(){return allDocs()}
function attrs(el){
  return [el&&el.name,el&&el.id,el&&el.placeholder,el&&el.getAttribute&&el.getAttribute('aria-label'),el&&el.getAttribute&&el.getAttribute('title')].map(clean).join(' ');
}
function findCurrentAddressElement(){
  var want=state.current&&state.current.street;if(!want)return null;
  var best=null;
  docs().forEach(function(d){
    arr(d.querySelectorAll('div,span,p,a,strong,h1,h2,h3,td')).forEach(function(el){
      if(!isVisible(el))return;
      var t=text(el);if(!t||norm(t).indexOf(norm(want))<0||t.length>220)return;
      var r=el.getBoundingClientRect(),score=0;
      if(r.top>=0&&r.top<120)score+=1500;else if(r.top<250)score+=700;
      if(/Previous\s+Opportunity|Next\s+Opportunity/i.test(t))score-=3000;
      if(!best||score>best.score)best={el:el,doc:d,score:score};
    });
  });
  return best;
}
function findEditor(){
  var out=null;
  docs().some(function(d){
    var inputs=arr(d.querySelectorAll('input')).filter(isVisible);
    var phone=inputs.find(function(el){return /primary\s*(number|phone)|phone/i.test(attrs(el))});
    var email=inputs.find(function(el){return /email/i.test(attrs(el))});
    if(phone&&email){out={doc:d,inputs:inputs,phone:phone,email:email};return true}
    return false;
  });
  return out;
}
async function waitFor(fn,timeout){
  var until=Date.now()+(timeout||9000);
  while(Date.now()<until){var v=null;try{v=fn()}catch(e){}if(v)return v;await sleep(140)}
  return null;
}
function editControl(){
  var current=findCurrentAddressElement(),best=null;
  docs().forEach(function(d){
    arr(d.querySelectorAll('[title],[aria-label],button,a,span,svg')).forEach(function(el){
      if(!isVisible(el))return;
      var label=attrs(el)+' '+text(el);
      if(!/edit/i.test(label))return;
      var r=el.getBoundingClientRect(),score=0;
      if(/edit\s*address/i.test(label))score+=2200;
      if(r.top>=0&&r.top<150)score+=1000;
      var p=el.parentElement,depth=0,local='';
      while(p&&depth<3){var pt=text(p);if(pt&&pt.length<500)local+=' '+pt;p=p.parentElement;depth++}
      if(state.current&&norm(local).indexOf(norm(state.current.street))>=0)score+=1800;
      if(current&&current.doc===d){
        try{var cr=current.el.getBoundingClientRect();score+=Math.max(0,600-Math.abs(r.top-cr.top)*5)}catch(e){}
      }
      if(!best||score>best.score)best={el:el,score:score};
    });
  });
  return best&&best.score>700?best.el:null;
}
async function openEditor(){
  var f=findEditor();if(f)return f;
  var e=editControl();if(!e)throw new Error('Could not find the current-house edit pencil');
  safeClick(e);
  f=await waitFor(findEditor,9000);
  if(!f)throw new Error('Customer edit form did not open');
  return f;
}
function nameFields(f){
  var inputs=f.inputs.filter(function(el){return el!==f.phone&&el!==f.email});
  var first=inputs.find(function(el){return /^prospective$/i.test(clean(el.value))})||inputs.find(function(el){return /first.*name/i.test(attrs(el))});
  var last=inputs.find(function(el){return /^customer$/i.test(clean(el.value))})||inputs.find(function(el){return /last.*name/i.test(attrs(el))});
  if(!first||!last){
    var textInputs=inputs.filter(function(el){var type=(el.type||'text').toLowerCase();return type==='text'||type==='search'||type==='' });
    if(textInputs.length>=2){first=first||textInputs[0];last=last||textInputs[1]}
  }
  if(!first||!last)throw new Error('Could not identify first and last name fields');
  return {first:first,last:last};
}
function nativeSet(el,value){
  var w=el.ownerDocument&&el.ownerDocument.defaultView?el.ownerDocument.defaultView:window;
  var proto=(el.tagName==='TEXTAREA'&&w.HTMLTextAreaElement)?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;
  var desc=Object.getOwnPropertyDescriptor(proto,'value');
  if(desc&&desc.set)desc.set.call(el,value);else el.value=value;
  ['input','change','blur'].forEach(function(type){
    try{el.dispatchEvent(new w.Event(type,{bubbles:true}))}catch(e){}
  });
}
function saveButton(d){
  var els=arr(d.querySelectorAll('button,input[type=button],input[type=submit],a')).filter(isVisible);
  var buttons=els.filter(function(el){return clean(el.value||text(el)).toLowerCase()==='save'});
  buttons.sort(function(a,b){return (a.disabled?1:0)-(b.disabled?1:0)});
  return buttons[0]||null;
}
function bodyHasAddress(d,street){
  try{return norm((d.body.innerText||'').slice(0,2500)).indexOf(norm(street))>=0}catch(e){return false}
}
async function fillAndSave(){
  var expected=state.current&&state.current.key;if(!expected)throw new Error('No stable current house');
  var f=await openEditor();
  var now=detectCurrent();
  if(now&&now.key!==expected)throw new Error('House changed while opening the edit form');
  var streetInput=f.inputs.find(function(el){return norm(el.value)===norm(state.current.street)});
  if(!streetInput&&!bodyHasAddress(f.doc,state.current.street))throw new Error('Edit form does not match the current house');
  var n=nameFields(f),c=state.contact;
  nativeSet(n.first,c.first);nativeSet(n.last,c.last);nativeSet(f.phone,c.phone);nativeSet(f.email,c.email);
  var b=await waitFor(function(){var x=saveButton(f.doc);return x&&!x.disabled?x:null},4500);
  if(!b)throw new Error('Save button never became enabled');
  safeClick(b);
  var closed=await waitFor(function(){return !findEditor()},7000);
  if(!closed)await sleep(900);
  var after=detectCurrent();if(after&&after.key!==expected)throw new Error('House changed after save');
}
function orderButton(){
  var best=null;
  docs().forEach(function(d){
    arr(d.querySelectorAll('button,a,[role=button],span')).forEach(function(el){
      if(!isVisible(el))return;
      var label=clean(el.innerText||el.textContent||el.getAttribute&&el.getAttribute('aria-label'));
      if(label.toLowerCase()!=='order')return;
      var r=el.getBoundingClientRect(),score=0;
      if(r.top>250)score+=800;
      if(r.top>500)score+=700;
      var p=el.parentElement,depth=0,local='';
      while(p&&depth<3){var pt=text(p);if(pt&&pt.length<700)local+=' '+pt;p=p.parentElement;depth++}
      if(/Collateral|Loop|Map|List|Add\s+New|Next/i.test(local))score+=1400;
      if(/Opportunity\s+Contact\s+DM\s+Presentation\s+Order/i.test(local))score-=1200;
      if(!best||score>best.score)best={el:el,score:score};
    });
  });
  return best&&best.score>500?best.el:null;
}
function readOrderId(){
  var re=/Partner\s+Order\s+Id\s*:\s*([A-Z0-9-]{5,})/i;
  var ds=docs();
  for(var i=0;i<ds.length;i++){var m=text(ds[i].body).match(re);if(m)return m[1]}
  return '';
}
async function createOrder(){
  var b=orderButton();if(!b)throw new Error('Could not find the record-level Order button');
  safeClick(b);
  var code=await waitFor(readOrderId,14000);
  if(!code)throw new Error('Order opened but Partner Order ID was not detected');
  try{await navigator.clipboard.writeText(code)}catch(e){}
  return code;
}
async function updateSalesforce(){
  var expected=state.current&&state.current.key;if(!expected)throw new Error('No current house');
  var stable=0;
  for(var i=0;i<4;i++){var d=detectCurrent();if(d&&d.key===expected)stable++;await sleep(180)}
  if(stable<3)throw new Error('Current house is not stable enough to update safely');
  await fillAndSave();
  var code=await createOrder();
  return {orderId:code};
}

setInterval(scanHouse,POLL_MS);
scanHouse();setTimeout(scanHouse,250);setTimeout(scanHouse,700);
render();

window.__sterlingONE={
  version:VERSION,
  open:openPanel,
  start:startTether,
  stop:stopTether,
  state:function(){return {version:VERSION,current:state.current,contact:state.contact,stage:state.stage,connected:state.connected,orderId:state.orderId,lastError:state.lastError}}
};
})();