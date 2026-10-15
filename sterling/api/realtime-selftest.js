import { gateway } from 'ai';

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'GET only'});
  const started=Date.now();
  try{
    const setup=await gateway.experimental_realtime.getToken({
      model:'openai/gpt-realtime-2.1',
      expiresAfterSeconds:90,
      sessionConfig:{
        voice:'marin',
        turnDetection:{type:'server-vad'}
      }
    });
    const keys=setup&&typeof setup==='object'?Object.keys(setup):[];
    const safe={};
    for(const k of keys){
      const v=setup[k];
      if(/token|secret|key|authorization/i.test(k)){
        safe[k]=v?('[redacted '+String(v).length+' chars]'):null;
      }else if(typeof v==='string'&&v.length<240){
        safe[k]=v;
      }else if(typeof v==='number'||typeof v==='boolean'||v==null){
        safe[k]=v;
      }else if(typeof v==='object'){
        safe[k]=Array.isArray(v)?'[array]':'[object]';
      }
    }
    return res.status(200).json({
      ok:true,
      model:'openai/gpt-realtime-2.1',
      latencyMs:Date.now()-started,
      keys,
      setup:safe
    });
  }catch(e){
    return res.status(500).json({ok:false,latencyMs:Date.now()-started,error:e?.message||String(e)});
  }
}