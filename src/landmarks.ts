import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { KarachiWorld } from './world';
import { arch, flatShape } from './sculpt';

export function mazar(w:KarachiWorld){
  const p=new TransformNode('Mazar-e-Quaid reference model',w.scene);
  for(let i=0;i<5;i++)w.box('broad marble terrace',27-i*1.7,.22,25-i*1.5,0,.11+i*.22,0,'#e5e2d7',p);
  const shell=w.box('tapered white marble mausoleum',14.4,10.8,14.4,0,6.5,0,'#e9e8e1',p);
  const pos=shell.getVerticesData(VertexBuffer.PositionKind)!;for(let i=0;i<pos.length;i+=3){const f=1-(pos[i+1]+5.4)/10.8*.12;pos[i]*=f;pos[i+2]*=f;}shell.setVerticesData(VertexBuffer.PositionKind,pos);
  for(let side=0;side<4;side++){
    const face=new TransformNode('marble facade',w.scene);face.parent=p;face.rotation.y=side*Math.PI/2;
    const opening=arch(w,face,4.35,7.7,0,1.1,-7.24,'#61453a');const verts=opening.getVerticesData(VertexBuffer.PositionKind)!;for(let i=0;i<verts.length;i+=3)verts[i+2]=verts[i+1]*.08;opening.setVerticesData(VertexBuffer.PositionKind,verts);
    for(let x=-1.85;x<=1.85;x+=.24)w.box('bronze entrance lattice',.038,3.5,.055,x,2.88,-7.265,'#9b7155',face);
    for(let y=1.5;y<4.7;y+=.25)w.box('bronze cross lattice',3.85,.027,.055,0,y,-7.27,'#9b7155',face);
    for(let y=1.4;y<11.8;y+=.48){const width=14.4-(y-1.1)*.16;w.box('marble horizontal joint',width,.017,.025,0,y,-7.21+(y-1.1)*.08,'#cbd0c9',face);}
    for(const x of [-1.1,0,1.1])arch(w,face,.67,1.04,x,11.5,-4.66,'#756655');
  }
  const dome=MeshBuilder.CreateSphere('smooth hemispherical marble dome',{diameter:9.8,segments:48,slice:.5},w.scene);dome.parent=p;dome.position.set(0,11.75,0);dome.material=w.mat('#f3f1e9');
  w.cyl('dome drum',9.7,.8,0,11.7,0,'#e8e7dd',p,undefined,48);
  w.box('garden approach pool',4,.06,15,0,.05,-21,'#568e94',p);for(const side of [-1,1])w.box('formal lawn',6,.08,16,side*7,.04,-21,'#638b61',p);
  w.merge(p);return p;
}

export function teenTalwar(w:KarachiWorld){
  const p=new TransformNode('Teen Talwar three parallel marble swords',w.scene);
  w.cyl('traffic island curb',12.5,.28,0,.14,0,'#d5c49e',p,undefined,48);w.cyl('island paving',11.9,.10,0,.32,0,'#777b72',p,undefined,48);
  for(let i=0;i<40;i++){const a=i*Math.PI/20;const curb=w.box('black yellow roundabout curb',.78,.28,.22,Math.sin(a)*6.2,.18,Math.cos(a)*6.2,i%2?'yellow':'black',p);curb.rotation.y=a;}
  const profile=[[.37,.43],[1.8,.43],[2.3,.50],[2.68,.85],[2.90,1.62],[3.25,1.82],[3.43,1.52],[3.68,1.01],[4.1,.65],[4.7,.51],[13.5,.51],[14.25,.02]];
  for(let i=0;i<3;i++){
    const s=new TransformNode('upright marble blade '+i,w.scene);s.parent=p;s.position.x=(i-1)*3.55;s.position.z=i===1?.45:0;
    // Extrude a connected, curved guard profile rather than a toy sword crossbar.
    const outline=[...profile.map(([y,x])=>new Vector3(-x,y,0)),...profile.slice().reverse().map(([y,x])=>new Vector3(x,y,0))];outline.push(outline[0].clone());
    const blade=MeshBuilder.ExtrudeShape('marble sword silhouette',{shape:outline,path:[new Vector3(0,0,-.28),new Vector3(0,0,.28)],cap:3,sideOrientation:2},w.scene);blade.material=w.mat('#e8e6dd');blade.parent=s;
    w.box('blade central marble ridge',.042,9.0,.027,0,8.9,-.295,'#bebdb5',s);
    const tex=new DynamicTexture('Quaid creed '+i,{width:512,height:128},w.scene,false);tex.drawText(['UNITY','FAITH','DISCIPLINE'][i],null,82,'bold 48px serif','#4d564a','#e8e6dd',true);const mat=new StandardMaterial('creed engraving '+i,w.scene);mat.diffuseTexture=tex;mat.emissiveColor=new Color3(.12,.12,.12);const text=MeshBuilder.CreatePlane('sword inscription',{width:2.8,height:.42},w.scene);text.parent=s;text.position.set(0,3.15,-.30);text.material=mat;
  }
  for(const side of [-1,1]){w.box('traffic signal pole',.13,5.6,.13,side*6.4,2.8,-1,'dark',p);w.box('traffic signal',.46,1.35,.35,side*6.4,5.3,-1,'dark',p);for(let i=0;i<3;i++)w.ball('signal lamp',.23,side*6.4,5.71-i*.38,-1.20,['red','yellow','green'][i],p);}
  w.merge(p);return p;
}

