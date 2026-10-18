import test from 'node:test';
import assert from 'node:assert/strict';
import {ChaiFlight,CHAI_HEIGHT,CHAI_TAKEOFF_SECONDS,CHAI_LANDING_SECONDS,jumpClipProgress,canStartJump,airCameraFov,flightCameraPose} from '../src/air-movement.mjs';
import {jumpImpulse,contactKind} from '../src/core.mjs';
import {stepVertical,surfaceHeight,canRide} from '../src/surfaces.mjs';
import {ROLL_DURATION,frameRunnerTargetY} from '../src/runner-motion.mjs';

test('ballistic height and velocity agree across refresh rates, with an honest landing impact',()=>{
 for(const powered of [false,true]){
  const snapshots=[30,60,120].map(fps=>{let y=0,v=jumpImpulse(powered);for(let i=0;i<fps*.3;i++){const s=stepVertical(y,v,0,0,1/fps,20);y=s.y;v=s.velocity;}return {y,v};});
  assert.ok(Math.max(...snapshots.map(s=>s.y))-Math.min(...snapshots.map(s=>s.y))<1e-9);
  assert.ok(Math.max(...snapshots.map(s=>s.v))-Math.min(...snapshots.map(s=>s.v))<1e-9);
 }
 const hit=stepVertical(.15,-12,0,0,1/30,20);assert.ok(hit.landed);assert.equal(hit.y,0);assert.equal(hit.velocity,0);assert.ok(hit.impactSpeed>12);
 assert.equal(canStartJump(0,0,8),false,'upward motion cannot re-trigger a ground jump');assert.ok(canStartJump(.04,0,-1));
});

test('Peshawari Bounce lands on a moving bus roof without a collision at any tested speed',()=>{
 for(const fps of [30,60,120])for(const speed of [14,22,32]){
  const dt=1/fps,closing=speed+6,bus={x:0,width:3.4,depth:9.3,height:4.9,kind:'bus'};
  let y=0,v=jumpImpulse(true),floor=0,z=closing*((jumpImpulse(true)+Math.sqrt(jumpImpulse(true)**2-64*bus.height))/32),landed=false,stood=false;
  for(let t=0;t<1.7;t+=dt){
   const previousZ=z,previousY=y;z-=closing*dt;const h=surfaceHeight(0,-z,bus),nextFloor=canRide(y,h)?h:0;
   const step=stepVertical(y,v,floor,nextFloor,dt,speed);y=step.y;v=step.velocity;floor=nextFloor;
   if(step.landed&&floor===bus.height)landed=true;
   if(landed&&v===0&&floor===bus.height)stood=true;
   assert.equal(canRide(y,h)?'none':contactKind({x:0,y,previousY},{...bus,z,previousZ,height:bus.height-.06}),'none',`bus collision at ${fps} FPS, speed ${speed}: ${JSON.stringify({y,v,z,previousZ,floor,t})}`);
  }
  assert.ok(landed&&stood,'must catch and run along the bus roof');
 }
});

test('a downward swipe exits the powered jump quickly while retaining the approved roll duration',()=>{
 assert.equal(ROLL_DURATION,.54);
 for(const fps of [30,60,120]){
  let y=8.5,v=-26,t=0;
  while(y>0&&t<1){const s=stepVertical(y,v,0,0,1/fps,20);y=s.y;v=s.velocity;t+=1/fps;}
  assert.ok(t<ROLL_DURATION-.15,'the runner must reach the road before the roll expires');
 }
});

test('flight has continuous takeoff, stable high cruise, exact duration and a soft landing',()=>{
 for(const fps of [30,60,120])for(const start of [0,4.9]){
  const flight=new ChaiFlight();flight.start(5,start);let t=0,prior=start,cruised=false,endedAt=0;
  while(flight.active&&t<8){const s=flight.step(1/fps,0);t+=1/fps;assert.ok(Number.isFinite(s.y));assert.ok(Math.abs(s.y-prior)<2.4);prior=s.y;
   if(flight.stage==='cruise'){cruised=true;assert.equal(s.y,CHAI_HEIGHT);assert.equal(s.velocity,0);}
   if(s.beganLanding)endedAt=t;
  }
  assert.ok(cruised);assert.ok(Math.abs(endedAt-5)<=1/fps+.00001);assert.ok(Math.abs(t-(5+CHAI_LANDING_SECONDS))<2/fps+.00001);
  assert.equal(flight.y,0);assert.equal(flight.velocity,0);assert.equal(flight.stage,'off');
 }
 const flight=new ChaiFlight();flight.start(8,2,10);const s=flight.step(.0001,0);assert.ok(Math.abs((s.y-2)/.0001-10)<.1,'collecting during a jump must preserve upward movement');
});

