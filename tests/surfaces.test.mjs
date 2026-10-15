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
