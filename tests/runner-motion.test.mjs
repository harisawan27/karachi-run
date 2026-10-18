import test from 'node:test';
import assert from 'node:assert/strict';
import {stepLane,flightCameraTarget,jointPose} from '../src/runner-motion.mjs';
test('lane movement has matching timing at 30, 60 and 120 FPS without overshooting',()=>{
 const results=[30,60,120].map(fps=>{let x=0,v=0;for(let i=0;i<fps*.2;i++){const next=stepLane(x,v,3.15,1/fps);x=next.x;v=next.velocity;assert.ok(x>=0&&x<=3.15);}return x;});
 assert.ok(Math.max(...results)-Math.min(...results)<.002);assert.ok(results[0]>2.95);
});
test('a fast reversed swipe preserves position continuity and returns to the chosen lane',()=>{
 let state=stepLane(0,0,3.15,.07);const start=state.x;state=stepLane(state.x,state.velocity,-3.15,.001);assert.ok(Math.abs(state.x-start)<.03);
 for(let i=0;i<120;i++)state=stepLane(state.x,state.velocity,-3.15,1/120);
 assert.equal(state.x,-3.15);assert.equal(state.velocity,0);
});
test('a high sneaker jump cannot activate the city-flight camera',()=>{
 for(const height of [0,2,5,9])assert.equal(flightCameraTarget(false,0,height),0);
 assert.equal(flightCameraTarget(true,0,0),0);assert.equal(flightCameraTarget(true,.3,6),.5);
 assert.equal(flightCameraTarget(true,.8,26),1);assert.equal(flightCameraTarget(false,.9,15),1);assert.equal(flightCameraTarget(false,.9,2),0);
});
test('sprint arms counter the legs and spine lean does not stack into a deep bow',()=>{
 for(let phase=0;phase<Math.PI*2;phase+=.1){
  const leg=jointPose('leftupleg',-1,phase,'run'),arm=jointPose('leftarm',-1,phase,'run');assert.ok((leg.pitch*(arm.pitch+.10))<=.0001);
  const knee=jointPose('leftleg',-1,phase,'run');assert.ok(knee.pitch>=.15&&knee.pitch<=1.8);
  const spine=['spine','spine1','spine2'].reduce((a,n)=>a+jointPose(n,-1,phase,'run').pitch,0);assert.ok(spine<.12);
 }
});
test('jump descent extends the legs and flight has a distinct balanced pose',()=>{
 const ascent=jointPose('leftleg',-1,0,'jump',1,0,10),descent=jointPose('leftleg',-1,0,'jump',1,0,-10);assert.ok(ascent.pitch>descent.pitch);
 assert.equal(jointPose('leftupleg',-1,0,'flight').pitch,jointPose('rightupleg',1,Math.PI,'flight').pitch);
 assert.equal(jointPose('leftfoot',-1,0,'idle').pitch,0);
});
import {swipeAction,swipeThreshold} from '../src/runner-motion.mjs';
test('phone flicks respond to the dominant direction while small touches remain taps',()=>{
 const threshold=swipeThreshold(360);assert.equal(swipeAction(4,8,threshold),null);
 assert.equal(swipeAction(18,2,threshold),'right');assert.equal(swipeAction(-18,4,threshold),'left');
 assert.equal(swipeAction(8,-24,threshold),'jump');assert.equal(swipeAction(9,24,threshold),'slide');
 assert.ok(swipeThreshold(100)>=16);assert.ok(swipeThreshold(1400)<=24);
});

