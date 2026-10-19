import test from 'node:test';
import assert from 'node:assert/strict';
import {TrackDirector,TRACK_PROFILES,TRACK_LOOKAHEAD,trackTimeAtDistance,materializeEncounter,skillCoins} from '../src/track-director.mjs';
import {LANES,speedAtDistance,distanceAfterRunTime,contactKind,jumpImpulse} from '../src/core.mjs';
import {stepLane,ROLL_DURATION} from '../src/runner-motion.mjs';
import {surfaceHeight,stepVertical,canRide} from '../src/surfaces.mjs';
import {trafficZ} from '../src/traffic.mjs';

function simulate(seed,fps,seconds=110,takeRoofs=false){
 const director=new TrackDirector(seed),plan=[],dt=1/fps;
 let active=[],coins=[],d=0,x=0,vx=0,y=0,vy=0,floor=0,buses=0,roofs=0,caught=0,offered=0,roofFrames=0,maxObstacles=0,hazards=0,busTimes=[],emptyRoad=0,maxEmptyRoad=0,pressureFrames=0;
 const emit=()=>{for(const g of director.takeThrough(d+TRACK_LOOKAHEAD)){
  plan.push(g);
  const existing=active.map(o=>({x:o.x,z:o.z,width:o.width,depth:o.depth+(o.key==='rooftop'?24:0),kind:o.kind,vehicleSpeed:o.vehicleSpeed}));
  const ready=materializeEncounter(g,d,existing);active.push(...ready.obstacles);hazards+=ready.obstacles.length;busTimes.push(...ready.obstacles.filter(o=>o.key==='bus').map(o=>o.time));buses+=ready.obstacles.filter(o=>o.key==='bus').length;roofs+=ready.obstacles.filter(o=>o.key==='rooftop'&&o.ramp).length;
  coins.push(...g.coins.map(c=>({...c})));offered+=g.coins.length;
 }};
 emit();
 for(let t=0;t<seconds;t+=dt){
  const speed=speedAtDistance(d),previousX=x,previousY=y;d+=speed*dt;
  const now=trackTimeAtDistance(d),g=plan.find(g=>now>=g.startTime&&now<g.endTime);
  // A 220ms response delay, then the actual damped lane controller.
  let target=g?(now<g.startTime+.22?g.previousLane:g.safeLane):director.lane;
  if(takeRoofs)for(const roof of plan.filter(g=>g.roofs.length)){
   const first=roof.roofs[0],last=roof.roofs.at(-1),entry=first.at-first.depth/2-12,exit=last.at+last.depth/2+12;
   if(d>=entry-speed*.8&&d<=exit+speed*.25)target=first.lane;
  }
  const lateral=stepLane(x,vx,LANES[target],dt);x=lateral.x;vx=lateral.velocity;
  const oldFloor=floor;floor=0;
  for(const o of active){o.previousZ=o.z;o.z=trafficZ(o.z,dt,speed,o.vehicleSpeed);if(o.key==='rooftop'){const h=surfaceHeight(x,-o.z,o);if(h!==null)floor=Math.max(floor,h);}}
  const vertical=stepVertical(y,vy,oldFloor,floor,dt,speed);y=vertical.y;vy=vertical.velocity;if(floor>2)roofFrames++;
  for(const o of active){const h=o.key==='rooftop'?surfaceHeight(x,-o.z,o):null;if(canRide(y,h))continue;
   assert.equal(contactKind({x,previousX,y,previousY},{...o,height:o.height-.06}),'none',JSON.stringify({seed,fps,t,d,x,y,target,obstacle:o,group:g?.section,takeRoofs}));
  }
  if(t>4){if(active.some(o=>o.z>=-o.depth/2&&o.z<speed*2.5)){pressureFrames++;emptyRoad=0;}else{emptyRoad+=dt;maxEmptyRoad=Math.max(maxEmptyRoad,emptyRoad);}}
  active=active.filter(o=>o.z>-(o.key==='rooftop'?o.depth/2+14:12));maxObstacles=Math.max(maxObstacles,active.length);
  coins=coins.filter(c=>{const z=c.at-d;if(Math.abs(z)<1.12&&Math.abs(c.x-x)<1.1&&Math.abs(c.y-(y+1))<1.22){caught++;return false;}return z>-2;});
  emit();
  while(plan.length&&plan[0].endTime<now-12)plan.shift();
 }
 return {buses,roofs,caught,offered,roofFrames,maxObstacles,d,hazards,busTimes:busTimes.filter(t=>t<=seconds),maxEmptyRoad,pressure:pressureFrames/(Math.max(1,seconds-4)*fps)};
}

test('the authored opening spans exactly ninety seconds and keeps pressure between roofs and moving buses',()=>{
 const d=new TrackDirector(42);assert.equal(d.chapters[0].kind,'welcome');assert.equal(d.chapters.at(-1).end,90);
 for(const kind of ['skills','roof','traffic','weave'])assert.ok(d.chapters.some(c=>c.kind===kind));
 assert.ok(d.chapters.every(c=>c.kind!=='rest'),'no completely empty recovery chapters');
 assert.ok(d.pending.every(g=>Math.abs(g.safeLane-g.previousLane)<=1));
 for(const g of d.pending){
  assert.ok(g.obstacles.every(o=>o.lane!==g.safeLane));
  for(const o of g.obstacles)assert.ok(o.time-g.startTime>.65,'leave space to read the encounter and change lanes');
  if(g.roofs.length){assert.equal(g.roofs.filter(o=>o.ramp).length,1);assert.equal(g.roofs.filter(o=>o.exitRamp).length,1);for(let i=1;i<g.roofs.length;i++)assert.equal(g.roofs[i].at-g.roofs[i-1].at,g.roofs[i].depth);}
 }
});

