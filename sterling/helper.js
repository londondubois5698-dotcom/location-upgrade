
(function(){
  'use strict';
  if(window.__sterlingRouteHelper?.open){window.__sterlingRouteHelper.open();return;}

  const APP_ORIGIN='https://sterling-olive.vercel.app';
  const VERSION='1.1.0';
  const bridgeToken=Array.from(crypto.getRandomValues(new Uint32Array(4))).map(n=>n.toString(16)).join('-');
  const qs=new URLSearchParams(location.search);

  function clean(s){return String(s||'').trim();}
  function norm(s){return clean(s).toLowerCase().replace(/[^a-z0-9]/g,'');}
  function visible(el){
    if(!el||!(el instanceof Element))return false;
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0;
  }
  function text(el){return clean(el?.innerText||el?.textContent);}
  function currentStop(){
    return {
      routeId:qs.get('routeId')||qs.get('gpRouteId')||'',
      gpRouteStopId:qs.get('gpRouteStopId')||'',
      street:qs.get('street')||'',
      city:qs.get('city')||'',
      postalcode:qs.get('postalcode')||'',
      state:qs.get('state')||'',
      latitude:qs.get('latitude')||'',
      longitude:qs.get('longitude')||''
    };
  }
  function stopLabel(s){
    return [s.street,s.city,s.state,s.postalcode].filter(Boolean).join(', ');
  }
  function allDocs(){
    const out=[],seen=new Set();
    function walk(w){
      try{
        const d=w.document;
        if(!d||seen.has(d))return;
        seen.add(d);out.push(d);
        for(const f of d.querySelectorAll('iframe')){
          try{if(f.contentWindow)walk(f.contentWindow);}catch{}
        }
      }catch{}
    }
    walk(window);try{if(top!==window)walk(top);}catch{}
    return out;
  }
  function candidates(selector){
    return allDocs().flatMap(d=>Array.from(d.querySelectorAll(selector))).filter(visible);
  }
  function byExactText(label,selector='button,a,[role="button"]'){
    return candidates(selector).filter(el=>text(el).trim().toLowerCase()===label.toLowerCase());
  }
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  async function waitFor(fn,timeout=8000,step=150){
    const end=Date.now()+timeout;
    while(Date.now()<end){
      try{const v=fn();if(v)return v;}catch{}
      await sleep(step);
    }
    return null;
  }
  function nativeSet(el,value){
    const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:
      el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    const desc=Object.getOwnPropertyDescriptor(proto,'value');
    if(desc?.set)desc.set.call(el,value); else el.value=value;
    for(const type of ['input','change','blur'])el.dispatchEvent(new Event(type,{bubbles:true}));
  }
  function parsePacket(raw){
    raw=clean(raw);
    if(raw.startsWith('STERLING_ROUTE_V1'))raw=raw.replace(/^STERLING_ROUTE_V1\s*/,'');
    let obj;
    try{obj=JSON.parse(raw);}catch{
      const lines=raw.split(/\n+/),o={};
      for(const line of lines){
        const m=line.match(/^\s*([^:]+):\s*(.+)\s*$/);
        if(m)o[m[1].trim().toLowerCase()]=m[2].trim();
      }
      obj={first:o['first name']||o.first,last:o['last name']||o.last,phone:o.phone,email:o.email};
    }
    if(!obj||!obj.first||!obj.last||!obj.phone||!obj.email)throw new Error('Packet is missing first name, last name, phone, or email.');
    if(obj.expiresAt&&Number(obj.expiresAt)<Date.now())throw new Error('Sterling packet expired. Reconfirm the customer in Sterling.');
    obj.phone=String(obj.phone).replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
    if(obj.phone.length!==10)throw new Error('Phone number is not 10 digits.');
    return obj;
  }
  function verify(packet,stop){
    if(packet.gpRouteStopId&&stop.gpRouteStopId&&packet.gpRouteStopId!==stop.gpRouteStopId){
      throw new Error('STOP MISMATCH. Sterling packet is for a different route stop.');
    }
    if(packet.street&&stop.street&&norm(packet.street)!==norm(stop.street)){
      throw new Error('ADDRESS MISMATCH. Sterling packet is for '+packet.street+', but this page is '+stop.street+'.');
    }
    return true;
  }

  const host=document.createElement('div');
  host.id='sterling-route-helper-host';
  host.style.cssText='position:fixed;z-index:2147483647;right:12px;bottom:12px;max-width:calc(100vw - 24px);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';
  document.documentElement.appendChild(host);
  const sh=host.attachShadow({mode:'open'});
  sh.innerHTML=\`
    <style>
      *{box-sizing:border-box}.panel{width:min(390px,calc(100vw - 24px));background:#061425;color:#fff;border:1px solid #22527d;border-radius:18px;box-shadow:0 18px 60px #0008;overflow:hidden}
      .head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;background:#0b2743;border-bottom:1px solid #1b4268}
      .brand{font-weight:800}.brand b{color:#49b5ff}.ver{font-size:10px;color:#7ea7c9}.close{background:#173a59;color:#fff;border:0;border-radius:10px;width:36px;height:36px;font-size:22px}
      .body{padding:14px}.stop{font-size:13px;line-height:1.35;color:#cce6fb;background:#0a2037;border:1px solid #163e62;padding:10px;border-radius:12px;margin-bottom:10px}
      .status{font-size:13px;min-height:38px;line-height:1.4;color:#9fd4ff;margin:9px 0}.good{color:#63e6a5}.bad{color:#ffadad}.code{font-size:26px;font-weight:850;letter-spacing:1px;padding:12px;border-radius:12px;background:#071e34;text-align:center;margin:10px 0}
      .row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.row.one{grid-template-columns:1fr}
      button{appearance:none;border:0;border-radius:12px;padding:12px 10px;font:inherit;font-weight:700;min-height:46px;background:#155486;color:#fff;touch-action:manipulation}.primary{background:#0788e8}.success{background:#09834d}.quiet{background:#173149}.danger{background:#71343a}
      .packet{font-size:12px;line-height:1.4;color:#b7cee2;margin-top:10px}.mini{font-size:11px;color:#7695af;margin-top:8px}.hide{display:none}
      @media(max-width:520px){.panel{width:calc(100vw - 20px)}.row{grid-template-columns:1fr}.head{padding:11px}.body{padding:12px}}
    </style>
    <div class="panel">
      <div class="head"><div><div class="brand"><b>Sterling</b> Route Helper</div><div class="ver">v1.1.0 • iPhone/iPad/Desktop</div></div><button class="close" id="x">×</button></div>
      <div class="body">
        <div class="stop" id="stop"></div>
        <div class="status" id="status">Ready. Open Sterling for this stop or load a customer packet.</div>
        <div class="packet" id="packet">No customer packet loaded.</div>
        <div class="code hide" id="code"></div>
        <div class="row one"><button class="primary" id="openSterling">Open Sterling for this stop</button></div>
        <div class="row"><button id="pull">Pull from Sterling</button><button id="load">Paste packet</button></div>
        <div class="row one"><button id="fill">Fill + Save</button></div>
        <div class="row"><button class="success" id="order">Create Order ID</button><button class="quiet" id="all">Run full sequence</button></div>
        <div class="row one"><button class="quiet" id="copyCode">Copy Order ID</button></div>
        <div class="mini">Safety: helper verifies route stop/address when Sterling supplied them. It only edits name, phone and email, then uses Save and Order.</div>
      </div>
    </div>\`;

  const $=id=>sh.getElementById(id);
  const state={packet:null,orderId:'',stop:currentStop(),sterlingWindow:null};
  $('stop').textContent=stopLabel(state.stop)||'Current Salesforce / ICL record';
  function setStatus(msg,kind=''){const el=$('status');el.textContent=msg;el.className='status '+kind;}
  function renderPacket(){
    $('packet').textContent=state.packet
      ? state.packet.first+' '+state.packet.last+' • '+state.packet.phone+' • '+state.packet.email
      : 'No customer packet loaded.';
  }
  function showCode(code){
    state.orderId=code||'';
    $('code').textContent=code||'';
    $('code').classList.toggle('hide',!code);
  }

  function acceptPacket(raw){
    try{
      const p=typeof raw==='string'?parsePacket(raw):parsePacket(JSON.stringify(raw));
      verify(p,state.stop);state.packet=p;renderPacket();
      setStatus('Packet loaded and matched to this stop.','good');
      return p;
    }catch(e){setStatus(e.message||String(e),'bad');return null;}
  }

  async function loadPacket(){
    let raw='';
    try{raw=await navigator.clipboard.readText();}catch{}
    if(!raw||(!raw.includes('STERLING_ROUTE_V1')&&!raw.includes('{'))){
      raw=prompt('Paste the packet copied from Sterling:')||'';
    }
    return acceptPacket(raw);
  }

  function findForm(){
    for(const d of allDocs()){
      const phone=Array.from(d.querySelectorAll('input')).find(el=>visible(el)&&/primary\s*number/i.test(el.getAttribute('placeholder')||''));
      const email=Array.from(d.querySelectorAll('input')).find(el=>visible(el)&&/^email/i.test(el.getAttribute('placeholder')||''));
      if(phone&&email)return {d,phone,email};
    }
    return null;
  }
  async function openEditor(){
    let f=findForm();if(f)return f;
    const sels='[title*="Edit Address" i],[aria-label*="Edit Address" i],a[title*="Edit" i],button[title*="Edit" i],[aria-label*="Edit" i]';
    const edits=candidates(sels);
    let edit=edits.find(el=>/address/i.test((el.getAttribute('title')||'')+' '+(el.getAttribute('aria-label')||'')));
    if(!edit){
      edit=edits.find(el=>{
        const p=el.parentElement?.parentElement;
        return p&&/Prospective\s+Customer/i.test(text(p));
      });
    }
    if(!edit)throw new Error('I cannot find the pencil/Edit Address control in this view.');
    edit.click();
    f=await waitFor(findForm,7000);
    if(!f)throw new Error('Edit form did not open.');
    return f;
  }
  function findNameInputs(f){
    const inputs=Array.from(f.d.querySelectorAll('input')).filter(el=>visible(el)&&el!==f.phone&&el!==f.email&&((el.type||'text')==='text'||!el.type));
    let first=inputs.find(el=>/^prospective$/i.test(clean(el.value)));
    let last=inputs.find(el=>/^customer$/i.test(clean(el.value)));
    if(!first||!last){
      const streetNorm=norm(state.stop.street);
      const excluded=inputs.filter(el=>norm(el.value)!==streetNorm && norm(el.value)!==norm(state.stop.city) && norm(el.value)!==norm(state.stop.postalcode));
      const top=excluded.sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
      first=first||top[0];last=last||top.find(el=>el!==first);
    }
    if(!first||!last)throw new Error('Could not identify first/last name fields.');
    return {first,last};
  }
  function clickSave(d){
    const els=Array.from(d.querySelectorAll('button,input[type=button],input[type=submit],a')).filter(visible);
    const save=els.find(el=>clean(el.value||text(el)).toLowerCase()==='save'&&!el.disabled);
    if(!save)throw new Error('Save button not found or still disabled.');
    save.click();
  }

  async function fillAndSave(){
    if(!state.packet){const p=await loadPacket();if(!p)return false;}
    try{
      verify(state.packet,state.stop);
      setStatus('Opening customer editor…');
      const f=await openEditor();
      const {first,last}=findNameInputs(f);

      if(state.stop.street){
        const streetInput=Array.from(f.d.querySelectorAll('input')).find(el=>visible(el)&&norm(el.value)===norm(state.stop.street));
        if(!streetInput)throw new Error('Safety stop: I cannot verify the street field before saving.');
      }

      nativeSet(first,state.packet.first);
      nativeSet(last,state.packet.last);
      nativeSet(f.phone,state.packet.phone);
      nativeSet(f.email,state.packet.email);

      setStatus('Filled '+state.packet.first+' '+state.packet.last+'. Saving…');
      await sleep(250);
      clickSave(f.d);
      await sleep(900);
      setStatus('Customer details saved.','good');
      return true;
    }catch(e){setStatus(e.message||String(e),'bad');return false;}
  }

  function orderCandidates(){
    return byExactText('Order').filter(el=>{
      if(el.closest('nav,header,[role="navigation"],.slds-context-bar,.oneAppNavContainer'))return false;
      return true;
    });
  }
  function chooseOrder(){
    const cs=orderCandidates();
    if(!cs.length)return null;
    return cs.sort((a,b)=>{
      const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      return (br.top+br.left/1000)-(ar.top+ar.left/1000);
    })[0];
  }
  function readOrderId(){
    for(const d of allDocs()){
      const body=text(d.body);
      const m=body.match(/Partner\s+Order\s+Id\s*:\s*([A-Z0-9-]{5,})/i);
      if(m)return m[1];
    }
    return '';
  }
  async function createOrder(){
    try{
      showCode('');
      setStatus('Opening order process…');
      const order=chooseOrder();
      if(!order)throw new Error('I cannot find the record-level Order button in this view.');
      order.click();
      const code=await waitFor(readOrderId,12000,200);
      if(!code)throw new Error('Order window opened, but Partner Order ID was not detected.');
      showCode(code);
      try{await navigator.clipboard.writeText(code);setStatus('Partner Order ID '+code+' created and copied.','good');}
      catch{setStatus('Partner Order ID '+code+' created.','good');}
      try{
        if(state.sterlingWindow&&!state.sterlingWindow.closed){
          state.sterlingWindow.postMessage({type:'STERLING_ORDER_ID_V1',token:bridgeToken,orderId:code},APP_ORIGIN);
        }
      }catch{}
      return code;
    }catch(e){setStatus(e.message||String(e),'bad');return '';}
  }

  async function runAll(){
    if(!state.packet){const p=await loadPacket();if(!p)return;}
    try{verify(state.packet,state.stop);}catch(e){setStatus(e.message,'bad');return;}
    const label=stopLabel(state.stop)||'this record';
    if(!confirm('Update '+label+' to '+state.packet.first+' '+state.packet.last+', save it, then create a Partner Order ID?'))return;
    const ok=await fillAndSave();if(!ok)return;
    await sleep(900);
    await createOrder();
  }

  $('x').onclick=()=>host.remove();
  window.addEventListener('message',e=>{
    if(e.origin!==APP_ORIGIN)return;
    const m=e.data||{};
    if(m.type!=='STERLING_ROUTE_PACKET_V2'||m.token!==bridgeToken)return;
    const p=acceptPacket(m.packet);
    if(p)setStatus('Sterling sent '+p.first+' '+p.last+' to this exact route stop. Ready to run.','good');
  });

  $('openSterling').onclick=()=>{
    const st=state.stop;
    const p=new URLSearchParams();
    for(const k of ['routeId','gpRouteStopId','street','city','postalcode','state','latitude','longitude'])if(st[k])p.set(k,st[k]);
    p.set('routeHelper','1');
    p.set('helperToken',bridgeToken);
    p.set('helperOrigin',location.origin);
    state.sterlingWindow=window.open(APP_ORIGIN+'/?'+p.toString(),'sterling-route');
    if(!state.sterlingWindow)setStatus('Pop-up blocked. Allow pop-ups for this site, then tap Open Sterling again.','bad');
    else setStatus('Sterling opened and linked to this route stop.','good');
  };
  $('pull').onclick=()=>{
    const u=APP_ORIGIN+'/bridge.html?token='+encodeURIComponent(bridgeToken)+'&origin='+encodeURIComponent(location.origin);
    const w=window.open(u,'sterling-bridge');
    if(!w)setStatus('Pop-up blocked. Allow pop-ups, then try Pull from Sterling again.','bad');
    else setStatus('Checking Sterling for the latest confirmed customer…');
  };
  $('load').onclick=loadPacket;
  $('fill').onclick=fillAndSave;
  $('order').onclick=createOrder;
  $('all').onclick=runAll;
  $('copyCode').onclick=async()=>{
    if(!state.orderId){setStatus('No Partner Order ID captured yet.');return;}
    try{await navigator.clipboard.writeText(state.orderId);setStatus('Order ID copied.','good');}
    catch{prompt('Copy this Order ID:',state.orderId);}
  };

  window.__sterlingRouteHelper={open(){host.style.display='block';},state};
})();