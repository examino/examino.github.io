/* Offline shell only. Clinical data stays inside the versioned HTML. */
'use strict';
const CONFIG={"version":"1.9.73","build":"9d9cf2f5a646d3b9","assets":[{"path":"index.html","sha256":"9d9cf2f5a646d3b91a846f468bbf0ce71c745b5e4846dc15b33de4132b8428f2"},{"path":"manifest.webmanifest","sha256":"b8b90661c8980338869e944ca393dd37b9c3311c7653ed868a180b5e036142aa"},{"path":"icons/apple-touch-icon.png","sha256":"77c620912773c0211a18a5d91abfe2d3cb61513d40943ef15e7bf88fa149dcda"},{"path":"icons/icon-192.png","sha256":"24b4863855d94abf3c31b50b319ace630caa12d5bc37780984f166124a910677"},{"path":"icons/icon-512.png","sha256":"c898d4215eeb3f3c70eb50be8bbbe5e7186dfbb716bcab0a1b4cd96edb68bc2d"},{"path":"icons/maskable-512.png","sha256":"c898d4215eeb3f3c70eb50be8bbbe5e7186dfbb716bcab0a1b4cd96edb68bc2d"}]};
const CACHE='shenyi-shell-'+CONFIG.build;
const INDEX=new URL('index.html',self.registration.scope).href;
let preparing=null;
async function prepare(){
 if(preparing)return preparing;
 preparing=(async()=>{
  const cache=await caches.open(CACHE);
  try{
   for(const asset of CONFIG.assets){
    const url=new URL(asset.path,self.registration.scope).href;
    const response=await fetch(url,{cache:'reload',credentials:'same-origin'});
    if(!response.ok||response.redirected)throw Error('離線檔案下載未完成');
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
    if(digest!==asset.sha256)throw Error('網站正在更新，稍後再試');
    await cache.put(url,response);
   }
   return true;
  }catch(error){await caches.delete(CACHE);throw error}
 })();
 try{return await preparing}finally{preparing=null}
}
self.addEventListener('install',event=>event.waitUntil(prepare()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('shenyi-shell-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){event.waitUntil(self.skipWaiting());return}
 if(!['OFFLINE_STATUS','PREPARE_OFFLINE'].includes(event.data?.type))return;
 event.waitUntil((async()=>{
  let error='';
  if(event.data.type==='PREPARE_OFFLINE')try{await prepare()}catch(e){error=e.message}
  const ready=(await Promise.all(CONFIG.assets.map(a=>caches.match(new URL(a.path,self.registration.scope).href,{cacheName:CACHE})))).every(Boolean);
  event.ports[0]?.postMessage({version:CONFIG.version,build:CONFIG.build,ready,error});
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==scope.origin)return;
 // Never cache external sources, Gemini, or unrelated pages in this repository.
 const isEntry=url.pathname===scope.pathname||url.pathname===new URL(INDEX).pathname;
 const asset=CONFIG.assets.find(a=>new URL(a.path,self.registration.scope).pathname===url.pathname);
 if(!isEntry&&!asset)return;
 event.respondWith((async()=>{
  const saved=await caches.match(isEntry?INDEX:new URL(asset.path,self.registration.scope).href,{cacheName:CACHE});
  if(saved)return saved;
  // If the OS removed this cache, online access recovers; never claim offline readiness.
  return fetch(request);
 })());
});
