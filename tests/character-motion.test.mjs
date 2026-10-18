import test from 'node:test';
import assert from 'node:assert/strict';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer.js';
import {character,vertices} from './helpers/character-model.mjs';

const sources=['pakistani_boy.glb','imran.glb','asim.glb'];
const range=a=>Math.max(...a)-Math.min(...a);
function joints(model){return [...new Set(model.root.getChildMeshes().flatMap(mesh=>mesh.skeleton?.bones??[]))].map(b=>b.getTransformNode()).filter(Boolean);}
function bounds(model){
 const box=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
 for(const {points}of vertices(model))for(let i=0;i<points.length;i+=3)for(let k=0;k<3;k++){assert.ok(Number.isFinite(points[i+k]));box[k]=Math.min(box[k],points[i+k]);box[k+3]=Math.max(box[k+3],points[i+k]);}
 return box;
}

test('all supplied runners have moving hands and recovering feet at the same sprint cadence',async()=>{
 const phases=[];
 for(const source of sources){
  const {model,engine}=await character(source);
  try{
   const nodes=joints(model),hands=nodes.filter(n=>/^(left|right)hand(_\d+)?$/i.test(n.name)),feet=nodes.filter(n=>/^(left|right)foot(_\d+)?$/i.test(n.name));
   assert.equal(hands.length,2,source);assert.equal(feet.length,2,source);
   const samples=hands.concat(feet).map(()=>[]);
   for(let i=0;i<90;i++){
    model.animate(i/60,true,0,false,22,1/60);
    hands.concat(feet).forEach((node,j)=>{node.computeWorldMatrix(true);samples[j].push(node.getAbsolutePosition().z);});
   }
   for(const sample of samples)assert.ok(range(sample)>.25,source+' has a frozen limb');
   const box=bounds(model);assert.ok(box[1]>-.05&&box[1]<.22,source+' feet need grounding');assert.ok(box[4]-box[1]<3.1,source+' body must not stretch');
   phases.push(model.phase);
  }finally{model.dispose();engine.dispose();}
 }
 assert.ok(range(phases)<1e-8,'character choice must not change stride timing');
});

test('jump, roll, flight and board drive matching body motion on all three GLBs',async()=>{
 const rotations=new Map();
 for(const source of sources){
  const {model,world,engine}=await character(source);
  try{
   for(const pose of ['jump','roll','flight','board']){
    world.airborne=pose==='jump';world.flightActive=pose==='flight';const y=pose==='jump'?2:pose==='flight'?26.5:0;
    for(let i=0;i<75;i++)model.animate(i/60,true,y,pose==='roll',22,1/60,pose==='roll'?.27:0,pose==='board');
    const q=model.body.rotationQuaternion.asArray(),prior=rotations.get(pose);if(prior)q.forEach((v,i)=>assert.ok(Math.abs(v-prior[i])<1e-6,source+' uses a different '+pose+' driver'));else rotations.set(pose,q);
    const box=bounds(model);assert.ok(box[1]>y-.07&&box[1]<y+.25,source+' '+pose+' lost its ground reference');assert.ok(box[4]-box[1]<(pose==='roll'?2.1:3.1),source+' '+pose+' silhouette exploded');
   }
  }finally{model.dispose();engine.dispose();}
 }
});

test('fitted skins have normalized weights and continuous seam deformation',async()=>{
 for(const source of sources.slice(1)){
  const {model,engine}=await character(source);
  try{
   const mesh=model.root.getChildMeshes().find(m=>m.skeleton),p=mesh.getVerticesData(VertexBuffer.PositionKind),ix=mesh.getVerticesData(VertexBuffer.MatricesIndicesKind),wt=mesh.getVerticesData(VertexBuffer.MatricesWeightsKind);
   assert.equal(mesh.skeleton.bones.length,18);
   const seams=new Map();
   for(let v=0;v<p.length/3;v++){
    const key=[p[v*3],p[v*3+1],p[v*3+2]].map(n=>Math.round(n*1e5)).join(',');
    const binding=new Map();for(let j=0;j<4;j++)if(wt[v*4+j]>.00001)binding.set(ix[v*4+j],(binding.get(ix[v*4+j])??0)+wt[v*4+j]);
    if(seams.has(key)){const prior=seams.get(key);for(const bone of new Set([...prior.keys(),...binding.keys()]))assert.ok(Math.abs((prior.get(bone)??0)-(binding.get(bone)??0))<.03,'UV seams must move together');}else seams.set(key,binding);
    let sum=0;for(let j=0;j<4;j++){sum+=wt[v*4+j];assert.ok(ix[v*4+j]>=0&&ix[v*4+j]<18);}
    assert.ok(Math.abs(sum-1)<1e-5);
   }
   for(let i=0;i<90;i++)model.animate(i/60,true,0,false,22,1/60);
   const ratios=[];
   for(const {points,rest,indices}of vertices(model))for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){
    const a=indices[i+j]*3,b=indices[i+(j+1)%3]*3,before=Math.hypot(rest[a]-rest[b],rest[a+1]-rest[b+1],rest[a+2]-rest[b+2]);if(before<.005)continue;
    ratios.push(Math.hypot(points[a]-points[b],points[a+1]-points[b+1],points[a+2]-points[b+2])/before/Math.cbrt(Math.abs(mesh.computeWorldMatrix(true).determinant())));
   }
   ratios.sort((a,b)=>a-b);assert.ok(ratios[Math.floor(ratios.length*.99)]<2.5,source+' clothes stretch across the moving rig');
   const skeletons=model.root.getChildMeshes().map(m=>m.skeleton).filter(Boolean);model.dispose();for(const skeleton of skeletons)assert.ok(!engine.scenes[0].skeletons.includes(skeleton),'switching characters leaked a skeleton');
  }finally{if(!model.root.isDisposed())model.dispose();engine.dispose();}
 }
});
