import test from 'node:test';
import assert from 'node:assert/strict';
import {character,vertices} from './helpers/character-model.mjs';
import {CATCH_CYCLE,THROW_AT,WALL_AFTER,CATCH_AFTER,WARDEN_AFTER,ESCAPE_AFTER,OPENING_AFTER,HERO,SHUTTER,nextThrowDelay,openingActors,normalBall,badBall,openingCamera,openingCueCrossed,escapeBlend} from '../src/shutter-opening.mjs';
const point={x:-4,y:1.8,z:1};
const near=(a,b,epsilon=1e-6)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<epsilon;
test('all actual runner models have stable palm sockets and bounded throw/catch poses, without food props',async()=>{
 for(const source of ['pakistani_boy.glb','imran.glb','asim.glb']){
  const {model,world,engine,scene}=await character(source);
  try{world.mode='menu';world.lobbyClock=0;model.root.position.set(HERO.x,0,HERO.z);model.root.rotation.y=HERO.yaw;
   let last=null;for(let i=0;i<100;i++){world.lobbyClock=i*CATCH_CYCLE/99;model.animate(world.lobbyClock,false,0,false,14,1/40);const hand=model.handPoint('right');assert.ok([hand.x,hand.y,hand.z].every(Number.isFinite));assert.ok(hand.y>.8&&hand.y<2.8,source+' palm height '+hand.y);if(last)assert.ok(hand.subtract(last).length()<.30,source+' hand teleport');last=hand;}
   for(const part of vertices(model))assert.ok(part.points.every(Number.isFinite));assert.equal(scene.getTransformNodeByName('biryani bowl'),null);assert.equal(scene.getTransformNodeByName('biryani spoon'),null);
   world.mode='running';for(let i=0;i<30;i++)model.animate(3+i/60,true,0,false,14,1/60);assert.ok(model.handPoint().asArray().every(Number.isFinite));
  }finally{engine.dispose();}
 }
});

test('authored Haris throw plants both soles, shifts the torso, and closes the loop without a hand snap',async()=>{
 const {model,world,engine}=await character('pakistani_boy.glb');world.mode='menu';
 try{const frames=[];for(const clock of [0,.52,.70,.84,1.05,1.98,3.2]){world.lobbyClock=clock;model.animate(clock,false,0,false,14,1/60);const foot=['LeftFoot_04','RightFoot_08'].map(name=>{const node=model.nativeJoints.find(j=>j.node.name===name).node;node.computeWorldMatrix(true);return node.getAbsolutePosition().clone();});frames.push({hand:model.handPoint(),feet:foot,torso:model.nativeJoints.find(j=>j.node.name==='Spine2_012').node.rotationQuaternion.clone()});for(const part of vertices(model)){let min=Infinity;for(let i=1;i<part.points.length;i+=3)min=Math.min(min,part.points[i]);assert.ok(min>=0,'Sandal must not sink through the street');}}
  for(const frame of frames)frame.feet.forEach((foot,i)=>assert.ok(foot.subtract(frames[0].feet[i]).length()<.002,'Planted foot drift'));
  assert.ok(frames[1].hand.subtract(frames[3].hand).length()>1,'Wind-up and release must be distinct');assert.ok(frames[0].torso.asArray().some((v,i)=>Math.abs(v-frames[1].torso.asArray()[i])>.005),'Torso must take part in the throw');assert.ok(frames[0].hand.subtract(frames.at(-1).hand).length()<.0001,'Catch loop seam');
 }finally{engine.dispose();}
});
