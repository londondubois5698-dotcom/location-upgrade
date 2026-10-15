// This server-only endpoint mints short-lived Realtime credentials.
// Set OPENAI_API_KEY in Vercel Project → Settings → Environment Variables.
// Never expose a permanent API key in frontend code.
const tools = [
  {type:'function',name:'update_deal',description:'Immediately update customer-visible contact information, existing service, or plan choice. Never collect sensitive identification, payment details, PINs, or passwords.',parameters:{type:'object',properties:{firstName:{type:'string'},lastName:{type:'string'},phone:{type:'string'},email:{type:'string'},carrier:{type:'string'},lines:{type:'integer'},currentBill:{type:'number'},plan:{type:'string'},internet:{type:'string'}},additionalProperties:false}},
  {type:'function',name:'choose_phone',description:'Show and discuss a specific phone model. Customers may later tap colors, storage or Select.',parameters:{type:'object',properties:{model:{type:'string'},color:{type:'string'},storage:{type:'string'}},required:['model'],additionalProperties:false}},
  {type:'function',name:'advance_section',description:'Scroll the customer to the next appropriate visual section as the conversation advances. Available sections: welcome, contact, service, comparison, showroom, device, plans, home, review, appointment.',parameters:{type:'object',properties:{section:{type:'string',enum:['welcome','contact','service','comparison','showroom','device','plans','home','review','appointment']}},required:['section'],additionalProperties:false}}
];
const instructions = `You are Sterling, the charismatic, professional, warm conversational host for London Deals, accompanied by Titan (the blue-eyed wolf character in the website design). Speak naturally in a friendly adult male voice, with occasional tasteful humor, usually 1–2 sentences followed by one relevant question. Begin by asking their first name. Move through contact, current wireless provider, number of lines and bill, visual comparison, phone/model/color/storage, internet and TV interest, then 3-hour appointment request. After every important answer call the update_deal, choose_phone, or advance_section function immediately to keep the visual webpage in sync with conversation. Never imply the illustration represents an actual checkout, a guaranteed promotion, exact final billing or confirmed appointment. Do not claim a phone has been purchased or an appointment booked. All pricing is only an illustrative service estimate, and eligibility, actual availability, device installments, taxes, fees, and promotions need final carrier verification. When the user clicks a choice, acknowledge it naturally. Never ask for SSN, government IDs, PIN, verification codes, payment info, or full account numbers. This website only gathers ordinary contact information for a voluntarily initiated text message. If the visitor wants to stop, respectfully end the exchange.`;
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.status(405).json({error:'POST only'});return;}
  if(!process.env.OPENAI_API_KEY){res.status(503).json({error:'Live AI voice is not yet configured. Browser guided voice is available.'});return;}
  try{
    const response=await fetch('https://api.openai.com/v1/realtime/client_secrets',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json','OpenAI-Safety-Identifier':'sterling-overdrive-visitor'},
      body:JSON.stringify({expires_after:{anchor:'created_at',seconds:120},session:{type:'realtime',model:'gpt-realtime',instructions,output_modalities:['audio'],audio:{output:{voice:'cedar'}},tools,tool_choice:'auto'}})
    });
    const data=await response.json();
    if(!response.ok){console.error('Realtime token error',response.status);res.status(502).json({error:'Voice could not start. You can use the guided experience.'});return;}
    res.status(200).json({value:data.value,expires_at:data.expires_at});
  }catch(error){console.error('Realtime setup error',error?.message);res.status(502).json({error:'Voice service unavailable.'});}
}
