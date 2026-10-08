import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../public/remix-player.js',import.meta.url),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture({allowAutoplay}){
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
      play(){if(allowAutoplay)setTimeout(()=>callbacks.PLAY?.(),2)}
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
    onFallback:()=>events.push('fallback')
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
  assert.equal(events.length,0,'clear refusal must have zero audio events');
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
console.log('FOOD_REMIX_SMOKE_OK refusal, customer answer, transcript cue, auto-play, fallback beat');
