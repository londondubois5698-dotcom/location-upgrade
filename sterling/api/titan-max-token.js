import { createGateway, experimental_getRealtimeToolDefinitions as getRealtimeToolDefinitions, tool } from 'ai';
import { z } from 'zod';
import { createHash, timingSafeEqual } from 'node:crypto';
import { loadStoredGatewayKey } from './gateway-key.js';

const MODEL='openai/gpt-realtime-2.1';
const TEAM_SCOPE='londondubois5698-dotcom';
const OWNER_HASH='740f047570fece67841e2e293720d5cd12ffe24fe4b8b9269851a1b2a37084f2';

function ownerOk(v){
  try{
    const h=createHash('sha256').update(String(v||'')).digest('hex');
    const A=Buffer.from(h),B=Buffer.from(OWNER_HASH);
    return A.length===B.length&&timingSafeEqual(A,B);
  }catch{return false}
}
function cors(req,res){
  const o=String(req.headers.origin||'');
  if(o==='https://londondubois5698-dotcom.github.io'||o.endsWith('.vercel.app')||o.startsWith('http://localhost:'))res.setHeader('Access-Control-Allow-Origin',o);
  res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store,max-age=0');
}
const tools={
  saveContact:tool({
    description:'Save one clearly heard field for the temporary on-screen review card.',
    inputSchema:z.object({field:z.enum(['first','last','phone','email']),value:z.string().min(1).max(254)})
  }),
  commitContact:tool({
    description:'Mark the temporary on-screen review card complete after the person says the full card looks correct.',
    inputSchema:z.object({reviewed:z.boolean()})
  }),
  saveDiscovery:tool({
    description:'Immediately save a clearly stated, non-sensitive customer fact for the live NOW versus NEW display.',
    inputSchema:z.object({
      field:z.enum(['carrier','lines','bill','phones','currentPlan','upgradeInterest','discountEligibility','internetProvider','internetBill','internetUse','tv','decisionMaker','work','commute','rapportAnchor','painPoint','motivator','objection','decisionStyle','jonesCue','lossAversionCue','urgencyTrigger','nextClose','notes']),
      value:z.string().min(1).max(300)
    })
  }),
  saveFieldMemory:tool({
    description:'Save concise non-sensitive rep-side memory for a later second loop at this stop.',
    inputSchema:z.object({address:z.string().max(180).optional(),summary:z.string().min(1).max(700),outcome:z.string().max(280).optional(),nextMove:z.string().max(280).optional()})
  }),
  recallFieldMemory:tool({
    description:'Recall prior stop memory when London asks what happened here earlier or references a prior customer/stop.',
    inputSchema:z.object({query:z.string().min(1).max(300)})
  }),
  setFaceMode:tool({
    description:'Change Titan face expression when it improves the interaction.',
    inputSchema:z.object({mode:z.enum(['neutral','friendly','thinking','excited','serious','ring'])})
  })
};

export default async function handler(req,res){
  cors(req,res);if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({error:'GET or POST only'});
  if(!ownerOk(req.query?.device))return res.status(401).json({error:'Titan owner key required'});
  try{
    const apiKey=await loadStoredGatewayKey();
    if(!apiKey)return res.status(503).json({error:'Sterling Gateway key is not configured'});
    const gateway=createGateway({apiKey,teamIdOrSlug:TEAM_SCOPE});
    let token,lastErr;
    for(let attempt=0;attempt<3;attempt++){
      try{
        token=await gateway.experimental_realtime.getToken({model:MODEL,expiresAfterSeconds:300});
        if(token?.token&&token?.url)break;
      }catch(e){lastErr=e}
      if(attempt<2)await new Promise(r=>setTimeout(r,250*(attempt+1)));
    }
    if(!token?.token||!token?.url)throw lastErr||new Error('Titan realtime token mint failed');
    const toolsDef=await getRealtimeToolDefinitions({tools});
    return res.status(200).json({...token,tools:toolsDef,model:MODEL,version: '18.1-connection-recovery'});
  }catch(e){
    console.error('[titan-max:token]',e);
    return res.status(500).json({error:e?.message||'Could not start Titan Max'});
  }
}
