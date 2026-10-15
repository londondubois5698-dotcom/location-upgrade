(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const ASSET = name => `./assets/${name}.webp`;
  function imageFor(phone){
    if(phone.image)return ASSET(phone.image);
    const label=phone.name.replace(/[&<>]/g,'');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800"><defs><radialGradient id="g"><stop stop-color="#0e6a9a"/><stop offset=".7" stop-color="#06203b"/><stop offset="1" stop-color="#020817"/></radialGradient><linearGradient id="p" x2="1" y2="1"><stop stop-color="#71d6f4"/><stop offset=".5" stop-color="#133b68"/><stop offset="1" stop-color="#070a18"/></linearGradient></defs><rect width="640" height="800" fill="url(#g)"/><rect x="164" y="88" width="310" height="568" rx="53" fill="#111b25" stroke="#9ac9d7" stroke-width="11"/><rect x="183" y="108" width="271" height="522" rx="39" fill="url(#p)"/><rect x="264" y="122" width="104" height="24" rx="15" fill="#071325"/><text x="320" y="521" font-family="Arial,sans-serif" font-size="24" fill="#e4faff" text-anchor="middle">${label}</text><text x="320" y="690" font-family="Arial,sans-serif" font-size="15" letter-spacing="3" fill="#9bb9c7" text-anchor="middle">ILLUSTRATIVE PREVIEW</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  const NUM = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const currency = value => Number(value).toLocaleString('en-US', { style:'currency', currency:'USD', maximumFractionDigits: Number(value)%1 ? 2 : 0 });
  const sections = ['welcome','contact','service','comparison','showroom','device','plans','home','review','appointment'];
  const prices = { 'Value 2.0':[0,50,45,35,30], 'Extra 2.0':[0,70,60,50,40], 'Premium 2.0':[0,90,80,65,50] };
  const internetPricing = {'None':0,'Internet Air':55,'Fiber 300':50,'Fiber 500':65,'Fiber 1000':80,'Fiber 5000':125};
  const phones = [
    {id:'18promax',brand:'Apple',name:'iPhone 18 Pro Max',image:'iphone18promax',tagline:'Power, a polished design and advanced photo tools.',colors:['Burgundy','Black','Silver','Glacier'],storage:['256 GB','512 GB','1 TB','2 TB'],features:['Advanced camera system','Pro performance','Big-screen viewing','All-day potential','Creative photo tools','5G capable']},
    {id:'18pro',brand:'Apple',name:'iPhone 18 Pro',image:'iphone18pro',tagline:'A powerful pro phone in an easy-to-hold form.',colors:['Burgundy','Black','Silver','Glacier'],storage:['256 GB','512 GB','1 TB'],features:['Pro photography','High performance','Premium display','Creative tools','Connected anywhere','5G capable']},
    {id:'duo',brand:'Apple',name:'iPhone Duo',image:'duo-large',tagline:'A dramatic fold-open display that puts more room in your hands.',colors:['Star White','Night Sky'],storage:['256 GB','512 GB','1 TB','2 TB'],features:['Expansive foldable screen','Multitask comfortably','Immersive media','Unique form factor','Premium design','5G capable']},
    {id:'s26fe',brand:'Samsung',name:'Galaxy S26 FE',image:'galaxy',tagline:'Galaxy style and everyday performance in one smart upgrade.',colors:['Graphite','Silver','Blue'],storage:['128 GB','256 GB'],features:['Galaxy experience','Smart camera tools','Brilliant display','Everyday battery','Easy multitasking','5G capable']},
    {id:'s26ultra',brand:'Samsung',name:'Galaxy S26 Ultra',image:null,tagline:'A flagship Galaxy with expansive productivity and camera possibilities.',colors:['Black','Silver','Violet'],storage:['256 GB','512 GB','1 TB'],features:['Flagship camera','Large display','Work and play','Powerful performance','Smart tools','5G capable']},
    {id:'fold8',brand:'Samsung',name:'Galaxy Z Fold8',image:null,tagline:'The foldable built for an expansive mobile experience.',colors:['Black','Silver','Blue'],storage:['256 GB','512 GB','1 TB'],features:['Fold-open display','Multitasking','Immersive viewing','Flexible form','Productivity','5G capable']},
    {id:'flip8',brand:'Samsung',name:'Galaxy Z Flip8',image:null,tagline:'A pocket-friendly foldable with standout style.',colors:['Black','Mint','Blue'],storage:['256 GB','512 GB'],features:['Compact foldable','Expressive design','Camera tools','Flexible photography','Customizable','5G capable']},
    {id:'pixel11pro',brand:'Google',name:'Pixel 11 Pro',image:null,tagline:'Google intelligence with a camera-first approach.',colors:['Obsidian','Porcelain'],storage:['128 GB','256 GB','512 GB'],features:['Google AI features','Camera assistance','Clean Android','Smarter search','Photo tools','5G capable']},
    {id:'pixel11',brand:'Google',name:'Pixel 11',image:null,tagline:'Helpful Google features wrapped in a refined everyday phone.',colors:['Obsidian','Porcelain'],storage:['128 GB','256 GB'],features:['Pixel camera','Google assistant tools','Android','Useful automation','Simple controls','5G capable']},
    {id:'razr',brand:'Motorola',name:'Motorola razr ultra',image:null,tagline:'Folding form meets expressive design.',colors:['Black','Red'],storage:['512 GB','1 TB'],features:['Foldable form','Large outer screen','Style-led design','Camera options','Multitasking','5G capable']},
    {id:'motoedge',brand:'Motorola',name:'Motorola Edge',image:null,tagline:'A slim, fast everyday upgrade.',colors:['Black','Blue'],storage:['256 GB'],features:['Slim design','Smooth display','Smart photo options','Daily endurance','Android','5G capable']}
  ];
  const state = {
    firstName:'',lastName:'',phone:'',email:'',carrier:'T-Mobile',lines:4,currentBill:345,
    hasInternet:false,hasTV:false,plan:'Value 2.0',internet:'None',wantTV:false,
    selectedPhone:'18promax',color:'Burgundy',storage:'256 GB',chosen:false,
    appointmentDate:'',appointmentTime:'',current:'welcome'
  };
  let toastTimeout=0, revealTimer=0, revealPhaseTimer=0, recognition=null, realtime=null;
  let voiceStartedAt=0;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const plainPhone = () => phones.find(phone => phone.id === state.selectedPhone) || phones[0];
  const prettyBill = value => value > 0 ? currency(value) : '—';
  const livePlan = () => {
    const n=state.lines;
    if(n<1 || n>4) return null;
    if(state.plan==='55+ Plan'){
      if(n>2)return null;
      const standalone=state.internet==='None';
      return n*(n===1?(standalone?60:40):(standalone?55:35));
    }
    return n*(prices[state.plan]?.[n] || 0);
  };
  const serviceTotal = () => livePlan()===null ? null : livePlan() + (internetPricing[state.internet] || 0);
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function toast(message){const elem=$('#toast');elem.textContent=message;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>elem.textContent='',3700);}
  function go(section){const el=document.getElementById(section);if(!el)return;el.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});setCurrent(section);}
  function setCurrent(section){state.current=section;const idx=sections.indexOf(section);if(idx<0)return;$('#progress-copy').innerHTML=`${String(idx+1).padStart(2,'0')} / 10 <span>${esc(elTitle(section))}</span>`;$$('.scene-nav button').forEach(el=>{el.classList.toggle('active',el.dataset.go===section);el.setAttribute('aria-current',el.dataset.go===section?'step':'false');});}
  function elTitle(id){return document.getElementById(id)?.dataset.title||'WELCOME';}
  function startObservers(){const io=new IntersectionObserver(entries=>{const cand=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(cand)setCurrent(cand.target.id);},{rootMargin:'-20% 0px -35% 0px',threshold:[0,.2,.4,.65]});$$('section.scene').forEach(s=>io.observe(s));}
  function setStateField(field,value){state[field]=value;refresh();}
  function refresh(){
    $('#now-carrier').textContent=state.carrier||'YOUR CARRIER';$('#now-price').innerHTML=`${prettyBill(state.currentBill)} <small>/ mo</small>`;
    $('#now-lines').textContent=state.lines;$('#new-lines').textContent=state.lines;$('#new-plan').textContent=state.plan;
    $('#now-kind').textContent=[`Wireless`,state.hasInternet&&'Internet',state.hasTV&&'TV'].filter(Boolean).join(' + ');
    $('#new-internet').textContent=state.internet==='None'?'Not selected':state.internet;
    $('#new-price').innerHTML=`${serviceTotal()===null?'QUOTE NEEDED':currency(serviceTotal())} <small>/ mo*</small>`;
    const savings=serviceTotal()===null?null:state.currentBill-serviceTotal();
    $('#savings-month').innerHTML=savings===null?'CUSTOM QUOTE':`${savings>=0?'−':'+'}${currency(Math.abs(savings))} <small>/mo</small>`;
    $('#savings-year').textContent=savings===null?'CUSTOM QUOTE':`${savings>=0?'−':'+'}${currency(Math.abs(savings*12))}`;
    $('#wireless-estimate').innerHTML=livePlan()===null?'CUSTOM QUOTE':`${currency(livePlan())}<small> / month</small>`;
    $('#review-name').textContent=`${state.firstName} ${state.lastName}`.trim()||'Guest';
    $('#review-lines').textContent=String(state.lines);$('#review-plan').textContent=state.plan;
    $('#review-device').textContent=state.chosen?`${plainPhone().name} · ${state.color} · ${state.storage}`:`${plainPhone().name} (not yet locked)`;
    $('#review-internet').textContent=state.internet==='None'?'Not selected':state.internet;
    $('#review-tv').textContent=state.wantTV?'Quote requested':'Not selected';
    $('#review-total').innerHTML=`${serviceTotal()===null?'Custom quote':currency(serviceTotal())} <small>/mo*</small>`;
    $$('#carriers button').forEach(el=>el.classList.toggle('active',el.dataset.carrier===state.carrier));
    $$('#plan-grid button.plan-card').forEach(el=>{el.classList.toggle('active',el.dataset.plan===state.plan);const c=el.querySelector('.plan-choose');if(c)c.textContent=el.dataset.plan===state.plan?'✓ SELECTED':'CHOOSE THIS PLAN';});
    $('#line-output').textContent=state.lines;
    $$('#time-grid button').forEach(el=>el.classList.toggle('active',el.dataset.time===state.appointmentTime));
    $$('#phone-grid .phone-card').forEach(el=>el.classList.toggle('active',el.dataset.phone===state.selectedPhone));
    $('#appt-note').textContent=state.appointmentDate&&state.appointmentTime?`Request: ${state.appointmentDate} · ${state.appointmentTime}. London must confirm availability.`:'Choose a date and time to prepare your request.';
  }
  function renderPhones(filter='All'){
    const list=filter==='All'?phones:phones.filter(p=>p.brand===filter);
    $('#phone-grid').innerHTML=list.map(p=>`<button class="phone-card ${p.id===state.selectedPhone?'active':''}" data-phone="${esc(p.id)}" aria-label="Explore ${esc(p.name)}"><figure>${p.image?`<img src="${ASSET(p.image)}" alt="Illustrative image of ${esc(p.name)}" loading="lazy">`:`<span class="abstract-phone"><span>◉</span><b>${esc(p.name)}</b><small>IMAGE PENDING</small></span>`}</figure><span class="brandline">${esc(p.brand)}</span><h3>${esc(p.name)}</h3><span class="phone-sub">Explore colors · features · storage</span><span class="phone-pill">VIEW PHONE DETAILS →</span></button>`).join('');
    $$('#phone-grid .phone-card').forEach(el=>el.addEventListener('click',()=>{selectPhone(el.dataset.phone);go('device');}));
  }
  const colorsMap={'Burgundy':'#773b49','Black':'#1f252d','Silver':'#d2d4d4','Glacier':'#b9dbeb','Star White':'#f4f1e6','Night Sky':'#192d46','Graphite':'#59616c','Blue':'#2c5c94','Violet':'#9474b5','Mint':'#84c8b5','Obsidian':'#30383f','Porcelain':'#e0dacf','Red':'#b34b4e'};
  function notifyRealtime(message){try{if(realtime?.dc?.readyState==='open'){realtime.dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:'USER INTERFACE UPDATE: '+message}]}}));realtime.dc.send(JSON.stringify({type:'response.create'}));}}catch{}}
  function selectPhone(id){const phone=phones.find(p=>p.id===id);if(!phone)return;state.selectedPhone=id;state.color=phone.colors[0];state.storage=phone.storage[0];state.chosen=false;renderDevice();refresh();notifyRealtime('Customer is viewing '+phone.name+'. Ask about their preferred color and storage.');}
  function renderDevice(){const p=plainPhone();$('#device-title').textContent=p.name;$('#device-tagline').textContent=p.tagline;
    const img=$('#device-photo');img.style.opacity='0';img.style.transform='scale(.95) translateY(5px)';setTimeout(()=>{img.src=imageFor(p);img.alt=`Preview of ${p.name}`;img.style.opacity='1';img.style.transform='scale(1)';},150);
    $('#color-options').innerHTML=p.colors.map(c=>`<button data-color="${esc(c)}" class="${c===state.color?'active':''}"><i style="background:${colorsMap[c]||'#6b8798'}"></i>${esc(c)}</button>`).join('');
    $('#storage-options').innerHTML=p.storage.map(s=>`<button data-storage="${esc(s)}" class="${s===state.storage?'active':''}">${esc(s)}</button>`).join('');
    $('#feature-grid').innerHTML=p.features.map((f,i)=>`<div><b>${['◉','✦','▣','⌁','◇','↯'][i]}</b><span>${esc(f)}</span></div>`).join('');
    $$('#color-options button').forEach(el=>el.addEventListener('click',()=>{state.color=el.dataset.color;renderDevice();refresh();notifyRealtime('Customer chose '+state.color+' for '+p.name+'.');}));
    $$('#storage-options button').forEach(el=>el.addEventListener('click',()=>{state.storage=el.dataset.storage;renderDevice();refresh();notifyRealtime('Customer chose '+state.storage+' for '+p.name+'.');}));
    $('#selected-copy').textContent=`${p.name} · ${state.color} · ${state.storage} ${state.chosen?'✓ Selected':'— ready to choose'}`;
  }
  function renderPlans(){const names=['Value 2.0','Extra 2.0','Premium 2.0','55+ Plan'];const captions=[
    'A practical wireless starting point with included high-speed data. Final features depend on live terms.',
    'More room for streaming and hotspot use; confirm the current benefit details.',
    'A more premium wireless experience for people who put connectivity first.',
    'Age-eligibility plan; 1 or 2 lines only, with additional eligible home-internet pricing options.'
  ];
  $('#plan-grid').innerHTML=names.map((name,i)=>`<button class="plan-card ${state.plan===name?'active':''}" data-plan="${name}"><span class="plan-tag">0${i+1} / YOUR CHOICE</span><h3>${name}</h3><span class="plan-money">${rateForPlan(name)}<small>${rateForPlan(name)==='—'?'':' /mo service'}</small></span><p>${captions[i]}</p><span class="plan-choose">${state.plan===name?'✓ SELECTED':'CHOOSE THIS PLAN'}</span></button>`).join('');
    $$('#plan-grid .plan-card').forEach(el=>el.addEventListener('click',()=>{state.plan=el.dataset.plan;renderPlans();refresh();notifyRealtime('Customer chose plan '+state.plan+'.');}));
  }
  function rateForPlan(name){const l=state.lines;if(l>4||l<1||name==='55+ Plan'&&l>2)return '—';if(name==='55+ Plan'){return currency(l*(l===1?(state.internet==='None'?60:40):(state.internet==='None'?55:35)));}return currency(l*prices[name][l]);}
  function updatePlans(){renderPlans();refresh();}
  function revealSelected(){const modal=$('#selection-overlay');clearTimeout(revealTimer);clearTimeout(revealPhaseTimer);const phone=plainPhone();state.chosen=true;renderDevice();refresh();notifyRealtime('Customer selected '+phone.name+' in '+state.color+', '+state.storage+'. React briefly to their choice.');$('#selection-name').textContent=phone.name;$('#selection-photo').src=imageFor(phone);$('#selection-phase').textContent='POWERING UP YOUR CHOICE';$('#selection-sparks').innerHTML='';
    if(!reducedMotion){for(let i=0;i<36;i++){const node=document.createElement('i');const rad=(i/36)*Math.PI*2;const dist=115+((i*37)%220);node.style.setProperty('--dx',`${Math.cos(rad)*dist}px`);node.style.setProperty('--dy',`${Math.sin(rad)*dist}px`);node.style.setProperty('--delay',`${(i%6)*.06+.15}s`);$('#selection-sparks').appendChild(node);}}
    modal.hidden=false;document.body.style.overflow='hidden';
    revealPhaseTimer=setTimeout(()=>{$('#selection-phase').textContent=`${state.color.toUpperCase()} · ${state.storage.toUpperCase()} · SELECTED ✓`;},1400);
    revealTimer=setTimeout(()=>{modal.hidden=true;document.body.style.overflow='';go('plans');},reducedMotion?400:3000);
  }
  function summary(){const person=[state.firstName,state.lastName].filter(Boolean).join(' ')||'Not provided';const dev=plainPhone();return [
    'LONDON DEALS · STERLING OVERDRIVE',
    `Name: ${person}`,`Phone: ${state.phone||'Not provided'}`,`Email: ${state.email||'Not provided'}`,
    `Current provider: ${state.carrier||'Not stated'}`,`Lines: ${state.lines}`,`Current bill: ${state.currentBill?currency(state.currentBill)+'/mo':'Not stated'}`,
    `Plan interest: ${state.plan}`,`Phone: ${state.chosen?`${dev.name} / ${state.color} / ${state.storage}`:`${dev.name} (exploring)`}`,
    `Internet interest: ${state.internet}`,`DIRECTV quote: ${state.wantTV?'Yes':'No'}`,
    `Service estimate only: ${serviceTotal()===null?'Custom quote needed':currency(serviceTotal())+'/mo'}`,
    `Requested 3-hour window: ${state.appointmentDate||'No date'} / ${state.appointmentTime||'No window'}`,
    'This is an unconfirmed appointment request and illustrative estimate. Phone payments, tax, fees, TV and credits require final verification.'
  ].join('\n');}
  async function sendText(){if(!state.appointmentDate||!state.appointmentTime){toast('Please choose your preferred date and 3-hour window first.');return;}
    const recipient='2053108645';const isiOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);const url=`sms:${recipient}${isiOS?'&':'?'}body=${encodeURIComponent(summary())}`;window.location.href=url;toast('Your SMS app should open. Press Send there to submit your request.');}
  function wireControls(){
    $$('[data-next]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.next)));
    $$('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
    const textfields=['firstName','lastName','phone','email','currentBill'];textfields.forEach(id=>$('#'+id)?.addEventListener('input',e=>{setStateField(id,id==='currentBill'?Math.max(0,NUM(e.target.value)):e.target.value);}));
    $$('#carriers button').forEach(el=>el.addEventListener('click',()=>setStateField('carrier',el.dataset.carrier)));
    $('#line-minus').addEventListener('click',()=>{state.lines=Math.max(1,state.lines-1);updatePlans();});
    $('#line-plus').addEventListener('click',()=>{state.lines=Math.min(12,state.lines+1);updatePlans();});
    $$('[data-internet-interest]').forEach(el=>el.addEventListener('click',()=>{state.hasInternet=el.dataset.internetInterest==='yes';$$('[data-internet-interest]').forEach(n=>n.classList.toggle('active',n===el));refresh();}));
    $$('[data-tv-interest]').forEach(el=>el.addEventListener('click',()=>{state.hasTV=el.dataset.tvInterest==='yes';$$('[data-tv-interest]').forEach(n=>n.classList.toggle('active',n===el));refresh();}));
    $$('#phone-filters button').forEach(el=>el.addEventListener('click',()=>{$$('#phone-filters button').forEach(n=>n.classList.toggle('active',n===el));renderPhones(el.dataset.filter);}));
    $('#internet-plan').addEventListener('change',e=>{state.internet=e.target.value;updatePlans();});
    $('#tv-choice').addEventListener('change',e=>{state.wantTV=e.target.checked;refresh();});
    $('#device-pick').addEventListener('click',revealSelected);
    const today=new Date(); const localDay=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    $('#appt-date').min=localDay(today);const max=new Date(today);max.setDate(max.getDate()+30);$('#appt-date').max=localDay(max);
    $('#appt-date').addEventListener('change',e=>{state.appointmentDate=e.target.value;refresh();});
    $$('#time-grid button').forEach(el=>el.addEventListener('click',()=>{state.appointmentTime=el.dataset.time;refresh();}));
    $('#send-button').addEventListener('click',sendText);
    $('#copy-button').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(summary());toast('Deal summary copied.');}catch{toast('Clipboard access unavailable. You can use the text-message button instead.');}});
  }
  // Guided voice is a deterministic speech-control fallback. It never pretends to be a live AI.
  function say(message){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.rate=.97;u.pitch=.94;u.volume=.85;const voices=window.speechSynthesis.getVoices();const en=voices.find(v=>v.lang.startsWith('en')&&/male|Daniel|Aaron|Arthur|Alex|Fred/i.test(v.name))||voices.find(v=>v.lang.startsWith('en'));if(en)u.voice=en;window.speechSynthesis.speak(u);}
  function recognizeUtterance(text){const lower=text.toLowerCase().trim();$('#voice-message').textContent=`Heard: “${text}”`;
    if(/(stop|mute|goodbye|end session)/.test(lower)){stopVoice();return;}
    if(/(next|continue|let's go|go on|show me next)/.test(lower)){const index=sections.indexOf(state.current);go(sections[Math.min(9,index+1)]);return;}
    if(/(back|previous)/.test(lower)){go(sections[Math.max(0,sections.indexOf(state.current)-1)]);return;}
    for(const carrier of ['verizon','t-mobile','at&t'])if(lower.includes(carrier)){state.carrier=carrier==='t-mobile'?'T-Mobile':carrier==='at&t'?'AT&T':'Verizon';refresh();toast('Carrier updated: '+state.carrier);if(state.current==='contact')go('service');return;}
    const numMap={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
    const linesMatch=lower.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(phone )?lines?/);if(linesMatch){state.lines=Math.min(12,Math.max(1,Number(linesMatch[1])||numMap[linesMatch[1]]));updatePlans();toast(`${state.lines} lines noted`);return;}
    const dollars=lower.match(/(?:\$|bill(?: is| around| about)?\s*)(\d{2,4})/);if(dollars){state.currentBill=NUM(dollars[1]);$('#currentBill').value=state.currentBill;refresh();toast(`Current bill: ${currency(state.currentBill)}`);return;}
    for(const p of phones){if(lower.includes(p.name.toLowerCase())||lower.includes(p.id)){selectPhone(p.id);go('device');toast('Showing '+p.name);return;}}
    if(/(choose this phone|select this phone|lock it|i want that phone)/.test(lower)){revealSelected();return;}
    const pname=state.current==='contact'&&lower.match(/(?:my name is|i'm|i am)\s+([a-z]+)(?:\s+([a-z]+))?/);if(pname){state.firstName=pname[1][0].toUpperCase()+pname[1].slice(1);state.lastName=pname[2]?pname[2][0].toUpperCase()+pname[2].slice(1):'';$('#firstName').value=state.firstName;$('#lastName').value=state.lastName;refresh();toast(`Welcome, ${state.firstName}!`);return;}
    toast('Try: “Verizon”, “four lines”, “iPhone Duo”, or “next”.');
  }
  function stopGuidedSpeech(){try{recognition?.stop();}catch{} recognition=null;try{window.speechSynthesis.cancel();}catch{} }
  async function stopVoice(){stopGuidedSpeech();if(realtime){try{realtime.dc?.close();realtime.pc?.close();realtime.stream?.getTracks()?.forEach(t=>t.stop());realtime.audio?.remove();}catch{}realtime=null;}$('#voice-listen').textContent='START LISTENING';$('#voice-status').textContent='VOICE GUIDE';$('#voice-toggle').setAttribute('aria-pressed','false');}
  async function startRealtime(){
    let res;try{res=await fetch('/api/realtime-token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store'});}catch{return false;}
    if(!res.ok)return false;
    const token=await res.json().catch(()=>null);if(!token?.value)return false;
    const pc=new RTCPeerConnection();const audio=document.createElement('audio');audio.autoplay=true;audio.setAttribute('playsinline','');audio.style.display='none';document.body.appendChild(audio);
    pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{toast('Tap Voice Guide again to enable audio playback on this device.');});};
    let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});for(const track of stream.getTracks())pc.addTrack(track,stream);
      const dc=pc.createDataChannel('oai-events');realtime={pc,dc,stream,audio};dc.onopen=()=>{dc.send(JSON.stringify({type:'response.create',response:{instructions:'Greet the customer as Sterling. Ask their name and begin the conversation.'}}));};
      dc.onmessage=ev=>{let event;try{event=JSON.parse(ev.data);}catch{return;}if(event.type==='response.function_call_arguments.done'){try{const args=JSON.parse(event.arguments||'{}');applyAITool(event.name,args);dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:event.call_id,output:JSON.stringify({ok:true})}}));dc.send(JSON.stringify({type:'response.create'}));}catch{}}};
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);const response=await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',body:offer.sdp,headers:{Authorization:'Bearer '+token.value,'Content-Type':'application/sdp'}});if(!response.ok)throw new Error('Realtime SDP failed');await pc.setRemoteDescription({type:'answer',sdp:await response.text()});
      voiceStartedAt=Date.now();$('#voice-status').textContent='STERLING LIVE';$('#voice-message').textContent='Sterling is connected. Speak naturally.';
      setTimeout(()=>{if(realtime&&Date.now()-voiceStartedAt>=240000){stopVoice();toast('Voice session ended after the protected time limit. Your deal remains here.');}},241000);
      return true;
    }catch(e){try{pc.close();stream?.getTracks().forEach(t=>t.stop());audio.remove();}catch{}realtime=null;return false;}
  }
  function applyAITool(name,args){
    if(name==='advance_section'&&sections.includes(args.section)){go(args.section);return;}
    if(name==='choose_phone'){const p=phones.find(p=>p.name.toLowerCase().includes(String(args.model||'').toLowerCase()));if(p){selectPhone(p.id);if(args.color&&p.colors.includes(args.color))state.color=args.color;if(args.storage&&p.storage.includes(args.storage))state.storage=args.storage;renderDevice();go('device');}return;}
    if(name==='update_deal'){
      for(const key of ['firstName','lastName','phone','email','carrier','plan','internet','currentBill','lines'])if(Object.hasOwn(args,key)){
        let val=args[key];if(key==='plan'&&!([...Object.keys(prices),'55+ Plan'].includes(val)))continue;
        if(key==='internet'&&!Object.hasOwn(internetPricing,val))continue;
        if(key==='lines')val=Math.max(1,Math.min(12,NUM(val)));
        if(key==='currentBill')val=Math.max(0,Math.min(3000,NUM(val)));
        state[key]=val;if($('#'+key))$('#'+key).value=val;
      }
      updatePlans();refresh();
    }
  }
  function startGuidedSpeech(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('#voice-message').textContent='Live AI voice is not configured, and this browser does not support speech recognition. You can tap through every section.';return false;}
    stopGuidedSpeech();recognition=new SR();recognition.lang='en-US';recognition.continuous=true;recognition.interimResults=false;
    recognition.onresult=e=>{const part=e.results[e.results.length-1];if(part?.isFinal)recognizeUtterance(part[0].transcript);};recognition.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed')toast('Microphone permission is required to use voice.');};
    recognition.onend=()=>{recognition=null;$('#voice-listen').textContent='START LISTENING';};try{recognition.start();$('#voice-status').textContent='VOICE GUIDANCE';$('#voice-message').textContent='Listening. Say “iPhone Duo”, “four lines”, “next”, or a carrier name.';say('Hey, I’m Sterling. Tap or talk your way through. Who do I have the pleasure of speaking with?');return true;}catch{return false;}
  }
  function wireVoice(){
    $('#voice-toggle').addEventListener('click',()=>{const panel=$('#voice-panel');panel.hidden=!panel.hidden;$('#voice-toggle').setAttribute('aria-pressed',String(!panel.hidden));if(panel.hidden)stopVoice();});
    $('#voice-listen').addEventListener('click',async()=>{if(realtime||recognition){await stopVoice();return;}$('#voice-listen').textContent='CONNECTING...';$('#voice-message').textContent='Checking live voice availability...';let ok=false;try{ok=await startRealtime();}catch{}if(!ok){ok=startGuidedSpeech();if(ok)toast('Using browser voice guidance. Live AI voice requires server credentials.');}$('#voice-listen').textContent=ok?'STOP LISTENING':'START LISTENING';});
    $('#voice-stop').addEventListener('click',async()=>{await stopVoice();$('#voice-panel').hidden=true;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stopGuidedSpeech();if(realtime){realtime.stream?.getAudioTracks().forEach(track=>track.enabled=false);$('#voice-message').textContent='Microphone paused in the background. Tap Stop and reconnect when ready.';}}});
  }
  function init(){renderPhones();renderDevice();renderPlans();wireControls();wireVoice();startObservers();refresh();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
