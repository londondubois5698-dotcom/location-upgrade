import { createHash, timingSafeEqual } from 'node:crypto';
import { loadStoredGatewayKey } from './gateway-key.js';

const OWNER_HASH='740f047570fece67841e2e293720d5cd12ffe24fe4b8b9269851a1b2a37084f2';
const MODEL='openai/gpt-realtime-2.1';

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
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Titan-Owner-Key');
  res.setHeader('Cache-Control','no-store,max-age=0');
}

export default async function handler(req,res){
  cors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
  if(!ownerOk(String(req.headers['x-titan-owner-key']||req.query?.device||''))){
    return res.status(401).json({ok:false,error:'Titan passcode rejected'});
  }
  try{
    const apiKey=await loadStoredGatewayKey();
    if(!apiKey)return res.status(503).json({ok:false,error:'AI Gateway key is not configured'});
    return res.status(200).json({
      ok:true,
      gateway:true,
      model:MODEL,
      version:'titan-executive-glass-1',
      timestamp:new Date().toISOString()
    });
  }catch(e){
    console.error('[titan-max:health]',e);
    return res.status(500).json({ok:false,error:e?.message||'Titan health check failed'});
  }
}
