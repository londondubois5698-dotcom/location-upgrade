import { get, put } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createGateway, generateText } from 'ai';
import { loadStoredGatewayKey } from './gateway-key.js';

const STORE_ID='store_77xswngTjapdvTI7',LEARNING_PATH='titan-max/memory/learning.json',MEMORY_PATH='titan-max/memory/stops.json',OWNER_HASH='740f047570fece67841e2e293720d5cd12ffe24fe4b8b9269851a1b2a37084f2',TEAM_SCOPE='londondubois5698-dotcom';
function hash(v){return createHash('sha256').update(String(v||'')).digest('hex')}
function ownerOk(v){try{const A=Buffer.from(hash(v)),B=Buffer.from(OWNER_HASH);return A.length===B.length&&timingSafeEqual(A,B)}catch{return false}}
function cors(req,res){const o=String(req.headers.origin||'');if(o==='https://londondubois5698-dotcom.github.io'||o.endsWith('.vercel.app')||o.startsWith('http://localhost:'))res.setHeader('Access-Control-Allow-Origin',o);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Titan-Owner-Key');res.setHeader('Cache-Control','no-store,max-age=0')}
function clean(v,max=800){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max)}
function sensitive(v){return /social security|\bssn\b|driver'?s? license number|credit card|debit card|card number|account pin|password|one[- ]?time code|verification code/i.test(JSON.stringify(v||{}))}
async function read(path,fallback){try{const r=await get(path,{access:'private',storeId:STORE_ID,useCache:false});if(!r||r.statusCode!==200)return fallback;const rd=r.stream.getReader(),chunks=[];let total=0;while(true){const {done,value}=await rd.read();if(done)break;chunks.push(value);total+=value.length}const all=new Uint8Array(total);let off=0;for(const c of chunks){all.set(c,off);off+=c.length}return JSON.parse(new TextDecoder().decode(all))}catch{return fallback}}
async function write(path,value){return put(path,JSON.stringify(value),{access:'private',storeId:STORE_ID,allowOverwrite:true,addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:0})}
function parse(s){s=String(s||'').replace(/^\s*\`\`\`(?:json)?/i,'').replace(/\`\`\`\s*$/,'').trim();try{return JSON.parse(s)}catch{return {lessons:[clean(s,400)]}}}

export default async function handler(req,res){
  cors(req,res);if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST only'});
  if(!ownerOk(String(req.headers['x-titan-owner-key']||'')))return res.status(401).json({ok:false,error:'Titan owner key required'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};if(sensitive(body))return res.status(400).json({ok:false,error:'Sensitive credentials cannot enter Titan learning'});
    const key=await loadStoredGatewayKey();if(!key)return res.status(503).json({ok:false,error:'Sterling Gateway key is not configured'});
    const transcript=clean(body.transcript,7000),discovery=body.discovery&&typeof body.discovery==='object'?body.discovery:{},existing=await read(LEARNING_PATH,{lessons:[]});
    const gateway=createGateway({apiKey:key,teamIdOrSlug:TEAM_SCOPE});
    const result=await generateText({model:gateway('openai/gpt-5.6-sol'),maxOutputTokens:450,prompt:[
      "You are Titan's private field-learning analyst for London.",
      "Extract only reusable truthful conversation lessons. Do not infer or retain sensitive credentials, protected traits, private medical details, or private financial details.",
      'Return JSON only: {"lessons":["..."],"objections":["..."],"wins":["..."]}. Keep each item concise.',
      'Existing lessons: '+JSON.stringify((existing.lessons||[]).slice(0,30)),
      'Discovery: '+JSON.stringify(discovery),
      'Transcript: '+transcript
    ].join('\n')});
    const learned=parse(result.text),incoming=[...(learned.lessons||[]),...(learned.objections||[]).map(x=>'Objection: '+x),...(learned.wins||[]).map(x=>'Worked: '+x)].map(x=>clean(x,360)).filter(Boolean),merged=[];
    for(const x of [...incoming,...(existing.lessons||[])])if(x&&!merged.some(y=>y.toLowerCase()===x.toLowerCase()))merged.push(x);
    await write(LEARNING_PATH,{lessons:merged.slice(0,120),updatedAt:new Date().toISOString()});
    if(transcript){const stops=await read(MEMORY_PATH,[]);stops.unshift({id:'session-'+Date.now(),at:new Date().toISOString(),address:clean(body.address,180),summary:clean(body.summary||transcript,700),outcome:clean(body.outcome,280),nextMove:clean(body.nextMove,280),discovery});await write(MEMORY_PATH,stops.slice(0,300))}
    return res.status(200).json({ok:true,newLessons:incoming.slice(0,8),lessonCount:Math.min(120,merged.length)});
  }catch(e){console.error('[titan-max:learn]',e);return res.status(500).json({ok:false,error:e?.message||'Learning pass failed'})}
}
