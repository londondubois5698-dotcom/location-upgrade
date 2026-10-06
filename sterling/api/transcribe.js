import { transcribe } from 'ai';
import { gateway } from '@ai-sdk/gateway';

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const b64=String(body.audio||'');
    if(!b64) return res.status(400).json({error:'audio required'});
    const audio=Buffer.from(b64,'base64');
    if(audio.length>6_000_000) return res.status(413).json({error:'audio too large'});

    const result=await transcribe({
      model:gateway.transcriptionModel('openai/gpt-4o-transcribe'),
      audio
    });
    const text=String(result.text||'').trim();
    if(!text) return res.status(422).json({error:'No speech detected'});
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({text});
  }catch(e){
    return res.status(500).json({error:e?.message||'Transcription failed'});
  }
}
