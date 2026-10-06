import { createGateway } from 'ai';
import { CONFIG_PATH, cors, ownerOk, readJson, writeJson } from '../lib/core.js';

const MODEL='openai/gpt-realtime-2';
const TEAM_SCOPE='londondubois5698-dotcom';

export default async function handler(req,res){
  if(cors(req,res))return;
  if(req.method==='GET'){
    const cfg=await readJson(CONFIG_PATH,null);
    return res.status(200).json({ok:true,configured:!!(process.env.AI_GATEWAY_API_KEY||cfg?.apiKey),version:'titan-max-1'});
  }
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'GET or POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(!ownerOk(body.ownerKey))return res.status(403).json({ok:false,error:'Owner key is not valid'});
    const apiKey=String(body.apiKey||'').trim();
    if(apiKey.length<20||/\s/.test(apiKey))return res.status(400).json({ok:false,error:'Enter a valid Vercel AI Gateway API key'});
    const gateway=createGateway({apiKey,teamIdOrSlug:TEAM_SCOPE});
    const test=await gateway.experimental_realtime.getToken({model:MODEL,expiresAfterSeconds:45});
    if(!test?.token||!test?.url)throw new Error('Gateway key could not create a realtime session.');
    await writeJson(CONFIG_PATH,{apiKey,verifiedAt:new Date().toISOString(),model:MODEL,teamScope:TEAM_SCOPE});
    return res.status(200).json({ok:true,configured:true,verified:true,model:MODEL});
  }catch(e){
    console.error('[titan-max:setup]',e);
    return res.status(500).json({ok:false,error:e?.message||'Titan setup failed'});
  }
}
