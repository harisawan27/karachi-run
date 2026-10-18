import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {loadScenery,sceneryWorld} from './helpers/scenery-world.mjs';
const props=await loadScenery();
test('outdoor props have finite geometry and a bounded mesh and triangle budget',()=>{
 const {w,engine,root}=sceneryWorld();
 try{
  for(const [build,limit]of [[props.coastalPalm,2400],[props.neemTree,5000],[props.promenadeBench,1800],[props.streetLamp,1300],[props.planter,1600],[props.beachParasol,500]]){
   const parent=root(),prop=build(w,parent,8,4),meshes=prop.getChildMeshes();let triangles=0;
   assert.ok(meshes.length<=9,'section props must batch to a small material count');
   for(const mesh of meshes){assert.equal(mesh.isPickable,false);const vertices=mesh.getVerticesData('position'),normals=mesh.getVerticesData('normal');assert.ok(vertices.every(Number.isFinite));assert.equal(vertices.length,normals.length);assert.ok(normals.every(Number.isFinite));triangles+=mesh.getTotalIndices()/3;}
   assert.ok(triangles<limit,`${prop.name}: ${triangles} triangles exceeds ${limit}`);
   const bounds=prop.getHierarchyBoundingVectors(true);assert.ok(bounds.max.y>1,'prop must have a complete silhouette');assert.ok(bounds.min.y>=-.03,'prop must rest on the pavement');
  }
 }finally{engine.dispose();}
});
test('repeated scenery placements share prototypes without moving or enabling their sources',()=>{
 const {w,engine,scene,root}=sceneryWorld();
 try{
  const parent=root(),first=props.coastalPalm(w,parent,8,4,1,0),second=props.coastalPalm(w,parent,-8,14,.8,0);
  assert.equal(scene.transformNodes.filter(n=>n.name==='feather palm 0 prototype').length,1);
  assert.ok(first.isEnabled()&&second.isEnabled());assert.equal(scene.getTransformNodeByName('feather palm 0 prototype').isEnabled(),false);
  assert.equal(first.getChildMeshes()[0].geometry,second.getChildMeshes()[0].geometry,'reuse vertex buffers until section batching');
  assert.equal(first.position.x,8);assert.equal(second.position.x,-8);assert.equal(second.scaling.x,.8);
 }finally{engine.dispose();}
});
test('gulls flap at their shoulders, have finite continuous motion and remain above traffic',()=>{
 const {w,engine}=sceneryWorld();
 try{const bird=props.seagull(w,0);let previous=null;
  assert.equal(bird.metadata.wings.length,2);
  for(let i=0;i<600;i++){props.animateGull(bird,i/60,0,true);assert.ok(bird.position.y>10);if(previous)assert.ok(Vector3.Distance(previous,bird.position)<.2,'bird teleported');previous=bird.position.clone();for(const wing of bird.metadata.wings)assert.ok(Math.abs(wing.rotation.z)<.6);}
  assert.ok(bird.getChildMeshes().every(m=>!m.isPickable));
 }finally{engine.dispose();}
});
test('the detailed jump barricade stays inside its existing physical bounds',()=>{
 const {w,engine,root}=sceneryWorld();
 try{const p=root();props.roadBarricade(w,p);const bounds=p.getHierarchyBoundingVectors(true);assert.ok(bounds.min.x>=-1.3&&bounds.max.x<=1.3);assert.ok(bounds.min.z>=-.25&&bounds.max.z<=.25);assert.ok(bounds.max.y<=1.55);assert.ok(bounds.min.y>=0);}
 finally{engine.dispose();}
});
