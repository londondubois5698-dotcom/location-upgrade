import test from 'node:test';
import assert from 'node:assert/strict';
import {Character} from '../character.js';
import {Voice} from '../voice.js';
import token from '../api/wolf-token.js';
const doc={hidden:false,addEventListener(){}};
globalThis.document=doc;globalThis.matchMedia=()=>({matches:false});
function fixture(){let loads=0;const events={};const classes=new Set();const stage={dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)}};const video={currentTime:3,paused:false,readyState:4,videoWidth:512,videoHeight:910,addEventListener:(n,f)=>events[n]=f,play:async()=>{},pause(){this.paused=true},load(){loads++}};const retry={hidden:true};return {character:new Character(stage,video,retry),stage,video,retry,events,loads:()=>loads};}
test('selection reactions preserve video time and do not override speaking',t=>{t.mock.timers.enable({apis:['setTimeout','setInterval']});const f=fixture();f.character.conversation('speaking');f.character.react('presenting');assert.equal(f.stage.dataset.state,'speaking');assert.equal(f.video.currentTime,3);assert.equal(f.loads(),0);f.character.conversation('idle');f.character.react('confirming');t.mock.timers.tick(4000);assert.equal(f.stage.dataset.state,'idle');});
test('missing media removes video layer but leaves poster fallback and retry',t=>{t.mock.timers.enable({apis:['setTimeout','setInterval']});const f=fixture();f.character.start();f.events.playing();assert.equal(f.stage.classList.contains('playing'),true);f.events.error();assert.equal(f.stage.classList.contains('playing'),false);assert.equal(f.retry.hidden,false);assert.equal(f.loads(),0);});
test('120 second controller renews schedule while respecting conversation priority',t=>{t.mock.timers.enable({apis:['setTimeout','setInterval']});const f=fixture();f.character.planCycle();assert.equal(f.character.cycle,1);assert.ok(f.character.events.length>=4);f.character.conversation('listening');t.mock.timers.tick(120000);assert.equal(f.character.cycle,2);assert.equal(f.stage.dataset.state,'listening');});
test('customer context reaches live socket without shadowing getter',()=>{let sent;const v=new Voice({character:{},status(){},changed(){},tool(){},context:()=>'{"lines":4}'});v.state='connected';v.socket={readyState:1,send:m=>sent=JSON.parse(m)};v.context('Customer selected blue');assert.equal(sent.type,'context-append');assert.equal(sent.content,'Customer selected blue');assert.equal(v.getContext(),'{"lines":4}');});
function response(){return {headers:{},code:0,setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(body){this.body=body;return this}};}
test('token adapter rejects wrong origin and method before upstream access',async()=>{for(const [req,expected] of [[{method:'GET',headers:{}},405],[{method:'POST',headers:{host:'preview.example',origin:'https://other.example'}},403]]){const res=response();await token(req,res);assert.equal(res.code,expected);assert.equal(res.headers['Cache-Control'],'no-store');}});
test('unavailable voice backend returns honest service failure',async t=>{t.mock.method(globalThis,'fetch',async()=>{throw new Error('offline')});const res=response();await token({method:'POST',headers:{host:'preview.example',origin:'https://preview.example'}},res);assert.equal(res.code,503);assert.match(res.body.error,/could not be reached/);});
test('multiple AI tool calls share one follow-up response and rapid Speak taps cannot overlap',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const previousWindow=globalThis.window,previousNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),previousWS=globalThis.WebSocket;
 t.after(()=>{globalThis.window=previousWindow;Object.defineProperty(globalThis,'navigator',previousNavigator);globalThis.WebSocket=previousWS});
 globalThis.window={AudioContext:class{async resume(){}async close(){}}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{async getUserMedia(){throw Object.assign(new Error('No microphone'),{name:'NotFoundError'})}}}});
 let socket;class Socket{constructor(){this.readyState=1;this.sent=[];socket=this}send(s){this.sent.push(JSON.parse(s))}close(){}}globalThis.WebSocket=Socket;
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({token:'temporary-test-token',url:'wss://test.invalid',tools:[]})}));
 const v=new Voice({character:{conversation(){}},status(){},changed(){},tool:()=>({ok:true}),context:()=> '{}'});await v.connect();socket.onopen();const emit=m=>socket.onmessage({data:JSON.stringify(m)});emit({type:'session-updated'});assert.equal(v.state,'connected');assert.match(v.listeningStatus(),/No microphone/);
 const responseCount=()=>socket.sent.filter(m=>m.type==='response-create').length;
 assert.equal(responseCount(),1);v.ask('Again');assert.equal(responseCount(),1);
 emit({type:'function-call-arguments-done',callId:'a',name:'saveContact',arguments:'{"field":"first","value":"Test"}'});emit({type:'function-call-arguments-done',callId:'b',name:'saveContact',arguments:'{"field":"last","value":"Customer"}'});assert.equal(responseCount(),1);emit({type:'response-done'});assert.equal(responseCount(),2);v.disconnect();
});
test('ending voice while microphone access is pending cannot restore listening state',async()=>{let finish;const states=[];const v=new Voice({character:{conversation:s=>states.push(s)},status(){},changed(){},tool(){},context:()=> '{}'});v.state='connected';v.enableMicrophone=()=>new Promise(r=>finish=r);const pending=v.toggleMic();v.disconnect();finish();await pending;assert.equal(v.state,'off');assert.equal(states.at(-1),'idle');});
