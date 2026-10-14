import test from 'node:test';
import assert from 'node:assert/strict';
import {limbWeights} from '../src/rig-weights.mjs';
test('hands below the waist follow forearms instead of legs',()=>{
  for(const x of [-.32,.32]){const w=limbWeights(x,.43,1);assert.equal(w.forearm,1);assert.equal(w.thigh+w.calf,0);}
});
test('skin weights remain normalized at limb transitions',()=>{
  for(let y=0;y<=1;y+=.01)for(let x=-.5;x<=.5;x+=.01){const w=limbWeights(x,y,1);assert.ok(Math.abs(w.upperArm+w.forearm+w.thigh+w.calf+w.torso-1)<1e-6);}
  assert.equal(limbWeights(.15,.12,1).calf,1);
});
