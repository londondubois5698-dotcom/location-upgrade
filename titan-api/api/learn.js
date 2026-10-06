import { createGateway, generateText } from 'ai';
import { LEARNING_PATH, MEMORY_PATH, cleanText, containsSensitive, cors, loadGatewayKey, readJson, requireOwner, writeJson } from '../lib/core.js';

const TEAM_SCOPE='londondubois5698-dotcom';

function parseJson(text){
  const s=String(text||'').replace(/^\s*\`\`\`(?:json)?/i,'').replace(/\`\`\`\s*$/,'').trim();
  try{return JSON.parse(s)}catch{return {lessons:[cleanText(s,500)]}}
}
export default async function handler(req,res){
  if(cors(req,res))return;
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST only'});
  if(!requireOwner(req,res))return;
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(containsSensitive(body))return res.status(400).json({ok:false,error:'Sensitive credentials are not allowed in Titan learning'});
    const transcript=cleanText(body.transcript,7000);
    const discovery=body.discovery&&typeof body.discovery==='object'?body.discovery:{};
    const apiKey=await loadGatewayKey();
    if(!apiKey)return res.status(503).json({ok:false,error:'Titan Gateway setup required'});
    const gateway=createGateway({apiKey,teamIdOrSlug:TEAM_SCOPE});
    const existing=await readJson(LEARNING_PATH,{lessons:[],updatedAt:null});
    const prompt=[
      'You are Titan\'s private field-learning analyst for London.',
      'Extract only reusable, truthful sales-conversation lessons from this completed session.',
      'Never store or infer sensitive credentials, protected traits, or private medical/financial details.',
      'Do not invent outcomes. Keep lessons short and operational.',
      'Return JSON only: {"lessons":["..."],"objections":["..."],"wins":["..."]}.',
      'Existing lessons: '+JSON.stringify((existing.lessons||[]).slice(0,30)),
      'Discovery: '+JSON.stringify(discovery),
      'Transcript: '+transcript
    ].join('\n');
    const result=await generateText({model:gateway('openai/gpt-5.6-sol'),prompt,maxOutputTokens:500});
    const learned=parseJson(result.text);
    const incoming=[...(learned.lessons||[]),...(learned.objections||[]).map(x=>'Objection: '+x),...(learned.wins||[]).map(x=>'Worked: '+x)].map(x=>cleanText(x,360)).filter(Boolean);
    const merged=[];for(const x of [...incoming,...(existing.lessons||[])])if(x&&!merged.some(y=>y.toLowerCase()===x.toLowerCase()))merged.push(x);
    const next={lessons:merged.slice(0,120),updatedAt:new Date().toISOString()};
    await writeJson(LEARNING_PATH,next);
    if(transcript){
      const stops=await readJson(MEMORY_PATH,[]);
      stops.unshift({id:'session-'+Date.now(),at:new Date().toISOString(),address:cleanText(body.address,180),summary:cleanText(body.summary||transcript,700),outcome:cleanText(body.outcome,280),nextMove:cleanText(body.nextMove,280),discovery});
      await writeJson(MEMORY_PATH,stops.slice(0,300));
    }
    return res.status(200).json({ok:true,newLessons:incoming.slice(0,8),lessonCount:next.lessons.length});
  }catch(e){
    console.error('[titan-max:learn]',e);
    return res.status(500).json({ok:false,error:e?.message||'Titan learning pass failed'});
  }
}