test('the actual generated course has a collision-free ground route at phone and desktop refresh rates',()=>{
 for(const seed of [0,1,419,4294967295])for(const fps of [30,60,120]){
  const result=simulate(seed,fps,90);
  assert.ok(result.busTimes.length>=20,'moving buses must survive placement, not be silently starved by props');
  assert.ok(result.roofs>=3,'all three opening rooftop routes must be present');
  assert.ok(result.caught/result.offered>.80,'the clear coin route must remain collectable with a realistic input delay');
  assert.ok(result.hazards>=90,'actual placement must retain dense mixed hazards');
  assert.ok(result.pressure>.92,'a hazard must approach within 2.5 seconds for most of the run');
  assert.ok(result.maxEmptyRoad<2.1,'placement must not recreate long empty-road breaks');
  assert.ok(result.busTimes.every((t,i)=>!i||t-result.busTimes[i-1]<15),'no minute-long traffic drought');
  assert.ok(result.maxObstacles<40,'keep active traffic bounded');
 }
});

test('the generated roof forks are traversable up, along continuous decks and back to the street',()=>{
 for(const seed of [0,419])for(const fps of [30,60,120]){const r=simulate(seed,fps,90,true);assert.ok(r.roofFrames>fps,'must spend meaningful time on the actual roofs');}
});

test('jump and roll cues fit the existing physical arc and approved roll at all run speeds',()=>{
 for(const speed of [14,22,32])for(const fps of [30,60,120]){
  const at=(speed-14)/.012,dt=1/fps,arc=skillCoins('barrier',1,at),roll=skillCoins('arch',1,at);
  const begin=arc[0].at;let y=0,v=jumpImpulse(false),z=at-begin;
  for(let t=0;t<1;t+=dt){const previousZ=z,previousY=y;z-=speed*dt;const s=stepVertical(y,v,0,0,dt,speed);y=s.y;v=s.velocity;assert.equal(contactKind({x:0,y,previousY},{x:0,z,previousZ,kind:'barrier',width:2.6,depth:.5,height:1.55}),'none');}
  assert.ok(Math.abs(arc[Math.floor(arc.length/2)].y-3.15)<.1,'jump arc should rise above the jump barrier');
  assert.ok((at-roll[0].at)/speed+.65/speed<ROLL_DURATION-.12,'the first low coin must not ask for an early roll');
 }
});

test('seeded encounters are independent of how often the frame drains the queue, and endless memory stays bounded',()=>{
 const collect=step=>{const d=new TrackDirector(821),out=[];for(let metres=0;metres<9000;metres+=step)out.push(...d.takeThrough(metres+TRACK_LOOKAHEAD));return {out:out.filter(g=>g.at<8800),d};};
 const a=collect(5),b=collect(19);assert.deepEqual(a.out,b.out);assert.ok(a.d.pending.length<80);assert.ok(a.d.chapters.length<=64);
 assert.notDeepEqual(new TrackDirector(821).pending,new TrackDirector(822).pending);
 for(const seconds of [0,8,40,90,400])assert.ok(Math.abs(trackTimeAtDistance(distanceAfterRunTime(0,seconds))-seconds)<1e-9);
});

test('a rejected hazard cannot leave an orphaned bonus coin trail',()=>{
 const d=new TrackDirector(1),g=d.pending.find(g=>g.bonuses.some(b=>b.obstacle!=='roof')),o=g.obstacles[0];
 const parked={x:LANES[o.lane],z:o.at,width:TRACK_PROFILES.bus.width,depth:20,kind:'bus',vehicleSpeed:8};
 const result=materializeEncounter(g,0,[parked]);
 assert.ok(result.obstacles.every(p=>p.lane!==o.lane));assert.deepEqual(result.coins,g.coins);
});

test('endless sections remain traversable as speed caps and the director generates new chapters',()=>{
 for(const seed of [2,3,71])for(const fps of [30,120]){const r=simulate(seed,fps,300,true);assert.ok(r.buses>=12);assert.ok(r.roofs>=5);assert.ok(r.maxObstacles<40);}
});

test('ground coins stay on lane centres through turns while obstacle trails retain their height',()=>{
 for(const seed of [0,1,419,4294967295]){const d=new TrackDirector(seed);for(const g of d.takeThrough(4000)){assert.ok(g.coins.every(c=>c.x===LANES[g.safeLane]&&c.y===1.1),'ground strips must never cut diagonally between lanes');if(g.previousLane!==g.safeLane&&g.coins.length)assert.ok(trackTimeAtDistance(g.coins[0].at)-g.startTime>=.449,'start the next straight strip after the lane change');}assert.ok(d.pending.some(g=>g.bonuses.some(b=>b.coins.some(c=>c.y>2))),'keep elevated reward trails');}
});
