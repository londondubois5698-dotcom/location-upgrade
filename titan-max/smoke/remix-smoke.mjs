import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../public/remix-player.js',import.meta.url),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture({allowAutoplay,signalOnly=false,trackId=293}){
  const notices=[], events=[];
  let player,unblocked=false;
  function element(tag='div'){
    const fields={};
    return {
      tag,style:{},children:[],onclick:null,innerHTML:'',textContent:'',
      setAttribute(){},appendChild(child){this.children.push(child);return child},
      remove(){this.removed=true},
      querySelector(sel){return fields[sel]||(fields[sel]=element('button'))}
    };
  }
  function Widget(){
    const callbacks={};
    player={
      bind(name,fn){callbacks[name]=fn},
      seekTo(){},setVolume(){},pause(){events.push('pause')},
      getCurrentSound(cb){cb(trackId?{id:trackId}:null)},
      play(){
        if(allowAutoplay||signalOnly||unblocked){
          setTimeout(()=>callbacks.PLAY?.(),2);
          if(allowAutoplay||unblocked){
            setTimeout(()=>callbacks.PLAY_PROGRESS?.({currentPosition:0}),5);
            setTimeout(()=>callbacks.PLAY_PROGRESS?.({currentPosition:500}),13);
            setTimeout(()=>callbacks.PLAY_PROGRESS?.({currentPosition:1250}),22);
          }
        }
      }
    };
    setTimeout(()=>callbacks.READY?.(),2);
    return player;
  }
  Widget.Events={READY:'READY',PLAY:'PLAY',PLAY_PROGRESS:'PLAY_PROGRESS',FINISH:'FINISH',ERROR:'ERROR'};
  const fastTimers=(fn,ms,...args)=>setTimeout(fn,ms>500?35:ms,...args);
  const body=element();
  const sandbox={window:{SC:{Widget},location:{href:''}},document:{createElement:element,head:element(),body},setTimeout:fastTimers,clearTimeout,setInterval,clearInterval,console};
  vm.runInNewContext(code,sandbox,{timeout:1200});
  const remix=sandbox.window.createFoodRemixPlayer({
    onStatus:s=>notices.push(s),
    onStart:s=>events.push('start:'+s),
    onStop:()=>events.push('stop'),
    onFallback:()=>events.push('fallback'),
    onSecondNeeded:ctx=>events.push('second:'+!!ctx.softDecline),
    onRespectStop:()=>events.push('respect-stop'),
    onComplete:r=>events.push('complete:'+r.source),
    onAwaitingTap:()=>events.push('awaiting-tap')
  });
  return {remix,notices,events,unlock:()=>{unblocked=true;if(player)player.play()},
    appUrl:()=>sandbox.window.location.href,
    clickApp:()=>{const d=body.children[body.children.length-1];d.querySelector('[data-open-app]').onclick()}};
}

{
  const {remix,events}=fixture({allowAutoplay:false});
  remix.observeAssistant('Do you know what I am gonna eat?');
  assert.equal(remix.isArmed(),true,'food question must arm the second icebreaker');
  remix.observeCustomer('No thanks, stop talking');
  await wait(90);
  assert.equal(remix.hasCued(),false,'clear refusal must not play sound');
  assert.equal(events.filter(x=>x.startsWith('start:')).length,0,'clear refusal must have zero audio events');
  remix.stop();
}
{
  const {remix,events}=fixture({allowAutoplay:false});
  remix.observeAssistant("Do you know what I'm gonna eat?");
  remix.observeCustomer('No');
  await wait(110);
  assert.equal(remix.hasCued(),true,'answer to the food question MUST cue automatically');
  assert.ok(events.includes('awaiting-tap'),'blocked SoundCloud must stay in a visible mandatory music gate');
  assert.equal(remix.isWaitingForTap(),true,'blocked track must NOT skip the song');
  assert.ok(!events.some(x=>x.startsWith('complete:')),'do not resume the assistant before music plays');
  remix.stop();
}
{
  const {remix,events}=fixture({allowAutoplay:true});
  remix.observeAssistant("You know what I'm gonna eat?");
  remix.observeAssistant('Let me tell you!');
  await wait(100);
  assert.equal(remix.hasCued(),true,'spoken catchphrase must trigger music without tool call');
  assert.ok(events.includes('start:soundcloud'),'official widget must play if autoplay permitted');
  remix.stop();
}

