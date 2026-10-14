import test from 'node:test';
import assert from 'node:assert/strict';
import {convoyLayout} from '../src/track.mjs';
import {surfaceHeight,stepVertical} from '../src/surfaces.mjs';
test('convoys alternate length, have continuous decks and a clear exit',()=>{
 for(const row of [4,12,20,28])for(const depth of [6,8,12]){
  const route=convoyLayout(145,depth,row);
  assert.equal(route.centers.length,Math.floor(row/8)%2===0?2:3);
  assert.equal(route.entry,145-depth/2-12);
  for(let i=1;i<route.centers.length;i++)assert.equal(route.centers[i]-route.centers[i-1]-depth,0);
  assert.ok(route.gap<14*(2*10.5/27));
  assert.equal(route.exit-route.centers.at(-1)-depth/2,16);
 }
});
test('only the first roof has a loading ramp and each roof can catch a jump',()=>{
 const truck={x:0,width:3,depth:8,height:4.4,ramp:false};
 assert.equal(surfaceHeight(0,-5,truck),null);
 assert.equal(surfaceHeight(0,0,truck),4.4);
 for(const dt of [.016,.033,.04]){
  const landing=stepVertical(4.5,-8,0,4.4,dt,32);
  assert.equal(landing.y,4.4);
 }
});

import {canRide} from '../src/surfaces.mjs';
import {contactKind} from '../src/core.mjs';
test('continuous convoy is traversable without jumping or crashing, up and down ramps',()=>{
 for(const speed of [14,22,32])for(const dt of [.016,.033,.04]){
  const layout=convoyLayout(0,8,12);
  const trucks=layout.centers.map((center,i)=>({center,x:0,width:3,depth:8,height:4.4,ramp:i===0,exitRamp:i===layout.centers.length-1}));
  let y=0,v=0,floor=0;
  for(let position=-17;position<layout.exit;position+=speed*dt){
   const heights=trucks.map(t=>surfaceHeight(0,position-t.center,t));
   const nextFloor=Math.max(0,...heights.filter(h=>h!==null));
   const state=stepVertical(y,v,floor,nextFloor,dt,speed);y=state.y;v=state.velocity;floor=nextFloor;
   assert.ok(Math.abs(y-floor)<.001,`lost surface at ${position}, speed ${speed}`);
   trucks.forEach((t,i)=>assert.equal(canRide(y,heights[i])?'none':contactKind({x:0,y},{...t,z:t.center-position,kind:'bus',height:t.height-.06}),'none'));
  }
  assert.equal(y,0);
 }
});
test('a rising ramp catches a low upward jump and tolerates a foot near the deck edge',()=>{
 assert.equal(stepVertical(1,.5,1,1.15,.04,32).y,1.15);
 assert.equal(surfaceHeight(1.53,0,{x:0,width:3,depth:8,height:4.4}),4.4);
 assert.equal(contactKind({x:1.25,y:0},{x:0,z:0,width:3,depth:8,height:4.4,kind:'bus'}),'graze');
});
