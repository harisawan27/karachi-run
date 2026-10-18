import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { KarachiWorld } from './world';
import { ROUTES, ROUTE_LENGTH, routeAt, environmentAt } from './routes.mjs';
import { teenTalwar, empressMarket, merewether } from './landmarks';
import { promenadeBench, streetLamp, planter, neemTree, beachParasol, seagull, animateGull } from './scenery';

export class CityRoute {
  variants:{open:TransformNode;coast:TransformNode}[]=[];
  landmarks:{node:TransformNode;at:number;x:number}[]=[];
  birds:TransformNode[]=[];sea:TransformNode;
  constructor(private w:KarachiWorld){
    w.box('Karachi ground',450,.08,500,0,-.3,100,'#c7c4ab');
    this.sea=w.box('Arabian Sea horizon',260,.03,500,-151,-.21,130,'#489fa9');
  }
  private nextFrame(){return new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
  private status(message:string){const label=document.querySelector<HTMLParagraphElement>('#loading p');if(label)label.textContent=message;}
  async initialize(){
    for(let i=0;i<this.w.chunks.length;i++){
      this.status(`DRESSING THE CITY · ${i+1}/${this.w.chunks.length}`);
      this.variants.push({open:this.openSection(i,false),coast:this.openSection(i,true)});
      await this.nextFrame();
    }
    for(const r of ROUTES){
      if(!r.landmark||r.id==='seaview')continue;
      this.status(`BUILDING LANDMARK · ${r.name.toUpperCase()}`);
      const node=r.id==='mazar'?this.w.landmark:r.id==='empress'?this.empress():r.id==='tower'?this.tower():this.swords();
      const x=r.id==='mazar'?-22:r.id==='empress'?-22:14;
      this.landmarks.push({node,at:r.start+r.landmark,x});
      await this.nextFrame();
    }
    this.w.landmark.scaling.setAll(1.05);
    for(let i=0;i<6;i++)this.birds.push(seagull(this.w,i));
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
      streetLamp(w,p,-7.5,14,-1);
      planter(w,p,8,14,true);
      for(let z=-3;z<15;z+=1.5)w.box('promenade paving joints',2.7,.012,.025,-8.5,.19,z,'#a79d88',p);
      for(let k=0;k<5;k++){const a=k*2.4;const rock=w.ball('tidal shoreline rock',.7+(k%2)*.35,-31+Math.sin(a)*1.7,.2,1+k*3,'#a89e85',p);rock.scaling.set(1,.45,.8);}
      if(i%3===0){w.fruitCart(p,10.1,4);beachParasol(w,p,-14,8);}
      if(i%3===1){beachParasol(w,p,-12,5);promenadeBench(w,p,-9,5,Math.PI/2);}
      if(i%3===2){w.sign(2,3.3,1.15,9,3.2,8,0,p);w.cyl('sign post',.1,3.3,9,1.65,8,'teal',p);}
    }else{
      for(const side of [-1,1]){
        w.box('plaza paving',35,.05,18,side*24,.015,4.5,'#ccc9b3',p);
        w.box('garden bed',6,.12,11,side*11,.09,4,'#80a077',p);
        w.box('garden edge',.18,.21,11,side*8,.14,4,'white',p);
        w.palm(p,side*8.8,10,.93);
        promenadeBench(w,p,side*8,2,side>0?-Math.PI/2:Math.PI/2);
        streetLamp(w,p,side*7.1,14,side);
        planter(w,p,side*8,6,i%2===0);
        if(i%2===0)neemTree(w,p,side*12,3,.9);
        for(let z=-3;z<15;z+=2.25)w.box('plaza paving joint',4.6,.012,.025,side*9,.055,z,'#aba893',p);
      }
    }
    w.merge(p);p.setEnabled(false);return p;
  }
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
    this.birds.forEach((b,i)=>animateGull(b,time,i,coast));
  }
}
