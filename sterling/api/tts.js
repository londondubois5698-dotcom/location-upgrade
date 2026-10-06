export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST only"});
  const token=process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if(!token) return res.status(503).json({error:"Voice authentication unavailable"});
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body):req.body||{};
    const input=String(body.text||"").trim().slice(0,3500);
    if(!input) return res.status(400).json({error:"text required"});
    const payload={
      model:"openai/tts-1-hd",
      input,
      voice:"onyx",
      response_format:"mp3",
      speed:1.03
    };
    let r=await fetch("https://ai-gateway.vercel.sh/v1/audio/speech",{
      method:"POST",
      headers:{"content-type":"application/json","authorization":"Bearer "+token},
      body:JSON.stringify(payload)
    });
    if(!r.ok){
      payload.model="openai/tts-1";
      r=await fetch("https://ai-gateway.vercel.sh/v1/audio/speech",{
        method:"POST",
        headers:{"content-type":"application/json","authorization":"Bearer "+token},
        body:JSON.stringify(payload)
      });
    }
    if(!r.ok){
      let msg="Voice request failed";
      try{const j=await r.json();msg=j?.error?.message||msg;}catch{}
      return res.status(r.status).json({error:msg});
    }
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type",r.headers.get("content-type")||"audio/mpeg");
    res.setHeader("Cache-Control","private, no-store");
    return res.status(200).send(buf);
  }catch(e){
    return res.status(500).json({error:e?.message||"Voice request failed"});
  }
}