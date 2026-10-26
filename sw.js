/* Offline shell only. Clinical data stays inside the versioned HTML. */
'use strict';
const CONFIG={"version":"1.9.29","build":"a734e24d9a5ee1c9","assets":[{"path":"index.html","sha256":"a734e24d9a5ee1c91b1e57c072f32600ad3c6f58188f747ae686c159bdede970"},{"path":"manifest.webmanifest","sha256":"b8b90661c8980338869e944ca393dd37b9c3311c7653ed868a180b5e036142aa"},{"path":"icons/apple-touch-icon.png","sha256":"3b26ae5ca65fbae3c14b16d949e958ef511be1ab63cabcab7db3fdea78a9f303"},{"path":"icons/icon-192.png","sha256":"de23623f1eec472a2f16081684437d3542c3a287bdab998ef57bcb24aa30c3a6"},{"path":"icons/icon-512.png","sha256":"8f162bfbcf8d3948a7d410db9941de67ff1019d87caee189066ac6589f2a5f09"},{"path":"icons/maskable-512.png","sha256":"8f162bfbcf8d3948a7d410db9941de67ff1019d87caee189066ac6589f2a5f09"}]};
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
