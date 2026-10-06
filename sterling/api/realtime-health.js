import WebSocket from 'ws';
import { mintRealtimeSetup } from './realtime-token.js';

function safeClose(ws){ try{ ws.close(); }catch{} }

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'GET only'});
  const started=Date.now();
  let ws;
  try{
    const setup=await mintRealtimeSetup();
    const tokenOk=typeof setup.token==='string'&&setup.token.length>10;
    const urlOk=typeof setup.url==='string'&&/^wss:\/\//i.test(setup.url);
    if(!tokenOk||!urlOk) throw new Error('Realtime token setup did not return a usable token and WebSocket URL');

    const audioResult=await new Promise((resolve,reject)=>{
      let done=false,sessionReady=false,audio=false;
      const finish=(value)=>{if(done)return;done=true;clearTimeout(timer);safeClose(ws);resolve(value)};
      const fail=(err)=>{if(done)return;done=true;clearTimeout(timer);safeClose(ws);reject(err)};
      const timer=setTimeout(()=>fail(new Error('Realtime health check timed out')),12000);

      ws=new WebSocket(setup.url, setup.protocols || [
        'ai-gateway-realtime.v1',
        'ai-gateway-auth.'+setup.token
      ]);

      ws.on('open',()=>{
        ws.send(JSON.stringify({
          type:'session-update',
          config:{
            instructions:'Health check only. When asked, say the single word ready.',
            voice:'marin',
            outputModalities:['audio'],
            outputAudioFormat:{type:'audio/pcm',rate:24000},
            turnDetection:{type:'disabled'}
          }
        }));
      });

      ws.on('message',(raw)=>{
        let m;try{m=JSON.parse(String(raw))}catch{return}
        if(m.type==='error') return fail(new Error(m.message||'Realtime gateway returned an error'));
        if(!sessionReady && (m.type==='session-created'||m.type==='session-started'||m.type==='session-updated')){
          sessionReady=true;
          ws.send(JSON.stringify({type:'conversation-item-create',item:{type:'text-message',role:'user',text:'Say ready.'}}));
          ws.send(JSON.stringify({type:'response-create',options:{modalities:['audio']}}));
          return;
        }
        if(m.type==='audio-delta'||m.type==='audio-chunk'){
          audio=!!m.delta;
          if(audio) finish({sessionReady:true,audio:true});
        }
      });
      ws.on('error',e=>fail(e instanceof Error?e:new Error(String(e))));
      ws.on('close',()=>{if(!done&&!audio)fail(new Error('Realtime socket closed before audio arrived'))});
    });

    return res.status(200).json({
      ok:true,
      version:'13.0',
      model:setup.model,
      tokenMint:true,
      websocket:true,
      nativeAudio:!!audioResult.audio,
      latencyMs:Date.now()-started
    });
  }catch(e){
    safeClose(ws);
    console.error('[sterling:realtime-health] failed',{message:e?.message,stack:e?.stack});
    return res.status(500).json({
      ok:false,
      version:'13.0',
      error:e?.message||String(e),
      latencyMs:Date.now()-started
    });
  }
}