{
  const {remix,events}=fixture({allowAutoplay:true});
  remix.observeCustomer('Hello there');
  remix.onAssistantTurnDone(300);
  remix.observeCustomer("I'm good, not interested in changing service.");
  remix.onAssistantTurnDone(300);
  remix.onAssistantTurnDone(300);
  assert.deepEqual(events.filter(x=>x.startsWith('second:')),['second:true'],'soft refusal must cue one respectful second-icebreaker setup');
  remix.observeAssistant("I understand, no sales pitch. I am hungry. You know what I'm gonna eat?");
  assert.equal(remix.isArmed(),true,'soft refusal response should arm food setup');
  remix.observeCustomer('Not interested in wireless, but what?');
  await wait(105);
  assert.ok(events.includes('start:soundcloud'),'casual not-interested response must still play if engaged');
  remix.stop();
}
{
  const {remix,events}=fixture({allowAutoplay:false});
  remix.observeCustomer('Hello');
  remix.observeCustomer('Please leave and stop talking.');
  remix.onAssistantTurnDone(300);
  assert.equal(remix.hasCued(),false,'explicit request to leave must not queue audio');
  assert.equal(remix.isArmed(),false);
  assert.ok(events.includes('respect-stop'),'the stage machine must respect a direct stop');
  const denied=await remix.play();
  assert.equal(denied.ok,false,'model tool call may not override a direct stop');
  remix.stop();
}
{
  const {remix,events}=fixture({allowAutoplay:true});
  remix.observeCustomer('Hello');
  remix.observeCustomer("I'm not home right now.");
  remix.onAssistantTurnDone(300);
  assert.ok(events.includes('second:true'),'Ring remote customer soft reply should offer the food beat');
  remix.stop();
}
{
  const {remix,notices,events,unlock}=fixture({allowAutoplay:false,signalOnly:true});
  const resultPromise=remix.play();
  await wait(110);
  assert.equal(remix.isWaitingForTap(),true,'PLAY without progressing track must NOT skip the mandatory music');
  assert.ok(events.includes('awaiting-tap'),'must make user-visible playback-required stage');
  assert.ok(!events.includes('complete:voice'),'AI must not resume before SoundCloud music');
  assert.ok(!events.includes('start:beat'),'old annoying beat must never return');
  assert.ok(!notices.some(x=>x.includes('SoundCloud playback progress confirmed')),'never falsely claim music started');
  unlock();
  await wait(120);
  assert.ok(events.includes('start:soundcloud'),'a trusted/manual start must be accepted even after initial autoplay failure');
  const result=await resultPromise;
  assert.equal(result.source,'soundcloud','playback after user interaction must complete the actual music');
  assert.ok(events.includes('complete:soundcloud'),'must resume conversation after 20 seconds of music');
  remix.stop();
}
{
  const {remix,events}=fixture({allowAutoplay:false});
  const resultPromise=remix.play();
  await wait(110);
  assert.equal(remix.isWaitingForTap(),true);
  remix.stop();
  const result=await resultPromise;
  assert.equal(result.stopped,true,'explicit Stop must safely end the required music stage');
  assert.ok(!events.includes('start:beat'),'stopping must not start a beat');
}
{
  const {remix,events}=fixture({allowAutoplay:true});
  const played=remix.play();
  await wait(110);
  const result=await played;
  assert.equal(result.source,'soundcloud','position change confirms official SoundCloud playback');
  assert.ok(events.includes('start:soundcloud'));
  assert.ok(events.includes('complete:soundcloud'),'verified recording must complete then trigger conversation handoff');
  assert.ok(events.indexOf('complete:soundcloud')>events.indexOf('start:soundcloud'));
  remix.stop();
}
{
  const {remix,appUrl,clickApp}=fixture({allowAutoplay:false,trackId:123456});
  const pending=remix.play();
  await wait(20);
  assert.equal(appUrl(),'','music cue MUST NOT auto-switch out of Titan/Sterling');
  clickApp();
  assert.equal(appUrl(),'soundcloud://tracks:123456','a real user tap uses the resolved numeric SoundCloud track ID');
  remix.stop();await pending;
}
{
  const {remix,appUrl,clickApp}=fixture({allowAutoplay:false,trackId:null});
  const pending=remix.play();
  await wait(20);
  clickApp();
  assert.equal(appUrl(),'https://soundcloud.com/empire/dj-suede-the-remix-god-you-name-it-unameitchallenge','missing metadata should use real permalink, not a guessed app ID');
  remix.stop();await pending;
}
console.log('SOUNDCLOUD_DEEP_LINK_SMOKE_OK resolved track ID, safe universal URL fallback, no automatic app switch');
console.log('FOOD_REMIX_STAGE_SMOKE_OK soft declines, remote Ring, stage once, explicit stop');
console.log('FOOD_REMIX_SMOKE_OK mandatory music gate, delayed manual start, 20-second completion, stop, and no beat');
