import { randomBytes, randomInt } from 'node:crypto';
import { put, get, del } from '@vercel/blob';

const STORE_ID='store_77xswngTjapdvTI7';
const PREFIX='sterling-tether-v1';
const PAIR_TTL_MS=10*60*1000;

function clean(v){return String(v??'').trim()}
function safeId(v){return /^[a-f0-9]{64}$/i.test(clean(v))?clean(v):''}
function safeCode(v){return /^\d{6}$/.test(clean(v))?clean(v):''}
function now(){return Date.now()}
function path(...parts){return [PREFIX,...parts].join('/')}

async function readJson(p){
  try{
    const r=await get(p,{access:'private',storeId:STORE_ID,useCache:false});
    if(!r||r.statusCode!==200)return null;
    const reader=r.stream.getReader();const chunks=[];let total=0;
    while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);total+=value.length}
    const all=new Uint8Array(total);let off=0;for(const c of chunks){all.set(c,off);off+=c.length}
    return JSON.parse(new TextDecoder().decode(all));
  }catch{return null}
}
async function writeJson(p,obj){
  await put(p,JSON.stringify(obj),{
    access:'private',storeId:STORE_ID,allowOverwrite:true,addRandomSuffix:false,
    contentType:'application/json',cacheControlMaxAge:0
  });
  return obj;
}
function cors(req,res){
  const origin=req.headers?.origin||'';
  const allowed=!origin||origin==='https://win.iclportal.com'||origin==='https://sterling-olive.vercel.app'||/\.vercel\.app$/.test(new URL(origin).hostname);
  if(origin&&allowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  return allowed;
}

async function pairCreate(){
  const tetherId=randomBytes(32).toString('hex');
  let code='';
  for(let i=0;i<8;i++){
    code=String(randomInt(100000,1000000));
    const existing=await readJson(path('pairs',code+'.json'));
    if(!existing||existing.expiresAt<now())break;
    code='';
  }
  if(!code)throw new Error('Could not create pairing code');
  const expiresAt=now()+PAIR_TTL_MS;
  await writeJson(path('pairs',code+'.json'),{tetherId,expiresAt});
  await writeJson(path('rooms',tetherId,'meta.json'),{createdAt:now(),version:1});
  return {tetherId,code,expiresAt};
}
async function pairClaim(code){
  const p=await readJson(path('pairs',code+'.json'));
  if(!p||!p.tetherId||p.expiresAt<now())throw new Error('Pairing code expired or invalid');
  try{await del(path('pairs',code+'.json'),{storeId:STORE_ID})}catch{}
  await writeJson(path('rooms',p.tetherId,'phone.json'),{pairedAt:now(),lastSeen:now()});
  return {tetherId:p.tetherId};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method==='OPTIONS'){cors(req,res);return res.status(204).end()}
  if(!cors(req,res))return res.status(403).json({ok:false,error:'Origin not allowed'});
  try{
    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
      const action=clean(body.action);

      if(action==='pair-create'){
        return res.status(200).json({ok:true,...await pairCreate()});
      }
      if(action==='pair-claim'){
        const code=safeCode(body.code);if(!code)return res.status(400).json({ok:false,error:'Enter the six-digit pairing code'});
        return res.status(200).json({ok:true,...await pairClaim(code)});
      }

      const tetherId=safeId(body.tetherId);
      if(!tetherId)return res.status(401).json({ok:false,error:'Missing tether credential'});
      const base=path('rooms',tetherId);

      if(action==='ipad-heartbeat'){
        const house=body.house&&typeof body.house==='object'?body.house:null;
        await writeJson(base+'/ipad.json',{lastSeen:now(),house:house||null,version:clean(body.version)||null});
        if(house)await writeJson(base+'/house.json',{...house,updatedAt:now()});
        return res.status(200).json({ok:true});
      }
      if(action==='phone-heartbeat'){
        await writeJson(base+'/phone.json',{lastSeen:now(),active:body.active!==false,version:clean(body.version)||null});
        return res.status(200).json({ok:true});
      }
      if(action==='command'){
        const id=clean(body.id)||randomBytes(12).toString('hex');
        const command=body.command&&typeof body.command==='object'?body.command:{};
        await writeJson(base+'/command.json',{id,command,createdAt:now()});
        return res.status(200).json({ok:true,id});
      }
      if(action==='result'){
        const id=clean(body.id);if(!id)return res.status(400).json({ok:false,error:'Missing result id'});
        const result=body.result&&typeof body.result==='object'?body.result:{};
        await writeJson(base+'/result.json',{id,result,createdAt:now()});
        return res.status(200).json({ok:true,id});
      }
      return res.status(400).json({ok:false,error:'Unknown tether action'});
    }

    if(req.method==='GET'){
      const tetherId=safeId(req.query?.tetherId);
      if(!tetherId)return res.status(401).json({ok:false,error:'Missing tether credential'});
      const base=path('rooms',tetherId);
      const part=clean(req.query?.part||'status');

      if(part==='house')return res.status(200).json({ok:true,house:await readJson(base+'/house.json')});
      if(part==='command')return res.status(200).json({ok:true,command:await readJson(base+'/command.json')});
      if(part==='result')return res.status(200).json({ok:true,result:await readJson(base+'/result.json')});
      if(part==='status'){
        const [house,ipad,phone,command,result]=await Promise.all([
          readJson(base+'/house.json'),readJson(base+'/ipad.json'),readJson(base+'/phone.json'),
          readJson(base+'/command.json'),readJson(base+'/result.json')
        ]);
        return res.status(200).json({ok:true,house,ipad,phone,command,result,serverTime:now()});
      }
      return res.status(400).json({ok:false,error:'Unknown tether part'});
    }
    return res.status(405).json({ok:false,error:'GET or POST only'});
  }catch(e){
    console.error('[sterling:tether]',{message:e?.message,stack:e?.stack});
    return res.status(500).json({ok:false,error:e?.message||'Tether service failed'});
  }
}
