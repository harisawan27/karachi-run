import test from 'node:test';
import assert from 'node:assert/strict';
import {CATCH_CYCLE,THROW_AT,WALL_AFTER,CATCH_AFTER,WARDEN_AFTER,ESCAPE_AFTER,OPENING_AFTER,HERO,SHUTTER,nextThrowDelay,openingActors,normalBall,badBall,openingCamera,openingCueCrossed,escapeBlend} from '../src/shutter-opening.mjs';
const point={x:-4,y:1.8,z:1};
const near=(a,b,epsilon=1e-6)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<epsilon;
test('Run always picks the next throw, never changes a ball already in flight',()=>{
 for(let clock=0;clock<CATCH_CYCLE*3;clock+=.013){const delay=nextThrowDelay(clock);assert.ok(delay>=.08&&delay<CATCH_CYCLE+.08);assert.ok(Math.abs(((clock+delay)%CATCH_CYCLE)-THROW_AT)<1e-8);}
});
test('the ordinary catch and accidental ricochet have continuous, exact contacts',()=>{
 assert.ok(near(normalBall(point,point,0),point));assert.ok(near(normalBall(point,point,WALL_AFTER),SHUTTER));assert.ok(near(normalBall(point,point,CATCH_AFTER),point));
 const bowl={x:-6.8,y:1.8,z:8.2};assert.ok(near(badBall(point,bowl,WALL_AFTER),SHUTTER));assert.ok(near(badBall(point,bowl,WARDEN_AFTER),bowl));
 for(const at of [WALL_AFTER,WARDEN_AFTER,WARDEN_AFTER+.42])assert.ok(near(badBall(point,bowl,at-1e-6),badBall(point,bowl,at+1e-6),.0001));
});
test('camera and actors reveal the warden only after the bad bounce and reach the existing run origin',()=>{
 const idle=openingActors(-Infinity);assert.equal(idle.wardenVisible,false);assert.deepEqual(idle.hero,HERO);assert.equal(openingActors(WALL_AFTER+.04).wardenVisible,false);assert.equal(openingActors(1).wardenVisible,true);
 const end=openingActors(OPENING_AFTER);assert.ok(end.hero.x===0&&end.hero.z===0&&end.hero.yaw===0);assert.ok(Math.abs(end.warden.x+.55)<1e-9&&Math.abs(end.warden.z+4.6)<1e-9);
 for(const portrait of [false,true]){let before=openingCamera(portrait,-.1);for(let t=-.09;t<OPENING_AFTER;t+=.01){const next=openingCamera(portrait,t);for(const key of ['eye','target']){assert.ok(next[key].every(Number.isFinite));assert.ok(Math.hypot(...next[key].map((v,i)=>v-before[key][i]))<.4);}before=next;}}
 assert.equal(escapeBlend(ESCAPE_AFTER),0);assert.equal(escapeBlend(OPENING_AFTER),1);assert.equal(openingCueCrossed(.45,.47,WALL_AFTER),true);assert.equal(openingCueCrossed(.47,.48,WALL_AFTER),false);
});

test('portrait camera keeps the runner, shutter contact and warden inside the frame',()=>{
 function inFrame(point,shot){const v=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>a.map(n=>n/Math.hypot(...a));const forward=unit(v(shot.target,shot.eye)),right=unit(cross([0,1,0],forward)),up=cross(forward,right),offset=v(point,shot.eye),depth=dot(offset,forward);return depth>0&&Math.abs(dot(offset,right)/depth)<Math.tan(1.22/2)*390/844&&Math.abs(dot(offset,up)/depth)<Math.tan(1.22/2);}
 const idle=openingCamera(true);for(const point of [[HERO.x,0,HERO.z],[HERO.x,2.86,HERO.z],[SHUTTER.x,SHUTTER.y,SHUTTER.z]])assert.ok(inFrame(point,idle),'phone lobby framing '+point);
 const reveal=openingCamera(true,1.4);for(const point of [[-6.35,0,8.2],[-6.35,2.86,8.2]])assert.ok(inFrame(point,reveal),'phone reaction framing '+point);
});
