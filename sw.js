// Routines Reimagined: offline support, reminders, badge and widget
const CACHE='rr-v4';
const CORE=['./','index.html','manifest.webmanifest','favicon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','widget/today.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!=='rr-data'&&k!=='rr-sent').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

async function getData(){try{const r=await (await caches.open('rr-data')).match('widget/data.json');return r?await r.json():null}catch(e){return null}}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.pathname.endsWith('/widget/data.json')){e.respondWith(getData().then(d=>new Response(JSON.stringify(d||{level:1,title:'Rookie',streak:0,workoutText:'Open the app to start',leftText:''}),{headers:{'content-type':'application/json'}})));return}
  const fresh=e.request.mode==='navigate'||/\.(html|js|webmanifest|json)$/.test(url.pathname);
  e.respondWith(fetch(e.request,fresh?{cache:'no-cache'}:{}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
});

/* background reminders (Android Chrome, installed app) */
function hmToday(s){const[h,m]=s.split(':').map(Number);const d=new Date();d.setHours(h,m,0,0);return d.getTime()}
function todayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
async function remind(){
  const d=await getData();if(!d||!d.notif||d.date!==todayKey())return;
  const sentC=await caches.open('rr-sent'),key='sent/'+d.date;let sent={};try{const r=await sentC.match(key);if(r)sent=await r.json()}catch(e){}
  const now=Date.now();let shown=0;
  for(const i of d.items){if(i.done||!i.time||sent[i.id])continue;const ts=hmToday(i.time);
    if(now>=ts&&now-ts<3*3600000&&shown<2){sent[i.id]=1;shown++;
      await self.registration.showNotification(i.workout?'Time to train':'Reminder: '+i.title,{body:i.workout?'Your workout is ready. Keep the streak alive!':'Tap to check it off.',icon:'icon-192.png',badge:'icon-192.png',tag:'rr-'+i.id,data:{url:'./#'+(i.workout?'workout':'day')}})}}
  await sentC.put(key,new Response(JSON.stringify(sent)));
  try{if(self.navigator&&'setAppBadge' in self.navigator){d.left?self.navigator.setAppBadge(d.left):self.navigator.clearAppBadge()}}catch(e){}
}
self.addEventListener('periodicsync',e=>{if(e.tag==='rr-remind')e.waitUntil(Promise.all([remind(),updateWidgets()]))});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='rr-sync')e.waitUntil(updateWidgets())});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c){c.navigate&&c.navigate(url).catch(()=>{});return c.focus()}}return self.clients.openWindow(url)}))});

/* Windows Widgets board */
async function updateWidgets(){
  if(!self.widgets)return;
  try{const w=await self.widgets.getByTag('today');if(!w)return;
    const tpl=await (await fetch('widget/today.json')).text();const d=await getData()||{};
    await self.widgets.updateByTag('today',{template:tpl,data:JSON.stringify({level:d.level||1,title:d.title||'Rookie',streak:d.streak||0,workoutText:d.workoutText||'Open the app to start',leftText:d.leftText||''})})}catch(e){}
}
self.addEventListener('widgetinstall',e=>e.waitUntil(updateWidgets()));
self.addEventListener('widgetresume',e=>e.waitUntil(updateWidgets()));
self.addEventListener('widgetclick',e=>{if(e.action==='open')e.waitUntil(self.clients.openWindow('./'))});
