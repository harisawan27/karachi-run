import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceHeight,stepVertical} from '../src/surfaces.mjs';
const truck={x:0,width:3,depth:8,height:4.4,ramp:true};
test('ramp joins the roof continuously and has real side edges',()=>{assert.equal(surfaceHeight(0,-16,truck),0);assert.equal(surfaceHeight(0,-4,truck),4.4);assert.equal(surfaceHeight(0,4.1,truck),null);assert.equal(surfaceHeight(2,-8,truck),null);});
test('runner climbs a ramp at maximum speed without jumping',()=>{let y=0,v=0,floor=0;for(let z=-16;z<=4;z+=.32){const next=surfaceHeight(0,z,truck);const state=stepVertical(y,v,floor,next,.01,32);y=state.y;v=state.velocity;floor=next;assert.ok(Math.abs(y-floor)<.001);}assert.ok(y>4.3);});
test('side entry cannot teleport onto a roof',()=>{const state=stepVertical(0,0,0,4.4,.016,32);assert.equal(state.y,0);});
test('jump can land on a roof and leaving it falls gradually',()=>{const landed=stepVertical(4.5,-10,4.4,4.4,.02,20);assert.equal(landed.y,4.4);assert.equal(landed.landed,true);const fall=stepVertical(4.4,0,4.4,0,.02,20);assert.ok(fall.y>4&&fall.y<4.4);});

import {canRide} from "../src/surfaces.mjs";
import {collides} from "../src/core.mjs";
test("inflated vehicle front does not block the ramp-to-roof seam",()=>{const local=-4.3;const height=surfaceHeight(0,local,truck);assert.equal(collides({x:0,y:height},{...truck,z:-local,kind:"bus"}),true);assert.equal(canRide(height,height),true);assert.equal(canRide(0,height),false);});
import {contactKind} from '../src/core.mjs';
test('descending jump lands on an ascending ramp rather than falling through',()=>{const result=stepVertical(1,-3,.98,1.15,.04,32);assert.equal(result.y,1.15);assert.equal(result.velocity,0);});
test('clothing clearance is ignored, edge brushes graze, body hits stop',()=>{const obstacle={x:0,z:0,width:3,depth:8,height:4,kind:'bus'};assert.equal(contactKind({x:1.9,y:0},obstacle),'none');assert.equal(contactKind({x:1.6,y:0},obstacle),'graze');assert.equal(contactKind({x:0,y:0},obstacle),'direct');assert.equal(contactKind({previousX:-2,x:2,y:0},obstacle),'graze');});

test('bounce-height bus roof stays walkable after a jump lands',()=>{const bus={x:0,width:3,depth:8,height:4.9,ramp:false};assert.equal(surfaceHeight(0,0,bus),4.9);assert.equal(surfaceHeight(1.6,0,bus),null);});
import {jumpImpulse,sideBumpResponse} from '../src/core.mjs';
test('Peshawari Bounce clears a full bus and catches its roof on descent',()=>{
 let y=0,v=jumpImpulse(true),floor=0,peak=0,landed=false;
 for(let i=0;i<180;i++){
  const surface=i>28&&i<140&&y>=4.75?4.9:0;
  const next=stepVertical(y,v,floor,surface,1/60,20);y=next.y;v=next.velocity;floor=surface;peak=Math.max(peak,y);
  if(next.landed&&surface===4.9){landed=true;assert.equal(y,4.9);break;}
 }
 assert.ok(peak>7,'powered jump must clear the whole vehicle');assert.ok(landed,'descending feet must land on the roof');
 let normalY=0,normalV=jumpImpulse(false),normalPeak=0;
 for(let i=0;i<90;i++){const n=stepVertical(normalY,normalV,0,0,1/60,20);normalY=n.y;normalV=n.velocity;normalPeak=Math.max(normalPeak,normalY);}
 assert.ok(normalPeak<3,'normal jumps remain distinct');
});
test('a near-deck descending landing tolerates the roof seam without a teleport from below',()=>{
 assert.equal(stepVertical(4.82,-5,0,4.9,.016,32).y,4.9);
 assert.equal(stepVertical(0,0,0,4.9,.016,32).y,0);
});
test('side bump recoils into the clear lane so the same obstacle cannot become a head-on crash next frame',()=>{
 const bus={x:0,width:3.4,z:0,depth:9.3,height:4.9,kind:'bus'};
 for(const oldX of [-2,2]){
  const recoil=sideBumpResponse(oldX,bus);assert.equal(recoil.lane,oldX<0?0:2);
  assert.equal(contactKind({x:recoil.x,previousX:recoil.x,y:0},bus),'none');
 }
});
