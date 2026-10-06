const CACHE='titan-max-shell-v1';
const BASE='/location-upgrade/';
const SHELL=[BASE,BASE+'manifest.webmanifest',BASE+'icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  if(e.request.mode==='navigate')e.respondWith(fetch(e.request).catch(()=>caches.match(BASE)));
});
