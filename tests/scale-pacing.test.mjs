import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleFit} from '../src/vehicle-scale.mjs';
import {ROUTES,routeAt,environmentAt} from '../src/routes.mjs';
import {collides} from '../src/core.mjs';
import {overlapsChaser} from '../src/traffic.mjs';
test('rickshaws restore the exact pre-enlargement fit and trucks retain their fit',()=>{
 for(const size of [{x:1.501,y:1.744,z:2.718},{x:1.644,y:1.982,z:2.969}]){
  const fit=vehicleFit(size,'rickshaw');assert.equal(fit.scale,Math.min(3.15/size.y,2.7/size.x));assert.ok(fit.width<=2.7&&fit.height<=3.15);
  const o={x:0,z:0,...fit,kind:'rickshaw'};assert.equal(collides({x:0,y:0},o),true);assert.equal(overlapsChaser({x:0,z:0},o),true);assert.equal(collides({x:3.15,y:0},o),false);
 }
 const size={x:.694,y:1.009,z:1.899},fit=vehicleFit(size,'truck');assert.equal(fit.scale,Math.min(5/size.y,3.45/size.x,9.5/size.z));
});
test('bus is twenty percent larger without blocking the adjacent lane and keeps proportions',()=>{
 const size={x:1.029,y:1.476,z:1.898},fit=vehicleFit(size,'bus'),old=Math.min(5/size.y,3.45/size.x,9.5/size.z);
 assert.ok(fit.scale/old>1.19);assert.ok(fit.height>5.8);assert.ok(Math.abs(fit.width/fit.depth-size.x/size.z)<1e-9);
 const o={x:0,z:0,...fit,kind:'bus'};assert.equal(collides({x:0,y:0},o),true);assert.equal(collides({x:3.15,y:0},o),false);assert.equal(overlapsChaser({x:3.15,z:0},o),false);
});

test('districts offer about 400–500 coins without a collection gate',()=>{for(const r of ROUTES){const spacing=r.kind==='street'?28:r.kind==='coast'?34:31;const coins=r.length/spacing*(r.kind==='street'?7:7.75);assert.ok(coins>=400&&coins<=500);assert.equal(routeAt(r.start+r.length).id,ROUTES[(ROUTES.indexOf(r)+1)%ROUTES.length].id);}});
test('street interludes change scenery while preserving district progress',()=>{assert.equal(environmentAt(350).kind,'plaza');assert.equal(environmentAt(500).kind,'street');assert.equal(environmentAt(350).id,routeAt(350).id);assert.equal(routeAt(1000).id,'saddar');});
