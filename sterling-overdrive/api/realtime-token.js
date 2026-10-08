import { gateway } from '@ai-sdk/gateway';
export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'POST only'});return;}
  try{
    const setup=await gateway.experimental_realtime.getToken({model:'openai/gpt-realtime-2.1',expiresAfterSeconds:600});
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.status(200).json({...setup,tools:[]});
  }catch(err){console.error('realtime-token',err);res.status(500).json({error:'Sterling voice could not start.'});}
}