export function empressMarket(w:KarachiWorld,clock:(p:TransformNode,x:number,y:number,z:number,size:number)=>unknown){
  const p=new TransformNode('Empress Market referenced sandstone facade',w.scene),stone='#bb9466',trim='#d2af7d',roof='#8f5141';
  w.box('market platform',34,.3,13,0,.15,0,'sand',p);
  for(const side of [-1,1]){
    w.box('long market arcade',12,4.7,8,side*8,2.5,0,stone,p);
    for(let j=0;j<6;j++){const x=side*8+(j-2.5)*1.8;arch(w,p,1.17,3.05,x,.8,-4.06,'#49645b');arch(w,p,1.38,3.3,x,.7,-4.04,'#816646');arch(w,p,1.12,2.96,x,.83,-4.08,'#3e6056');w.box('arcade pilaster',.17,3.9,.2,x+.76,2.6,-4.10,trim,p);}
    const roofMesh=w.cyl('red pitched arcade roof',10.7,12.4,side*8,5.5,0,roof,p,undefined,4);roofMesh.rotation.z=Math.PI/2;roofMesh.rotation.x=Math.PI/4;roofMesh.scaling.x=.19;
    w.box('end pavilion',3.8,6.7,8.2,side*14.1,3.5,0,stone,p);for(const x of [-.98,0,.98])arch(w,p,.73,3.8,side*14.1+x,.6,-4.14,'#426158');
    const hip=w.cyl('pavilion hip roof',5.8,2.6,side*14.1,8.03,0,roof,p,.8,4);hip.rotation.y=Math.PI/4;hip.scaling.z=1.7;
  }
  w.box('central clock tower',4.35,13.7,4.6,0,7.0,-1.7,stone,p);
  arch(w,p,2.54,4.8,0,.3,-4.04,'#cbaa75');arch(w,p,2.05,4.36,0,.3,-4.06,'#404b43');
  for(const x of [-1.12,0,1.12]){arch(w,p,.8,2.5,x,6.15,-4.06,'#624e3d');arch(w,p,.55,2.20,x,6.3,-4.08,'#314945');}
  for(const y of [5.65,9.15,11.95,14.0])w.box('carved tower cornice',4.8,.28,5.02,0,y,-1.7,trim,p);
  for(const y of [9.45,13.35])for(let x=-1.75;x<2;x+=.48)arch(w,p,.23,.47,x,y,-4.09,'#856b4b');
  for(let side=0;side<4;side++){const f=new TransformNode('four faced clock',w.scene);f.parent=p;f.position.z=-1.7;f.rotation.y=side*Math.PI/2;clock(f,0,11.0,-2.35,1.5);}
  // Steep red hipped roof with a short flat crown, as seen in location photographs.
  const hip=w.cyl('steep hipped clock tower roof',6.55,5.0,0,16.65,-1.7,roof,p,1.55,4);hip.rotation.y=Math.PI/4;
  for(const side of [-1,1]){arch(w,p,.58,1.2,side*.92,15.05,-3.48,'#343f37');w.cyl('roof flag pole',.045,2.0,side*.43,20.0,-1.7,'dark',p);}
  for(let x=-15.5;x<=15.5;x+=.55)w.box('stone dentil course',.19,.21,.22,x,4.73,-4.14,trim,p);
  w.merge(p);return p;
}

