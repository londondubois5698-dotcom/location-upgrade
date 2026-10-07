import { createGateway } from 'ai';
import { loadStoredGatewayKey } from './gateway-key.js';

const MODEL='openai/gpt-realtime-2.1';
const TEAM_SCOPE='londondubois5698-dotcom';

function cors(req,res){
  const origin=String(req.headers.origin||'');
  if(origin==='https://londondubois5698-dotcom.github.io'||origin.endsWith('.vercel.app')||origin.startsWith('http://localhost:')){
    res.setHeader('Access-Control-Allow-Origin',origin);
  }
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Cache-Control','no-store,max-age=0');
}

export default async function handler(req,res){
  cors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});

  const explicit=!!process.env.AI_GATEWAY_API_KEY;
  const oidc=!!process.env.VERCEL_OIDC_TOKEN;
  const report={
    ok:false,
    timestamp:new Date().toISOString(),
    model:MODEL,
    authSource:explicit?'environment':(oidc?'vercel-oidc':'private-store-or-none'),
    gatewayConfigured:false,
    realtimeTokenMint:false
  };

  try{
    const apiKey=await loadStoredGatewayKey();
    report.gatewayConfigured=!!apiKey;
    if(!apiKey)throw new Error('No AI Gateway credential is available');

    const gateway=createGateway({apiKey,teamIdOrSlug:TEAM_SCOPE});
    const setup=await gateway.experimental_realtime.getToken({model:MODEL,expiresAfterSeconds:30});
    if(!setup?.token||!setup?.url)throw new Error('Realtime client secret was not returned');

    report.realtimeTokenMint=true;
    report.ok=true;
    report.endpointHost=(()=>{try{return new URL(setup.url).host}catch{return 'returned'}})();
    return res.status(200).json(report);
  }catch(e){
    report.error=e?.message||String(e);
    console.error('[sterling:diagnostic]',{...report,error:report.error});
    return res.status(503).json(report);
  }
}
