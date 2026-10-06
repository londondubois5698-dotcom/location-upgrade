import { createGateway, experimental_getRealtimeToolDefinitions as getRealtimeToolDefinitions, tool } from 'ai';
import { z } from 'zod';
import { cors, loadGatewayKey, requireOwner } from '../lib/core.js';

const MODEL='openai/gpt-realtime-2';
const TEAM_SCOPE='londondubois5698-dotcom';

const tools={
  saveDiscovery:tool({
    description:'Save a clearly stated, non-sensitive customer fact immediately so Titan can update the live NOW versus NEW screen.',
    inputSchema:z.object({
      field:z.enum(['carrier','lines','bill','phones','currentPlan','upgradeInterest','discountEligibility','internetProvider','internetBill','internetUse','tv','decisionMaker','work','commute','notes']),
      value:z.string().min(1).max(300)
    })
  }),
  saveFieldMemory:tool({
    description:'Save a concise rep-side memory about this stop for a future second loop. Never include sensitive credentials.',
    inputSchema:z.object({
      address:z.string().max(180).optional(),
      summary:z.string().min(1).max(700),
      outcome:z.string().max(280).optional(),
      nextMove:z.string().max(280).optional()
    })
  }),
  recallFieldMemory:tool({
    description:'Recall prior field-stop memory when London asks what happened here earlier or references a prior customer/stop.',
    inputSchema:z.object({query:z.string().min(1).max(300)})
  }),
  setFaceMode:tool({
    description:'Change Titan face expression only when it improves the interaction.',
    inputSchema:z.object({mode:z.enum(['neutral','friendly','thinking','excited','serious','ring'])})
  })
};

export default async function handler(req,res){
  if(cors(req,res))return;
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  if(!requireOwner(req,res))return;
  try{
    const apiKey=await loadGatewayKey();
    if(!apiKey)return res.status(503).json({error:'Titan needs one-time Gateway setup'});
    const gateway=createGateway({apiKey,teamIdOrSlug:TEAM_SCOPE});
    const token=await gateway.experimental_realtime.getToken({model:MODEL,expiresAfterSeconds:300});
    const toolDefs=await getRealtimeToolDefinitions({tools});
    return res.status(200).json({...token,tools:toolDefs,model:MODEL,version:'titan-max-1'});
  }catch(e){
    console.error('[titan-max:token]',e);
    return res.status(500).json({error:e?.message||'Could not start Titan voice'});
  }
}
