import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import sharp from 'sharp';
import {createInstallController,installPlatform} from '../src/pwa-install.mjs';
import {readAccountOwner,rememberAccountOwner} from '../src/account-owner.mjs';

const origin='https://karachi-run.test';
const config={version:'test-v1',shell:['/','/assets/main-12345678.js','/branding/icon-192.png'],game:['/boy.glb','/bus.glb'],gameBytes:42};
function worker(){
 const handlers={},stores=new Map(),requests=[],messages=[];let online=true,failPath='',skipped=0,claimed=0,clientCount=1;
 const key=input=>new URL(typeof input==='string'?input:input.url,origin).href;
 const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async match(input){return map.get(key(input))?.clone();},async put(input,response){map.set(key(input),response.clone());}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);},async match(input){for(const map of stores.values())if(map.has(key(input)))return map.get(key(input)).clone();}};
 class WorkerRequest extends Request{constructor(input,init){super(typeof input==='string'?new URL(input,origin):input,init);}}
 const self={location:{origin},addEventListener:(type,handler)=>handlers[type]=handler,clients:{matchAll:async()=>Array.from({length:clientCount},()=>({postMessage:message=>messages.push(message)})),claim:async()=>claimed++},skipWaiting:async()=>skipped++};
 vm.runInNewContext(fs.readFileSync('src/service-worker.js','utf8').replace('__PWA_CONFIG__',JSON.stringify(config)),{self,caches,Request:WorkerRequest,URL,console,fetch:async request=>{const path=new URL(request.url).pathname;requests.push(path);if(!online||path===failPath)throw new Error('offline');return new Response(path==='/'?'<html>game shell</html>':'asset '+path,{headers:{'content-type':path==='/'?'text/html':'application/octet-stream'}});}});
 async function dispatch(type,extra={}){const waits=[];let response;handlers[type]({...extra,waitUntil:p=>waits.push(p),respondWith:p=>response=p});const result=response?await response:undefined;await Promise.all(waits);return result;}
 return {dispatch,requests,messages,caches,stores,get skipped(){return skipped;},get claimed(){return claimed;},clients(count){clientCount=count;},offline(){online=false;},online(){online=true;failPath='';},fail(path){failPath=path;},request:(path,init)=>new WorkerRequest(path,init)};
}

test('native install is user initiated, single use, and handles dismissal and installation',async()=>{
 let calls=0,prevented=0;const install=createInstallController();
 assert.equal(await install.request(),'help');
 install.capture({preventDefault(){prevented++;},async prompt(){calls++;return {outcome:'dismissed'};}});
 assert.equal(install.state().available,true);assert.equal(await install.request(),'dismissed');assert.equal(await install.request(),'help');assert.equal(calls,1);assert.equal(prevented,1);
 install.capture({preventDefault(){},async prompt(){calls++;return undefined;},userChoice:Promise.resolve({outcome:'accepted'})});
 assert.equal(await install.request(),'accepted');install.markInstalled();assert.equal(await install.request(),'installed');assert.equal(install.state().available,false);
 assert.equal(installPlatform('Mozilla iPhone'),'ios');assert.equal(installPlatform('Macintosh',5),'ios');assert.equal(installPlatform('Mozilla Android'),'android');assert.equal(installPlatform('Mozilla Windows'),'desktop');
});

test('service worker installs just the shell, serves it offline, and never forces an update',async()=>{
 const w=worker();await w.dispatch('install');assert.deepEqual(w.requests,config.shell);assert.equal(w.skipped,0);
 await w.dispatch('activate');assert.equal(w.claimed,1);w.offline();
 const request=w.request('/');Object.defineProperty(request,'mode',{value:'navigate'});
 assert.match(await (await w.dispatch('fetch',{request})).text(),/game shell/);
 const asset=await w.dispatch('fetch',{request:w.request('/assets/main-12345678.js')});assert.match(await asset.text(),/asset/);
 await w.dispatch('message',{data:{type:'ACTIVATE_UPDATE'}});assert.equal(w.skipped,1);
});