test('changing the landing lane from a bus roof to the street preserves position and descending motion',()=>{
 const flight=new ChaiFlight();flight.start(2,0);while(flight.stage!=='landing')flight.step(1/120,4.9);
 for(let i=0;i<75;i++)flight.step(1/120,4.9);
 const y=flight.y,v=flight.velocity,step=flight.step(1/120,0);
 assert.ok(Math.abs(step.y-y)<1,'changing roof height must not teleport the player');assert.ok(step.y<=y);assert.ok(Math.abs(step.velocity-v)<8);
 let prior=step.y;while(flight.active){const s=flight.step(1/120,0);assert.ok(s.y<=prior+1e-8);prior=s.y;}assert.equal(prior,0);
});

test('jump sampling extends the landing leg and never loops back to takeoff in midair',()=>{
 assert.equal(jumpClipProgress(jumpImpulse(true),jumpImpulse(true)),0);assert.equal(jumpClipProgress(0,jumpImpulse(true)),.5);assert.equal(jumpClipProgress(-jumpImpulse(true),jumpImpulse(true)),1);
 assert.ok(jumpClipProgress(-5,0)>.8);assert.equal(jumpClipProgress(-100,11.6),1);
});

test('flight framing keeps head and feet visible during ascent and descent on phone and landscape screens',()=>{
 for(const [width,height]of [[320,568],[360,800],[320,960],[844,390]]){
  const flight=new ChaiFlight();flight.start(5,0);const fov=airCameraFov(width,height);let cy=5.15,cz=-12.4;
  while(flight.active){const s=flight.step(1/60,0),pose=flightCameraPose(s.y,width<height);cy+=(pose.eyeY-cy)*(1-Math.exp(-8/60));cz+=(pose.eyeZ-cz)*(1-Math.exp(-8/60));
   const target=frameRunnerTargetY(cy,cz,pose.targetY,pose.targetZ,s.y,fov),tilt=Math.atan2(target-cy,pose.targetZ-cz);
   assert.ok(Math.atan2(s.y-cy,-cz)-tilt>-fov/2+.02);assert.ok(Math.atan2(s.y+3.05-cy,-cz)-tilt<fov/2-.02);
  }
 }
});

test('a powered jump can clear the top of an overhead sign, while low jumps must still duck',()=>{
 const sign={kind:'arch',x:0,z:0,previousZ:.5,width:2.6,depth:.5,height:3.5};
 assert.equal(contactKind({x:0,y:5,previousY:5.2},sign),'none');
 assert.equal(contactKind({x:0,y:2,previousY:1.8},sign),'direct');
 assert.equal(contactKind({x:0,y:0,previousY:0,sliding:true},sign),'none');
 assert.equal(contactKind({x:0,y:1,previousY:1.4,sliding:true},sign),'direct');
});

test('the shorter powered arc clears vehicle roofs and the closer sky view shows the hero and upcoming coins',()=>{
 const peak=jumpImpulse(true)**2/64,previousPeak=23.8**2/64;
 assert.ok(Math.abs(peak/previousPeak-.8)<1e-6,'powered jump peak must be 20 percent lower');
 assert.ok(peak>4.9+1.5,'leave clearance above the tallest vehicle roof');
 for(const [width,height]of [[320,568],[360,800],[320,960],[844,390]]){
  const portrait=width<height,pose=flightCameraPose(CHAI_HEIGHT,portrait),fov=airCameraFov(width,height),tan=Math.tan(fov/2),aspect=width/height;
  const pitch=Math.atan2(pose.eyeY-pose.targetY,pose.targetZ-pose.eyeZ),fy=-Math.sin(pitch),fz=Math.cos(pitch);
  assert.ok(pitch>=30*Math.PI/180&&pitch<=40*Math.PI/180,'camera must look from behind at a shallow city-view angle');
  const project=(y,z)=>{const dy=y-pose.eyeY,dz=z-pose.eyeZ,depth=dy*fy+dz*fz;return {depth,vertical:(dy*fz-dz*fy)/(depth*tan)};};
  const heroHeight=project(CHAI_HEIGHT+2.86,0).vertical-project(CHAI_HEIGHT,0).vertical;
  const oldY=CHAI_HEIGHT+(portrait?12.5:11.5),oldZ=portrait?-14:-13,oldTargetZ=portrait?24:22,oldPitch=Math.atan2(oldY-(CHAI_HEIGHT-10),oldTargetZ-oldZ),oldTan=Math.tan((portrait?Math.max(1.28,2*Math.atan(Math.tan(.32)/aspect)):.99)/2);
  const oldProject=y=>{const dy=y-oldY,dz=-oldZ;return (dy*Math.cos(oldPitch)+dz*Math.sin(oldPitch))/((-dy*Math.sin(oldPitch)+dz*Math.cos(oldPitch))*oldTan);};
  assert.ok(heroHeight>(oldProject(CHAI_HEIGHT+2.86)-oldProject(CHAI_HEIGHT))*1.12,'hero should occupy visibly more screen height');
  for(const z of [0,10,32,64,76])for(const lane of [-3.15,0,3.15]){const coin=project(CHAI_HEIGHT+1.05,z);assert.ok(Math.abs(coin.vertical)<.97,'coin lookahead cropped vertically');assert.ok(Math.abs(lane/(coin.depth*tan*aspect))<.97,'outer coin lane cropped');}
 }
});
