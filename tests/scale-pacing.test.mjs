import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleFit} from '../src/vehicle-scale.mjs';
import {ROUTES,routeAt,environmentAt} from '../src/routes.mjs';
import {collides} from '../src/core.mjs';
import {overlapsChaser} from '../src/traffic.mjs';
test('supplied vehicles remain human-scaled and fit a traffic lane',()=>{
 for(const [kind,x,y,z] of [['bus',1.029,1.476,1.898],['bus',.694,1.009,1.899],['rickshaw',1.501,1.744,2.718],['rickshaw',1.644,1.982,2.969]]){const fit=vehicleFit({x,y,z},kind);assert.ok(fit.height>2.86);assert.ok(fit.width<=3.001);assert.ok(fit.depth<=(kind==='bus'?8.5:5));assert.ok(Math.abs(fit.width/fit.depth-x/z)<1e-9);}
});
test('wider supplied rickshaw collision agrees for runner and warden',()=>{const obstacle={x:0,z:0,width:2.7,depth:4.9,height:3.15,kind:'rickshaw'};assert.equal(collides({x:1.75,y:0},obstacle),true);assert.equal(overlapsChaser({x:1.75,z:0},obstacle),true);assert.equal(collides({x:3.15,y:0},obstacle),false);});
test('districts offer about 400–500 coins without a collection gate',()=>{for(const r of ROUTES){const spacing=r.kind==='street'?28:r.kind==='coast'?34:31;const coins=r.length/spacing*(r.kind==='street'?7:7.75);assert.ok(coins>=400&&coins<=500);assert.equal(routeAt(r.start+r.length).id,ROUTES[(ROUTES.indexOf(r)+1)%ROUTES.length].id);}});
test('street interludes change scenery while preserving district progress',()=>{assert.equal(environmentAt(350).kind,'plaza');assert.equal(environmentAt(500).kind,'street');assert.equal(environmentAt(350).id,routeAt(350).id);assert.equal(routeAt(1000).id,'saddar');});
