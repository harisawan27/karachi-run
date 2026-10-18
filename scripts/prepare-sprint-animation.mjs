import fs from 'node:fs';
import {Matrix,Quaternion,Vector3} from '@babylonjs/core/Maths/math.vector.js';

const b=fs.readFileSync('art/motion/sketchbook-boxman.glb'),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),bin=b.subarray(28+b.readUInt32LE(12));
const parents=[];j.nodes.forEach((n,i)=>n.children?.forEach(c=>parents[c]=i));
function values(index){const a=j.accessors[index],v=j.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4,MAT4:16}[a.type],start=(v.byteOffset??0)+(a.byteOffset??0);return Array.from({length:a.count},(_,i)=>Array.from({length:size},(_,k)=>bin.readFloatLE(start+i*(v.byteStride??size*4)+k*4)));}
function sample(clip,time){const locals=j.nodes.map(n=>({q:Quaternion.FromArray(n.rotation??[0,0,0,1]),p:Vector3.FromArray(n.translation??[0,0,0]),s:Vector3.FromArray(n.scale??[1,1,1])}));if(clip)for(const c of clip.channels){const sampler=clip.samplers[c.sampler],times=values(sampler.input).flat(),v=values(sampler.output);let k=0;while(k<times.length-2&&time>times[k+1])k++;const f=Math.max(0,Math.min(1,(time-times[k])/(times[k+1]-times[k]))),n=locals[c.target.node];if(c.target.path==='rotation')n.q=Quaternion.Slerp(Quaternion.FromArray(v[k]),Quaternion.FromArray(v[k+1]),f);else if(c.target.path==='translation')n.p=Vector3.Lerp(Vector3.FromArray(v[k]),Vector3.FromArray(v[k+1]),f);else n.s=Vector3.Lerp(Vector3.FromArray(v[k]),Vector3.FromArray(v[k+1]),f);}
for(let i=0;i<j.nodes.length;i++)if(j.nodes[i].matrix)Matrix.FromArray(j.nodes[i].matrix).decompose(locals[i].s,locals[i].q,locals[i].p);const w=[];function world(i){if(w[i])return w[i];const n=locals[i],m=Matrix.Compose(n.s,n.q,n.p);return w[i]=parents[i]===undefined?m:m.multiply(world(parents[i]));}j.nodes.forEach((_,i)=>world(i));const mirror=Matrix.Identity();return w.map(m=>mirror.multiply(m).multiply(mirror));}
const bind=sample(null,0),clip=j.animations.find(a=>a.name==='sprint');

