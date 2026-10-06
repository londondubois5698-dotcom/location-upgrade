(function(){
'use strict';
if(window.__sterlingV11&&window.__sterlingV11.open){window.__sterlingV11.open();return;}

var APP='https://sterling-olive.vercel.app';
var VERSION='11.0';
var token=(crypto&&crypto.randomUUID)?crypto.randomUUID():('st-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
var packet=null,orderId='',busy=false,autoMode=true,sessionId='',lastHouseKey='',sterlingWindow=null,pollTimer=null;
var qs=function(sel,root){return (root||document).querySelector(sel)};
var qsa=function(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))};
var clean=function(v){return String(v==null?'':v).trim()};
var norm=function(v){return clean(v).toLowerCase().replace(/[^a-z0-9]/g,'')};
var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
var visible=function(el){if(!el||!(el instanceof Element))return false;var r=el.getBoundingClientRect(),cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0};
var txt=function(el){return clean(el&&(el.innerText||el.textContent))};

function allDocs(){
  var out=[],seen=new Set();
  function walk(w){
    try{
      var d=w.document;
      if(!d||seen.has(d))return;
      seen.add(d);out.push(d);
      qsa('iframe',d).forEach(function(f){try{if(f.contentWindow)walk(f.contentWindow)}catch(e){}});
    }catch(e){}
  }
  walk(window);try{if(top!==window)walk(top)}catch(e){}
  return out;
}
function parseUrl(raw){
  try{
    var u=new URL(raw,location.href),p=u.searchParams;
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
  }catch(e){return {routeId:'',gpRouteStopId:'',street:'',city:'',postalcode:'',state:'',latitude:'',longitude:''}}
}
function urlStop(){
  var urls=[location.href];
  try{
    qsa('iframe[src],a[href]').forEach(function(el){
      var raw=el.getAttribute('src')||el.getAttribute('href');
      if(raw&&/(routeId|gpRouteStopId|street)=/i.test(raw))urls.push(raw);
    });
  }catch(e){}
  var best=null,bestScore=-1;
  urls.forEach(function(raw){
    var st=parseUrl(raw),score=0;
    ['routeId','gpRouteStopId','street','city','postalcode','state'].forEach(function(k){if(st[k])score++});
    if(score>bestScore){best=st;bestScore=score}
  });
  return best||parseUrl('');
}
function visibleCurrentAddress(){
  var re=/(\d{1,6}\s+[A-Za-z0-9.'#\- ]+?),\s*([A-Za-z .'\-]+?),\s*(Virginia|VA)\s+(\d{5}(?:-\d{4})?)/i;
  var candidates=[];
  allDocs().forEach(function(d){
    qsa('div,span,p,a,strong,h1,h2,h3,td',d).forEach(function(el){
      if(!visible(el))return;
      var t=txt(el);if(!t||t.length>220)return;
      var m=t.match(re);if(!m)return;
      var anc=el,context='';
      for(var i=0;i<4&&anc;i++,anc=anc.parentElement)context+=' '+txt(anc);
      if(/Previous\s+Opportunity|Next\s+Opportunity/i.test(context))return;
      var r=el.getBoundingClientRect(),score=0;
      if(r.top>=0&&r.top<90)score+=800;
      else if(r.top<180)score+=500;
      else if(r.top<300)score+=150;
      if(/Prospective\s+Customer/i.test(context))score+=600;
      if(/Edit\s+Address/i.test((el.getAttribute('title')||'')+' '+(el.getAttribute('aria-label')||'')+' '+context))score+=300;
      if(t.trim()===m[0].trim())score+=120;
      score+=Math.max(0,200-t.length);
      candidates.push({street:clean(m[1]),city:clean(m[2]),state:'Virginia',postalcode:clean(m[4]),score:score,top:r.top,text:t});
    });
  });
  candidates.sort(function(a,b){return b.score-a.score});
  return candidates[0]||null;
}
function currentStop(){
  var u=urlStop(),v=visibleCurrentAddress();
  if(v){
    var stale=u.street&&norm(u.street)!==norm(v.street);
    u.urlStreet=u.street||'';u.staleUrl=!!stale;u.street=v.street;u.city=v.city;u.state=v.state;u.postalcode=v.postalcode;u.addressSource='visible-current-record';
    if(stale){u.gpRouteStopId='';u.latitude='';u.longitude=''}
  }
  return u;
}
function label(st){return [st.street,st.city,st.state,st.postalcode].filter(Boolean).join(', ')}
function houseKey(st){return norm(st.street)+'|'+norm(st.city)+'|'+norm(st.postalcode)}
function makeSession(){sessionId='relay-'+token.replace(/[^A-Za-z0-9_-]/g,'')+'-'+Date.now().toString(36)}
var stop=currentStop();makeSession();

var host=document.createElement('div');
host.id='sterling-v11-host';
host.style.cssText='position:fixed;z-index:2147483647;right:12px;bottom:12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';
document.documentElement.appendChild(host);
var sh=host.attachShadow({mode:'open'});
sh.innerHTML=
'<style>'+
'*{box-sizing:border-box}.panel{width:min(390px,calc(100vw - 24px));max-height:76vh;overflow:auto;background:#061425;color:#fff;border:1px solid #22527d;border-radius:18px;box-shadow:0 18px 60px #0009}.head{display:flex;justify-content:space-between;align-items:center;padding:12px 13px;background:#0b2743}.brand{font-weight:900}.brand b{color:#57baff}.ver{font-size:10px;color:#80a8ca}.x{border:0;border-radius:9px;background:#173a59;color:#fff;padding:8px 10px}.body{padding:13px}.stop{font-size:12px;line-height:1.4;color:#cde8ff;background:#0a2037;border-radius:11px;padding:9px 10px}.status{font-size:13px;line-height:1.42;color:#a2d4ff;margin:10px 0}.good{color:#76efb6}.bad{color:#ffb2b2}.customer{font-size:12px;color:#c6d9ea;line-height:1.45;margin:8px 0}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.one{grid-template-columns:1fr}button{border:0;border-radius:11px;padding:12px 10px;font:inherit;font-weight:850;min-height:45px;background:#155486;color:#fff;touch-action:manipulation}.primary{background:#0788e8}.success{background:#07814c}.quiet{background:#173149}.qrbox{display:none;text-align:center;background:#fff;border-radius:14px;padding:10px;margin-top:10px}.qrbox img{width:220px;max-width:90%;height:auto}.qrnote{color:#173149;font-size:12px;font-weight:800;margin-top:6px}.code{display:none;font-size:25px;font-weight:900;letter-spacing:1px;text-align:center;color:#79efb5;background:#071e34;border-radius:11px;padding:11px;margin:9px 0}.mini{font-size:10px;color:#738fa9;line-height:1.4;margin-top:9px}.compact{display:none;background:#061425;color:#fff;border:1px solid #22527d;border-radius:999px;padding:8px 10px;box-shadow:0 12px 38px #0007;align-items:center;gap:8px}.compact b{color:#57baff}.compact button{min-height:0;padding:8px 11px;border-radius:999px;background:#0b6fc9}@media(max-width:600px){.panel{width:calc(100vw - 16px);max-height:64vh}.row{grid-template-columns:1fr}:host{right:8px!important;bottom:calc(8px + env(safe-area-inset-bottom))!important}}</style>'+
'<div id="compact" class="compact"><b>Sterling</b><span id="compactHouse">Ready</span><button id="expand">Open</button></div>'+
'<div id="panel" class="panel">'+
'<div class="head"><div><div class="brand"><b>Sterling</b> Route Helper</div><div class="ver">V11 • phone ↔ iPad relay</div></div><button class="x" id="min">Minimize</button></div>'+
'<div class="body">'+
'<div class="stop" id="stop"></div>'+
'<div class="status" id="status">Checking the active Salesforce house…</div>'+
'<div class="customer" id="customer">Waiting for a confirmed customer.</div>'+
'<div class="code" id="code"></div>'+
'<div class="row one"><button class="primary" id="phone">Use Customer Phone</button></div>'+
'<div id="qrbox" class="qrbox"><img id="qr"><div class="qrnote">Scan this with the customer phone</div></div>'+
'<div class="row"><button class="quiet" id="same">Use This Device</button><button class="quiet" id="auto">Auto: ON</button></div>'+
'<div class="row one"><button class="success" id="run" disabled>Run Now</button></div>'+
'<div class="mini">The helper watches the visible Salesforce address, not just the old URL. A customer packet must match this house before Auto mode can edit anything.</div>'+
'</div></div>';

function $(id){return sh.getElementById(id)}
function status(msg,kind){var e=$('status');e.textContent=msg;e.className='status '+(kind||'')}
function renderStop(){
  stop=currentStop();
  $('stop').textContent='Active house: '+(label(stop)||'address not detected')+(stop.staleUrl?' • old URL ignored ('+stop.urlStreet+')':' • visible record verified');
  $('compactHouse').textContent=stop.street||'Route ready';
}
function renderPacket(){
  $('customer').textContent=packet?(packet.first+' '+packet.last+' • '+packet.phone+' • '+packet.email):'Waiting for a confirmed customer.';
  $('run').disabled=!packet;
}
function showPanel(){host.style.display='block';$('panel').style.display='block';$('compact').style.display='none'}
function minimize(){ $('panel').style.display='none';$('compact').style.display='flex'}
$('min').onclick=minimize;$('expand').onclick=showPanel;

function liveUrl(){
  stop=currentStop();
  var p=new URLSearchParams();
  ['routeId','gpRouteStopId','street','city','postalcode','state','latitude','longitude'].forEach(function(k){if(stop[k])p.set(k,stop[k])});
  p.set('relay',sessionId);
  p.set('helperToken',token);
  return APP+'/live.html?'+p.toString();
}
function refreshQr(){
  var u=liveUrl();
  $('qr').src=APP+'/api/qr?u='+encodeURIComponent(u);
}
$('phone').onclick=function(){
  refreshQr();$('qrbox').style.display='block';
  status('Phone relay is ready. Have the customer scan the QR. I will receive the confirmed contact here automatically.','good');
};
$('same').onclick=function(){
  sterlingWindow=window.open(liveUrl(),'sterling-live');
  if(!sterlingWindow)status('Safari blocked the new tab. Allow pop-ups and try again.','bad');
  else{status('Sterling Live opened for '+(stop.street||'this house')+'.','good');minimize()}
};
$('auto').onclick=function(){autoMode=!autoMode;$('auto').textContent='Auto: '+(autoMode?'ON':'OFF');status(autoMode?'Auto mode is on. A matching packet will run automatically.':'Auto mode is off. Tap Run Now after the customer is confirmed.')};

function parsePacket(p){
  if(!p||typeof p!=='object')throw new Error('No packet');
  if(!p.first||!p.last||!p.phone||!p.email)throw new Error('Incomplete');
  var d=String(p.phone).replace(/\D/g,'');if(d.length===11&&d[0]==='1')d=d.slice(1);
  if(d.length!==10)throw new Error('Phone is not ten digits');
  p.phone=d;return p;
}
function verify(p){
  stop=currentStop();
  if(!stop.street)throw new Error('Safety stop: I cannot read the current Salesforce house.');
  if(p.street&&norm(p.street)!==norm(stop.street))throw new Error('Safety stop: Sterling has '+p.street+', but Salesforce is showing '+stop.street+'.');
  if(p.gpRouteStopId&&stop.gpRouteStopId&&p.gpRouteStopId!==stop.gpRouteStopId)throw new Error('Safety stop: route-stop ID changed.');
  return true;
}
function accept(p){
  try{
    p=parsePacket(p);verify(p);packet=p;renderPacket();
    status('Confirmed customer matched to '+stop.street+'. '+(autoMode?'Running automatically…':'Ready.'),'good');
    if(autoMode)setTimeout(function(){runAll()},350);
  }catch(e){
    if(e.message==='Incomplete'||e.message==='No packet'){status('Waiting for Sterling to finish the four confirmed contact details.');return}
    packet=null;renderPacket();status(e.message||String(e),'bad');showPanel();
  }
}

window.addEventListener('message',function(e){
  if(e.origin!==APP)return;
  var m=e.data||{};
  if(m.type==='STERLING_ROUTE_PACKET_V2'&&(!m.token||m.token===token))accept(m.packet);
  if(m.type==='STERLING_PARTNER_ORDER_ID'&&m.code){orderId=m.code;showOrder(orderId)}
});

async function relayPoll(){
  try{
    var r=await fetch(APP+'/api/relay?session='+encodeURIComponent(sessionId)+'&t='+Date.now(),{cache:'no-store'});
    if(!r.ok)return;
    var j=await r.json();
    if(j&&j.packet&&!packet)accept(j.packet);
  }catch(e){}
}
function startPolling(){if(pollTimer)clearInterval(pollTimer);pollTimer=setInterval(relayPoll,1500);relayPoll()}
startPolling();

function docs(){return allDocs()}
function findForm(){
  var ds=docs();
  for(var i=0;i<ds.length;i++){
    var d=ds[i],ins=qsa('input',d).filter(visible);
    var phone=ins.find(function(el){return /primary\s*(number|phone)|phone/i.test((el.placeholder||'')+' '+(el.getAttribute('aria-label')||''))});
    var email=ins.find(function(el){return /email/i.test((el.placeholder||'')+' '+(el.getAttribute('aria-label')||''))});
    if(phone&&email)return {d:d,phone:phone,email:email};
  }
  return null;
}
async function waitFor(fn,timeout){
  var end=Date.now()+(timeout||8000);
  while(Date.now()<end){try{var v=fn();if(v)return v}catch(e){}await sleep(150)}
  return null;
}
function nativeSet(el,val){
  var proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  var desc=Object.getOwnPropertyDescriptor(proto,'value');
  if(desc&&desc.set)desc.set.call(el,val);else el.value=val;
  ['input','change','blur'].forEach(function(t){el.dispatchEvent(new Event(t,{bubbles:true}))});
}
async function openEditor(){
  var f=findForm();if(f)return f;
  var els=[];
  docs().forEach(function(d){els=els.concat(qsa('[title],[aria-label],button,a,span',d).filter(visible))});
  var edit=els.find(function(el){return /edit address/i.test((el.getAttribute('title')||'')+' '+(el.getAttribute('aria-label')||''))});
  if(!edit)edit=els.find(function(el){var c=(el.getAttribute('title')||'')+' '+(el.getAttribute('aria-label')||'')+' '+txt(el.parentElement);return /edit/i.test(c)&&/address|customer/i.test(c)});
  if(!edit)throw new Error('I cannot find the pencil / Edit Address control in this view.');
  edit.click();
  f=await waitFor(findForm,8000);
  if(!f)throw new Error('The customer edit form did not open.');
  return f;
}
function names(f){
  var ins=qsa('input',f.d).filter(function(el){return visible(el)&&el!==f.phone&&el!==f.email});
  var first=ins.find(function(el){return /^prospective$/i.test(clean(el.value))});
  var last=ins.find(function(el){return /^customer$/i.test(clean(el.value))});
  if(!first||!last){
    var labels=function(el){return (el.name||'')+' '+(el.id||'')+' '+(el.placeholder||'')+' '+(el.getAttribute('aria-label')||'')};
    first=first||ins.find(function(el){return /first.*name/i.test(labels(el))});
    last=last||ins.find(function(el){return /last.*name/i.test(labels(el))});
  }
  if(!first||!last)throw new Error('I could not identify the first and last name fields.');
  return {first:first,last:last};
}
function saveButton(d){
  return qsa('button,input[type=button],input[type=submit],a',d).filter(visible).find(function(el){return clean(el.value||txt(el)).toLowerCase()==='save'&&!el.disabled});
}
async function fillSave(){
  verify(packet);
  var expected=houseKey(currentStop());
  status('Opening customer editor…');
  var f=await openEditor();
  if(houseKey(currentStop())!==expected)throw new Error('Safety stop: Salesforce changed houses while I was opening the editor.');
  var nm=names(f);
  if(stop.street){
    var streetField=qsa('input',f.d).filter(visible).find(function(el){return norm(el.value)===norm(stop.street)});
    if(!streetField)throw new Error('Safety stop: the edit form does not match the visible house.');
  }
  nativeSet(nm.first,packet.first);nativeSet(nm.last,packet.last);nativeSet(f.phone,packet.phone);nativeSet(f.email,packet.email);
  await sleep(250);
  var b=saveButton(f.d);if(!b)throw new Error('Save button is missing or disabled.');
  b.click();await sleep(1100);
  status('Customer saved. Opening Order…','good');
}
function orderBtn(){
  var all=[];docs().forEach(function(d){all=all.concat(qsa('button,a,[role=button]',d).filter(visible))});
  var arr=all.filter(function(el){return txt(el).toLowerCase()==='order'&&!el.closest('nav,header,[role=navigation],.slds-context-bar,.oneAppNavContainer')});
  arr.sort(function(a,b){return b.getBoundingClientRect().top-a.getBoundingClientRect().top});
  return arr[0]||null;
}
function readOrder(){
  var re=/Partner\s+Order\s+Id\s*:\s*([A-Z0-9-]{5,})/i;
  var ds=docs();for(var i=0;i<ds.length;i++){var m=txt(ds[i].body).match(re);if(m)return m[1]}
  return '';
}
function showOrder(code){
  $('code').style.display='block';$('code').textContent='Partner Order ID: '+code;showPanel();
}
async function createOrder(){
  var b=orderBtn();if(!b)throw new Error('I cannot find the record-level Order button.');
  b.click();var c=await waitFor(readOrder,13000);if(!c)throw new Error('Order opened, but I could not detect the Partner Order ID.');
  orderId=c;showOrder(c);try{await navigator.clipboard.writeText(c)}catch(e){}
  if(sterlingWindow&&!sterlingWindow.closed)try{sterlingWindow.postMessage({type:'STERLING_PARTNER_ORDER_ID',token:token,code:c},APP)}catch(e){}
  try{await fetch(APP+'/api/relay?session='+encodeURIComponent(sessionId),{method:'DELETE'})}catch(e){}
  status('Done. '+c+' was captured and copied.','good');
}
async function runAll(){
  if(busy||!packet)return;busy=true;$('run').disabled=true;
  try{verify(packet);await fillSave();await createOrder()}
  catch(e){status(e.message||String(e),'bad');showPanel()}
  finally{busy=false;$('run').disabled=!packet}
}
$('run').onclick=runAll;

function houseRefresh(){
  var n=currentStop(),k=houseKey(n);if(!k)return;
  if(k!==lastHouseKey){
    var had=!!lastHouseKey;lastHouseKey=k;stop=n;renderStop();
    if(had){
      packet=null;orderId='';renderPacket();$('code').style.display='none';
      makeSession();startPolling();refreshQr();$('qrbox').style.display='none';
      status('New house detected: '+stop.street+'. New Sterling session created.','good');
    }else status('House detected. Use Customer Phone or Use This Device.','good');
  }
}
var observer=new MutationObserver(function(){setTimeout(houseRefresh,120)});
try{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true})}catch(e){}
setInterval(houseRefresh,900);
renderStop();renderPacket();houseRefresh();refreshQr();

window.__sterlingV11={open:showPanel,state:function(){return {stop:currentStop(),packet:packet,sessionId:sessionId,autoMode:autoMode}}};
})();