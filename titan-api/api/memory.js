import { MEMORY_PATH, LEARNING_PATH, cleanText, containsSensitive, cors, readJson, requireOwner, tokens, writeJson } from '../lib/core.js';

function scoreMemory(m,q){
  const qTokens=tokens(q),mTokens=tokens([m.address,m.summary,m.outcome,m.nextMove].filter(Boolean).join(' '));
  let score=0;for(const t of qTokens)if(mTokens.has(t))score+=2;
  const qn=cleanText(q,400).toLowerCase(),an=cleanText(m.address,200).toLowerCase();
  if(an&&qn.includes(an))score+=12;
  if(m.at)score+=Math.max(0,2-(Date.now()-Date.parse(m.at))/86400000/30);
  return score;
}
export default async function handler(req,res){
  if(cors(req,res))return;
  if(!requireOwner(req,res))return;
  if(req.method==='GET'){
    const stops=await readJson(MEMORY_PATH,[]);
    const learning=await readJson(LEARNING_PATH,{lessons:[]});
    return res.status(200).json({ok:true,count:stops.length,lessonCount:(learning.lessons||[]).length,recent:stops.slice(0,12),lessons:(learning.lessons||[]).slice(0,20)});
  }
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'GET or POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(body.action==='recall'){
      const q=cleanText(body.query,400),stops=await readJson(MEMORY_PATH,[]);
      const hits=stops.map(m=>({m,score:scoreMemory(m,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.m);
      return res.status(200).json({ok:true,hits});
    }
    if(body.action==='save'){
      if(containsSensitive(body))return res.status(400).json({ok:false,error:'Sensitive credentials are not allowed in Titan memory'});
      const stops=await readJson(MEMORY_PATH,[]);
      const item={
        id:String(Date.now())+'-'+Math.random().toString(36).slice(2,8),
        at:new Date().toISOString(),
        address:cleanText(body.address,180),
        summary:cleanText(body.summary,700),
        outcome:cleanText(body.outcome,280),
        nextMove:cleanText(body.nextMove,280),
        discovery:body.discovery&&typeof body.discovery==='object'?body.discovery:{}
      };
      if(!item.summary)return res.status(400).json({ok:false,error:'Memory summary required'});
      stops.unshift(item);await writeJson(MEMORY_PATH,stops.slice(0,300));
      return res.status(200).json({ok:true,item,count:Math.min(stops.length,300)});
    }
    return res.status(400).json({ok:false,error:'Unknown memory action'});
  }catch(e){
    console.error('[titan-max:memory]',e);
    return res.status(500).json({ok:false,error:e?.message||'Memory operation failed'});
  }
}
