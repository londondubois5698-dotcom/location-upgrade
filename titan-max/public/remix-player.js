/* Food Remix player: plays from SoundCloud's official embedded widget; no copied audio. */
(function(global){
'use strict';
const TRACK='https://soundcloud.com/empire/dj-suede-the-remix-god-you-name-it-unameitchallenge';
let apiPromise=null;
function api(){
  if(global.SC&&global.SC.Widget)return Promise.resolve(global.SC);
  if(apiPromise)return apiPromise;
  apiPromise=new Promise(function(resolve,reject){
    const s=document.createElement('script');s.src='https://w.soundcloud.com/player/api.js';s.async=true;
    const timeout=setTimeout(function(){reject(new Error('SoundCloud player did not load'));},6500);
    s.onload=function(){clearTimeout(timeout);global.SC&&global.SC.Widget?resolve(global.SC):reject(new Error('SoundCloud player unavailable'));};
    s.onerror=function(){clearTimeout(timeout);reject(new Error('SoundCloud player blocked'));};
    document.head.appendChild(s);
  });
  return apiPromise;
}
global.createFoodRemixPlayer=function(callbacks){
  callbacks=callbacks||{};
  let dock=null,widget=null,used=false,active=false,timeout=null,manual=null,resolvePending=null;
  const notify=function(s){if(callbacks.onStatus)callbacks.onStatus(s)};
  function close(){
    clearTimeout(timeout);timeout=null;
    if(widget)try{widget.pause()}catch(e){}
    if(active&&callbacks.onStop)callbacks.onStop();
    active=false;widget=null;
    if(dock){dock.remove();dock=null}
    const r=resolvePending;resolvePending=null;if(r)r({ok:true,played:true,seconds:20});
    notify('Remix finished. Listening again.');
  }
  function play(){
    if(used)return Promise.resolve({ok:false,reason:'Already queued this conversation'});
    used=true;
    return new Promise(async function(resolve){
      try{
        const SC=await api();
        dock=document.createElement('div');
        dock.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:520px;margin:auto;padding:10px;border-radius:14px;border:1px solid #2b87a5;background:#081825;box-shadow:0 12px 38px #000b;color:#fff;font:13px system-ui';
        dock.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px"><strong>YOU NAME IT • 20-second remix</strong><button type="button" data-close style="font:inherit;border:1px solid #64899e;border-radius:7px;background:#173a4c;color:white;padding:5px 9px">Stop</button></div><div data-frame></div><button type="button" data-play style="display:none;width:100%;padding:9px;margin-top:7px;background:#159ad3;color:#fff;border:0;border-radius:8px;font-weight:800">Tap to play remix</button><div style="margin-top:5px;font-size:10px;color:#b3c8d4">Streaming via SoundCloud · DJ Suede The Remix God</div>';
        document.body.appendChild(dock);
        manual=dock.querySelector('[data-play]');
        const iframe=document.createElement('iframe');
        iframe.width='100%';iframe.height='80';iframe.title='SoundCloud You Name It remix';
        iframe.allow='autoplay';iframe.frameBorder='0';iframe.scrolling='no';
        iframe.src='https://w.soundcloud.com/player/?url='+encodeURIComponent(TRACK)+'&auto_play=false&visual=false&show_artwork=false&sharing=false&download=false';
        dock.querySelector('[data-frame]').appendChild(iframe);
        widget=SC.Widget(iframe);
        let settled=false;
        const blocked=setTimeout(function(){
          if(!active&&!settled){settled=true;manual.style.display='block';notify('SoundCloud needs a tap to start on this device.');resolve({ok:false,needsTap:true});}
        },4200);
        function started(){
          if(active)return;
          active=true;clearTimeout(blocked);manual.style.display='none';
          if(callbacks.onStart)callbacks.onStart();
          notify('Remix playing: first 20 seconds.');
          timeout=setTimeout(close,20000);
        }
        widget.bind(SC.Widget.Events.READY,function(){widget.seekTo(0);widget.setVolume(95);widget.play()});
        widget.bind(SC.Widget.Events.PLAY,started);
        widget.bind(SC.Widget.Events.PLAY_PROGRESS,function(ev){
          if(active&&ev&&ev.currentPosition>=20000)close();
        });
        widget.bind(SC.Widget.Events.ERROR,function(){
          if(!active){clearTimeout(blocked);if(!settled){settled=true;resolve({ok:false,error:'SoundCloud stream unavailable'})}manual.style.display='block';}
        });
        widget.bind(SC.Widget.Events.FINISH,close);
        dock.querySelector('[data-close]').onclick=function(){
          clearTimeout(blocked);
          if(!settled){settled=true;resolve({ok:false,cancelled:true})}
          close();
        };
        manual.onclick=function(){widget.seekTo(0);widget.play()};
        // Only resolve the AI tool after the cue, so it does not speak over the music.
        resolvePending=function(result){if(!settled){settled=true;resolve(result)}};
      }catch(e){
        notify('Remix player unavailable; continue speaking normally.');
        if(dock){dock.remove();dock=null}
        resolve({ok:false,error:String(e.message||e)});
      }
    });
  }
  return {play:play,reset:function(){used=false;close()},stop:close};
};
})(window);
