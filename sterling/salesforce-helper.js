
(function(){
'use strict';

const ORIGIN='https://sterling-olive.vercel.app';
const ICL=/(\.|^)iclportal\.com$/i;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const visible=e=>!!(e&&e.getClientRects().length);
const text=e=>(e?.innerText||e?.textContent||'').replace(/\s+/g,' ').trim();
const rand=()=>crypto?.randomUUID?.()||('s'+Date.now().toString(36)+Math.random().toString(36).slice(2));

if(!ICL.test(location.hostname)){
  const frame=[...document.querySelectorAll('iframe')].find(f=>/iclportal\.com/i.test(f.src||''));
  if(frame?.src){
    if(confirm('Sterling found the active ICL route page inside Salesforce. Open that route page directly so the helper can work?')) location.href=frame.src;
    return;
  }
  alert('Open an active house in Geopointe / ICL first, then tap the Sterling Helper bookmark.');
  return;
}

const ID='sterling-route-helper-v8';
document.getElementById(ID)?.remove();
document.getElementById(ID+'-style')?.remove();

const style=document.createElement('style');
style.id=ID+'-style';
style.textContent=
'#'+ID+'{position:fixed;z-index:2147483647;right:14px;bottom:14px;width:min(440px,calc(100vw - 28px));max-height:84vh;overflow:auto;background:#071424;color:#fff;border:1px solid #2d6ca2;border-radius:18px;box-shadow:0 16px 55px #0009;font:15px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:16px}'+
'#'+ID+' button{font:inherit;touch-action:manipulation}'+
'@media(max-width:700px){#'+ID+'{left:0;right:0;bottom:0;width:100%;max-height:62vh;border-radius:18px 18px 0 0;padding:16px env(safe-area-inset-right) calc(16px + env(safe-area-inset-bottom)) env(safe-area-inset-left)}}';
document.head.appendChild(style);

function currentStop(){
  const p=new URLSearchParams(location.search);
  return {
    routeId:p.get('routeId')||p.get('gpRouteId')||'',
    gpRouteStopId:p.get('gpRouteStopId')||'',
    street:p.get('street')||'',
    city:p.get('city')||'',
    postalcode:p.get('postalcode')||'',
    state:p.get('state')||'',
    latitude:p.get('latitude')||'',
    longitude:p.get('longitude')||''
  };
}
let stop=currentStop();
let hrefSeen=location.href;
let packet=null,busy=false,cancelAuto=false;
let helperToken=sessionStorage.getItem('sterling.helper.token')||rand();
sessionStorage.setItem('sterling.helper.token',helperToken);

const panel=document.createElement('div');
panel.id=ID;
panel.innerHTML=
'<div style="display:flex;justify-content:space-between;gap:12px;align-items:center">'+
'<div><b style="font-size:18px;color:#61bdff">Sterling Helper</b><div style="font-size:11px;color:#82a8c8;margin-top:2px">V9 • Live Voice auto route mode</div></div>'+
'<button id="srh-close" style="background:#173550;color:#fff;border:0;border-radius:9px;padding:8px 11px">Close</button></div>'+
'<div id="srh-stop" style="margin:10px 0;color:#b9d8f3"></div>'+
'<div id="srh-msg" style="padding:10px 12px;background:#0b233a;border-radius:12px;line-height:1.4">Linking this house to Sterling…</div>'+
'<div id="srh-customer" style="display:none;margin:12px 0;line-height:1.55"></div>'+
'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'+
'<button id="srh-start" style="flex:1;background:#124779;color:#fff;border:0;border-radius:11px;padding:13px;font-weight:700">Open Sterling Live</button>'+
'<button id="srh-run" disabled style="flex:1;background:#087fe2;color:#fff;border:0;border-radius:11px;padding:13px;font-weight:700">Run now</button></div>'+
'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+
'<button id="srh-paste" style="background:#173550;color:#fff;border:0;border-radius:11px;padding:11px">Paste backup packet</button>'+
'<button id="srh-auto" style="background:#0b3927;color:#8df2bd;border:0;border-radius:11px;padding:11px">Auto mode: ON</button></div>'+
'<div id="srh-code" style="display:none;margin-top:12px;padding:12px;border-radius:12px;background:#0b3927;color:#8df2bd;font-weight:700"></div>'+
'<div style="font-size:11px;color:#7391aa;margin-top:10px">Sterling will only auto-run when the saved packet matches this route stop/address. Sensitive data stays out of the helper.</div>';
document.body.appendChild(panel);

const msg=s=>q('#srh-msg',panel).textContent=s;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtPhone=s=>{const d=String(s||'').replace(/\D/g,'');return d.length===10?'('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6):s};
let autoMode=sessionStorage.getItem('sterling.helper.auto')!=='off';

function renderAuto(){q('#srh-auto',panel).textContent='Auto mode: '+(autoMode?'ON':'OFF');q('#srh-auto',panel).style.background=autoMode?'#0b3927':'#4a2730';q('#srh-auto',panel).style.color=autoMode?'#8df2bd':'#ffd0d8'}
function renderStop(){
  stop=currentStop();
  q('#srh-stop',panel).textContent='Active house: '+([stop.street,stop.city,stop.state,stop.postalcode].filter(Boolean).join(', ')||'route stop detected')+(stop.gpRouteStopId?' • verified stop ID loaded':'');
}
function sterlingUrl(){
  const u=new URL(ORIGIN+'/live.html');
  for(const [k,v] of Object.entries(stop))if(v)u.searchParams.set(k,v);
  u.searchParams.set('helperToken',helperToken);
  u.searchParams.set('helperOrigin',location.origin);
  return u.toString();
}
function bridgeUrl(){
  const u=new URL(ORIGIN+'/bridge.html');
  u.searchParams.set('token',helperToken);
  u.searchParams.set('origin',location.origin);
  return u.toString();
}
function exactMatch(p){
  if(!p)return false;
  if(p.gpRouteStopId&&stop.gpRouteStopId&&p.gpRouteStopId!==stop.gpRouteStopId)return false;
  if(p.routeId&&stop.routeId&&p.routeId!==stop.routeId)return false;
  if(p.street&&stop.street&&p.street.trim().toLowerCase()!==stop.street.trim().toLowerCase())return false;
  return true;
}
function parsePacket(raw){
  raw=String(raw||'').trim();
  if(raw.startsWith('STERLING_ROUTE_V'))raw=raw.slice(raw.indexOf('\n')+1);
  try{return JSON.parse(raw)}catch{return null}
}

async function showPacket(p){
  if(!p||!p.first||!p.last||!p.phone||!p.email){msg('Sterling has not finished the four contact details yet. Keep talking with the customer.');return}
  if(p.expiresAt&&Date.now()>Number(p.expiresAt)){msg('That Sterling packet expired. Open Sterling again for this house.');return}
  if(!exactMatch(p)){
    packet=null;
    q('#srh-run',panel).disabled=true;
    msg('Safety stop: the Sterling packet does not match this active house. Nothing will be edited.');
    return;
  }
  packet=p;
  q('#srh-customer',panel).style.display='block';
  q('#srh-customer',panel).innerHTML='<b>'+esc(p.first)+' '+esc(p.last)+'</b><br>'+esc(fmtPhone(p.phone))+'<br>'+esc(p.email);
  q('#srh-run',panel).disabled=false;
  msg(autoMode?'Customer matched to this house. Auto-completing Salesforce now…':'Customer matched. Tap Run now when ready.');
  if(autoMode&&!busy&&!cancelAuto){
    await sleep(700);
    if(packet&&!busy&&autoMode&&!cancelAuto)runFlow();
  }
}

q('#srh-close',panel).onclick=()=>{cancelAuto=true;panel.remove();style.remove()};
q('#srh-start',panel).onclick=()=>window.open(sterlingUrl(),'sterlingAssistant');
q('#srh-run',panel).onclick=()=>runFlow();
q('#srh-auto',panel).onclick=()=>{autoMode=!autoMode;sessionStorage.setItem('sterling.helper.auto',autoMode?'on':'off');renderAuto();msg(autoMode?'Auto mode is on. A matching Sterling packet will fill, save, and open Order automatically.':'Auto mode is off. Sterling will wait for you to tap Run now.');};
q('#srh-paste',panel).onclick=async()=>{let raw='';try{raw=await navigator.clipboard.readText()}catch{}if(!raw)raw=prompt('Paste the Sterling route packet:')||'';const p=parsePacket(raw);if(p)showPacket(p);else msg('That was not a valid Sterling packet.');};

window.addEventListener('message',e=>{
  if(e.origin!==ORIGIN)return;
  const m=e.data||{};
  if(m.token&&m.token!==helperToken)return;
  if(m.type==='STERLING_ROUTE_PACKET_V2')showPacket(m.packet);
});

function setNativeValue(el,val){
  const proto=Object.getPrototypeOf(el);
  const d=Object.getOwnPropertyDescriptor(proto,'value')||Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  if(d?.set)d.set.call(el,val);else el.value=val;
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
  el.blur?.();
}
function findInput(kind){
  const all=qa('input').filter(visible);
  const meta=x=>(x.placeholder||'')+' '+(x.name||'')+' '+(x.getAttribute('aria-label')||'');
  if(kind==='first')return all.find(x=>/^prospective$/i.test(x.value.trim()))||all.find(x=>/first.*name/i.test(meta(x)));
  if(kind==='last')return all.find(x=>/^customer$/i.test(x.value.trim()))||all.find(x=>/last.*name/i.test(meta(x)));
  if(kind==='phone')return all.find(x=>/primary\s*(number|phone)|phone/i.test(meta(x)));
  if(kind==='email')return all.find(x=>/email/i.test(meta(x)));
}
const editorReady=()=>!!(findInput('first')&&findInput('last')&&findInput('phone')&&findInput('email'));
function clickExact(label){
  const el=qa('button,a,[role="button"]').filter(visible).find(e=>text(e).toLowerCase()===label.toLowerCase());
  if(el){el.click();return true}
  return false;
}
async function openEditor(){
  if(editorReady())return true;
  const nodes=qa('[title],[aria-label],button,a,span').filter(visible);
  let edit=nodes.find(x=>/edit address/i.test((x.getAttribute('title')||'')+' '+(x.getAttribute('aria-label')||'')));
  if(!edit)edit=nodes.find(x=>/edit/i.test((x.getAttribute('title')||'')+' '+(x.getAttribute('aria-label')||''))&&/address|customer/i.test(text(x.parentElement)));
  if(edit)edit.click();
  else qa('button,a,[role="button"]').filter(visible).find(x=>/edit/i.test((x.getAttribute('title')||'')+' '+(x.getAttribute('aria-label')||'')))?.click();
  for(let i=0;i<40;i++){if(editorReady())return true;await sleep(150)}
  return false;
}
async function waitOrderCode(){
  const re=/Partner\s+Order\s+Id\s*:\s*([A-Z0-9-]{6,})/i;
  for(let i=0;i<100;i++){const m=(document.body.innerText||'').match(re);if(m)return m[1];await sleep(150)}
  return '';
}

async function runFlow(){
  if(busy||!packet)return;
  busy=true;q('#srh-run',panel).disabled=true;
  try{
    renderStop();
    if(!exactMatch(packet))throw Error('STOP');
    msg('Opening customer editor…');
    if(!await openEditor())throw Error('EDITOR');
    const first=findInput('first'),last=findInput('last'),phone=findInput('phone'),email=findInput('email');
    if(!(first&&last&&phone&&email))throw Error('FIELDS');
    setNativeValue(first,packet.first);
    setNativeValue(last,packet.last);
    setNativeValue(phone,fmtPhone(packet.phone));
    setNativeValue(email,packet.email);
    msg('Saving customer details…');
    const scope=first.closest('form')||first.closest('[role="dialog"]')||document;
    let save=qa('button,input[type="button"],input[type="submit"]',scope).filter(visible).find(e=>(e.value||text(e)).trim().toLowerCase()==='save');
    save=save||qa('button,input[type="button"],input[type="submit"]').filter(visible).find(e=>(e.value||text(e)).trim().toLowerCase()==='save');
    if(!save)throw Error('SAVE');
    save.click();
    await sleep(1200);
    msg('Starting Order and waiting for the Partner Order ID…');
    if(!clickExact('Order'))throw Error('ORDER');
    const code=await waitOrderCode();
    if(!code)throw Error('CODE');
    q('#srh-code',panel).style.display='block';
    q('#srh-code',panel).textContent='Partner Order ID: '+code;
    msg('Done. Sterling captured the Partner Order ID.');
    try{await navigator.clipboard.writeText(code)}catch{}
    try{
      const w=window.open('', 'sterlingAssistant');
      if(w)w.postMessage({type:'STERLING_PARTNER_ORDER_ID',token:helperToken,code},ORIGIN);
    }catch{}
  }catch(e){
    const errors={
      STOP:'Safety stop: the customer packet no longer matches this active house.',
      EDITOR:'I could not open the customer editor on this layout.',
      FIELDS:'I opened the editor but could not identify all four contact fields.',
      SAVE:'I filled the fields but could not identify the Save button.',
      ORDER:'Customer saved, but I could not identify the Order button.',
      CODE:'Order opened, but I could not read a Partner Order ID.'
    };
    msg(errors[e.message]||'Sterling Helper stopped before making another change.');
  }finally{
    busy=false;q('#srh-run',panel).disabled=!packet;
  }
}

function pollRoute(){
  if(location.href!==hrefSeen){
    hrefSeen=location.href;
    const before=stop.gpRouteStopId||stop.street;
    stop=currentStop();
    const after=stop.gpRouteStopId||stop.street;
    if(before!==after){
      packet=null;
      cancelAuto=false;
      q('#srh-customer',panel).style.display='none';
      q('#srh-code',panel).style.display='none';
      q('#srh-run',panel).disabled=true;
      renderStop();
      msg('New house detected. Sterling Helper updated to this route stop.');
    }
  }
}
setInterval(pollRoute,800);
renderStop();renderAuto();

// First try to recover a completed Sterling packet from this device.
// If nothing is waiting, automatically open Sterling linked to this house once per route.
try{
  window.open(bridgeUrl(),'sterlingBridge','popup,width=420,height=340');
}catch{}
const routeKey='sterling.helper.launched.'+(stop.gpRouteStopId||stop.street||stop.routeId||'route');
if(!sessionStorage.getItem(routeKey)){
  sessionStorage.setItem(routeKey,'1');
  setTimeout(()=>{if(!packet)window.open(sterlingUrl(),'sterlingAssistant')},250);
}else{
  msg('Helper linked. If Sterling is already open, keep talking. If not, tap Open Sterling.');
}
})();