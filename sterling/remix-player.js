/* Second icebreaker: official SoundCloud widget, with an original beat on blocked playback. */
(function(global){
'use strict';
var TRACK='https://soundcloud.com/empire/dj-suede-the-remix-god-you-name-it-unameitchallenge';
var scriptPromise=null;
function loadSoundCloud(){
  if(global.SC&&global.SC.Widget)return Promise.resolve(global.SC);
  if(scriptPromise)return scriptPromise;
  scriptPromise=new Promise(function(resolve,reject){
    var s=document.createElement('script'),timer=setTimeout(function(){reject(new Error('SoundCloud script timeout'))},7000);
    s.src='https://w.soundcloud.com/player/api.js';s.async=true;
    s.onload=function(){clearTimeout(timer);global.SC&&global.SC.Widget?resolve(global.SC):reject(new Error('SoundCloud widget API missing'))};
    s.onerror=function(){clearTimeout(timer);reject(new Error('SoundCloud script unavailable'))};
    document.head.appendChild(s);
  }).catch(function(e){scriptPromise=null;throw e});
  return scriptPromise;
}
global.createFoodRemixPlayer=function(cb){
  cb=cb||{};
  var context=null,beatTimer=null,beatEnd=null,dock=null,widget=null,ready=false;
  var started=false,used=false,playing=false,source='',musicTimer=null,watchdog=null,reply=null,replyDone=false;
  var finalResult=null,playPromise=null,streamProgressStart=null,progressConfirmed=false,stopRequested=false;
  var assistantBuffer='',armed=false,customerFollowup=false,assistantCueTimer=null;
  var customerTurns=0,softDecline=false,hardStop=false,needsSecond=false,secondReminderSent=false,cueReady=false;
  var explicitStop=/\b(?:go away|leave me alone|please leave|leave now|leave|stop talking|stop speaking|stop it|don't play|do not play|don't want music|no music|goodbye|bye now|bye|shut up|don't talk to me|do not talk to me|please stop|no thank you|no thanks|not today,? goodbye)\b/i;
  var softNo=/\b(?:not interested|i'?m good|i am good|all good|don'?t want it|do not want it|don'?t want (?:the )?(?:service|offer|upgrade)|not home|i'?m busy|no sale|don'?t need (?:service|a phone|an upgrade))\b/i;
  var fallbackNotice=false,closing=false;
  function say(msg){if(cb.onStatus)cb.onStatus(msg)}
  function audioContext(){
    if(context)return context;
    var AC=global.AudioContext||global.webkitAudioContext;
    if(!AC)return null;
    context=new AC();
    return context;
  }
  function prime(){
    try{
      var ac=audioContext();
      if(ac){
        ac.resume().catch(function(){});
        var o=ac.createOscillator(),g=ac.createGain();
        g.gain.value=0;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.012);
      }
    }catch(e){}
    loadSoundCloud().catch(function(){});
  }
  function thump(t,f,d,amp,noise){
    if(!context||context.state!=='running')return;
    try{
      var o=context.createOscillator(),g=context.createGain();
      o.type=noise?'square':'sine';
      o.frequency.setValueAtTime(f,t);
      if(!noise)o.frequency.exponentialRampToValueAtTime(Math.max(36,f*.38),t+d);
      g.gain.setValueAtTime(Math.max(.0001,amp),t);
      g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+d+.01);
    }catch(e){}
  }
  function startBeat(){
    if(beatTimer)return;
    try{var ac=audioContext();if(ac&&ac.state==='suspended')ac.resume().catch(function(){})}catch(e){}
    var beat=0;
    function pulse(){
      if(!context||context.state!=='running')return;
      var now=context.currentTime+.012;
      if(beat%4===0||beat%4===2)thump(now,125,.14,.15,false);
      if(beat%4===2)thump(now+.01,230,.07,.075,true);
      thump(now+.002,650,.025,.017,true);
      beat++;
    }
    pulse();beatTimer=setInterval(pulse,250);
  }
  function stopBeat(){
    clearInterval(beatTimer);beatTimer=null;
    clearTimeout(beatEnd);beatEnd=null;
  }
  function settle(result){
    finalResult=result;
    if(reply&&!replyDone){replyDone=true;var r=reply;reply=null;r(result)}
  }
  function cleanup(){
    clearTimeout(musicTimer);clearTimeout(watchdog);clearTimeout(assistantCueTimer);
    musicTimer=watchdog=assistantCueTimer=null;
    stopBeat();
    try{if(widget)widget.pause()}catch(e){}
    if(dock){dock.remove();dock=null}
    if(playing&&cb.onStop)cb.onStop();
    playing=false;source='';widget=null;ready=false;started=false;
    streamProgressStart=null;progressConfirmed=false;
  }
  function stop(){
    if(closing)return;closing=true;
    stopRequested=true;
    cleanup();settle({ok:false,stopped:true});
    closing=false;
  }
  function status(msg){if(dock){var n=dock.querySelector('[data-status]');if(n)n.textContent=msg}say(msg)}
  function complete(result){
    if(!started||stopRequested)return;
    // Return control to the live voice after the precise 20-second music segment.
    clearTimeout(musicTimer);clearTimeout(watchdog);musicTimer=watchdog=null;
    if(source==='beat')stopBeat();
    try{if(widget)widget.pause()}catch(e){}
    if(playing&&cb.onStop)cb.onStop();
    playing=false;started=false;
    if(dock){dock.remove();dock=null}
    settle(result);
    if(cb.onComplete)cb.onComplete(result);
    say(result.source==='soundcloud'?'Remix complete. Back in conversation.':'Original beat complete. Back in conversation.');
  }
  function fallback(reason){
    if(!started||source==='soundcloud'&&progressConfirmed)return;
    clearTimeout(watchdog);watchdog=null;
    if(source==='beat')return;
    if(widget)try{widget.pause()}catch(e){}
    source='beat';playing=true;progressConfirmed=false;
    if(cb.onStart)cb.onStart('beat');
    startBeat();
    var beatAudible=!!context&&context.state==='running';
    status(beatAudible?'Original beat playing for 20 seconds.':'SoundCloud autoplay blocked. Beat prepared; tap to enable audio if needed.');
    if(!fallbackNotice){fallbackNotice=true;if(cb.onFallback)cb.onFallback({reason:reason,beatAudible:beatAudible})}
    // IMPORTANT: Do not resolve tool early. Let the fallback play for 20 seconds first.
    musicTimer=setTimeout(function(){
      complete({ok:false,fallback:true,source:'beat',seconds:20,reason:reason,beatAudible:beatAudible});
    },20000);
  }
  function soundcloudStart(){
    if(!started||progressConfirmed)return;
    progressConfirmed=true;
    clearTimeout(watchdog);watchdog=null;
    if(source==='beat'){stopBeat();clearTimeout(musicTimer);musicTimer=null;}
    source='soundcloud';playing=true;
    if(cb.onStart)cb.onStart('soundcloud');
    status('SoundCloud playback progress confirmed · first 20 seconds.');
    musicTimer=setTimeout(function(){
      complete({ok:true,played:true,source:'soundcloud',seconds:20});
    },20000);
    if(dock){var b=dock.querySelector('[data-play]');if(b)b.textContent='SoundCloud playing · 20s';}
  }
  function showWidget(){
    dock=document.createElement('section');
    dock.setAttribute('aria-label','Second icebreaker remix');
    dock.style.cssText='position:fixed;left:9px;right:9px;bottom:9px;z-index:9999;max-width:550px;margin:auto;background:#071b2c;color:#f9feff;padding:11px;border:1px solid #36b4e6;border-radius:14px;box-shadow:0 12px 42px #000c;font:13px -apple-system,BlinkMacSystemFont,system-ui';
    dock.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong>FOOD REMIX · ICEBREAKER TWO</strong><button type="button" data-stop style="padding:6px 10px;border:1px solid #6b9db9;color:white;background:#163850;border-radius:8px">Stop</button></div><div data-frame style="margin:9px 0 3px"></div><div data-status style="font-size:12px;padding:3px 0">Cueing SoundCloud…</div><button type="button" data-play style="margin-top:7px;width:100%;padding:10px;background:#078ece;color:white;border:none;border-radius:9px;font-weight:800">Tap to start official remix if autoplay is blocked</button><div style="margin-top:5px;color:#a8c4d6;font-size:10px">Official SoundCloud player · streamed, not downloaded</div>';
    document.body.appendChild(dock);
    dock.querySelector('[data-stop]').onclick=stop;
    dock.querySelector('[data-play]').onclick=function(){
      if(widget){try{widget.seekTo(0);widget.play();}catch(e){fallback('SoundCloud playback was blocked')}}
      else fallback('SoundCloud player unavailable');
    };
  }
  function play(){
    if(hardStop)return Promise.resolve({ok:false,reason:'Homeowner asked to stop'});
    if(used)return playPromise||Promise.resolve(finalResult||{ok:false,reason:'Icebreaker already queued for this customer'});
    used=true;stopRequested=false;streamProgressStart=null;progressConfirmed=false;finalResult=null;showWidget();
    playPromise=new Promise(function(resolve){
      reply=resolve;replyDone=false;started=true;
      watchdog=setTimeout(function(){fallback('SoundCloud playback position never advanced on this device')},4000);
      loadSoundCloud().then(function(sc){
        if(!started||!dock)return;
        var frame=document.createElement('iframe');
        frame.width='100%';frame.height='80';frame.frameBorder='0';
        frame.setAttribute('allow','autoplay');frame.title='DJ Suede You Name It on SoundCloud';
        frame.src='https://w.soundcloud.com/player/?url='+encodeURIComponent(TRACK)+'&auto_play=false&visual=false&show_artwork=false&sharing=false&download=false';
        dock.querySelector('[data-frame]').appendChild(frame);
        widget=sc.Widget(frame);
        widget.bind(sc.Widget.Events.READY,function(){
          ready=true;
          if(source==='beat'||!started)return; // Never auto-play behind the fallback.
          try{widget.seekTo(0);widget.setVolume(95);widget.play()}catch(e){fallback('SoundCloud playback rejected')}
        });
        widget.bind(sc.Widget.Events.PLAY,function(){
          // PLAY means the player accepted the command; it does not prove iOS audio started.
          if(!progressConfirmed)status('Waiting for SoundCloud playback confirmation…');
        });
        widget.bind(sc.Widget.Events.PLAY_PROGRESS,function(x){
          if(!started||!x||!Number.isFinite(Number(x.currentPosition)))return;
          var pos=Number(x.currentPosition);
          if(streamProgressStart===null){streamProgressStart=pos; if(pos>2200){fallback('Playback did not start at the beginning');} return;}
          if(!progressConfirmed&&pos-streamProgressStart>=400) soundcloudStart();
          if(progressConfirmed&&pos>=20000)complete({ok:true,played:true,source:'soundcloud',seconds:20});
        });
        widget.bind(sc.Widget.Events.FINISH,function(){if(progressConfirmed)complete({ok:true,played:true,source:'soundcloud',seconds:20});else fallback('SoundCloud ended before playback could be confirmed')});
        widget.bind(sc.Widget.Events.ERROR,function(){fallback('SoundCloud stream unavailable')});
      }).catch(function(){fallback('SoundCloud connection unavailable')});
    });
    return playPromise;
  }
  function queueCue(delay){
    if(used||hardStop)return;
    clearTimeout(assistantCueTimer);
    assistantCueTimer=setTimeout(function(){if(!used&&!hardStop)play()},Math.max(120,Number(delay)||250));
  }
  function observeAssistant(text){
    if(used||hardStop||!text)return;
    assistantBuffer=(assistantBuffer+' '+String(text)).slice(-650).toLowerCase();
    if(/(?:you know|know what|guess what).{0,55}(?:gonna eat|going to eat|i(?:'| a)m eating|we(?:'| a)re eating|on my menu)|wanna hear the menu|want to hear the menu|what(?:'| i)s for dinner|i(?:'| a)m hungry.{0,90}(?:eat|menu|food)/.test(assistantBuffer)){
      armed=true;needsSecond=false;
    }
    if(armed&&/let me tell you|lemme tell you|i'?ll tell you|here comes (?:the |my )?menu|cue (?:that|the) (?:song|music|remix)/.test(assistantBuffer)){
      cueReady=true;
      // If output-complete events are unavailable, this last-resort timer still plays.
      queueCue(1700);
    }
  }
  function observeCustomer(text){
    if(!text)return;
    var val=String(text).toLowerCase().trim();
    if(explicitStop.test(val)){
      hardStop=true;armed=false;needsSecond=false;cueReady=false;
      clearTimeout(assistantCueTimer);
      if(playing)stop();
      if(cb.onRespectStop)cb.onRespectStop();
      return;
    }
    if(used||hardStop)return;
    customerTurns++;
    if(softNo.test(val))softDecline=true;
    if(armed){
      if(customerFollowup)return;
      customerFollowup=true;
      // Give Titan/Sterling a chance to say "Let me tell you" first.
      // Audio transcript completion can fire later than the text event.
      queueCue(7600);
      return;
    }
    // Greeting reply + first tech joke reply usually means two customer turns.
    // A casual "I'm good"/"not interested" still allows ONE playful second icebreaker;
    // an explicit no-thanks/stop never does.
    if(customerTurns>=2 || softDecline)needsSecond=true;
  }
  function onAssistantTurnDone(delay){
    if(used||hardStop)return;
    if(cueReady){
      queueCue(Math.max(250,Number(delay)||350));
      return;
    }
    if(armed)return; // Asked the menu question; wait for the answer.
    if(needsSecond&&!secondReminderSent){
      secondReminderSent=true;
      needsSecond=false;
      if(cb.onSecondNeeded)cb.onSecondNeeded({softDecline:softDecline,customerTurns:customerTurns});
    }
  }
  return {prime:prime,play:play,stop:stop,reset:function(){stop();used=false;armed=false;customerFollowup=false;assistantBuffer='';fallbackNotice=false;customerTurns=0;softDecline=false;hardStop=false;needsSecond=false;secondReminderSent=false;cueReady=false},observeAssistant:observeAssistant,observeCustomer:observeCustomer,onAssistantTurnDone:onAssistantTurnDone,hasCued:function(){return used},isArmed:function(){return armed}};
};
})(window);
