
(function(){
'use strict';

const ICL=/(\.|^)iclportal\.com$/i;
if(!ICL.test(location.hostname)){
  const frame=[...document.querySelectorAll('iframe')].find(f=>/iclportal\.com/i.test(f.src||''));
  if(frame?.src){
    if(confirm('Sterling found the active ICL route window inside Salesforce. Open it directly so the helper can work?')) location.href=frame.src;
    return;
  }
  alert('Open a house/route stop in Geopointe first, then run Sterling Helper again.');
  return;
}

const ID='sterling-route-helper-v6';
document.getElementById(ID)?.remove();

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const visible=e=>!!(e&&e.getClientRects().length);
const text=e=>(e?.innerText||e?.textContent||'').replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const params=new URLSearchParams(location.search);
const stop={
  routeId:params.get('routeId')||params.get('gpRouteId')||'',
  gpRouteStopId:params.get('gpRouteStopId')||'',
  street:params.get('street')||'',
  city:params.get('city')||'',
  postalcode:params.get('postalcode')||'',
  state:params.get('state')||'',
  latitude:params.get('latitude')||'',
  longitude:params.get('longitude')||''
};

let packet=null,busy=false;

const panel=document.createElement('div');
panel.id=ID;
panel.style.cssText='position:fixed;z-index:2147483647;right:14px;bottom:14px;width:min(440px,calc(100vw - 28px));max-height:84vh;overflow:auto;background:#071424;color:#fff;border:1px solid #2d6ca2;border-radius:18px;box-shadow:0 16px 55px #0009;font:15px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:16px';
panel.innerHTML=
'<div style="display:flex;justify-content:space-between;gap:12px;align-items:center">'+
'<b style="font-size:18px;color:#61bdff">Sterling Route Helper</b>'+
'<button id="srh-close" style="background:#173550;color:#fff;border:0;border-radius:9px;padding:8px 11px">Close</button></div>'+
'<div id="srh-stop" style="margin:10px 0;color:#b9d8f3"></div>'+
'<div id="srh-msg" style="padding:10px 12px;background:#0b233a;border-radius:12px;line-height:1.4">Checking for a confirmed Sterling customer…</div>'+
'<div id="srh-customer" style="display:none;margin:12px 0;line-height:1.55"></div>'+
'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'+
'<button id="srh-start" style="flex:1;background:#124779;color:#fff;border:0;border-radius:11px;padding:13px;font-weight:700">Start Sterling for this stop</button>'+
'<button id="srh-run" disabled style="flex:1;background:#087fe2;color:#fff;border:0;border-radius:11px;padding:13px;font-weight:700">Fill + Save + Order</button></div>'+
'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+
'<button id="srh-paste" style="background:#173550;color:#fff;border:0;border-radius:11px;padding:11px">Paste packet</button></div>'+
'<div id="srh-code" style="display:none;margin-top:12px;padding:12px;border-radius:12px;background:#0b3927;color:#8df2bd;font-weight:700"></div>'+
'<div style="font-size:11px;color:#7391aa;margin-top:10px">Only first name, last name, phone and email are transferred. No SSN, ID, PIN, payment or verification data.</div>';
document.body.appendChild(panel);

q('#srh-close',panel).onclick=()=>panel.remove();
q('#srh-stop',panel).textContent='Active stop: '+([stop.street,stop.city,stop.state,stop.postalcode].filter(Boolean).join(', ')||'route stop detected')+(stop.gpRouteStopId?' • '+stop.gpRouteStopId:'');

const msg=s=>q('#srh-msg',panel).textContent=s;
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtPhone=s=>{const d=String(s).replace(/\D/g,'');return d.length===10?'('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6):s};

function sterlingUrl(){
  const u=new URL('https://sterling-olive.vercel.app/');
  for(const [k,v] of Object.entries(stop))if(v)u.searchParams.set(k,v);
  return u.toString();
}
q('#srh-start',panel).onclick=()=>window.open(sterlingUrl(),'_blank');

function showPacket(p){
  if(!p||!p.first||!p.last||!p.phone||!p.email){msg('No complete customer packet yet. Tap Start Sterling for this stop, finish the four contact details, then return here and run the helper again.');return}
  if(p.expiresAt&&Date.now()>p.expiresAt){msg('That Sterling packet expired. Start Sterling again for this stop.');return}
  packet=p;
  q('#srh-customer',panel).style.display='block';
  q('#srh-customer',panel).innerHTML='<b>'+esc(p.first)+' '+esc(p.last)+'</b><br>'+esc(fmtPhone(p.phone))+'<br>'+esc(p.email);
  q('#srh-run',panel).disabled=false;
  msg('Customer loaded. Confirm the active house above, then tap Fill + Save + Order.');
}

function parsePacket(raw){
  raw=String(raw||'').trim();
  if(raw.startsWith('STERLING_ROUTE_V'))raw=raw.slice(raw.indexOf('\n')+1);
  try{return JSON.parse(raw)}catch{return null}
}

window.addEventListener('message',e=>{
  if(e.origin!=='https://sterling-olive.vercel.app')return;
  if(e.data?.type==='STERLING_ROUTE_PACKET_V2')showPacket(e.data.packet);
});

q('#srh-paste',panel).onclick=async()=>{
  let raw='';
  try{raw=await navigator.clipboard.readText()}catch{}
  if(!raw)raw=prompt('Paste the Sterling route packet:')||'';
  const p=parsePacket(raw);
  if(p)showPacket(p);else msg('That was not a valid Sterling packet.');
};

try{window.open('https://sterling-olive.vercel.app/bridge.html','sterlingBridge','popup,width=420,height=340')}catch{}

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
  for(let i=0;i<35;i++){if(editorReady())return true;await sleep(150)}
  return false;
}

async function waitOrderCode(){
  const re=/Partner\s+Order\s+Id\s*:\s*([A-Z0-9-]{6,})/i;
  for(let i=0;i<90;i++){
    const m=(document.body.innerText||'').match(re);
    if(m)return m[1];
    await sleep(150);
  }
  return '';
}

q('#srh-run',panel).onclick=async()=>{
  if(busy||!packet)return;
  busy=true;q('#srh-run',panel).disabled=true;
  try{
    if(packet.gpRouteStopId&&stop.gpRouteStopId&&packet.gpRouteStopId!==stop.gpRouteStopId)throw Error('STOP');
    if(packet.street&&stop.street&&packet.street.trim().toLowerCase()!==stop.street.trim().toLowerCase())throw Error('ADDR');

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

    await sleep(1300);
    msg('Starting the order and waiting for the Partner Order ID…');
    if(!clickExact('Order'))throw Error('ORDER');

    const code=await waitOrderCode();
    if(!code)throw Error('CODE');

    q('#srh-code',panel).style.display='block';
    q('#srh-code',panel).textContent='Partner Order ID: '+code;
    msg('Done. Partner Order ID captured.');
    try{await navigator.clipboard.writeText(code)}catch{}
  }catch(e){
    const errors={
      STOP:'Safety stop: this Sterling packet belongs to a different route stop.',
      ADDR:'Safety stop: the Sterling packet address does not match this house.',
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
};
})();