import QRCode from 'qrcode';

export default async function handler(req,res){
  try{
    const u=String(req.query?.u||'');
    if(!u.startsWith('https://sterling-olive.vercel.app/'))return res.status(400).send('invalid url');
    const svg=await QRCode.toString(u,{type:'svg',margin:1,width:280,errorCorrectionLevel:'M'});
    res.setHeader('Content-Type','image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    return res.status(200).send(svg);
  }catch(e){
    return res.status(500).send('qr failed');
  }
}
