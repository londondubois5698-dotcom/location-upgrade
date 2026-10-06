import { put, get, del } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
const STORE_ID='store_77xswngTjapdvTI7';

async function readText(path){
  const r=await get(path,{access:'private',storeId:STORE_ID,useCache:false});
  if(!r||r.statusCode!==200)throw new Error('Private store read failed');
  const reader=r.stream.getReader();const chunks=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);total+=value.length}
  const all=new Uint8Array(total);let off=0;for(const c of chunks){all.set(c,off);off+=c.length}
  return new TextDecoder().decode(all);
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
  const id=randomBytes(10).toString('hex');
  const path='sterling-health/'+id+'.txt';
  try{
    await put(path,id,{access:'private',storeId:STORE_ID,allowOverwrite:true,addRandomSuffix:false,contentType:'text/plain',cacheControlMaxAge:0});
    const got=await readText(path);
    try{await del(path,{storeId:STORE_ID})}catch{}
    if(got!==id)throw new Error('Private store round-trip mismatch');
    return res.status(200).json({ok:true,privateStore:true,version:'13.0'});
  }catch(e){
    return res.status(500).json({ok:false,privateStore:false,error:e?.message||String(e),version:'13.0'});
  }
}
