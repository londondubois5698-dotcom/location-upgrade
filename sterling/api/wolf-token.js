// Preserve the existing Sterling backend and its server-owned credential store.
// This same-origin adapter forwards only its short-lived setup, never a provider API key.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 const origin=req.headers.origin;if(origin){try{if(new URL(origin).host!==req.headers.host)return res.status(403).json({error:'Origin not allowed'});}catch{return res.status(403).json({error:'Invalid origin'});}}
 try{const upstream=await fetch('https://sterling-olive.vercel.app/api/realtime-token',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});const body=await upstream.json();if(!upstream.ok||!body.token||!body.url)return res.status(503).json({error:body.error||'The existing Sterling voice service is unavailable.'});return res.status(200).json(body);}catch{return res.status(503).json({error:'Sterling’s voice service could not be reached. Your selections are safe; please try again.'});}
}
