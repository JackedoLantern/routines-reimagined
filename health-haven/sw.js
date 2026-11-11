// Health Haven: works offline and opens like an app
const CACHE='hh-v3';
const CORE=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('hh-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const same=url.origin===self.location.origin, cdn=/(fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname);
  if(!same&&!cdn)return;
  if(cdn){e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r})));return}
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('index.html'))));
});