test('Neon, OAuth, private headers, writes and arbitrary URLs completely bypass cache handling',async()=>{
 const w=worker();
 for(const request of [w.request('https://project.neon.tech/rest/v1/player_saves'),w.request('/api/save'),w.request('/auth/callback?token=private'),w.request('/boy.glb?token=private'),w.request('/boy.glb',{headers:{authorization:'Bearer private'}}),w.request('/boy.glb',{method:'POST',body:'private account'})])assert.equal(await w.dispatch('fetch',{request}),undefined);
 assert.equal(w.requests.length,0);assert.equal(w.stores.size,0);
});

test('offline download is explicit, reports complete only after all models and resumes a partial pack',async()=>{
 const w=worker();await w.dispatch('install');assert.ok(!w.requests.includes('/boy.glb'));
 w.fail('/bus.glb');await w.dispatch('message',{data:{type:'CACHE_GAME'}});
 assert.ok(w.messages.some(message=>message.type==='OFFLINE_ERROR'));assert.equal(w.messages.at(-1).ready,false);
 w.online();const count=w.requests.filter(path=>path==='/boy.glb').length;await w.dispatch('message',{data:{type:'CACHE_GAME'}});
 assert.equal(w.messages.at(-1).ready,true);assert.equal(w.messages.at(-1).downloading,false);assert.equal(w.messages.at(-1).bytes,42);assert.equal(w.requests.filter(path=>path==='/boy.glb').length,count,'already downloaded models must not be downloaded again');
 w.offline();assert.equal(await (await w.dispatch('fetch',{request:w.request('/bus.glb')})).text(),'asset /bus.glb');
});

test('normal play caches only successful public model responses',async()=>{
 const w=worker();assert.equal(await (await w.dispatch('fetch',{request:w.request('/boy.glb')})).text(),'asset /boy.glb');w.offline();
 assert.equal(await (await w.dispatch('fetch',{request:w.request('/boy.glb')})).text(),'asset /boy.glb');
 let answer;await w.dispatch('message',{data:{type:'OFFLINE_STATUS'},ports:[{postMessage:value=>answer=value}]});assert.equal(answer.ready,false);assert.equal(answer.done,1);
});

test('cached offline identity retains its revision, excludes credentials and separates account changes',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},key='owner';
 rememberAccountOwner(storage,key,{id:'one',name:'Haris',email:'test@example.test',token:'never-store'},'2026-10-18T12:00:00Z');
 assert.equal(readAccountOwner(storage,key).version,'2026-10-18T12:00:00Z');assert.ok(!values.get(key).includes('never-store'));
 rememberAccountOwner(storage,key,{id:'one',name:'Haris'});assert.equal(readAccountOwner(storage,key).version,'2026-10-18T12:00:00Z');
 rememberAccountOwner(storage,key,{id:'two',name:'Other'});assert.equal(readAccountOwner(storage,key).version,null);
 rememberAccountOwner(storage,key,null);assert.equal(readAccountOwner(storage,key),null);
 values.set(key,'invalid json');assert.equal(readAccountOwner(storage,key),null);
});

test('manifest and exported artwork cover install icons, Apple touch and favicon without the K placeholder',async()=>{
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'any');
 for(const icon of manifest.icons){const meta=await sharp('public'+icon.src).metadata();assert.equal(icon.sizes,meta.width+'x'+meta.height);if(icon.purpose==='maskable')assert.equal((await sharp('public'+icon.src).stats()).isOpaque,true);}
 const apple=await sharp('public/branding/apple-touch-icon.png').metadata();assert.equal(apple.width,180);assert.equal((await sharp('public/branding/apple-touch-icon.png').stats()).isOpaque,true);
 const ico=fs.readFileSync('public/favicon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),2);
 const html=fs.readFileSync('index.html','utf8'),game=fs.readFileSync('src/game.ts','utf8');assert.match(html,/manifest.webmanifest/);assert.match(html,/apple-touch-icon/);assert.ok(!game.includes('brand-mark">K</div>'));assert.ok(!html.includes('data:image/svg+xml'));
});

test('updates cannot activate across another open game window',async()=>{
 const w=worker();w.clients(2);await w.dispatch('message',{data:{type:'ACTIVATE_UPDATE'},source:{postMessage:message=>w.messages.push(message)}});assert.equal(w.skipped,0);assert.ok(w.messages.some(message=>message.type==='UPDATE_BLOCKED'));
});
