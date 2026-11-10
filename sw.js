/* Offline shell only. Clinical data stays inside the versioned HTML. */
'use strict';
const CONFIG={"version":"1.9.82-split","build":"683a7f295cc0e859","assets":[{"path":"index.html","sha256":"683a7f295cc0e859c07593bfb12088daae267ca7841601e1fa95b4f5a16efb64"},{"path":"manifest.webmanifest","sha256":"b8b90661c8980338869e944ca393dd37b9c3311c7653ed868a180b5e036142aa"},{"path":"icons/apple-touch-icon.png","sha256":"77c620912773c0211a18a5d91abfe2d3cb61513d40943ef15e7bf88fa149dcda"},{"path":"icons/icon-192.png","sha256":"24b4863855d94abf3c31b50b319ace630caa12d5bc37780984f166124a910677"},{"path":"icons/icon-512.png","sha256":"c898d4215eeb3f3c70eb50be8bbbe5e7186dfbb716bcab0a1b4cd96edb68bc2d"},{"path":"icons/maskable-512.png","sha256":"c898d4215eeb3f3c70eb50be8bbbe5e7186dfbb716bcab0a1b4cd96edb68bc2d"},{"path":"payloads/releaseMetadata-c1c97023099e96712784.bin","sha256":"c1c97023099e96712784cc69fdde653d3433d390852b6bf612eb311f2e9ba610"},{"path":"payloads/workbookData-2c5e4c25c1f34a11eb36.bin","sha256":"2c5e4c25c1f34a11eb364f00842f9f356564e3ca569cfe0b44797ef876ed1c1c"},{"path":"payloads/clinicalRevisions-49546f07bb9597755e86.bin","sha256":"49546f07bb9597755e869f70be09a22f89efbd4ea3bb9d3db59afe57768e199a"},{"path":"payloads/predictionData-36bfa262b9fc61766ac8.bin","sha256":"36bfa262b9fc61766ac812b9d390922113cea45087cc97363df2e43e20d1d793"},{"path":"payloads/registryData-1893483a323af1e53b23.bin","sha256":"1893483a323af1e53b2302b714c40cc3b943d9ce7ada5b0a4d76916aadc7070b"},{"path":"payloads/registryDocument-29af873bc2b816e90921.bin","sha256":"29af873bc2b816e90921321dedb0ade85e661f4951e0ec12fa051b07f8440068"},{"path":"payloads/applicationBundle-afcd12ffa2ea91da72a9.bin","sha256":"afcd12ffa2ea91da72a9c3abb82846d039239e8b8623c03ce33a4eada68ce31b"},{"path":"assets/login-02a91cdedacdde6b6a06.webp","sha256":"02a91cdedacdde6b6a06af4f60cfe9204e6c0e55c36487fd0f08094723d5fb50"},{"path":"assets/login-16ee14effd3dc9232f74.webp","sha256":"16ee14effd3dc9232f741dfbbc9d4c9c914115822f3ea7dd3025d21a1d8919ce"}]};
const CACHE='shenyi-shell-'+CONFIG.build;
const INDEX=new URL('index.html',self.registration.scope).href;
let preparing=null;
async function verified(response,sha){
 if(!response||!response.ok||response.redirected)return false;
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
 return hash===sha;
}
async function prepare(){
 if(preparing)return preparing;
 preparing=(async()=>{
  const cache=await caches.open(CACHE);
  const previous=(await caches.keys()).filter(k=>k.startsWith('shenyi-shell-')&&k!==CACHE);
  try{
   for(const asset of CONFIG.assets){
    const url=new URL(asset.path,self.registration.scope).href;
    const current=await cache.match(url);
    if(await verified(current,asset.sha256))continue;
    if(current)await cache.delete(url);
    let response=null;
    for(const key of previous){const saved=await caches.match(url,{cacheName:key});if(await verified(saved,asset.sha256)){response=saved;break}}
    if(!response)response=await fetch(url,{cache:'default',credentials:'same-origin',priority:'low'});
    if(!await verified(response,asset.sha256))throw Error('網站正在更新或下載未完成，稍後再試');
    await cache.put(url,response);
   }
   return true;
  }catch(error){throw error} // Keep verified progress; a failed install cannot replace the active worker.
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
