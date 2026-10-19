/* Build injects exact public asset URLs and a content-derived cache version. */
const CONFIG=__PWA_CONFIG__;
const SHELL_CACHE='karachi-run-shell-'+CONFIG.version;
const GAME_CACHE='karachi-run-game-'+CONFIG.version;
const shell=new Set(CONFIG.shell),game=new Set(CONFIG.game);
let download=null;

function pathFor(request){
 const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.search||request.headers.has('authorization'))return null;
 return url.pathname;
}
function valid(response){return response.status===200&&response.ok&&!response.redirected&&response.type!=='opaque';}
async function fetchAndCache(path,cache){
 const response=await fetch(new Request(path,{cache:'no-cache',credentials:'same-origin'}));
 if(!valid(response)||path!=='/'&&(response.headers.get('content-type')??'').includes('text/html'))throw new Error('Asset unavailable');
 await cache.put(path,response.clone());return response;
}
async function status(){
 const cache=await caches.open(GAME_CACHE);let done=0;
 for(const path of game)if(await cache.match(path))done++;
 return {type:'OFFLINE_STATUS',done,total:game.size,ready:done===game.size,downloading:Boolean(download),bytes:CONFIG.gameBytes};
}
async function broadcast(message){for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage(message);}
async function downloadGame(){
 const cache=await caches.open(GAME_CACHE),missing=[];let done=0;
 for(const path of game){if(await cache.match(path))done++;else missing.push(path);}
 await broadcast({type:'OFFLINE_STATUS',done,total:game.size,ready:done===game.size,downloading:true,bytes:CONFIG.gameBytes});
 let cursor=0;
 const worker=async()=>{while(cursor<missing.length){const path=missing[cursor++];await fetchAndCache(path,cache);done++;await broadcast({type:'OFFLINE_STATUS',done,total:game.size,ready:done===game.size,downloading:true});}};
 // Two downloads at a time keep traffic bounded on mobile connections.
 const results=await Promise.allSettled([worker(),worker()]);if(results.some(result=>result.status==='rejected'))throw new Error('Offline download incomplete');
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(SHELL_CACHE);
  // The small application shell is atomic; big 3D models are cached as played
  // or through the player's explicit Save for Offline action.
  await Promise.all(CONFIG.shell.map(path=>fetchAndCache(path,cache)));
 })());
 // Updates wait. Never activate a new build in the middle of someone's run.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(clients.length<=1)for(const key of await caches.keys())if(key.startsWith('karachi-run-')&&key!==SHELL_CACHE&&key!==GAME_CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});if(windows.length>1){event.source?.postMessage({type:'UPDATE_BLOCKED'});return;}await self.skipWaiting();})());return;}
 if(event.data?.type==='OFFLINE_STATUS'){event.waitUntil(status().then(data=>event.ports?.[0]?.postMessage(data)));return;}
 if(event.data?.type==='CACHE_GAME'){
  if(!download)download=downloadGame().catch(()=>broadcast({type:'OFFLINE_ERROR'})).finally(async()=>{download=null;await broadcast(await status());});
  event.waitUntil(download);
 }
});
// Mobile video elements seek with Range requests, including during offline play.
async function rangedVideo(response,range){
 if(!range)return response;
 const bytes=await response.arrayBuffer(),length=bytes.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
 const headers=new Headers(response.headers);headers.set('Accept-Ranges','bytes');
 if(!match||(!match[1]&&!match[2])){headers.set('Content-Range','bytes */'+length);return new Response(null,{status:416,headers});}
 let start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2]));let end=match[1]?(match[2]?Math.min(length-1,Number(match[2])):length-1):length-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=length||start>end){headers.set('Content-Range','bytes */'+length);return new Response(null,{status:416,headers});}
 headers.set('Content-Range',`bytes ${start}-${end}/${length}`);headers.set('Content-Length',String(end-start+1));
 return new Response(bytes.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // OAuth, Neon, API calls, writes, private headers and unrelated navigation
 // always bypass the worker. Account data never goes into Cache Storage.
 if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('authorization'))return;
 if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){
  event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE);return await cache.match('/')||fetch(request);})());return;
 }
 const path=pathFor(request);if(!path)return;
 const oldHashedAsset=/^\/assets\/[^/]+-[\w-]{8,}\.(js|css)$/.test(path);
 if(!shell.has(path)&&!game.has(path)&&!oldHashedAsset)return;
 event.respondWith((async()=>{
  const cache=await caches.open(game.has(path)?GAME_CACHE:SHELL_CACHE);
  const cached=await cache.match(path)||oldHashedAsset&&await caches.match(path);
  if(game.has(path)&&path.endsWith('.mp4')){
   const full=cached||await fetchAndCache(path,cache);
   return rangedVideo(full,request.headers.get('range'));
  }
  if(cached)return cached;
  const response=await fetch(request);
  if(valid(response)&&!(response.headers.get('content-type')??'').includes('text/html')&&(shell.has(path)||game.has(path)))event.waitUntil(cache.put(path,response.clone()).catch(()=>{}));
  return response;
 })());
});
