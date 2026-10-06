import { experimental_generateSpeech as generateSpeech, gateway } from 'ai';

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const text=String(body.text||'').trim().slice(0,3500);
    if(!text) return res.status(400).json({error:'text required'});

    let result;
    try{
      result=await generateSpeech({
        model:gateway.speechModel('google/gemini-3.8-flash-tts'),
        text,
        voice:'Kore',
        instructions:'Natural American conversational voice. Warm, confident and relaxed. Sound like a polished human sales concierge, not an announcer or robot. Use natural phrasing, slight conversational variation, and clear volume. Keep a brisk but comfortable pace.',
        outputFormat:'wav'
      });
    }catch{
      result=await generateSpeech({
        model:gateway.speechModel('openai/tts-1'),
        text,
        voice:'onyx',
        outputFormat:'mp3'
      });
    }

    const bytes=Buffer.from(result.audio.uint8Array);
    const mediaType=result.audio.mediaType || (bytes.slice(0,4).toString()==='RIFF'?'audio/wav':'audio/mpeg');
    res.setHeader('Content-Type',mediaType);
    res.setHeader('Cache-Control','private, no-store');
    return res.status(200).send(bytes);
  }catch(e){
    return res.status(500).json({error:e?.message||'Voice request failed'});
  }
}