import {sprintPose,sprintLift,ROLL_DURATION,flightDescent,flightCoinLane,openingYaw,groundCameraRise} from '../src/runner-motion.mjs';
import {jumpImpulse} from '../src/core.mjs';
import {stepVertical} from '../src/surfaces.mjs';
test('authored sprint has contact, strong heel recovery, and a seamless loop',()=>{
 const contact=sprintPose(0),recover=sprintPose(.58*Math.PI*2);
 assert.ok(contact.knee<.3 && recover.knee>1.6);
 assert.ok(sprintPose(.76*Math.PI*2).hip<-.9,'forward knee drive');
 for(const key of ['hip','knee','ankle'])assert.ok(Math.abs(sprintPose(-.00001)[key]-sprintPose(.00001)[key])<.001);
 assert.equal(sprintLift(0),0);assert.ok(sprintLift(Math.PI*.55)>.05);
 assert.equal(ROLL_DURATION,.54);
});
test('normal jump is brisk and powered jump still clears a full bus at multiple frame rates',()=>{
 for(const fps of [30,60,120])for(const powered of [false,true]){
  let y=0,v=jumpImpulse(powered),peak=0,elapsed=0;
  while(elapsed<3){const step=stepVertical(y,v,0,0,1/fps,20);y=step.y;v=step.velocity;peak=Math.max(peak,y);elapsed+=1/fps;if(step.landed)break;}
  assert.ok(powered?peak>7&&peak<7.1:peak>1.8&&peak<2.3);
  assert.ok(powered?elapsed<1.6:elapsed>.65&&elapsed<.8);
 }
});
test('sky coins allow a reachable lane dwell at maximum speed and descent finishes smoothly',()=>{
 let previous=26.5;
 for(let t=0;t<=1.1;t+=.01){const y=flightDescent(26.5,0,t);assert.ok(y<=previous+.0001&&y>=0);previous=y;}
 assert.equal(flightDescent(26.5,4.9,1.05),4.9);
 for(let i=0;i<40;i+=5){assert.ok(5*3.1/32>.45);assert.equal(flightCoinLane(i),flightCoinLane(i+4));}
 assert.equal(openingYaw(0),Math.PI);assert.equal(openingYaw(.8),0);
 assert.equal(groundCameraRise(2),0);assert.ok(groundCameraRise(9)>5&&groundCameraRise(9)<=7.2);
});

import {jumpCameraPullback,frameRunnerTargetY} from '../src/runner-motion.mjs';
test('powered-jump camera keeps the full runner inside portrait and landscape frames',()=>{
 for(const portrait of [true,false])for(const fps of [30,60,120])for(const floor of [0,4.9]){
  const dt=1/fps,baseY=portrait?5.15:5.4,baseZ=portrait?-12.4:-10.8,targetZ=portrait?16:18;
  let y=floor,v=jumpImpulse(true),elevation=floor,cy=baseY+floor*.7,cz=baseZ;
  for(let i=0;i<fps*1.8;i++){
   const vertical=stepVertical(y,v,floor,floor,dt,14);y=vertical.y;v=vertical.velocity;
   const rise=groundCameraRise(y-floor);elevation+=(floor+rise-elevation)*(1-Math.exp(-dt*(rise>0?14:7)));
   const f=1-Math.exp(-dt*(rise>0?9:5));cy+=(baseY+elevation*.7-cy)*f;cz+=(baseZ-jumpCameraPullback(y-floor)-cz)*f;
   const targetY=frameRunnerTargetY(cy,cz,2+elevation*.7,targetZ,y,portrait?1.2:.87),tilt=Math.atan2(targetY-cy,targetZ-cz),head=Math.atan2(y+2.86-cy,-cz)-tilt;
   assert.ok(Math.atan2(y-cy,-cz)-tilt>-(portrait?1.2:.87)/2+.025,'feet remain in frame');
   assert.ok(head<(portrait?1.2:.87)/2-.025,JSON.stringify({portrait,fps,floor,i,y,cy,cz,elevation,head,limit:(portrait?1.2:.87)/2-.025}));
  }
 }
});

import {contactKind} from '../src/core.mjs';
test('timely and last-moment rolls clear the entire gate at every run speed and frame rate',()=>{
 for(const fps of [30,60,120])for(const speed of [14,22,32])for(const lead of [.08,.25,.4]){
  const dt=1/fps;let remaining=ROLL_DURATION,z=speed*lead;let passed=false;
  for(let t=0;t<1.2;t+=dt){
   const previousZ=z;z-=speed*dt;remaining=Math.max(0,remaining-dt);
   assert.equal(contactKind({x:0,previousX:0,y:0,sliding:remaining>0},{x:0,z,previousZ,width:2.6,depth:.5,height:3.3,kind:'arch'}),'none',`roll expired inside gate: ${fps} FPS, speed ${speed}, lead ${lead}`);
   if(z<-.65-speed*dt)passed=true;
  }
  assert.ok(passed);assert.equal(remaining,0,'roll must end after the gate');
 }
 assert.equal(contactKind({x:0,y:0,sliding:false},{x:0,z:0,width:2.6,depth:.5,height:3.3,kind:'arch'}),'direct','standing in a gate must still crash');
});
