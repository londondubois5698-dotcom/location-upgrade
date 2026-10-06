import { createHash, timingSafeEqual } from 'node:crypto';
import { get, put } from '@vercel/blob';

export const OWNER_HASH='740f047570fece67841e2e293720d5cd12ffe24fe4b8b9269851a1b2a37084f2';
export const CONFIG_PATH='titan-max/config/gateway.json';
export const MEMORY_PATH='titan-max/memory/stops.json';
export const LEARNING_PATH='titan-max/memory/learning.json';

export function hash(v){return createHash('sha256').update(String(v||'')).digest('hex')}
export function safeEq(a,b){
  try{
    const A=Buffer.from(String(a)),B=Buffer.from(String(b));
    return A.length===B.length&&timingSafeEqual(A,B);
  }catch{return false}
}
export function ownerOk(value){return safeEq(hash(value),OWNER_HASH)}

export function cors(req,res){
  const origin=String(req.headers.origin||'');
  const allowed=
    origin==='https://londondubois5698-dotcom.github.io' ||
    origin==='https://titan-max-api.vercel.app' ||
    origin.endsWith('.vercel.app') ||
    origin.startsWith('http://localhost:');
  if(allowed)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Titan-Owner-Key');
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method==='OPTIONS'){res.status(204).end();return true}
  return false;
}

export function ownerFrom(req){
  return String(req.headers['x-titan-owner-key']||req.query?.device||req.query?.owner||'').trim();
}
export function requireOwner(req,res){
  if(ownerOk(ownerFrom(req)))return true;
  res.status(401).json({ok:false,error:'Titan owner key required'});
  return false;
}

export async function readJson(path,fallback){
  try{
    const r=await get(path,{access:'private',useCache:false});
    if(!r||r.statusCode!==200)return fallback;
    const reader=r.stream.getReader();const chunks=[];let total=0;
    while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);total+=value.length}
    const all=new Uint8Array(total);let off=0;for(const c of chunks){all.set(c,off);off+=c.length}
    return JSON.parse(new TextDecoder().decode(all));
  }catch{return fallback}
}
export async function writeJson(path,value){
  await put(path,JSON.stringify(value),{
    access:'private',
    allowOverwrite:true,
    addRandomSuffix:false,
    contentType:'application/json',
    cacheControlMaxAge:0
  });
  return value;
}
export async function loadGatewayKey(){
  if(process.env.AI_GATEWAY_API_KEY)return process.env.AI_GATEWAY_API_KEY;
  const cfg=await readJson(CONFIG_PATH,null);
  return String(cfg?.apiKey||'');
}
export function cleanText(v,max=800){
  return String(v||'').replace(/\s+/g,' ').trim().slice(0,max);
}
export function containsSensitive(v){
  const s=JSON.stringify(v||{}).toLowerCase();
  return /social security|\bssn\b|driver'?s? license number|credit card|debit card|card number|account pin|password|one[- ]?time code|verification code/.test(s);
}
export function tokens(v){
  return new Set(cleanText(v,2000).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2));
}
