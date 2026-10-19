import {TrackDirector} from '../src/track-director.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {pathToFileURL} from 'node:url';
import {cinematicViewport,cinematicBackdropCrop} from '../src/cinematic-framing.mjs';
import {nextReadyDelay,CATCH_CYCLE} from '../src/shutter-opening.mjs';
let code=ts.transpileModule(fs.readFileSync('src/cinematic-intro.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
for(const source of ['shutter-opening.mjs','cinematic-framing.mjs'])code=code.replace('./'+source,pathToFileURL(process.cwd()+'/src/'+source).href);
const {CinematicIntro}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function dom(width=0,height=0){
 const nodes=[],draws=[],frames=new Map();let serial=0;
 class Element{className='';hidden=false;readyState=2;duration=6;currentTime=0;videoWidth=720;videoHeight=1280;paused=true;removed=false;classList={add:()=>{}};children=[];setAttribute(){}removeAttribute(){}append(...children){this.children.push(...children);}remove(){this.removed=true;}load(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
 const document={hidden:false,body:new Element(),querySelector:()=>null,createElement:tag=>{const node=new Element();node.tag=tag;if(tag==='canvas'){node.clientWidth=width;node.clientHeight=height;node.getContext=()=>({drawImage:(...args)=>draws.push(args)});}if(tag==='video'){node.requestVideoFrameCallback=callback=>{const id=++serial;frames.set(id,callback);return id;};node.cancelVideoFrameCallback=id=>frames.delete(id);}nodes.push(node);return node;}};
 return {document,nodes,draws,frames,frame(){const [id,callback]=frames.entries().next().value;frames.delete(id);callback();}};
}

test('portrait framing contains all action and expands continuously to the full responsive game',()=>{
 for(const [width,height]of [[390,844],[360,640],[844,390],[1440,900]]){
  const first=cinematicViewport(width,height),last=cinematicViewport(width,height,1);
  assert.ok(Math.abs(width*first.width/(height*first.height)-9/16)<1e-9);assert.deepEqual(last,{x:0,y:0,width:1,height:1,blend:1});
  assert.ok(cinematicViewport(width,height,.5).width>=first.width);
 }
 for(let clock=0;clock<20;clock+=.03){const delay=nextReadyDelay(clock);assert.ok(delay>=0&&delay<CATCH_CYCLE);if(delay>0)assert.ok(nextReadyDelay(clock+delay)<1e-8);}
});
test('Run primes playback, finishes the catch, prepares once near the endpoint and hands off once',async()=>{
 const original=globalThis.document,{document,nodes}=dom();globalThis.document=document;let prepared=0,completed=0;
 try{const film=new CinematicIntro(()=>prepared++,()=>completed++);film.begin(.9,false);const video=nodes.find(n=>n.tag==='video');await Promise.resolve();assert.equal(video.paused,true);film.tick(.1);assert.equal(film.waiting,true);assert.equal(prepared,0);
  film.tick(2.3);assert.equal(film.waiting,false);assert.equal(video.paused,false);video.currentTime=5.7;film.tick(.01);film.tick(.01);assert.equal(prepared,1);assert.equal(completed,0);const ended=video.onended;ended();ended();assert.equal(completed,1);assert.equal(film.active,false);
 }finally{globalThis.document=original;}
});
test('Skip, cancellation, hidden tabs and missing media cannot duplicate or trap a run',async()=>{
 const original=globalThis.document,{document,nodes}=dom();globalThis.document=document;let prepared=0,completed=0;
 try{const film=new CinematicIntro(()=>prepared++,()=>completed++);film.begin(0,true);await Promise.resolve();document.hidden=true;film.tick(99);assert.equal(film.waiting,true);assert.equal(completed,0);document.hidden=false;film.skip();film.skip();assert.equal(completed,1);assert.equal(prepared,1);
  film.begin(0,false);film.cancel();await Promise.resolve();assert.equal(film.active,false);assert.equal(completed,1);
  film.begin(0,false);nodes.filter(n=>n.tag==='video').at(-1).onerror();assert.equal(completed,2);assert.equal(prepared,2);
 }finally{globalThis.document=original;}
});

test('film alignment pins the visible first section while later track choices still vary by run seed',()=>{
 const a=new TrackDirector(111,undefined,0x4b415241),b=new TrackDirector(222,undefined,0x4b415241);
 assert.deepEqual(a.pending.filter(g=>g.endTime<=16),b.pending.filter(g=>g.endTime<=16));assert.notDeepEqual(a.pending.filter(g=>g.startTime>=16),b.pending.filter(g=>g.startTime>=16));assert.equal(a.seed,111);assert.equal(b.seed,222);
});

test('widescreen blur uses the foreground video frames with one decoder and releases its frame callback',async()=>{
 const original=globalThis.document,fixture=dom(1600,900);globalThis.document=fixture.document;
 try{const film=new CinematicIntro(()=>{},()=>{});film.begin(0,false);await Promise.resolve();film.tick(.01);await Promise.resolve();
  const video=fixture.nodes.find(n=>n.tag==='video'),canvas=fixture.nodes.find(n=>n.tag==='canvas');assert.equal(fixture.nodes.filter(n=>n.tag==='video').length,1);assert.equal(fixture.draws.length,1);assert.equal(fixture.draws[0][0],video);assert.equal(canvas.width,480);assert.equal(canvas.height,270);assert.equal(fixture.frames.size,1);
  video.currentTime=2.5;fixture.frame();assert.equal(fixture.draws.length,2);assert.equal(fixture.frames.size,1);film.cancel();assert.equal(fixture.frames.size,0);assert.equal(video.paused,true);
 }finally{globalThis.document=original;}
});
test('portrait devices skip decorative canvas painting while the foreground video plays',async()=>{
 const original=globalThis.document,fixture=dom();globalThis.document=fixture.document;
 try{const film=new CinematicIntro(()=>{},()=>{});film.begin(0,false);await Promise.resolve();film.tick(.01);await Promise.resolve();fixture.frame();assert.equal(fixture.draws.length,0);film.cancel();}finally{globalThis.document=original;}
});
test('backdrop fill crops safely around the source center without distorting its aspect ratio',()=>{
 for(const [w,h]of [[1920,1080],[1366,768],[2560,1080],[844,390]]){const crop=cinematicBackdropCrop(720,1280,w,h);assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=720&&crop.y+crop.height<=1280);assert.ok(Math.abs(crop.width/crop.height-w/h)<1e-10);assert.equal(crop.x+crop.width/2,360);assert.equal(crop.y+crop.height/2,640);}
 assert.equal(cinematicBackdropCrop(0,0,1600,900),null);
});
