import { generateText } from 'ai';

const SYSTEM = `You analyze a single consented front-camera snapshot for a sales assistant.

Return compact JSON only:
{"cue":"...","compliment":"..."}

Rules:
- Use only directly visible, non-sensitive details suitable for a respectful conversational compliment: clothing color/style, a visible smile, a clearly visible non-sensitive accessory, or whether the person is looking at the phone.
- Never identify the person.
- Never infer or mention age, race, ethnicity, religion, gender, sexuality, health, disability, wealth, income, occupation, immigration status, attractiveness, body shape, or personality.
- Do not diagnose emotion. "smiling" is okay when visibly smiling; "happy/confident/nervous" is not.
- If there is no safe useful cue, return {"cue":"","compliment":""}.
- Compliment must be one short natural sentence, not creepy and not sales pressure.
- Do not say "I see", "camera", "image", "frame", or "I notice".`;

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const raw=String(body.image||'');
    if(!raw) return res.status(400).json({error:'image required'});
    const b64=raw.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/,'');
    const image=Buffer.from(b64,'base64');
    if(!image.length||image.length>900000) return res.status(413).json({error:'image too large'});

    const result=await generateText({
      model:'openai/gpt-5.6-luna',
      messages:[{
        role:'user',
        content:[
          {type:'text',text:SYSTEM},
          {type:'image',image}
        ]
      }],
      temperature:0.2,
      maxOutputTokens:90
    });

    let out={cue:'',compliment:''};
    try{
      const clean=String(result.text||'').trim().replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
      const parsed=JSON.parse(clean);
      out.cue=String(parsed.cue||'').slice(0,160);
      out.compliment=String(parsed.compliment||'').slice(0,180);
    }catch{}
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json(out);
  }catch(e){
    return res.status(500).json({error:e?.message||'vision failed'});
  }
}
