import {
  gateway,
  experimental_getRealtimeToolDefinitions as getRealtimeToolDefinitions,
  tool
} from 'ai';
import { z } from 'zod';

const tools = {
  saveContact: tool({
    description: 'Save one customer contact field only after the customer verbally confirms that field is correct.',
    inputSchema: z.object({
      field: z.enum(['first','last','phone','email']),
      value: z.string().min(1).max(254)
    })
  }),
  setStage: tool({
    description: 'Update Sterling sales stage when the conversation clearly moves to a new phase.',
    inputSchema: z.object({
      stage: z.enum(['rapport','contact','discovery','qualification','value','close'])
    })
  })
};

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const sessionConfig=body.sessionConfig||undefined;
    const toolDefs=await getRealtimeToolDefinitions({tools});
    const setup=await gateway.experimental_realtime.getToken({
      model:'openai/gpt-realtime-2.1',
      expiresAfterSeconds:600,
      sessionConfig:{...(sessionConfig||{}),tools:toolDefs}
    });
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({...setup,tools:toolDefs});
  }catch(e){
    return res.status(500).json({error:e?.message||'Could not start realtime voice'});
  }
}
