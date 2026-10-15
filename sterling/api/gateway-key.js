import { createHash, timingSafeEqual } from 'node:crypto';
import { put, get } from '@vercel/blob';
import { createGateway } from 'ai';

const STORE_ID='store_77xswngTjapdvTI7';
const PATH='config/sterling-ai-gateway.json';
const SETUP_HASH='f183de11fe8754f829b2b2c8bb6c09ef677621681f864959759bb7e012a35f21';
const MODEL='openai/gpt-realtime-2.1';
const TEAM_SCOPE='londondubois5698-dotcom';

function hash(v){ return createHash('sha256').update(String(v||'')).digest('hex'); }
function safeEq(a,b){
  try{
    const A=Buffer.from(String(a)),B=Buffer.from(String(b));
    return A.length===B.length && timingSafeEqual(A,B);
  }catch{return false}
}
async function readConfig(){
  try{
    const r=await get(PATH,{access:'private',storeId:STORE_ID,useCache:false});
    if(!r||r.statusCode!==200)return null;
    const reader=r.stream.getReader();const chunks=[];let total=0;
    while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);total+=value.length}
    const all=new Uint8Array(total);let off=0;for(const c of chunks){all.set(c,off);off+=c.length}
    return JSON.parse(new TextDecoder().decode(all));
  }catch{return null}
}
async function verifyGatewayKey(apiKey){
  const gateway=createGateway({apiKey,teamIdOrSlug:TEAM_SCOPE});
  const setup=await gateway.experimental_realtime.getToken({
    model:MODEL,
    expiresAfterSeconds:60
  });
  if(!setup?.token||!setup?.url)throw new Error('Gateway key did not mint a realtime client secret.');
  return {ok:true,expiresAt:setup.expiresAt||null};
}

export async function loadStoredGatewayKey(){
  // Prefer explicit AI Gateway credentials that were already proven to work.
  // The private-store key is the same class of credential as AI_GATEWAY_API_KEY;
  // deployment OIDC is only a fallback so a scope change cannot override a
  // known-good funded Gateway key.
  if(process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  const cfg=await readConfig();
  if(cfg?.apiKey) return cfg.apiKey;
  if(process.env.VERCEL_OIDC_TOKEN) return process.env.VERCEL_OIDC_TOKEN;
  return '';
}

export default async function handler(req,res){
  const origin=String(req.headers.origin||'');
  if(origin==='https://londondubois5698-dotcom.github.io'||origin.endsWith('.vercel.app')||origin.startsWith('http://localhost:'))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method==='GET'){
    const env=!!process.env.AI_GATEWAY_API_KEY;
    const cfg=env?null:await readConfig();
    const oidc=!!process.env.VERCEL_OIDC_TOKEN;
    return res.status(200).json({
      ok:true,
      configured:env||!!cfg?.apiKey||oidc,
      source:env?'environment':(cfg?.apiKey?'private-store':(oidc?'vercel-oidc':'none')),
      verifiedAt:cfg?.verifiedAt||null
    });
  }
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'GET or POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(!safeEq(hash(body.setupCode),SETUP_HASH))return res.status(403).json({ok:false,error:'Invalid Sterling setup code'});
    if(process.env.AI_GATEWAY_API_KEY)return res.status(200).json({ok:true,alreadyConfigured:true,source:'environment'});
    const existing=await readConfig();
    if(existing?.apiKey)return res.status(200).json({ok:true,alreadyConfigured:true,source:'private-store',verifiedAt:existing.verifiedAt||null});
    const apiKey=String(body.apiKey||'').trim();
    if(apiKey.length<20||/\s/.test(apiKey))return res.status(400).json({ok:false,error:'That does not look like a valid Vercel AI Gateway API key.'});
    await verifyGatewayKey(apiKey);
    const saved={
      apiKey,
      verifiedAt:new Date().toISOString(),
      model:MODEL,
      teamScope:TEAM_SCOPE
    };
    await put(PATH,JSON.stringify(saved),{
      access:'private',
      storeId:STORE_ID,
      allowOverwrite:true,
      addRandomSuffix:false,
      contentType:'application/json',
      cacheControlMaxAge:0
    });
    return res.status(200).json({ok:true,configured:true,verified:true,source:'private-store',model:MODEL});
  }catch(e){
    console.error('[sterling:gateway-key] setup failed',{message:e?.message,stack:e?.stack});
    return res.status(500).json({ok:false,error:e?.message||'Could not verify/store Gateway key'});
  }
}
