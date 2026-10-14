import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { KarachiWorld } from './world';

export function mazda(w:KarachiWorld){
  const r=new TransformNode('Karachi Mazda W-11 minibus',w.scene);
  let art=w.materials.get('mazda painted panels');
  if(!art){
    const tex=new DynamicTexture('original Karachi truck art',{width:1024,height:256},w.scene,false),c=tex.getContext() as unknown as CanvasRenderingContext2D;
    c.fillStyle='#b12f33';c.fillRect(0,0,1024,256);
    for(let y=0;y<256;y+=32){c.fillStyle=['#efe8ce','#177f70','#edb82d','#e55788'][y/32%4];c.fillRect(0,y,1024,7);}
    for(let x=32;x<1024;x+=96){
      c.fillStyle='#075567';c.beginPath();c.ellipse(x,127,41,88,0,0,Math.PI*2);c.fill();c.strokeStyle='#f9d663';c.lineWidth=4;c.stroke();
      for(let j=0;j<8;j++){const a=j*Math.PI/4;c.fillStyle=j%2?'#f785a5':'#f8edca';c.beginPath();c.ellipse(x+Math.cos(a)*21,127+Math.sin(a)*31,10,21,-a,0,Math.PI*2);c.fill();}c.fillStyle='#edb829';c.beginPath();c.arc(x,127,10,0,Math.PI*2);c.fill();
      for(const y of [18,235]){c.fillStyle='#fff2c2';c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fill();}
    }
    tex.update();art=new StandardMaterial('mazda painted panels',w.scene);art.diffuseTexture=tex;art.emissiveColor=new Color3(.20,.20,.20);art.specularColor=new Color3(.15,.15,.15);w.materials.set('mazda painted panels',art);
  }
  const panel=(name:string,width:number,height:number,x:number,y:number,z:number,rotation=0)=>{const p=MeshBuilder.CreatePlane(name,{width,height},w.scene);p.position.set(x,y,z);p.rotation.y=rotation;p.material=art!;p.parent=r;return p;};
  const shape:Vector3[]=[];for(let corner=0;corner<4;corner++)for(let j=0;j<=6;j++){const a=corner*Math.PI/2+j*Math.PI/12;shape.push(new Vector3(Math.cos(a)*.23+(Math.cos(a)>=0?1.06:-1.06),Math.sin(a)*.23+(Math.sin(a)>=0?1.07:-1.07)+1.82,0));}
  shape.push(shape[0].clone());const shell=MeshBuilder.ExtrudeShape('rounded coachwork',{shape,path:[new Vector3(0,0,-3.05),new Vector3(0,0,3.05)],cap:Mesh.CAP_ALL,sideOrientation:Mesh.DOUBLESIDE},w.scene);shell.parent=r;shell.material=w.mat('#b74039');
  w.box('Mazda chassis',2.45,.25,6.3,0,.50,0,'dark',r);
  for(const side of [-1,1]){
    for(let z=-1.8;z<=2.5;z+=.96){w.box('chrome window frame',.045,.99,.87,side*1.302,2.43,z,'metal',r);w.box('passenger window',.053,.82,.73,side*1.31,2.43,z,'#244954',r);w.box('window divider',.062,.84,.035,side*1.32,2.43,z,'metal',r);}
    panel('floral side panels',5.85,.86,side*1.325,1.34,0,side<0?Math.PI/2:-Math.PI/2);
    panel('painted roof valance',5.8,.25,side*1.31,3.01,0,side<0?Math.PI/2:-Math.PI/2);
    for(const y of [.86,1.82,3.16])w.box('chrome body stripe',.055,.064,6.10,side*1.32,y,0,'metal',r);
    w.box('roof rack rail',.045,.045,5.8,side*1.15,3.63,0,'metal',r);
    for(let z=-2.8;z<3;z+=.42){w.cyl('roof rack spindle',.04,.40,side*1.15,3.43,z,'metal',r);w.ball('roof ornament',.105,side*1.15,3.66,z,z%1>.5?'yellow':'red',r);}
    for(const z of [-2.02,2.02]){const tire=w.cyl('Mazda tire',1.02,.23,side*1.23,.52,z,'#252829',r,undefined,24);tire.rotation.z=Math.PI/2;const hub=w.cyl('decorated wheel hub',.64,.25,side*1.25,.52,z,'#c8c6b8',r,undefined,24);hub.rotation.z=Math.PI/2;const center=w.cyl('red hub',.34,.27,side*1.26,.52,z,'red',r);center.rotation.z=Math.PI/2;}
    w.box('mirror arm',.38,.04,.05,side*1.46,2.52,-2.72,'metal',r);w.box('side mirror',.15,.30,.08,side*1.65,2.48,-2.74,'metal',r);
  }
  const windshield=w.box('sloped split windscreen',2.25,.92,.08,0,2.41,-3.12,'#234953',r);windshield.rotation.x=-.12;
  w.box('windscreen central pillar',.05,.96,.10,0,2.41,-3.17,'metal',r);
  panel('painted bonnet',2.47,.69,0,1.56,-3.10);panel('painted roof crown',2.51,.35,0,3.11,-3.10);panel('rear floral panel',2.50,1.0,0,1.52,3.10,Math.PI);
  w.box('rear glass',2.13,.85,.055,0,2.43,3.09,'glass',r);
  for(let i=0;i<4;i++)w.box('Mazda chrome grille',1.18,.035,.06,0,1.17+i*.09,-3.16,'metal',r);
  for(const side of [-1,1])for(let j=0;j<2;j++){const lamp=w.cyl('round headlight',.23,.10,side*(.82+j*.26),1.25,-3.18,'white',r,undefined,20);lamp.rotation.x=Math.PI/2;}
  for(let x=-1.2;x<1.3;x+=.14){w.cyl('bumper tassel',.03,.23,x,.39,-3.17,x<0?'red':'yellow',r);w.ball('roof bulb',.10,x,3.34,-3.06,x<0?'yellow':'green',r);}
  w.box('chrome bumper',2.70,.14,.22,0,.63,-3.20,'metal',r);
  const label=new DynamicTexture('W11 Mazda destination',{width:512,height:128},w.scene,false);label.drawText('W–11  •  MAZDA',null,86,'bold 56px Arial','#fff0b9','#125b50',true);const labelMat=new StandardMaterial('Mazda route board',w.scene);labelMat.diffuseTexture=label;labelMat.emissiveColor=new Color3(.2,.2,.2);const board=MeshBuilder.CreatePlane('W-11 destination',{width:2.05,height:.35},w.scene);board.parent=r;board.position.set(0,2.97,-3.13);board.material=labelMat;
  w.merge(r);return r;
}