export function merewether(w:KarachiWorld,clock:(p:TransformNode,x:number,y:number,z:number,size:number)=>unknown){
  const p=new TransformNode('Merewether Tower Gothic reference model',w.scene),stone='#bea078',light='#d3b992',dark='#776447';
  for(let i=0;i<4;i++)w.box('square foundation steps',11-i*.9,.23,11-i*.9,0,.115+i*.23,0,stone,p);
  w.box('lower carved pavilion',6.6,6.3,6.6,0,4.05,0,stone,p);w.box('narrow upper tower',4.2,6.9,4.2,0,11.4,0,stone,p);
  for(const [y,size] of [[1,7],[5.9,7],[7,7.4],[9,5.2],[12.7,4.8],[15,4.8]])w.box('Gothic cornice',size,.25,size,0,y,0,light,p);
  for(let side=0;side<4;side++){
    const f=new TransformNode('carved tower elevation',w.scene);f.parent=p;f.rotation.y=side*Math.PI/2;
    arch(w,f,3.5,4.0,0,1.0,-3.34,dark);arch(w,f,2.75,3.64,0,1.0,-3.36,'#38453b');
    const gable=flatShape(w,'large triangular tracery gable',[[-3.45,6.1],[3.45,6.1],[0,10.15]],stone,f);gable.position.z=-3.42;
    for(const side2 of [-1,1]){const line=MeshBuilder.CreateTube('gable stone moulding',{path:[new Vector3(side2*3.45,6.1,-3.48),new Vector3(0,10.15,-3.48)],radius:.12,tessellation:8},w.scene);line.parent=f;line.material=w.mat(light);}
    const rose=MeshBuilder.CreateTorus('rose window stone ring',{diameter:2.43,thickness:.11,tessellation:32},w.scene);rose.parent=f;rose.position.set(0,7.65,-3.49);rose.rotation.x=Math.PI/2;rose.material=w.mat(light);
    for(let j=0;j<6;j++){const a=j*Math.PI/3;const line=MeshBuilder.CreateTube('radial Gothic tracery',{path:[new Vector3(0,7.65,-3.5),new Vector3(Math.sin(a)*1.15,7.65+Math.cos(a)*1.15,-3.5)],radius:.07,tessellation:6},w.scene);line.parent=f;line.material=w.mat(light);}
    for(const x of [-.84,.84]){arch(w,f,1.22,2.44,x,9.65,-2.14,dark);arch(w,f,.88,2.18,x,9.7,-2.16,'#3e4840');for(let y=9.9;y<11.4;y+=.28)w.box('belfry louvre',.84,.065,.08,x,y,-2.20,light,f);}
    const clockGable=flatShape(w,'pointed clock pediment',[[-2.1,12.5],[2.1,12.5],[2.1,14.3],[0,16.25],[-2.1,14.3]],stone,f);clockGable.position.z=-2.15;clock(f,0,14.05,-2.18,1.70);
    for(let x=-2.8;x<=2.8;x+=.7)arch(w,f,.44,.77,x,5.06,-3.36,light);
    for(const x of [-3.2,3.2]){w.box('corner buttress',.47,7.1,.62,x,4.40,-3.2,light,f);w.cyl('Gothic corner pinnacle',.57,2,x,8.95,-3.2,stone,f,0,4);}
  }
  w.cyl('slender octagonal spire',3.6,6.5,0,18.1,0,stone,p,0,8);w.ball('spire finial',.32,0,21.50,0,dark,p);
  for(const x of [-2,2])for(const z of [-2,2])w.cyl('clock stage pinnacles',.36,1.8,x,15.5,z,light,p,0,4);
  w.merge(p);return p;
}
