import {
  createGateway,
  experimental_getRealtimeToolDefinitions as getRealtimeToolDefinitions,
  tool
} from 'ai';
import { z } from 'zod';
import { STERLING_INSTRUCTIONS } from '../brain.js';
import { loadStoredGatewayKey } from './gateway-key.js';

const MODEL = 'openai/gpt-realtime-2.1';
const TEAM_SCOPE = 'londondubois5698-dotcom';

async function getRealtimeGateway(){
  const apiKey=await loadStoredGatewayKey();
  if(!apiKey)throw new Error('Sterling voice needs a Vercel AI Gateway API key. Open /voice-setup.html once to finish voice setup.');
  return createGateway({apiKey,teamIdOrSlug:TEAM_SCOPE});
}

const ALLOWED_ORIGINS = new Set([
  'https://win.iclportal.com',
  'https://sterling-olive.vercel.app',
  'https://sterling-londondubois5698-dotcom.vercel.app'
]);

const tools = {
  saveFieldBrief: tool({
    description: 'RING PERSONAL FIELD ASSISTANT ONLY: Save or update a private pre-visit briefing about who London is approaching, number of people, what matters, and how Sterling should join. Use the facts naturally without announcing the private prep. Never claim independent surveillance or research.',
    inputSchema: z.object({
      title: z.string().max(100).optional(),
      briefing: z.string().min(1).max(1400),
      phase: z.enum(['prep','with_people','followup']).optional()
    })
  }),
  saveRouteStop: tool({
    description: 'RING PERSONAL FIELD ASSISTANT ONLY: Save or update notes for a specific stop/lead London mentions. Require a label, do not invent streets or addresses.',
    inputSchema: z.object({
      label: z.string().min(1).max(110),
      note: z.string().min(1).max(900),
      status: z.enum(['upcoming','visited','followup','completed']).optional()
    })
  }),
  getFieldNotebook: tool({
    description: 'RING PERSONAL FIELD ASSISTANT ONLY: Retrieve London’s locally stored route stops, latest group briefing and notes from this device. Look here before answering about old or upcoming stops; admit missing notes.',
    inputSchema: z.object({label: z.string().max(110).optional()})
  }),
  markRouteStop: tool({
    description: 'RING PERSONAL FIELD ASSISTANT ONLY: Set a known stop to upcoming, visited, followup or completed. Never invent visits.',
    inputSchema: z.object({
      label: z.string().min(1).max(110),
      status: z.enum(['upcoming','visited','followup','completed'])
    })
  }),
  getFieldPosition: tool({
    description: 'RING PERSONAL FIELD ASSISTANT ONLY: Request phone GPS with permission ONLY when London asks where they are. This returns coordinates and accuracy, NOT a street address or a view of surroundings.',
    inputSchema: z.object({})
  }),
  playFoodRemix: tool({
    description: 'Trigger the second food icebreaker: stream exactly the first 20 seconds of the user-selected SoundCloud You Name It remix from the official embedded player. Only once per new customer conversation after the first opener and explicit engagement; not after clear refusal.',
    inputSchema: z.object({})
  }),
  saveContact: tool({
    description: 'Save one clearly heard contact-card field. The full card is reviewed once after all four fields are present.',
    inputSchema: z.object({
      field: z.enum(['first','last','phone','email']),
      value: z.string().min(1).max(254),
      confirmed: z.boolean().optional()
    })
  }),
  setStage: tool({
    description: 'Update the live sales stage when the conversation clearly enters a new phase.',
    inputSchema: z.object({
      stage: z.enum(['rapport','contact','discovery','qualification','value','close'])
    })
  }),
  saveDiscovery: tool({
    description: 'Immediately save a non-sensitive fact the customer clearly states so Sterling Alpha can build the live NOW versus NEW visual. Do not use for SSN, ID, payment, PIN, password, or one-time-code data.',
    inputSchema: z.object({
      field: z.enum([
        'carrier','lines','bill','phones','currentPlan','upgradeInterest',
        'internetProvider','internetBill','internetUse','discountEligibility',
        'work','commute','decisionMaker','tv',
        'rapportAnchor','painPoint','motivator','objection','decisionStyle','jonesCue','lossAversionCue','urgencyTrigger','nextClose',
        'notes'
      ]),
      value: z.string().min(1).max(280)
    })
  }),
  commitContact: tool({
    description: 'Call once after the customer has reviewed the complete on-screen contact card and said it is correct.',
    inputSchema: z.object({reviewed:z.boolean().optional()})
  }),
  flagAddressMismatch: tool({
    description: 'Use when the customer says the house/address/area Sterling has is not correct.',
    inputSchema: z.object({
      heardAddress: z.string().max(240).optional()
    })
  })
};

function applyCors(req,res){
  const origin = req.headers?.origin || '';
  if(origin && ALLOWED_ORIGINS.has(origin)){
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary','Origin');
  }
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  return !origin || ALLOWED_ORIGINS.has(origin);
}

export async function mintRealtimeSetup(){
  const toolDefs = await getRealtimeToolDefinitions({tools});
  const realtimeGateway=await getRealtimeGateway();
  let setup,lastErr;
  for(let attempt=0;attempt<3;attempt++){
    try{
      setup=await realtimeGateway.experimental_realtime.getToken({
        model: MODEL,
        expiresAfterSeconds: 240
      });
      if(setup?.token&&setup?.url)break;
    }catch(e){lastErr=e}
    if(attempt<2)await new Promise(r=>setTimeout(r,250*(attempt+1)));
  }
  if(!setup?.token||!setup?.url)throw lastErr||new Error('Realtime token mint failed');

  const model = realtimeGateway.experimental_realtime(MODEL);
  const socket = model.getWebSocketConfig({
    token: setup.token,
    url: setup.url
  });

  return {
    ...setup,
    url: socket.url,
    protocols: socket.protocols || [],
    model: MODEL,
    tools: toolDefs,
    instructions: STERLING_INSTRUCTIONS,
    teamScope: TEAM_SCOPE,
    version: '18.1-connection-recovery'
  };
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method==='OPTIONS'){
    applyCors(req,res);
    return res.status(204).end();
  }
  if(!applyCors(req,res)) return res.status(403).json({error:'Origin not allowed'});
  if(req.method!=='GET' && req.method!=='POST') return res.status(405).json({error:'GET or POST only'});
  try{
    const setup = await mintRealtimeSetup();
    return res.status(200).json(setup);
  }catch(e){
    console.error('[sterling:realtime-token] failed', {
      message:e?.message,
      name:e?.name,
      stack:e?.stack
    });
    return res.status(500).json({
      error:e?.message||'Could not start realtime voice',
      code:e?.name||'REALTIME_TOKEN_ERROR'
    });
  }
}
