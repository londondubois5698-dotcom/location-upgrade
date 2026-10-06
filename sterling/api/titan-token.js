import {
  createGateway,
  experimental_getRealtimeToolDefinitions as getRealtimeToolDefinitions,
  tool
} from 'ai';
import { z } from 'zod';
import { TITAN_INSTRUCTIONS } from '../titan-brain.js';
import { loadStoredGatewayKey } from './gateway-key.js';

const MODEL='openai/gpt-realtime-2.1';
const TEAM_SCOPE='londondubois5698-dotcom';

const tools={
  saveDiscovery:tool({
    description:'Immediately save a non-sensitive fact the customer clearly states so Titan can update the live NOW versus NEW screen.',
    inputSchema:z.object({
      field:z.enum([
        'carrier','lines','bill','phones','currentPlan','upgradeInterest',
        'internetProvider','internetBill','internetUse','discountEligibility',
        'work','commute','decisionMaker','tv','notes'
      ]),
      value:z.string().min(1).max(280)
    })
  }),
  setStage:tool({
    description:'Update Titan conversational stage when useful.',
    inputSchema:z.object({
      stage:z.enum(['rapport','discovery','value','handoff'])
    })
  })
};

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  try{
    const apiKey=await loadStoredGatewayKey();
    if(!apiKey)throw new Error('Titan voice is not connected to the existing Sterling gateway key.');
    const gateway=createGateway({apiKey,teamIdOrSlug:TEAM_SCOPE});
    const token=await gateway.experimental_realtime.getToken({model:MODEL,expiresAfterSeconds:240});
    const model=gateway.experimental_realtime(MODEL);
    const socket=model.getWebSocketConfig({token:token.token,url:token.url});
    const toolDefs=await getRealtimeToolDefinitions({tools});
    return res.status(200).json({
      ...token,
      url:socket.url,
      protocols:socket.protocols||[],
      model:MODEL,
      tools:toolDefs,
      instructions:TITAN_INSTRUCTIONS,
      version:'titan-1.0'
    });
  }catch(e){
    console.error('[titan:realtime-token]',{message:e?.message,stack:e?.stack});
    return res.status(500).json({error:e?.message||'Could not start Titan voice'});
  }
}
