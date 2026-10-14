import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RUNTIME_MODELS} from '../src/asset-manifest.mjs';
import {streetRow} from '../src/track.mjs';
import {RunReport} from '../src/run-report.mjs';

test('every runtime character and street model has a valid source GLB',()=>{
 assert.equal(new Set(RUNTIME_MODELS).size,8);
 for(const file of RUNTIME_MODELS){const b=readFileSync(`public/${file}`);assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);}
});
test('street phrases repeat from a seed and their safe route never requires two lane changes at once',()=>{
 for(const seed of [0,1,2,419,4294967295]){
  let previous=1;
  for(let row=0;row<1024;row++){
   const a=streetRow(row,seed);assert.deepEqual(a,streetRow(row,seed));
   assert.ok(a.obstacles.every(o=>o.lane!==a.safeLane));assert.ok(Math.abs(a.safeLane-previous)<=1);previous=a.safeLane;
   if(row<4){assert.equal(a.safeLane,1);assert.equal(a.obstacles.length,1);assert.ok(a.obstacles.every(o=>o.kind!=='bus'));}
  }
 }
 assert.notDeepEqual(streetRow(6,0),streetRow(6,1));
});
test('local problem reports stay bounded and preserve the crash until revived',()=>{
 const report=new RunReport();report.start({seed:42});
 for(let i=0;i<2000;i++){report.frame(i*.11,.016,{x:i},[{z:i}]);report.event('input',i,{action:'left'});}
 const initial=report.snapshot();assert.equal(initial.frames.length,120);assert.equal(initial.events.length,160);
 report.freeze(221,{reason:'direct'});report.frame(222,.2,{x:9999},[]);report.event('input',222);
 assert.equal(report.snapshot().frames.at(-1).x,1999);assert.equal(report.snapshot().events.at(-1).type,'collision');
 initial.frames[0].obstacles[0].z=-999;assert.notEqual(report.snapshot().frames[0].obstacles[0].z,-999);
 report.continue(223);report.frame(223,.016,{x:3},[]);assert.equal(report.snapshot().frames.at(-1).x,3);
 report.start({seed:43});assert.equal(report.snapshot().frames.length,0);assert.equal(report.snapshot().events.length,0);assert.equal(report.snapshot().performance.frames,0);
});
