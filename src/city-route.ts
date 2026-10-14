import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { KarachiWorld } from './world';
import { ROUTES, ROUTE_LENGTH, routeAt, environmentAt } from './routes.mjs';
import { teenTalwar, empressMarket, merewether } from './landmarks';

export class CityRoute {
  variants:{open:TransformNode;coast:TransformNode}[]=[];
  landmarks:{node:TransformNode;at:number;x:number}[]=[];
  birds:TransformNode[]=[];walkers:TransformNode[]=[];waves:TransformNode[]=[];sea:TransformNode;
  constructor(private w:KarachiWorld){
    w.box('Karachi ground',450,.08,500,0,-.3,100,'#c7c4ab');
    this.sea=w.box('Arabian Sea horizon',260,.03,500,-151,-.21,130,'#489fa9');
    for(let i=0;i<w.chunks.length;i++)this.variants.push({open:this.openSection(i,false),coast:this.openSection(i,true)});
    for(const r of ROUTES){
      if(!r.landmark||r.id==='seaview')continue;
      const node=r.id==='mazar'?w.landmark:r.id==='empress'?this.empress():r.id==='tower'?this.tower():this.swords();
      const x=r.id==='mazar'?-22:r.id==='empress'?-22:14;
      this.landmarks.push({node,at:r.start+r.landmark,x});
    }
    w.landmark.scaling.setAll(1.05);
    for(let i=0;i<7;i++){
      const bird=new TransformNode('flying seagull',w.scene);
      w.ball('bird body',.18,0,0,0,'white',bird).scaling.z=1.7;
      for(const side of [-1,1]){const wing=w.box('wing',.65,.035,.18,side*.36,0,0,'white',bird);wing.metadata={side};}
      this.birds.push(bird);
    }
    const shirts=['#bc6349','#367b87','#e4dac0','#678459','#b69dba','#dddddb'];
    for(let i=0;i<8;i++){
      const p=new TransformNode('Karachi pedestrian',w.scene);
      w.cyl('pedestrian kurta',.38,.72,0,1,0,shirts[i%shirts.length],p,.46);
      w.ball('pedestrian head',.33,0,1.58,0,'skin',p);
      w.ball('pedestrian hair',.34,0,1.69,-.02,'hair',p).scaling.y=.5;
      for(const s of [-1,1]){const leg=w.cyl('walking leg',.16,.62,s*.13,.37,0,'trouser',p);leg.metadata={leg:s};const arm=w.cyl('arm',.13,.5,s*.28,1,0,shirts[i%shirts.length],p);arm.rotation.z=s*.12;}
      this.walkers.push(p);
    }
  }
  openSection(i:number,coast:boolean){
    const w=this.w,p=new TransformNode(coast?'Sea View promenade':'open landmark plaza',w.scene);
    for(let z=0;z<18;z+=3){for(const x of [-1.575,1.575])w.box('lane dash',.095,.02,1.55,x,.015,z,'white',p);for(const s of [-1,1])w.box('curb',.26,.29,3,s*6.52,.11,z,z%6?'black':'yellow',p);}
    if(coast){
      w.box('Clifton sand',27,.04,18,-20,.01,4.5,'#e8cc95',p);
      w.box('sea water',150,.035,18,-108,.02,4.5,'#3cabb4',p);
      w.box('shallow water',11,.04,18,-39,.025,4.5,'#77bdbb',p);
      for(let k=0;k<4;k++){const foam=w.box('gentle surf',.14,.015,14,-34-k*2,.06,4.5+(k%2),'#c5e3d3',p);foam.rotation.y=.035*(k%2?1:-1);}
      for(let z=-3;z<=12;z+=3){w.box('sea wall post',.24,.8,.24,-7.2,.5,z,'white',p);w.box('promenade railing',.08,.08,3,-7.2,.88,z+1.5,'teal',p);}
      w.palm(p,8.3,6,1.1);
      if(i%3===0){w.fruitCart(p,10.1,4);this.camel(p,-17,7);}
      if(i%3===1){w.cyl('beach umbrella pole',.065,2.4,-12,1.2,5,'dark',p);w.cyl('beach umbrella',3,.65,-12,2.7,5,'red',p,0,8);w.box('beach bench',1.4,.15,.6,-12,.6,5,'white',p);}
      if(i%3===2){w.sign(2,3.3,1.15,9,3.2,8,0,p);w.cyl('sign post',.1,3.3,9,1.65,8,'teal',p);}
    }else{
      for(const side of [-1,1]){
        w.box('plaza paving',35,.05,18,side*24,.015,4.5,'#ccc9b3',p);
        w.box('garden bed',6,.12,11,side*11,.09,4,'#80a077',p);
        w.box('garden edge',.18,.21,11,side*8,.14,4,'white',p);
        w.palm(p,side*8.8,10,.93);
        w.box('bench slats',1.8,.13,.6,side*7.8,.65,2,'sand',p);
        for(const x of [-.6,.6])w.box('bench leg',.12,.6,.45,side*7.8+x,.3,2,'dark',p);
        w.cyl('streetlight pole',.085,6.3,side*6.95,3.15,14,'teal',p);
        w.ball('streetlight globe',.47,side*6.95,6.4,14,'white',p);
        if(i%2===0)for(let k=0;k<3;k++){const bush=w.ball('flower bed',.9,side*(10+k*.8),.5,0,'leaf',p);bush.scaling.y=.6;w.ball('pink flowers',.3,side*(10+k*.8),.9,0,'pink',p);}
      }
    }
    w.merge(p);p.setEnabled(false);return p;
  }
  camel(p:TransformNode,x:number,z:number){const w=this.w,c=new TransformNode('Sea View camel',w.scene);c.parent=p;c.position.set(x,0,z);w.ball('camel body',1.3,0,1.3,0,'sand',c).scaling.z=1.6;w.ball('camel hump',.82,0,1.9,0,'sand',c);for(const side of [-1,1])for(const dz of [-.65,.65])w.cyl('camel leg',.15,1.25,side*.4,.62,dz,'sand',c);const neck=w.cyl('camel neck',.32,1.6,0,1.9,1,'sand',c);neck.rotation.x=.2;w.ball('camel head',.48,0,2.7,1.2,'sand',c).scaling.z=1.5;w.box('camel saddle',.9,.17,.75,0,1.9,-.2,'red',c);}
  clock(p:TransformNode,x:number,y:number,z:number,size:number){
    const w=this.w,tex=new DynamicTexture('historic clock',{width:256,height:256},w.scene,false);const c=tex.getContext();c.fillStyle='#f4e3ba';c.fillRect(0,0,256,256);c.strokeStyle='#5e4d35';c.lineWidth=10;c.beginPath();c.arc(128,128,113,0,Math.PI*2);c.stroke();c.lineWidth=5;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(128+Math.sin(a)*91,128-Math.cos(a)*91);c.lineTo(128+Math.sin(a)*104,128-Math.cos(a)*104);c.stroke();}
    c.lineWidth=9;c.beginPath();c.moveTo(128,128);c.lineTo(90,88);c.moveTo(128,128);c.lineTo(178,75);c.stroke();tex.update();const mat=new StandardMaterial('clock face',w.scene);mat.diffuseTexture=tex;mat.emissiveColor=new Color3(.15,.15,.15);mat.specularColor=Color3.Black();
    const face=MeshBuilder.CreateDisc('clock',{radius:size/2,tessellation:32},w.scene);face.position.set(x,y,z);face.material=mat;face.parent=p;return face;
  }
  empress(){ return empressMarket(this.w,(...args)=>this.clock(...args)); }
  tower(){return merewether(this.w,(...args)=>this.clock(...args));}
  swords(){ return teenTalwar(this.w); }
  update(distance:number,time:number){
    const w=this.w;w.chunks.forEach((chunk,i)=>{const r=environmentAt(distance+chunk.position.z+4);const variant=this.variants[i];chunk.setEnabled(r.kind==='street');variant.open.setEnabled(r.kind==='garden'||r.kind==='plaza');variant.coast.setEnabled(r.kind==='coast');variant.open.position.z=chunk.position.z;variant.coast.position.z=chunk.position.z;});
    const coast=routeAt(distance).kind==='coast'||routeAt(distance+100).kind==='coast';this.sea.setEnabled(coast);w.skyline?.setEnabled(!coast);
    this.landmarks.forEach(l=>{let z=l.at+Math.floor(distance/ROUTE_LENGTH)*ROUTE_LENGTH-distance;if(z< -50)z+=ROUTE_LENGTH;l.node.setEnabled(z>-50&&z<205);l.node.position.set(l.x,0,z);});
    this.birds.forEach((b,i)=>{b.position.set(Math.sin(time*.12+i)*23,10+i*1.2,23+i*14);b.rotation.y=.4;for(const wing of b.getChildMeshes())if(wing.metadata?.side)wing.rotation.z=Math.sin(time*3.5+i)*.35*wing.metadata.side;});
    this.walkers.forEach((p,i)=>{const z=((i*23-distance*.91)%184+184)%184-24;p.position.set((i%2?1:-1)*7.1,0,z);p.rotation.y=i%2?0:Math.PI;for(const m of p.getChildMeshes())if(m.metadata?.leg)m.rotation.x=Math.sin(time*5+i)*.3*m.metadata.leg;});
  }
}
