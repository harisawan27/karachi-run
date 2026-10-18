import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import clip from '../src/haris-sprint.mjs';
import {character,vertices} from './helpers/character-model.mjs';
import {ProgressWriter} from '../src/progress-writer.mjs';
import {groundRunFov} from '../src/runner-motion.mjs';
import {Quaternion} from '@babylonjs/core/Maths/math.vector.js';

test('retargeted sprint is pinned to its source and Haris, with normalized seamless rotations',()=>{
 for(const [file,key]of [['art/motion/sketchbook-boxman.glb','sourceSha256'],['public/pakistani_boy.glb','modelSha256']])assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),clip[key]);
 assert.equal(Object.keys(clip.tracks).length,16);
 for(const frames of Object.values(clip.tracks)){
  assert.equal(frames.length,clip.frames+1);
  for(const q of frames)assert.ok(Math.abs(Math.hypot(...q)-1)<1e-5);
  assert.ok(Math.abs(frames[0].reduce((sum,v,i)=>sum+v*frames.at(-1)[i],0))>.99999,'clip boundary must not snap');
 }
 assert.ok(clip.clearance.some(y=>y===0));assert.ok(Math.max(...clip.clearance)<=.08501);
 assert.match(fs.readFileSync('art/motion/SKETCHBOOK-LICENSE.txt','utf8'),/Copyright \(c\) 2020 swift502/);
});

test('real Haris sprint keeps bone lengths and planted feet at 30, 60 and 120 FPS',async()=>{
 const results=[];
 for(const fps of [30,60,120]){
  const {model,engine}=await character('pakistani_boy.glb');
  try{
   const nodes=model.root.getChildMeshes().flatMap(m=>m.skeleton?.bones??[]).map(b=>b.getTransformNode()).filter(Boolean),unique=[...new Set(nodes)],rest=unique.map(n=>n.position.clone());
   const headNode=unique.find(n=>/^Head_/.test(n.name)),neutralHead=new Quaternion();
   headNode.computeWorldMatrix(true).decompose(undefined,neutralHead);neutralHead.normalize();
   let low=99,high=-99;
   for(let i=0;i<fps*2;i++){
    model.animate(i/fps,true,0,false,22,1/fps);
    if(i>fps/2){
     const facing=new Quaternion();headNode.computeWorldMatrix(true).decompose(undefined,facing);facing.normalize();
     assert.ok(Math.abs(Quaternion.Dot(neutralHead,facing))>.998,'running head must face forward instead of pitching toward the road');
    }
    if(i>fps/2)for(const side of ['Left','Right']){
     const hip=unique.find(n=>n.name.startsWith(side+'UpLeg_')),foot=unique.find(n=>n.name.startsWith(side+'Foot_'));
     hip.computeWorldMatrix(true);foot.computeWorldMatrix(true);
     assert.ok(Math.abs(foot.getAbsolutePosition().x-hip.getAbsolutePosition().x)<.12,'the foot swung sideways outside its hip track');
    }
    if(i>fps/2&&i%Math.max(1,Math.round(fps/30))===0){let min=Infinity,max=-Infinity;
     for(const {points}of vertices(model))for(let v=1;v<points.length;v+=3){min=Math.min(min,points[v]);max=Math.max(max,points[v]);}
     assert.ok(min>-.04&&min<.16,`feet floated or penetrated ground: ${fps} FPS, ${min}`);assert.ok(max-min<3.1);low=Math.min(low,min);high=Math.max(high,min);
    }
   }
   unique.forEach((n,i)=>assert.ok(n.position.equalsWithEpsilon(rest[i],1e-8),'animation changed bone length'));
   const hand=unique.find(n=>/^LeftHand_/.test(n.name));results.push({phase:model.phase,hand:hand.rotationQuaternion.asArray(),low,high});
  }finally{model.dispose();engine.dispose();}
 }
 assert.ok(Math.max(...results.map(r=>r.phase))-Math.min(...results.map(r=>r.phase))<1e-6);
});

test('queued progression saves write the latest state at a bounded rate and immediate saves cancel the queue',()=>{
 const timers=new Map();let id=0,revision=0,value=0,writes=[];
 const writer=new ProgressWriter(()=>writes.push({value,revision}),()=>revision++,{setTimer:callback=>{timers.set(++id,callback);return id;},clearTimer:key=>timers.delete(key)});
 for(let i=0;i<120;i++){value++;writer.schedule();}
 assert.equal(timers.size,1);assert.equal(writes.length,0);assert.equal(revision,120,'in-flight cloud acknowledgements must see every mutation');
 const callback=timers.values().next().value;timers.clear();callback();assert.deepEqual(writes,[{value:120,revision:120}]);
 value++;writer.schedule();writer.cancel();writes.push({value,revision});assert.equal(timers.size,0);assert.equal(writes.at(-1).value,121);
 value++;writer.schedule();assert.equal(timers.size,1,'saving must continue after an immediate checkpoint');
});

test('the actual sprint silhouette fits all three lanes on short and tall portrait screens',async()=>{
 const {model,engine}=await character('pakistani_boy.glb');
 try{
  for(let frame=0;frame<60;frame++){
   model.animate(frame/60,true,0,false,22,1/60);if(frame<20||frame%4)continue;
   for(const [width,height]of [[320,568],[360,800],[390,844],[320,960]]){
    const aspect=width/height,tan=Math.tan(groundRunFov(width,height)/2),cy=5.15,cz=-12.4,fy=(2-cy)/Math.hypot(2-cy,16-cz),fz=(16-cz)/Math.hypot(2-cy,16-cz);
    for(const {points:p}of vertices(model))for(let i=0;i<p.length;i+=3){const z=(p[i+1]-cy)*fy+(p[i+2]-cz)*fz;
     for(const lane of [-3.15,0,3.15])assert.ok(Math.abs((p[i]+lane)/(z*tan*aspect))<.98,`cropped lane on ${width}×${height}`);
    }
   }
  }
 }finally{model.dispose();engine.dispose();}
});


test('default timer callbacks retain the browser global receiver',()=>{
 const set=globalThis.setTimeout,clear=globalThis.clearTimeout;let callback,cancelled=false;
 try{
  globalThis.setTimeout=function(fn){assert.equal(this,globalThis);callback=fn;return 12;};
  globalThis.clearTimeout=function(id){assert.equal(this,globalThis);assert.equal(id,12);cancelled=true;};
  const writer=new ProgressWriter(()=>{},()=>{});writer.schedule();assert.equal(typeof callback,'function');writer.cancel();assert.equal(cancelled,true);
 }finally{globalThis.setTimeout=set;globalThis.clearTimeout=clear;}
});
