import { Bone } from '@babylonjs/core/Bones/bone.js';
import { Skeleton } from '@babylonjs/core/Bones/skeleton.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const median=a=>{a.sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:0;};

/** Fit an upright bind pose before animating a scan that already has a stride. */
export function fitScan(positions){
 const points=Float32Array.from(positions);
 let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity;
 for(let i=0;i<points.length;i+=3){minY=Math.min(minY,points[i+1]);maxY=Math.max(maxY,points[i+1]);minX=Math.min(minX,points[i]);maxX=Math.max(maxX,points[i]);}
 const height=maxY-minY,width=maxX-minX,cx=(minX+maxX)/2;
 const bands=[.10,.25,.45],samples=bands.map(()=>[[],[]]);
 for(let i=0;i<points.length;i+=3){
  const y=(points[i+1]-minY)/height,side=points[i]>cx?0:1;
  // Stay inside each leg: dangling hands and the outside of the tunic aren't knees.
  if(Math.abs(points[i]-cx)>width*.33)continue;
  bands.forEach((band,b)=>{if(Math.abs(y-band)<.025)samples[b][side].push(points[i+2]);});
 }
 const z=samples.map(s=>s.map(median)),hipZ=(z[2][0]+z[2][1])/2;
 for(let i=0;i<points.length;i+=3){
  const y=(points[i+1]-minY)/height;if(y>=.45)continue;
  const side=points[i]>cx?0:1;
  const center=y<.10?z[0][side]:y<.25?z[0][side]+(z[1][side]-z[0][side])*smooth(.10,.25,y):z[1][side]+(hipZ-z[1][side])*smooth(.25,.45,y);
  points[i+2]-=(center-hipZ)*(1-smooth(.32,.45,y));
 }
 return {points,minY,height,width,cx,hipZ};
}

/** A linked humanoid skeleton, so scans use the same joint driver as Haris.
 * @param {import('@babylonjs/core/Meshes/mesh.js').Mesh} mesh
 * @param {{armMask?: Uint8Array|null, longShirt?: boolean}} [options]
 */
export function createScanRig(mesh,{armMask=null,longShirt=false}={}){
 const input=mesh.getVerticesData(VertexBuffer.PositionKind);
 if(!input)throw new Error('Character has no positions');
 if(longShirt&&(!armMask||armMask.length!==input.length/3))throw new Error('Invalid character arm weights');
 const fit=fitScan(input),{points,minY,height:h,width,cx,hipZ:z}=fit;
 mesh.setVerticesData(VertexBuffer.PositionKind,points);
 const normals=mesh.getVerticesData(VertexBuffer.NormalKind),triangles=mesh.getIndices();
 if(normals&&triangles){VertexData.ComputeNormals(points,triangles,normals);mesh.setVerticesData(VertexBuffer.NormalKind,normals);}
 const skeleton=new Skeleton(mesh.name+' humanoid run rig',mesh.name+' run',mesh.getScene()),nodes=[],bones=[];
 const positions=[];
 const torsoLevels=[];
 const add=(name,parent,x,y,z)=>{
  const node=new TransformNode(name,mesh.getScene()),position=new Vector3(x,minY+y*h,z);
  const translation=parent<0?position:position.subtract(positions[parent]);
  node.parent=parent<0?mesh.parent:nodes[parent];node.position.copyFrom(translation);node.rotationQuaternion=Quaternion.Identity();
  const bone=new Bone(name,skeleton,parent<0?null:bones[parent],Matrix.Translation(translation.x,translation.y,translation.z));
  bone.linkTransformNode(node);positions.push(position);nodes.push(node);bones.push(bone);return bones.length-1;
 };
 const hips=add('hips',-1,cx,.48,z),spine=add('spine',hips,cx,.55,z),spine1=add('spine1',spine,cx,.66,z),spine2=add('spine2',spine1,cx,.75,z);
 const neck=add('neck',spine2,cx,.85,z),head=add('head',neck,cx,.89,z);
 torsoLevels.push([.48,hips],[.58,spine],[.70,spine1],[.80,spine2],[.865,neck],[.91,head]);
 const limbs=[];
 for(const sign of [1,-1]){
  const side=sign>0?'left':'right';
  const hip=add(side+'upleg',hips,cx+sign*width*.17,.47,z),knee=add(side+'leg',hip,cx+sign*width*.17,.245,z),foot=add(side+'foot',knee,cx+sign*width*.17,.065,z);
  const arm=add(side+'arm',spine2,cx+sign*width*.29,.79,z),elbow=add(side+'forearm',arm,cx+sign*width*.37,.62,z),hand=add(side+'hand',elbow,cx+sign*width*.40,.44,z);
  limbs.push({hip,knee,foot,arm,elbow,hand});
 }
 const indices=new Float32Array(points.length/3*4),weights=new Float32Array(indices.length);
 for(let v=0;v<points.length/3;v++){
  const x=points[v*3]-cx,y=(points[v*3+1]-minY)/h,limb=limbs[x>=0?0:1],influences=[];
  let arm=smooth(width*.26,width*.35,Math.abs(x))*(1-smooth(.77,.84,y))*smooth(.33,.37,y);
  // Topology-smoothed arm weights keep loose kameez fabric with the torso
  // while sleeves and whole hands follow the arm, including dark skin texels.
  if(longShirt&&armMask)arm=armMask[v]/255;
  if(arm>.0001){const elbow=1-smooth(.56,.67,y),hand=1-smooth(.40,.46,y);influences.push([limb.arm,arm*(1-elbow)],[limb.elbow,arm*elbow*(1-hand)],[limb.hand,arm*elbow*hand]);}
  const body=1-arm,leg=body*(1-smooth(longShirt?.29:.37,longShirt?.36:.48,y));
  if(leg>.0001){const calf=1-smooth(.20,.30,y),foot=1-smooth(.045,.105,y);influences.push([limb.hip,leg*(1-calf)],[limb.knee,leg*calf*(1-foot)],[limb.foot,leg*calf*foot]);}
  const torso=body-leg;
  if(torso>.0001){
   const levels=torsoLevels;
   let a=0;while(a<levels.length-2&&y>levels[a+1][0])a++;
   const t=smooth(levels[a][0],levels[a+1][0],y);influences.push([levels[a][1],torso*(1-t)],[levels[a+1][1],torso*t]);
  }
  const top=influences.filter(([,w])=>w>.00001).sort((a,b)=>b[1]-a[1]).slice(0,4),total=top.reduce((sum,[,w])=>sum+w,0);
  for(let j=0;j<top.length;j++){indices[v*4+j]=top[j][0];weights[v*4+j]=top[j][1]/total;}
 }
 mesh.setVerticesData(VertexBuffer.MatricesIndicesKind,indices,false,4);mesh.setVerticesData(VertexBuffer.MatricesWeightsKind,weights,false,4);mesh.numBoneInfluencers=4;mesh.skeleton=skeleton;skeleton.prepare(true);
 return {skeleton,fit,nodes};
}
