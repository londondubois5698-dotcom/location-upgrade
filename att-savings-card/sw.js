self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('att-savings-')).map(k=>caches.delete(k)));
    }catch{}
    try{await self.registration.unregister()}catch{}
    try{await self.clients.claim()}catch{}
  })());
});