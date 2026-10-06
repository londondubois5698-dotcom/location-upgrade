import { gateway } from '@ai-sdk/gateway';

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const setup=await gateway.experimental_realtime.getToken({
      model:'openai/gpt-realtime-2.1',
      expiresAfterSeconds:600
    });
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({...setup,tools:[]});
  }catch(e){
    return res.status(500).json({error:e?.message||'Could not start realtime voice'});
  }
}
