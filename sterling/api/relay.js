import { put, get, del } from '@vercel/blob';

const STORE_ID='store_77xswngTjapdvTI7';
const SAFE=/^[A-Za-z0-9_-]{20,100}$/;

async function readJson(pathname){
  const result=await get(pathname,{access:'private',storeId:STORE_ID,useCache:false});
  if(!result||result.statusCode!==200)return null;
  const reader=result.stream.getReader();
  const chunks=[];
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    chunks.push(value);
  }
  let total=0;for(const c of chunks)total+=c.length;
  const all=new Uint8Array(total);let off=0;
  for(const c of chunks){all.set(c,off);off+=c.length}
  return JSON.parse(new TextDecoder().decode(all));
}
function cleanText(v,max=254){return String(v??'').trim().slice(0,max)}
function sanitizePacket(p){
  if(!p||typeof p!=='object')throw new Error('packet required');
  const out={
    version:11,
    createdAt:Number(p.createdAt)||Date.now(),
    expiresAt:Math.min(Number(p.expiresAt)||Date.now()+30*60*1000,Date.now()+30*60*1000),
    first:cleanText(p.first,80),
    last:cleanText(p.last,80),
    phone:cleanText(p.phone,32).replace(/\D/g,''),
    email:cleanText(p.email,180).toLowerCase(),
    routeId:cleanText(p.routeId,80),
    gpRouteStopId:cleanText(p.gpRouteStopId,120),
    street:cleanText(p.street,160),
    city:cleanText(p.city,100),
    postalcode:cleanText(p.postalcode,20),
    state:cleanText(p.state,60)
  };
  if(!out.first||!out.last||!/^\d{10}$/.test(out.phone)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)){
    throw new Error('complete confirmed contact required');
  }
  return out;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  try{
    const session=cleanText(req.method==='GET'||req.method==='DELETE'?req.query?.session:req.body?.session,120);
    if(!SAFE.test(session))return res.status(400).json({ok:false,error:'invalid session'});
    const pathname='relay/'+session+'.json';

    if(req.method==='GET'){
      const data=await readJson(pathname);
      if(!data||Number(data.expiresAt)<Date.now())return res.status(200).json({ok:true,packet:null});
      return res.status(200).json({ok:true,packet:data});
    }
    if(req.method==='POST'){
      const packet=sanitizePacket(typeof req.body==='string'?JSON.parse(req.body).packet:req.body?.packet);
      await put(pathname,JSON.stringify(packet),{
        access:'private',
        storeId:STORE_ID,
        allowOverwrite:true,
        addRandomSuffix:false,
        contentType:'application/json',
        cacheControlMaxAge:0
      });
      return res.status(200).json({ok:true});
    }
    if(req.method==='DELETE'){
      await del(pathname,{storeId:STORE_ID});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({ok:false,error:'method not allowed'});
  }catch(e){
    return res.status(500).json({ok:false,error:e?.message||'relay failed'});
  }
}
