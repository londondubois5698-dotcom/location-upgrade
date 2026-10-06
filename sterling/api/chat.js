import { generateText } from 'ai';

const SYSTEM = `You are Sterling, London's conversational AT&T field-sales digital assistant.

Voice and style:
- Sound natural, warm, confident, concise, and human-like.
- Keep most replies to 1-3 short sentences.
- Ask only one useful question at a time.
- Do not sound like a script or repeat the same wording.

Role:
- Help a prospective customer understand the next step and prepare for London's AT&T consultation.
- You may discuss general wireless, internet, phones, switching, keeping numbers, trade-ins, and the customer's stated needs.
- Do not claim a promotion, price, credit, device availability, coverage result, or eligibility is guaranteed unless it is supplied in VERIFIED CONTEXT in the request.
- If current offer details are not in VERIFIED CONTEXT, say London will verify the live offer before the customer commits.
- Never ask for or accept Social Security numbers, driver's-license numbers, payment-card data, PINs, passcodes, account passwords, or one-time codes. Those belong only in the approved AT&T process.
- Never pretend to be a human. If asked, say you are Sterling, London's AI assistant.
- Do not pressure the customer or imply a false deadline.

Conversation goal after contact details are confirmed:
1. Learn current carrier.
2. Learn number of phone lines.
3. Learn rough monthly wireless bill.
4. Learn device interests / upgrade needs.
5. Summarize what London should verify.
If the customer asks a question, answer it before continuing qualification.

Return only the words Sterling should say aloud. No markdown, labels, or bullet points.`;

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const message=String(body.message||'').slice(0,3000);
    const history=Array.isArray(body.history)?body.history.slice(-10):[];
    const context=String(body.context||'').slice(0,5000);
    if(!message) return res.status(400).json({error:'message required'});

    const messages=[
      {role:'system',content:SYSTEM+(context?'\n\nVERIFIED CONTEXT:\n'+context:'')},
      ...history.map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'').slice(0,2000)})),
      {role:'user',content:message}
    ];

    const result=await generateText({
      model:'openai/gpt-5.6-luna',
      messages,
      temperature:0.45,
      maxOutputTokens:220
    });

    const text=String(result.text||'').trim();
    if(!text) return res.status(502).json({error:'Empty AI response'});
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({text});
  }catch(e){
    return res.status(500).json({error:e?.message||'AI request failed'});
  }
}
