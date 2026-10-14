import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCharacter} from '../scripts/check-character-model.mjs';
function glb(doc){let json=JSON.stringify(doc);json+=' '.repeat((4-json.length%4)%4);const out=Buffer.alloc(20+json.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);out.write(json,20);return out;}
test('static generated meshes cannot pass as animation-ready characters',()=>{
  const report=inspectCharacter(glb({meshes:[{primitives:[]}],nodes:[{mesh:0}]}));
  assert.equal(report.readyForVisualReview,false);assert.ok(report.errors.some(e=>e.includes('static models')));
});
test('named object movement cannot masquerade as a skeletal run clip',()=>{
  const report=inspectCharacter(glb({meshes:[{primitives:[]}],nodes:[{mesh:0}],animations:[{name:'run',channels:[{target:{node:0,path:'translation'}}]}]}));
  assert.deepEqual(report.animations,[]);
});
test('reject truncated model data',()=>assert.throws(()=>inspectCharacter(Buffer.from('glTF'))));
