import test from 'node:test';
import assert from 'node:assert/strict';
import { trafficZ, canPlaceTraffic, sweepObstacle, stepChaser, overlapsChaser } from '../src/traffic.mjs';

test('oncoming bus closes faster than the world and pauses with zero delta',()=>{
  assert.equal(trafficZ(50,1,14,8),28);assert.equal(trafficZ(50,1,14),36);assert.equal(trafficZ(50,0,14,8),50);
});

test('committed dodge does not oscillate when the runner moves near a lane boundary',()=>{
  let state={x:0,z:-4.6,targetX:3.15,hold:.85};
  let lastX=state.x;
  for(let i=0;i<45;i++){state=stepChaser(state,[],1/60,i%2?-.1:.1,20);assert.ok(state.x>=lastX);assert.equal(state.targetX,3.15);lastX=state.x;}
});
test('moving obstacle sweep catches a bus crossing the chaser in one frame',()=>{
  const bus={x:0,previousZ:4,z:-8,depth:6.3,kind:'bus',vehicleSpeed:8};
  assert.equal(sweepObstacle({x:0,z:-4.6},{x:0,z:-4.6},bus),true);
  const next=stepChaser({x:0,z:-4.6},[bus],.04,0,32);
  assert.equal(overlapsChaser(next,bus),false);assert.ok(next.blocked);assert.ok(next.z<bus.z);
});
test('chaser cannot slide sideways through a stationary bus',()=>{
  const bus={x:0,z:-4.6,depth:6.3,kind:'bus',vehicleSpeed:0};let state={x:-3.15,z:-4.6};
  for(let i=0;i<120;i++){state=stepChaser(state,[bus],1/60,3.15,0);assert.equal(overlapsChaser(state,bus),false);}
});
test('chaser avoids a continuing oncoming convoy without body overlap',()=>{
  let state={x:0,z:-4.6};const obstacles=[{x:0,z:22,depth:6.3,kind:'bus',vehicleSpeed:8},{x:-3.15,z:40,depth:.5,kind:'barrier',vehicleSpeed:0},{x:3.15,z:58,depth:6.3,kind:'bus',vehicleSpeed:8}];
  for(let i=0;i<300;i++){for(const o of obstacles){o.previousZ=o.z;o.z=trafficZ(o.z,1/60,20,o.vehicleSpeed);}state=stepChaser(state,obstacles,1/60,Math.sin(i/35)*3.15,20);for(const o of obstacles)assert.equal(overlapsChaser(state,o),false);}
});
test('traffic generation rejects solid props in an oncoming lane and three-lane traps',()=>{
  const bus={x:0,z:50,depth:6.3,kind:'bus',vehicleSpeed:8};
  assert.equal(canPlaceTraffic({...bus,z:90,kind:'barrier',vehicleSpeed:0},[bus],14),false);
  const existing=[-3.15,0].map(x=>({x,z:60,depth:6.3,kind:'bus',vehicleSpeed:8}));
  assert.equal(canPlaceTraffic({...bus,x:3.15,z:60},existing,14),false);
  assert.equal(canPlaceTraffic({...bus,x:3.15,z:110},existing,14),true);
});

import {trafficWave} from '../src/traffic.mjs';
test('oncoming waves rotate lanes and reserve six rows before buses arrive',()=>{
 for(let cycle=0;cycle<6;cycle++){
  for(let phase=6;phase<12;phase++){const wave=trafficWave(cycle*16+phase);assert.equal(wave.reserve,true);assert.equal(wave.spawn,false);}
  const wave=trafficWave(cycle*16+12);assert.equal(wave.spawn,true);assert.equal(wave.reserve,true);assert.equal(wave.lane,cycle%3);
  const roof={x:[-3.15,0,3.15][(wave.lane+1)%3],z:100,depth:40,kind:'bus',vehicleSpeed:0};
  assert.equal(canPlaceTraffic({x:[-3.15,0,3.15][wave.lane],z:145,depth:8.5,kind:'bus',vehicleSpeed:8},[roof],22),true);
 }
});

test('warden loses ground continuously behind the camera and returns after a bump',()=>{
 for(const fps of [30,60,120]){
  let s={x:0,z:-4.6};
  for(let i=0;i<fps*3;i++){const before=s.z;s=stepChaser(s,[],1/fps,0,20,false,true);assert.ok(s.z<=before&&before-s.z<=6.5/fps+.00001);}
  assert.equal(s.z,-19);
  for(let i=0;i<fps*2.1;i++){const before=s.z;s=stepChaser(s,[],1/fps,0,20,true,false);assert.ok(s.z>=before&&s.z-before<=9/fps+.00001);}
  assert.equal(s.z,-1.8);
 }
});
test('retreat does not teleport the warden through a prop behind him',()=>{
 const prop={x:0,z:-10,depth:4,width:2.7,kind:'rickshaw',vehicleSpeed:0};let s={x:0,z:-4.6};
 for(let i=0;i<180;i++){s=stepChaser(s,[prop],1/60,0,0,false,true);assert.equal(overlapsChaser(s,prop),false);}
});