// Offline retarget: bake source world-space rotation changes onto Haris's
// neutral skeleton. Only compact local rotations ship to the browser.
import {createHash} from 'node:crypto';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {ImportMeshAsync} from '@babylonjs/core/Loading/sceneLoader.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import '@babylonjs/loaders/glTF/index.js';
function withoutTextures(bytes){
 const n=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+n));delete json.materials;delete json.textures;delete json.images;for(const m of json.meshes)for(const p of m.primitives)delete p.material;
 const js=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([js,Buffer.alloc((4-js.length%4)%4,32)]),tail=bytes.subarray(20+n),out=Buffer.alloc(20+padded.length+tail.length);bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);padded.copy(out,20);tail.copy(out,20+padded.length);return out;
}
const engine=new NullEngine(),scene=new Scene(engine),bytes=fs.readFileSync('public/pakistani_boy.glb');
const result=await ImportMeshAsync(withoutTextures(bytes),scene,{pluginExtension:'.glb'});
const container=new TransformNode('normalization',scene);for(const mesh of result.meshes)if(!mesh.parent)mesh.parent=container;
const min=new Vector3(Infinity,Infinity,Infinity),max=min.negate();
for(const mesh of result.meshes)if(mesh.getTotalVertices()){mesh.computeWorldMatrix(true);const box=mesh.getBoundingInfo().boundingBox;min.minimizeInPlace(box.minimumWorld);max.maximizeInPlace(box.maximumWorld);}
const scale=2.86/(max.y-min.y);container.scaling.setAll(scale);container.position.set(-(min.x+max.x)/2*scale,-min.y*scale,-(min.z+max.z)/2*scale);
const nodes=result.skeletons.flatMap(s=>s.bones).map(b=>b.getTransformNode()).filter(Boolean);
for(const node of nodes){node.computeWorldMatrix(true);if(!/shoulder|arm/i.test(node.name)||/forearm/i.test(node.name))continue;
 const parent=node.parent,inv=parent.computeWorldMatrix(true).clone().invert(),side=node.getAbsolutePosition().x>=0?1:-1;
 const axis=Vector3.TransformNormal(Vector3.Forward(),inv).normalize().scaleInPlace(inv.determinant()<0?-1:1);
 node.rotationQuaternion=Quaternion.RotationAxis(axis,-side*(/shoulder/i.test(node.name)?.16:1.28)).multiply(node.rotationQuaternion);node.computeWorldMatrix(true);
}
const neutral=new Map(nodes.map(n=>[n.name,n.computeWorldMatrix(true).clone()]));
function sourceName(name){name=name.replace(/_\d+$/,'').toLowerCase();const side=name.startsWith('left')?'.L':'.R';
 if(name==='hips')return 'body_IK';if(name==='spine'||name==='spine1')return 'body_lower';if(name==='spine2')return 'body_upper';if(name==='neck'||name==='head')return 'head';
 if(/upleg/.test(name))return 'leg_upper'+side;if(/^(left|right)leg$/.test(name))return 'leg_lower'+side;
 if(/shoulder/.test(name))return 'body_upper';
 if(/^(left|right)arm$/.test(name))return 'arm_upper'+side;if(/forearm/.test(name))return 'arm_lower'+side;return null;
}
const mapped=nodes.map(node=>({node,source:j.nodes.findIndex(n=>n.name===sourceName(node.name))})).filter(n=>n.source>=0);
const duration=5/12,frames=50,tracks=Object.fromEntries(mapped.map(({node})=>[node.name,[]])),clearance=[];
for(let frame=0;frame<=frames;frame++){
 const world=sample(clip,frame/frames*duration);
 for(const {node,source}of mapped){
  const delta=bind[source].clone().invert().multiply(world[source]);
  // Animation channels may contain export scale; rotation retargeting must
  // preserve Haris's own bone lengths and never import source translations.
  const rotation=new Quaternion();delta.decompose(undefined,rotation);
  // The reference rig has a wide, twisting stride. Keep its authored forward
  // swing, but use a sagittal hinge for Haris's hips, knees and elbows. Passing
  // the source abduction/twist through a different bind frame splays the legs
  // and corkscrews the shirt at the shoulder.
  if(/leg|arm/i.test(node.name)){
   const norm=Math.hypot(rotation.x,rotation.w);
   rotation.set(norm>1e-8?rotation.x/norm:0,0,0,norm>1e-8?rotation.w/norm:1);
  }
  let desired=neutral.get(node.name).multiply(Matrix.FromQuaternionToRef(rotation,new Matrix()));
  // Boxman's exaggerated torso pitch reads as a bow on Haris's longer body.
  // Keep the athletic lean while adapting it to the destination proportions.
  if(!/leg/i.test(node.name))desired=desired.multiply(Matrix.RotationX(-.18));
  // Keep the eyes toward the horizon instead of inheriting the source rig's
  // downward head pitch. Neutral world orientation compensates the torso lean
  // through the neck; it does not straighten the rest of the sprint.
  if(/^(head|neck)_/i.test(node.name))desired=neutral.get(node.name).clone();
  const local=desired.multiply(node.parent.computeWorldMatrix(true).clone().invert()),q=new Quaternion();local.decompose(undefined,q);q.normalize();
  node.rotationQuaternion=q;node.computeWorldMatrix(true);
  tracks[node.name].push(q.asArray().map(v=>+v.toFixed(7)));
 }
 const footY=['leg_lower.L','leg_lower.R'].map(name=>{const i=j.nodes.findIndex(n=>n.name===name);return Vector3.TransformCoordinates(new Vector3(0,.43573,0),world[i]).y;});
 clearance.push(Math.min(...footY));
}
const floor=Math.min(...clearance),range=Math.max(...clearance)-floor;
// Keep a brief, small airborne interval; the source has different proportions
// and stretch channels, which must not turn Haris's sprint into floating.
const data={source:'swift502/Sketchbook build/assets/boxman.glb · sprint · MIT',sourceSha256:createHash('sha256').update(b).digest('hex'),modelSha256:createHash('sha256').update(bytes).digest('hex'),duration,frames,tracks,clearance:clearance.map(y=>{const u=Math.max(0,((y-floor)/range-.6)/.4);return +(.085*u*u*(3-2*u)).toFixed(5);})};
fs.writeFileSync('src/haris-sprint.mjs','// Retargeted Sketchbook sprint. See art/motion/SKETCHBOOK-LICENSE.txt.\nexport default '+JSON.stringify(data)+';\n');
console.log(`Baked ${mapped.length} joints × ${frames+1} frames; ${fs.statSync('src/haris-sprint.mjs').size} bytes; source ${data.sourceSha256}`);
engine.dispose();
