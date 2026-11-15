import test from 'node:test';
import assert from 'node:assert/strict';
import {renderScale,usesMobileResolution} from '../src/render-resolution.mjs';
import {downloadStreetModel} from '../src/street-model-download.mjs';

test('High draws a 390 × 844 phone at 780 × 1688 instead of the old 585 × 1266',()=>{
 const phone={width:390,height:844,dpr:3,mobile:true};
 assert.equal(renderScale(phone),.5);
 assert.equal(renderScale({...phone,low:true}),.8);
 assert.equal(renderScale({...phone,dpr:1}),1);
});
test('phone and tablet rendering respects its pixel budget without changing desktop settings',()=>{
 const tablet={width:1024,height:1366,dpr:2,mobile:true};
 assert.ok(tablet.width*tablet.height/renderScale(tablet)**2<=1800000.0001);
 assert.equal(usesMobileResolution({...tablet,coarsePointer:true}),true);
 assert.equal(usesMobileResolution({width:844,height:390,mobileUserAgent:true}),true);
 assert.equal(usesMobileResolution({width:390,height:844}),false,'resizing a desktop window should not change its profile');
 for(const dpr of [1,1.25,2,3])for(const low of [false,true]){
  assert.equal(renderScale({width:1440,height:900,dpr,low}),low?Math.max(1.7,dpr):Math.max(1,dpr/1.5));
 }
});
test('street downloads report actual progress and abort an idle transfer',async t=>{
 t.mock.method(globalThis,'fetch',async url=>new Response(new ReadableStream({
  start(stream){stream.enqueue(new Uint8Array([1,2]));if(url!=='stall'){stream.enqueue(new Uint8Array([3,4]));stream.close();}}
 }),{headers:{'content-length':'4'}}));
 const progress=[];
 assert.deepEqual(await downloadStreetModel('traffic',{onProgress:p=>progress.push(p)}),new Uint8Array([1,2,3,4]));
 assert.deepEqual(progress,[50,100]);
 await assert.rejects(downloadStreetModel('stall',{idleMs:30}),{name:'AbortError'});
});
