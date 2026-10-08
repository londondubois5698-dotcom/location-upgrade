import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../public/remix-player.js',import.meta.url),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture({allowAutoplay,signalOnly=false}){
  const notices=[], events=[];
  let player;
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
      play(){
        if(allowAutoplay||signalOnly){
          setTimeout(()=>callbacks.PLAY?.(),2);
          if(allowAutoplay){
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
  const sandbox={window:{SC:{Widget}},document:{createElement:element,head:element(),body:element()},setTimeout:fastTimers,clearTimeout,setInterval,clearInterval,console};
  vm.runInNewContext(code,sandbox,{timeout:1200});
  const remix=sandbox.window.createFoodRemixPlayer({
    onStatus:s=>notices.push(s),
    onStart:s=>events.push('start:'+s),
    onStop:()=>events.push('stop'),
    onFallback:()=>events.push('fallback'),
    onSecondNeeded:ctx=>events.push('second:'+!!ctx.softDecline),
    onRespectStop:()=>events.push('respect-stop'),
    onComplete:r=>events.push('complete:'+r.source)
  });
  return {remix,notices,events};
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
  assert.ok(events.includes('fallback'),'blocked SoundCloud must start original beat fallback');
  assert.ok(events.includes('start:beat'),'fallback beat must start without an extra tap');
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
  const {remix,notices,events}=fixture({allowAutoplay:false,signalOnly:true});
  const played=remix.play();
  await wait(110);
  const result=await played;
  assert.equal(result.source,'beat','PLAY event without timeline progress must NOT count as playback');
  assert.ok(events.includes('start:beat'),'no confirmed track must activate original 20-second beat');
  assert.ok(events.includes('complete:beat'),'fallback MUST complete and return control after full beat window');
  assert.ok(!events.includes('start:soundcloud'),'never report false SoundCloud playback');
  assert.ok(!notices.some(s=>s.includes('SoundCloud playback progress confirmed')),'do not show misleading playing indicator');
  remix.stop();
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
console.log('FOOD_REMIX_STAGE_SMOKE_OK soft declines, remote Ring, stage once, explicit stop');
console.log('FOOD_REMIX_SMOKE_OK refusal, customer answer, transcript cue, auto-play, fallback beat');
