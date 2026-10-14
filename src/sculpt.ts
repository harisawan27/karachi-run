import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { KarachiWorld } from './world';

// Elliptical cross sections give clothing a continuous shoulder/waist/hem silhouette.
export function sculpt(w:KarachiWorld,name:string,profile:number[][],color:string,parent:TransformNode,segments=32){
  const positions:number[]=[],indices:number[]=[],normals:number[]=[];
  for(const [y,rx,rz,cx=0,cz=0] of profile)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;positions.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);}
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,c,b,b,c,d);}
  for(const end of [0,profile.length-1]){const [y,,,cx=0,cz=0]=profile[end],center=positions.length/3;positions.push(cx,y,cz);for(let i=0;i<segments;i++){const a=end*segments+i,b=end*segments+(i+1)%segments;indices.push(...(end===0?[center,a,b]:[center,b,a]));}}
  for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t;}
  VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=new Array(positions.length/3*2).fill(0);const mesh=new Mesh(name,w.scene);data.applyToMesh(mesh);mesh.parent=parent;mesh.material=w.mat(color);return mesh;
}

export function flatShape(w:KarachiWorld,name:string,points:number[][],color:string,parent:TransformNode){
  const positions=points.flatMap(([x,y])=>[x,y,0]),indices:number[]=[],normals:number[]=[];
  for(let i=1;i<points.length-1;i++)indices.push(0,i+1,i);
  for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t;}
  VertexData.ComputeNormals(positions,indices,normals);const d=new VertexData();d.positions=positions;d.indices=indices;d.normals=normals;d.uvs=new Array(positions.length/3*2).fill(0);const m=new Mesh(name,w.scene);d.applyToMesh(m);m.material=w.mat(color);m.material.unfreeze();m.material.backFaceCulling=false;m.material.freeze();m.parent=parent;return m;
}

export function arch(w:KarachiWorld,parent:TransformNode,width:number,height:number,x:number,y:number,z:number,color:string){
  const points:number[][]=[[-width/2,0],[width/2,0],[width/2,height*.48]];
  for(let i=1;i<=16;i++){const t=i/16;points.push([width/2*(1-t*t),height*(.48+.52*t)]);}
  for(let i=15;i>=0;i--){const t=i/16;points.push([-width/2*(1-t*t),height*(.48+.52*t)]);}
  const m=flatShape(w,'pointed arch',points,color,parent);m.position.set(x,y,z);return m;
}
