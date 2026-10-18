import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { KarachiWorld } from './world';

export function batchScenery(parent:TransformNode){
 const groups=new Map<NonNullable<Mesh['material']>,Mesh[]>();
 for(const mesh of parent.getChildMeshes())if(mesh instanceof Mesh&&mesh.material){const group=groups.get(mesh.material)||[];group.push(mesh);groups.set(mesh.material,group);}
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;
  // Leaf tint is per vertex. Give uncoloured geometry neutral tint before merging.
  if(meshes.some(m=>m.isVerticesDataPresent('color')))for(const mesh of meshes)if(!mesh.isVerticesDataPresent('color'))mesh.setVerticesData('color',new Array(mesh.getTotalVertices()*4).fill(1));
  const merged=Mesh.MergeMeshes(meshes,true,true,undefined,false,false);if(merged){merged.setParent(parent);merged.isPickable=false;}
 }
}

// Opaque leaf geometry: no downloaded textures, alpha sorting, or per-tree animation.
// Reuse prototypes, then let the existing section merger batch by material.
const palette={leaf:'#386653',tip:'#69945c',bark:'#836148',wood:'#b48151',iron:'#294d50',stone:'#d7c9ac',cream:'#f2dfae'};
const templates=new WeakMap<KarachiWorld,Map<string,TransformNode>>();
function place(w:KarachiWorld,key:string,parent:TransformNode,x:number,z:number,scale:number,yaw:number,build:(p:TransformNode)=>void){
 let cache=templates.get(w);if(!cache){cache=new Map();templates.set(w,cache);}
 let source=cache.get(key);
 if(!source){source=new TransformNode(key+' prototype',w.scene);build(source);w.merge(source);source.getChildMeshes().forEach(m=>m.isPickable=false);source.setEnabled(false);cache.set(key,source);}
 const p=source.clone(key,parent)!;p.setEnabled(true);p.position.set(x,0,z);p.scaling.setAll(scale);p.rotation.y=yaw;return p;
}
function geometry(w:KarachiWorld,name:string,positions:number[],indices:number[],parent:TransformNode,color:string,colors?:number[]){
 const faces=new Set<string>(),unique:number[]=[];
 for(let i=0;i<indices.length;i+=3){const triangle=indices.slice(i,i+3),key=triangle.slice().sort((a,b)=>a-b).join(':');if(!faces.has(key)){faces.add(key);unique.push(...triangle);}}
 indices=unique;
 const data=new VertexData();data.positions=positions;data.indices=indices;data.uvs=new Array(positions.length/3*2).fill(0);const normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;if(colors)data.colors=colors;
 const m=new Mesh(name,w.scene);data.applyToMesh(m);m.material=w.mat(color);m.material.unfreeze();m.material.backFaceCulling=false;m.material.freeze();m.parent=parent;m.isPickable=false;return m;
}
function tube(w:KarachiWorld,name:string,path:Vector3[],radius:number,color:string,parent:TransformNode,tessellation=6){
 const m=MeshBuilder.CreateTube(name,{path,radius,tessellation,cap:3},w.scene);m.material=w.mat(color);m.parent=parent;return m;
}
function accent(w:KarachiWorld,name:string,diameter:number,x:number,y:number,z:number,color:string,parent:TransformNode){
 const m=MeshBuilder.CreateIcoSphere(name,{radius:diameter/2,subdivisions:1,flat:true},w.scene);m.position.set(x,y,z);m.material=w.mat(color);m.parent=parent;return m;
}
function contact(w:KarachiWorld,p:TransformNode,width:number,depth:number){
 const shadow=MeshBuilder.CreateDisc('soft contact shade',{radius:1,tessellation:20},w.scene);shadow.rotation.x=Math.PI/2;shadow.scaling.set(width,depth,1);shadow.position.y=.024;shadow.parent=p;
 const mat=w.mat('scenery contact shade','#425d4c');mat.unfreeze();mat.alpha=.13;mat.specularColor.set(0,0,0);mat.freeze();shadow.material=mat;shadow.isPickable=false;
}
// A folded, pointed leaflet catches sunlight along its central ridge.
function leaf(positions:number[],indices:number[],colors:number[],base:Vector3,tip:Vector3,width:number,tint:number){
 const forward=tip.subtract(base),across=new Vector3(-forward.z,0,forward.x).normalize().scale(width),mid=base.add(forward.scale(.46)),n=positions.length/3;
 const verts=[base,mid.add(across),tip,mid.subtract(across),mid.add(new Vector3(0,width*.4,0))];
 for(let i=0;i<verts.length;i++){positions.push(...verts[i].asArray());const t=tint*(i===4?1.15:1);colors.push(t,t,t,1);}
 for(const [a,b,c]of [[0,1,4],[1,2,4],[2,3,4],[3,0,4]])indices.push(n+a,n+b,n+c,n+c,n+b,n+a);
}
export function coastalPalm(w:KarachiWorld,parent:TransformNode,x:number,z:number,scale=1,variant=0){
 return place(w,'feather palm '+variant%2,parent,x,z,scale,variant*.73,p=>{
  contact(w,p,1.35,.85);
  const lean=variant%2?.32:-.24,path=Array.from({length:10},(_,i)=>new Vector3(lean*(i/9)**2,7.1*i/9,.13*Math.sin(i/9*2)));
  const trunk=MeshBuilder.CreateTube('tapered ringed palm trunk',{path,radiusFunction:i=>.24-i*.012,tessellation:9,cap:3},w.scene);trunk.material=w.mat(palette.bark);trunk.parent=p;
  for(let i=1;i<13;i++){const y=i*.51;const collar=w.cyl('palm leaf scar',.49-y*.025,.055,lean*(y/7.1)**2,y,.13*Math.sin(y/7.1*2),'#9e8056',p,undefined,9);collar.rotation.z=-lean*.12;}
  const crown=path.at(-1)!;w.cyl('palm crown shaft',.39,.75,crown.x,7.08,crown.z,palette.leaf,p,.26,10);
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];
  for(let f=0;f<10;f++){
   const angle=f*Math.PI*2/10+.17*(variant%2),length=2.8+(f%3)*.28,forward=new Vector3(Math.cos(angle),0,Math.sin(angle)),across=new Vector3(-Math.sin(angle),0,Math.cos(angle));
   const point=(t:number)=>crown.add(forward.scale(length*t)).add(new Vector3(0,.25+1.45*Math.sin(t*Math.PI*.83)-1.25*t,0));
   tube(w,'curved palm rachis',Array.from({length:5},(_,i)=>point(i/4)),.026,palette.tip,p,4);
   for(let j=1;j<=9;j++)for(const side of [-1,1]){
    const t=j/10,b=point(t),spread=.68*Math.sin(t*Math.PI)*(.9+(f%2)*.15),tip=b.add(across.scale(side*spread)).add(forward.scale(.35)).add(new Vector3(0,-.14-t*.22,0));
    leaf(positions,indices,colors,b,tip,.10*(1-t*.48),.82+(f%3)*.09);
   }
  }
  geometry(w,'feathered palm leaflets',positions,indices,p,palette.leaf,colors);
  for(let i=0;i<3;i++)accent(w,'coconut',.29,crown.x+Math.sin(i*2.1)*.22,6.85,crown.z+Math.cos(i*2.1)*.22,'#79533a',p);
 });
}
export function neemTree(w:KarachiWorld,parent:TransformNode,x:number,z:number,scale=1){
 return place(w,'neem shade tree',parent,x,z,scale,x*.14,p=>{
  contact(w,p,2.25,1.5);
  tube(w,'branching neem trunk',[new Vector3(0,0,0),new Vector3(-.12,1.5,0),new Vector3(.08,3,.1),new Vector3(-.16,4.8,.1)],.17,palette.bark,p);
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];
  for(let b=0;b<9;b++){
   const a=b*2.399,end=new Vector3(Math.cos(a)*(1.3+b%3*.35),3.8+b%3*.55,Math.sin(a)*(1.3+b%3*.35));
   tube(w,'neem spreading branch',[new Vector3(0,2.1+b%3*.35,0),end.scale(.67).add(new Vector3(0,.7,0)),end],.055,palette.bark,p);
   for(let k=0;k<24;k++){
    const t=k*2.399,r=.35+(k%5)*.16,base=end.add(new Vector3(Math.cos(t)*r,Math.sin(k*1.7)*.48,Math.sin(t)*r));
    for(const side of [-1,1])leaf(positions,indices,colors,base,base.add(new Vector3(Math.cos(t+.7)*.50,side*.18,Math.sin(t+.7)*.50)),.16,.80+(k%4)*.08);
   }
  }
  geometry(w,'airy neem canopy',positions,indices,p,palette.leaf,colors);
 });
}
export function promenadeBench(w:KarachiWorld,parent:TransformNode,x:number,z:number,yaw=0){
 return place(w,'teak and iron bench',parent,x,z,1,yaw,p=>{
  contact(w,p,1.3,.55);
  for(let i=0;i<5;i++)w.box('rounded teak seat slat',2.25,.095,.105,0,.73,-.25+i*.125,palette.wood,p);
  for(let i=0;i<4;i++){const slat=w.box('teak backrest slat',2.25,.115,.075,0,.98+i*.16,.32+(i*.025),palette.wood,p);slat.rotation.x=-.15;}
  for(const side of [-1,1]){
   const x=side*.88;
   tube(w,'cast iron bench frame',[new Vector3(x,.12,-.34),new Vector3(x,.52,-.21),new Vector3(x,.68,.10),new Vector3(x,.87,.34),new Vector3(x,1.55,.47)],.055,palette.iron,p);
   tube(w,'bench rear leg',[new Vector3(x,.70,.24),new Vector3(x,.15,.52)],.055,palette.iron,p);
   tube(w,'curved bench armrest',[new Vector3(x,.73,-.25),new Vector3(x,1.05,-.24),new Vector3(x,1.13,.08),new Vector3(x,1.06,.35)],.045,palette.iron,p);
   for(const zz of [-.34,.52])w.box('bench foot plate',.25,.06,.2,x,.09,zz,palette.iron,p);
   for(let i=0;i<4;i++)accent(w,'backrest brass fixing',.035,x,1+i*.16,.27+i*.025,palette.cream,p);
  }
 });
}
export function streetLamp(w:KarachiWorld,parent:TransformNode,x:number,z:number,side=1){
 return place(w,'promenade lantern',parent,x,z,1,side<0?Math.PI:0,p=>{
  w.cyl('lamp stone footing',.48,.23,0,.15,0,palette.stone,p,undefined,10);
  w.cyl('tapered iron lamp',.16,5.8,0,3.05,0,palette.iron,p,.095,10);
  for(const y of [.4,.72,4.8])w.cyl('lamp collar',.23,.10,0,y,0,palette.iron,p,undefined,10);
  tube(w,'swept lamp arm',[new Vector3(0,5.7,0),new Vector3(-.22,6.12,0),new Vector3(-.67,6.18,0),new Vector3(-.9,5.98,0)],.06,palette.iron,p);
  w.cyl('lantern canopy',.62,.18,-.90,5.92,0,palette.iron,p,.18,8);
  w.cyl('warm lantern diffuser',.32,.40,-.9,5.66,0,palette.cream,p,.40,8);
  w.cyl('lantern base',.43,.09,-.9,5.41,0,palette.iron,p,undefined,8);
  for(const s of [-1,1])w.box('lantern cage',.035,.43,.035,-.9+s*.16,5.65,-.15,palette.iron,p);
 });
}
export function planter(w:KarachiWorld,parent:TransformNode,x:number,z:number,flower=false){
 return place(w,flower?'bougainvillea planter':'stone aloe planter',parent,x,z,1,x*.2,p=>{
  contact(w,p,.75,.65);w.cyl('tapered stone planter',1.05,.55,0,.3,0,palette.stone,p,1.2,8);w.cyl('planter lip',1.25,.10,0,.58,0,palette.cream,p,undefined,8);w.cyl('planter earth',1.06,.025,0,.64,0,palette.bark,p,undefined,10);
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];
  for(let i=0;i<22;i++){const a=i*2.399,r=.35+(i%3)*.12,b=new Vector3(0,.65,0),t=new Vector3(Math.cos(a)*r,.85+(i%4)*.12,Math.sin(a)*r);leaf(positions,indices,colors,b,t,.105,.85+(i%3)*.07);}
  geometry(w,'pointed planter foliage',positions,indices,p,palette.leaf,colors);
  if(flower)for(let i=0;i<12;i++){const a=i*2.399;const petal=accent(w,'bougainvillea paper blossoms',.17,Math.cos(a)*.37,1.03+(i%3)*.10,Math.sin(a)*.37,'#cc6480',p);petal.scaling.set(1,.30,1);petal.rotation.x=i*.4;}
 });
}
export function beachParasol(w:KarachiWorld,parent:TransformNode,x:number,z:number){
 return place(w,'striped beach parasol',parent,x,z,1,0,p=>{
  w.cyl('parasol timber pole',.075,2.75,0,1.38,0,palette.wood,p,undefined,8);
  const panels=10;
  for(let i=0;i<panels;i++){
   const a=i*Math.PI*2/panels,b=(i+1)*Math.PI*2/panels,mid=(a+b)/2,r=1.65;
   const points=[0,3.0,0,Math.cos(a)*r,2.55,Math.sin(a)*r,Math.cos(mid)*r,2.47,Math.sin(mid)*r,Math.cos(b)*r,2.55,Math.sin(b)*r];
   geometry(w,'stitched parasol panel',points,[0,1,2,0,2,3,2,1,0,3,2,0],p,i%2?palette.cream:'#bd6850');
   tube(w,'parasol rib',[new Vector3(0,2.97,0),new Vector3(Math.cos(a)*r,2.54,Math.sin(a)*r)],.018,palette.wood,p,3);
  }
  accent(w,'parasol finial',.12,0,3.03,0,palette.wood,p);
 });
}
export function seagull(w:KarachiWorld,index:number){
 const p=new TransformNode('Arabian Sea gull '+index,w.scene);
 const body=w.ball('gull streamlined body',.29,0,0,0,'#e8e8d9',p);body.scaling.set(.72,.8,1.8);
 w.ball('gull head',.19,0,.09,.27,'#f2eee0',p);
 const beak=w.cyl('gull tapered beak',.075,.19,0,.065,.43,'#c89c4f',p,0,6);beak.rotation.x=Math.PI/2;
 for(const s of [-1,1])accent(w,'gull eye',.027,s*.073,.12,.31,palette.iron,p);
 geometry(w,'forked gull tail',[-.08,0,-.23,-.20,.01,-.53,0,.035,-.42,.20,.01,-.53,.08,0,-.23],[0,1,2,2,3,4,2,1,0,4,3,2],p,'#e8e8d9');
 w.merge(p);
 const wings:TransformNode[]=[];
 for(const side of [-1,1]){
  const pivot=new TransformNode('gull wing pivot',w.scene);pivot.parent=p;pivot.position.x=side*.07;pivot.metadata={side};wings.push(pivot);
  const v=[0,0,.09,side*.43,.04,.13,side*.91,-.07,-.20,side*.68,-.09,-.28,side*.34,-.03,-.15,0,0,-.12];
  geometry(w,'swept feathered gull wing',v,[0,1,4,1,2,3,1,3,4,0,4,5,4,1,0,3,2,1,4,3,1,5,4,0],pivot,'#e8e8d9');
  geometry(w,'dark gull flight feathers',[side*.69,-.058,-.06,side*.91,-.069,-.20,side*.68,-.089,-.28,side*.55,-.06,-.20],[0,1,2,0,2,3,2,1,0,3,2,0],pivot,'#385258');
  w.merge(pivot);
 }
 p.metadata={wings};p.getChildMeshes().forEach(m=>m.isPickable=false);return p;
}
export function animateGull(p:TransformNode,time:number,index:number,coast:boolean){
 const phase=time*.19+index*.8,x=Math.sin(phase)*(coast?23:17),z=24+index*15+Math.cos(phase)*5;
 p.position.set(x,12+index*.85+Math.sin(time*.7+index)*.28,z);p.rotation.y=Math.cos(phase)*.55;p.rotation.z=Math.sin(phase)*-.12;
 // Brief flaps between long glides; wing roots pivot, rather than rotating boxes at their centres.
 const beat=time*3+index,flap=Math.max(0,Math.sin(time*.55+index)-.3)*Math.sin(beat)*.55;
 for(const wing of p.metadata.wings as TransformNode[])wing.rotation.z=wing.metadata.side*(.12+flap);
}
export function roadBarricade(w:KarachiWorld,root:TransformNode){
 for(const x of [-1,1]){
  w.box('rubber barricade foot',.42,.14,.48,x,.09,0,palette.iron,root);
  const front=w.box('folding barricade leg',.12,.85,.10,x,.48,-.10,palette.iron,root);front.rotation.x=-.18;
  const back=w.box('folding barricade rear leg',.12,.85,.10,x,.48,.10,palette.iron,root);back.rotation.x=.18;
 }
 w.box('barricade outer frame',2.55,.72,.30,0,.97,0,palette.iron,root);
 w.box('reflective hazard face',2.45,.59,.32,0,.97,0,'#e7b94f',root);
 // Clip every diagonal to the panel: no stripes sticking outside its collision silhouette.
 const min=-1.225,max=1.225,low=.675,high=1.265;
 for(let x=-1.7;x<1.5;x+=.57){
  const poly=[[x,low],[x+.23,low],[x+.23+.28,high],[x+.28,high]];
  const clipped=poly.map(([xx,yy])=>[Math.max(min,Math.min(max,xx)),yy]);
  geometry(w,'inset hazard chevron',clipped.flatMap(([xx,yy])=>[xx,yy,-.166]),[0,2,1,0,3,2],root,palette.iron);
 }
 for(const x of [-1.1,1.1]){accent(w,'reflector fixing',.065,x,1.17,-.18,palette.cream,root);w.cyl('amber caution beacon',.18,.16,x,1.42,0,'#e7b94f',root,undefined,10);w.cyl('beacon cap',.20,.05,x,1.51,0,palette.iron,root,undefined,10);}
}
export function citySkyline(w:KarachiWorld,parent:TransformNode){
 for(let i=0;i<24;i++){
  const side=i%2?1:-1,x=side*(16+(i%6)*7.5),z=135+(i%4)*14,height=10+(i*7%17),width=4.1+(i%3)*1.3;
  const color=['#a8b4a4','#c0b49e','#94aaa5','#cabda5'][i%4];
  w.box('distant Karachi apartment block',width,height,6.8,x,height/2,z,color,parent);
  w.box('skyline roof ledge',width+.3,.3,7.1,x,height+.12,z,palette.cream,parent);
  for(let y=3;y<height-1;y+=2.8){
   w.box('distant recessed window band',width-.6,.85,.06,x,y,z-3.43,'#678387',parent);
   for(let k=-1;k<=1;k++)w.box('skyline window mullion',.12,.95,.09,x+k*(width/4),y,z-3.48,color,parent);
  }
  if(i%3===0){
   w.box('rooftop service room',width*.55,1.6,3,x,height+.8,z+1,'#9f9f8b',parent);
   w.cyl('distant rooftop water tank',1.1,.9,x,height+2.05,z+1,palette.iron,parent,undefined,8);
  }
  if(i%5===0){
   w.cyl('skyline antenna',.065,3.3,x,height+1.7,z,palette.iron,parent,undefined,5);
   w.box('antenna aerial',1.6,.04,.04,x,height+2.9,z,palette.iron,parent);
  }
 }
}
