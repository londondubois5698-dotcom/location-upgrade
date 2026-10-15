import { get, put } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';

const STORE_ID='store_77xswngTjapdvTI7';
const MEMORY_PATH='titan-max/memory/stops.json';
const LEARNING_PATH='titan-max/memory/learning.json';
const OWNER_HASH='740f047570fece67841e2e293720d5cd12ffe24fe4b8b9269851a1b2a37084f2';

function hash(v){return createHash('sha256').update(String(v||'')).digest('hex')}
function ownerOk(v){try{const A=Buffer.from(hash(v)),B=Buffer.from(OWNER_HASH);return A.length===B.length&&timingSafeEqual(A,B)}catch{return false}}
function cors(req,res){const o=String(req.headers.origin||'');if(o==='https://londondubois5698-dotcom.github.io'||o.endsWith('.vercel.app')||o.startsWith('http://localhost:'))res.setHeader('Access-Control-Allow-Origin',o);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Titan-Owner-Key');res.setHeader('Cache-Control','no-store,max-age=0')}
function clean(v,max=800){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max)}
function sensitive(v){return /social security|\bssn\b|driver'?s? license number|credit card|debit card|card number|account pin|password|one[- ]?time code|verification code/i.test(JSON.stringify(v||{}))}
async function read(path,fallback){try{const r=await get(path,{access:'private',storeId:STORE_ID,useCache:false});if(!r||r.statusCode!==200)return fallback;const reader=r.stream.getReader(),chunks=[];let total=0;while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);total+=value.length}const all=new Uint8Array(total);let off=0;for(const c of chunks){all.set(c,off);off+=c.length}return JSON.parse(new TextDecoder().decode(all))}catch{return fallback}}
async function write(path,value){return put(path,JSON.stringify(value),{access:'private',storeId:STORE_ID,allowOverwrite:true,addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:0})}
function words(v){return new Set(clean(v,2000).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2))}
function score(m,q){const a=words(q),b=words([m.address,m.summary,m.outcome,m.nextMove].join(' '));let s=0;for(const x of a)if(b.has(x))s+=2;const ql=clean(q,400).toLowerCase(),al=clean(m.address,200).toLowerCase();if(al&&ql.includes(al))s+=12;return s}

export default async function handler(req,res){
  cors(req,res);if(req.method==='OPTIONS')return res.status(204).end();
  const key=String(req.headers['x-titan-owner-key']||req.query?.device||'');if(!ownerOk(key))return res.status(401).json({ok:false,error:'Titan owner key required'});
  if(req.method==='GET'){const stops=await read(MEMORY_PATH,[]),learning=await read(LEARNING_PATH,{lessons:[]});return res.status(200).json({ok:true,count:stops.length,lessonCount:(learning.lessons||[]).length,recent:stops.slice(0,12),lessons:(learning.lessons||[]).slice(0,30)})}
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'GET or POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(body.action==='recall'){const stops=await read(MEMORY_PATH,[]);const hits=stops.map(m=>({m,s:score(m,body.query)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,5).map(x=>x.m);return res.status(200).json({ok:true,hits})}
    if(body.action==='save'){
      if(sensitive(body))return res.status(400).json({ok:false,error:'Sensitive credentials cannot be stored'});
      const stops=await read(MEMORY_PATH,[]);const item={id:String(Date.now()),at:new Date().toISOString(),address:clean(body.address,180),summary:clean(body.summary,700),outcome:clean(body.outcome,280),nextMove:clean(body.nextMove,280),discovery:body.discovery&&typeof body.discovery==='object'?body.discovery:{}};
      if(!item.summary)return res.status(400).json({ok:false,error:'Memory summary required'});stops.unshift(item);await write(MEMORY_PATH,stops.slice(0,300));return res.status(200).json({ok:true,item,count:Math.min(stops.length,300)});
    }
    return res.status(400).json({ok:false,error:'Unknown memory action'});
  }catch(e){console.error('[titan-max:memory]',e);return res.status(500).json({ok:false,error:e?.message||'Memory failed'})}
}
