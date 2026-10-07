const CACHE='titan-max-shell-v2';
const BASE='/location-upgrade/titan-live/';
const SHELL=[BASE+'manifest.webmanifest',BASE+'icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  // Always fetch the latest Titan HTML shell. If the network is unavailable,
  // the app fails clearly instead of silently reviving an old realtime build.
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}));
  }
});
