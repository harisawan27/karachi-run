import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';

export type ObstacleKind = 'bus' | 'barrier' | 'arch' | 'rickshaw';
type Parent = TransformNode | null;
const colors: Record<string,string> = { asphalt:'#526267', sidewalk:'#b6b6a2', cream:'#f0dbc1', yellow:'#ffcc53', dark:'#213e45', glass:'#477984', black:'#223b3e', white:'#fff2d7', red:'#d45b4a', teal:'#2c8f88', green:'#3c815c', pink:'#dd9d8b', blue:'#5a96a0', sand:'#c8a781', brick:'#b87656', leaf:'#47876b', metal:'#9aa99e', skin:'#b98059', hair:'#303330', trouser:'#e4dfc9', uniform:'#536b48' };
const signTexts = [
 ['کراچی بریانی','KARACHI BIRYANI','#1e6d54'], ['چائے خانہ','CHAI • PARATHA','#a64434'], ['خوش آمدید کراچی','WELCOME TO KARACHI','#19595a'], ['ماشاءاللہ','MASHALLAH','#2d7690'],
 ['پاکستان زندہ باد','PAKISTAN ZINDABAD','#266747'], ['مدینہ جنرل اسٹور','MADINA GENERAL STORE','#b26537'], ['کراچی کی رونق','THE CITY NEVER STOPS','#b84847'], ['بابا جی آٹو','BABA JI AUTO WORKS','#356981'],
 ['تازہ پھل','FRESH FRUIT','#597840'], ['کراچی ایکسپریس','KARACHI EXPRESS','#2a7a73'], ['آہستہ چلیں','SLOW DOWN','#986431'], ['صدر بازار','SADDAR BAZAAR','#795264'],
 ['عوامی بک اسٹال','AWAMI BOOK STALL','#245c71'], ['خوشبو بیکری','KHUSHBOO BAKERY','#9e573e'], ['جیوے جیوے پاکستان','CITY OF LIGHTS','#296647'], ['کراچی رن','KARACHI RUN','#285556'],
];
export class KarachiWorld {
  engine: Engine; scene: Scene; camera: FreeCamera; materials = new Map<string,StandardMaterial>(); signMat: StandardMaterial;
  chunks: TransformNode[] = []; runner: Character; pursuer: Character; landmark: TransformNode; time=0; mode='menu'; speed=0; low=false;
  constructor(public canvas:HTMLCanvasElement) {
    this.engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,antialias:true,powerPreference:'high-performance'});
    this.engine.setHardwareScalingLevel(Math.max(1.4,window.devicePixelRatio / 1.3));
    this.scene=new Scene(this.engine); this.scene.clearColor=new Color4(.66,.81,.82,1);
    this.scene.fogMode=Scene.FOGMODE_LINEAR; this.scene.fogColor=new Color3(.71,.82,.79);this.scene.fogStart=65;this.scene.fogEnd=190;
    const hemi=new HemisphericLight('sky',new Vector3(-.1,1,-.3),this.scene);hemi.intensity=.8;hemi.groundColor=Color3.FromHexString('#6c807d');
    const sun=new DirectionalLight('sun',new Vector3(-.6,-1,.45),this.scene);sun.intensity=.9;sun.diffuse=Color3.FromHexString('#ffe1b1');
    this.scene.ambientColor=new Color3(.12,.12,.12);
    this.camera=new FreeCamera('camera',new Vector3(-4.1,7,-14),this.scene);this.camera.setTarget(new Vector3(1,1.6,29));this.camera.minZ=.15;this.camera.maxZ=240;this.camera.fov=.85;
    this.signMat=this.makeSigns();
    this.makeStreet();
    for(let i=0;i<12;i++)this.chunks.push(this.makeChunk(i));
    this.landmark=this.makeMazar();
    this.runner=new Character(this,false);this.runner.root.position.set(0,0,0);
    this.pursuer=new Character(this,true);this.pursuer.root.position.set(0,0,-6);
    window.addEventListener('resize',()=>this.engine.resize());
    this.scene.skipPointerMovePicking=true;
  }
  mat(name:string,hex?:string) {
    const key=hex || name; const found=this.materials.get(key);if(found)return found;
    const m=new StandardMaterial(key,this.scene);m.diffuseColor=Color3.FromHexString(hex || colors[name] || name);m.specularColor=new Color3(.055,.055,.045);m.freeze();this.materials.set(key,m);return m;
  }
  box(name:string,w:number,h:number,d:number,x:number,y:number,z:number,color:string,parent:Parent=null) {
    const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);m.position.set(x,y,z);m.material=this.mat(color);m.parent=parent;return m;
  }
  cyl(name:string,diameter:number,h:number,x:number,y:number,z:number,color:string,parent:Parent=null,top?:number,tess=12) {
    const m=MeshBuilder.CreateCylinder(name,{height:h,diameter,diameterTop:top ?? diameter,tessellation:tess},this.scene);m.position.set(x,y,z);m.material=this.mat(color);m.parent=parent;return m;
  }
  ball(name:string,diameter:number,x:number,y:number,z:number,color:string,parent:Parent=null) {
    const m=MeshBuilder.CreateSphere(name,{diameter,segments:8},this.scene);m.position.set(x,y,z);m.material=this.mat(color);m.parent=parent;return m;
  }
  makeSigns() {
    const texture=new DynamicTexture('Urdu street signs',{width:2048,height:1024},this.scene,false);const c=texture.getContext() as unknown as CanvasRenderingContext2D;
    signTexts.forEach(([urdu,en,bg],i)=>{const x=(i%4)*512,y=Math.floor(i/4)*256;c.fillStyle=bg;c.fillRect(x,y,512,256);c.strokeStyle='#ffdda0';c.lineWidth=6;c.strokeRect(x+9,y+9,494,238);c.direction='rtl';c.textAlign='center';c.fillStyle='#fff4d5';c.font='bold 60px "Noto Nastaliq Urdu", serif';c.fillText(urdu,x+256,y+120,465);c.direction='ltr';c.font='600 22px "DM Sans", sans-serif';c.fillStyle='#ffe1a6';c.fillText(en,x+256,y+217,460);});
    texture.update();const m=new StandardMaterial('Urdu atlas',this.scene);m.diffuseTexture=texture;m.emissiveColor=new Color3(.22,.22,.22);m.specularColor=Color3.Black();m.backFaceCulling=false;return m;
  }
  sign(index:number,w:number,h:number,x:number,y:number,z:number,rotation:number,parent:Parent=null) {
    const p=MeshBuilder.CreatePlane('hand-painted Urdu board',{width:w,height:h},this.scene);const i=index%16,u=(i%4)/4,v=1-Math.floor(i/4)/4;
    p.setVerticesData(VertexBuffer.UVKind,[u,v-.25,u+.25,v-.25,u+.25,v,u,v]);p.material=this.signMat;p.position.set(x,y,z);p.rotation.y=rotation;p.parent=parent;return p;
  }
  merge(parent:TransformNode) {
    const groups=new Map<StandardMaterial,Mesh[]>();parent.getChildMeshes(false).forEach(m=>{if(m instanceof Mesh && m.material){const mat=m.material as StandardMaterial;const group=groups.get(mat)||[];group.push(m);groups.set(mat,group);}});
    groups.forEach(meshes=>{if(meshes.length<2)return;const merged=Mesh.MergeMeshes(meshes,true,true,undefined,false,false);if(merged)merged.parent=parent;});
  }
  makeStreet() {
    this.box('road',13,.14,410,0,-.11,120,'asphalt');
    for(const side of [-1,1]) {
      this.box('pavement',5,.28,410,side*8.7,.04,120,'sidewalk');
      this.box('gutter',.15,.04,410,side*6.48,.01,120,'dark');
    }
    const far=new TransformNode('distant Karachi skyline',this.scene);
    for(let i=0;i<28;i++){const side=i%2?1:-1;const x=side*(11+(i%7)*4.8);const y=8+(i*7%13);this.box('city silhouette',4,y,5,x,y/2,148+(i%4)*9,i%3?'sand':'cream',far);this.box('rooftop silhouette',1.7,2,1.7,x,y+1,148+(i%4)*9,'cream',far);}
    this.merge(far);
    const sun=this.ball('afternoon sun',13,-38,58,165,'#ffeed0');const sm=this.mat('sun','#ffeed0');sm.unfreeze();sm.emissiveColor=Color3.FromHexString('#ffeed0');sm.disableLighting=true;sm.freeze();sun.material=sm;
    for(let i=0;i<6;i++){const cloud=this.ball('sea breeze cloud',13,-50+i*20,42+(i%3)*4,120+i%3*15,'#dbe6d9');cloud.scaling.set(2,.23,.7);}
  }
  makeChunk(index:number) {
    const root=new TransformNode('street section '+index,this.scene);
    for(let z=0;z<18;z+=3) {
      for(const x of [-1.575,1.575])this.box('lane dash',.095,.018,1.55,x,.015,z,'white',root);
      for(const s of [-1,1])this.box('painted Karachi curb',.26,.29,3,s*6.52,.11,z,z%6?'black':'yellow',root);
    }
    for(const side of [-1,1])for(let n=0;n<2;n++)this.building(root,side,n*9,index*4+n+(side===1?2:0));
    if(index%2===0)for(const side of [-1,1])this.palm(root,side*7.25,13,1+(index%3)*.12);
    if(index%2===1) {
      for(const s of [-1,1]){this.cyl('utility pole',.12,10,s*6.94,5,8,'dark',root);this.box('pole cross arm',2.1,.1,.1,s*6.94,9.5,8,'dark',root);}
      for(let i=0;i<2;i++){const points=[new Vector3(-10,10,8+i*.5),new Vector3(-5,8.8,8+i*.5),new Vector3(0,8.3,8+i*.5),new Vector3(5,8.8,8+i*.5),new Vector3(10,10,8+i*.5)];const wire=MeshBuilder.CreateTube('overhead wires',{path:points,radius:.027,tessellation:3},this.scene);wire.material=this.mat('dark');wire.parent=root;}
      if(index%3===0)for(let i=0;i<12;i++){const x=-6+i*1.08;const flag=this.box('festival bunting',.46,.63,.025,x,8.05+Math.abs(x)*.045,8,i%3?'green':'white',root);flag.rotation.z=(i%2?.15:-.15);}
    }
    if(index===2||index===7){this.sign(2,10.7,1.8,0,10.1,4,0,root);for(const x of [-5.8,5.8])this.cyl('banner post',.13,11,x,5.5,4,'dark',root);}
    if(index%3===0)this.fruitCart(root,-7.5,6);
    if(index%3===1)this.parkedRickshaw(root,7.7,5);
    this.merge(root);root.position.z=index*18-36;return root;
  }
  building(root:TransformNode,side:number,z:number,seed:number) {
    const palette=['#dec5a7','#b4c3b0','#e4d4b5','#cbac97','#91b5ae','#c9b89a','#d8c7b4'];const height=6+(seed*7%4)*2.7;const x=side*10.5;const face=side*7.43;
    this.box('stucco building',6.1,height,8.7,x,height/2+.22,z,palette[seed%palette.length],root);
    this.box('cornice',6.45,.3,8.95,x,height+.15,z,'cream',root);
    this.box('parapet facade',.24,.65,8.9,side*7.39,height+.53,z,'sand',root);
    this.box('shop recess',.13,2.55,7.8,face,1.55,z,'dark',root);
    for(const dz of [-2.6,0,2.6]) {
      this.box('corrugated shutters',.16,2.1,2.27,side*7.32,1.32,z+dz,seed%2?'teal':'metal',root);
      for(let h=.5;h<2.3;h+=.28)this.box('shutter slats',.035,.035,2.25,side*7.22,h,z+dz,'dark',root);
    }
    this.sign(seed,7.9,1.5,side*7.17,3.45,z,side*Math.PI/2,root);
    const awning=this.box('striped awning',1.1,.1,8.1,side*6.83,2.53,z,seed%2?'red':'green',root);awning.rotation.z=side*-.14;
    for(let a=-3.6;a<=3.6;a+=.9)this.box('awning stripe',1.1,.12,.35,side*6.83,2.55,z+a,'white',root).rotation.z=side*-.14;
    for(let y=5;y<height-.3;y+=2.7) {
      for(const dz of [-2.5,0,2.5]){
        this.box('window frame',.17,1.63,1.48,side*7.37,y,z+dz,'cream',root);
        this.box('dark window',.2,1.36,1.18,side*7.25,y,z+dz,'glass',root);
        this.box('window mullion',.23,1.4,.065,side*7.15,y,z+dz,'cream',root);
      }
      if(seed%3!==1) {
        this.box('balcony floor',.85,.16,7.9,side*7.06,y-.87,z,'sand',root);
        this.box('balcony rail',.055,.07,7.75,side*6.69,y-.13,z,'dark',root);
        for(let a=-3.7;a<3.8;a+=.5)this.box('balcony spindle',.06,.75,.05,side*6.69,y-.5,z+a,'dark',root);
      }
    }
    this.cyl('water tank',1.5,1.3,x,height+1,z+2,'dark',root);this.cyl('tank lid',1.62,.12,x,height+1.7,z+2,'black',root);
    this.box('rooftop room',2.6,1.3,2.7,x,height+.7,z-1.7,'sand',root);
    if(seed%3===0){this.cyl('flagpole',.055,3,side*7.7,height+1.5,z-3,'dark',root);this.box('Pakistan flag',.03,1.1,1.65,side*7.7,height+2.3,z-2.2,'green',root);this.box('flag white stripe',.045,1.1,.26,side*7.7,height+2.3,z-2.86,'white',root);const moon=this.ball('crescent',.64,side*7.66,height+2.3,z-2.1,'white',root);moon.scaling.x=.055;const cut=this.ball('crescent cutout',.56,side*7.64,height+2.39,z-2.02,'green',root);cut.scaling.x=.05;}
    if(seed%2===0){this.box('air conditioner',.62,.55,.95,side*7.03,4.25,z+2.7,'white',root);this.box('AC grill',.02,.32,.64,side*6.7,4.25,z+2.7,'dark',root);}
  }
  palm(root:TransformNode,x:number,z:number,scale:number) {
    const p=new TransformNode('palm tree',this.scene);p.parent=root;p.position.set(x,0,z);
    const trunk=this.cyl('palm trunk',.27,7,0,3.5,0,'sand',p,.17);trunk.rotation.z=x>0?-.08:.08;
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const points=[new Vector3(.25,7,0),new Vector3(Math.cos(a)*1.1,7.8,Math.sin(a)*1.1),new Vector3(Math.cos(a)*2.6,7.35,Math.sin(a)*2.6),new Vector3(Math.cos(a)*3.1,6.3,Math.sin(a)*3.1)];const leaf=MeshBuilder.CreateTube('palm frond',{path:points,radius:.16,radiusFunction:(j)=>[.1,.27,.19,.01][j],tessellation:3},this.scene);leaf.parent=p;leaf.material=this.mat('leaf');}
    p.scaling.setAll(scale);
  }
  fruitCart(root:TransformNode,x:number,z:number) {
    this.box('fruit cart',1.5,.65,2.6,x,.95,z,'teal',root);
    for(const dz of [-.9,.9]){const wheel=this.cyl('cart wheel',.62,.16,x,.45,z+dz,'dark',root);wheel.rotation.z=Math.PI/2;}
    for(let i=0;i<18;i++)this.ball('mangoes',.26,x-.5+(i%3)*.45,1.43,z-.9+Math.floor(i/3)*.34,i%3?'yellow':'red',root);
    this.cyl('umbrella pole',.06,2.8,x,1.6,z,'dark',root);this.cyl('market umbrella',3.1,.55,x,3,z,'red',root,0,8);
  }
  parkedRickshaw(root:TransformNode,x:number,z:number){const r=this.vehicle('rickshaw');r.parent=root;r.position.set(x,0,z);r.rotation.y=.18;}
  makeMazar() {
    const p=new TransformNode('Mazar-e-Quaid stylized landmark',this.scene);
    this.box('mausoleum platform',15,.8,15,0,.4,0,'white',p);
    this.box('mausoleum base',10.5,8.5,10.5,0,4.8,0,'cream',p);
    this.box('mausoleum crown',11.2,.45,11.2,0,9.2,0,'white',p);
    const dome=this.ball('white dome',8.8,0,9.1,0,'white',p);dome.scaling.y=.8;
    for(const x of [-3.4,0,3.4]){this.box('arch opening',1.65,4,.05,x,3.2,-5.29,'sand',p);const arch=this.cyl('arch round top',1.65,.09,x,5.2,-5.3,'sand',p,undefined,16);arch.rotation.x=Math.PI/2;}
    for(const x of [-5,5])for(const z of [-5,5])this.box('marble edge',.3,8.5,.3,x,4.8,z,'white',p);
    this.cyl('dome finial',.15,1.1,0,13.4,0,'yellow',p,0);
    this.merge(p);p.position.set(-2,0,145);return p;
  }
  vehicle(kind:'bus'|'rickshaw') {
    const r=new TransformNode(kind,this.scene);const bus=kind==='bus';const w=bus?2.62:2;const d=bus?6.3:2.85;
    this.box('vehicle chassis',w,.62,d,0,.67,0,bus?'teal':'green',r);
    this.box('vehicle body',w,bus?2.35:1.2,d-.18,0,bus?2.13:1.56,0,bus?'yellow':'yellow',r);
    if(bus){
      this.box('bus lower paint',w+.03,.65,d,0,1.25,0,'red',r);
      this.box('bus roof',w+.12,.2,d+.06,0,3.4,0,'teal',r);
      this.box('rear glass',2.14,.85,.035,0,2.42,-d/2-.01,'glass',r);
      this.sign(9,2.05,.71,0,1.51,-d/2-.035,0,r);
      for(const side of [-1,1]){
        for(let z=-2.25;z<2.8;z+=1.04){this.box('bus side windows',.04,.83,.82,side*(w/2+.015),2.52,z,'glass',r);this.box('truck art diamond',.06,.32,.32,side*(w/2+.035),1.19,z,'yellow',r).rotation.x=Math.PI/4;}
        this.box('painted side stripe',.045,.1,d,side*(w/2+.02),1.7,0,'white',r);
      }
      for(let x=-1.05;x<=1.1;x+=.3)this.ball('bus decorative lights',.12,x,3.17,-d/2-.02,x<0?'red':'green',r);
      for(const x of [-.7,.7])this.box('luggage roof rail',.05,.3,5.2,x,3.64,0,'dark',r);
      this.box('roof luggage',1.1,.58,1.6,0,3.75,.7,'sand',r);
      this.box('roof luggage blue',1.3,.43,1.2,0,3.65,-1.2,'blue',r);
    }else{
      this.box('rickshaw canopy',w+.1,.2,d,0,2.3,0,'dark',r);
      this.box('rickshaw back window',1.43,.58,.03,0,1.78,-d/2-.01,'dark',r);
      this.sign(3,1.45,.48,0,1.13,-d/2-.035,0,r);
      this.box('rickshaw cabin',1.62,.12,.6,0,1.15,1.1,'green',r);
    }
    for(const side of [-1,1])for(const z of bus?[-2.05,2.05]:[-.8,.85]){const tire=this.cyl('rubber tire',bus?.9:.68,.2,side*(w/2),.47,z,'black',r);tire.rotation.z=Math.PI/2;const hub=this.cyl('wheel hub',bus?.42:.27,.22,side*(w/2+.01),.47,z,'metal',r);hub.rotation.z=Math.PI/2;}
    this.box('bumper',w+.15,.17,.18,0,.66,-d/2-.1,'white',r);
    for(const x of [-w*.37,w*.37])this.box('tail light',.18,.23,.06,x,1,-d/2-.04,'red',r);
    this.merge(r);return r;
  }
  obstacle(kind:ObstacleKind) {
    if(kind==='bus'||kind==='rickshaw')return this.vehicle(kind);
    const root=new TransformNode(kind,this.scene);
    if(kind==='barrier'){
      for(const x of [-1,1]){this.box('barrier foot',.42,.16,.8,x,.09,0,'dark',root);this.box('barrier leg',.14,1.35,.15,x,.7,0,'dark',root);}
      this.box('road barricade',2.55,.7,.3,0,.95,0,'yellow',root);
      for(let x=-.94;x<=1;x+=.65)this.box('hazard stripe',.29,.73,.015,x,.95,-.163,'dark',root).rotation.z=-.35;
      this.cyl('warning lamp',.17,.12,-1,1.54,0,'red',root);
    }else{
      for(const x of [-1.23,1.23])this.box('gantry post',.18,3.45,.4,x,1.725,0,'teal',root);
      this.box('low overhead board',2.73,1.75,.42,0,2.6,0,'yellow',root);
      this.sign(10,2.4,1.24,0,2.65,-.222,0,root);
      this.box('clearance edge',2.73,.18,.46,0,1.69,0,'red',root);
    }
    this.merge(root);return root;
  }
  coin() {
    const root=new TransformNode('collectible coin',this.scene);
    const coin=this.cyl('gold rupee',.58,.105,0,0,0,'yellow',root,undefined,16);coin.rotation.x=Math.PI/2;
    const inset=this.cyl('coin inset',.44,.113,0,0,0,'#f1ac30',root,undefined,16);inset.rotation.x=Math.PI/2;
    this.box('coin stamp',.085,.28,.13,0,0,0,'white',root);this.merge(root);return root;
  }
  power(kind:'magnet'|'shield') {
    const root=new TransformNode(kind,this.scene);
    const orb=this.ball('power orb',.88,0,0,0,kind==='magnet'?'red':'teal',root);orb.visibility=.8;
    if(kind==='magnet'){for(const x of [-.2,.2]){this.box('magnet arm',.17,.48,.18,x,.05,-.4,'white',root);this.box('magnet tip',.18,.12,.19,x,.31,-.4,'blue',root);}this.box('magnet base',.57,.16,.18,0,-.23,-.4,'white',root);}else{const shield=this.ball('shield icon',.5,0,0,-.4,'white',root);shield.scaling.set(.75,1.1,.25);}
    this.merge(root);return root;
  }
  quality(low:boolean){this.low=low;this.engine.setHardwareScalingLevel(low?Math.max(1.7,devicePixelRatio):Math.max(1,devicePixelRatio/1.5));this.scene.fogEnd=low?145:190;}
  update(dt:number,distanceDelta:number,playing:boolean,playerY:number,sliding:boolean) {
    this.time+=dt;
    for(const c of this.chunks){c.position.z-=distanceDelta;if(c.position.z< -48)c.position.z+=216;}
    this.runner.animate(this.time,playing,playerY,sliding);
    this.pursuer.animate(this.time+.15,playing,0,false);
    const desired=playing?new Vector3(this.runner.root.position.x*.18,5.2,-10.5):new Vector3(-4.1,7,-14);
    const factor=1-Math.exp(-dt*4);this.camera.position=Vector3.Lerp(this.camera.position,desired,factor);
    const target=playing?new Vector3(this.runner.root.position.x*.12,1.65,18):new Vector3(1,1.8,27);
    this.camera.setTarget(target);this.camera.fov=innerWidth<700?.98:.87;
    this.pursuer.root.position.x+=(this.runner.root.position.x-this.pursuer.root.position.x)*(1-Math.exp(-dt*3));
  }
}
export class Character {
  root:TransformNode;body:TransformNode;legs:TransformNode[]=[];arms:TransformNode[]=[];shadow:Mesh;
  constructor(w:KarachiWorld,police:boolean) {
    this.root=new TransformNode(police?'Asim pursuer':'Imran runner',w.scene);this.body=new TransformNode('character body',w.scene);this.body.parent=this.root;
    const cloth=police?'uniform':'#dedcc7';const hair=police?'#33342e':'#393a32';
    const torso=w.cyl('kurta torso',.73,.99,0,1.34,0,cloth,this.body,.83);torso.scaling.z=.67;
    if(!police){w.box('waistcoat back',.79,.72,.08,0,1.45,-.28,'#41624b',this.body);for(const x of [-.21,.21])w.box('waistcoat front',.32,.74,.11,x,1.45,.23,'#41624b',this.body);w.box('kurta hem',.77,.35,.54,0,.91,0,cloth,this.body);}
    else{w.box('uniform belt',.77,.095,.52,0,.99,0,'dark',this.body);w.box('belt buckle',.13,.095,.04,0,.99,-.28,'yellow',this.body);for(const x of [-.26,.26])w.box('epaulette',.17,.06,.38,x,1.85,0,'yellow',this.body);}
    w.cyl('neck',.26,.22,0,1.94,0,'skin',this.body);
    const head=w.ball('head',.57,0,2.22,.01,'skin',this.body);head.scaling.set(.86,1.14,.88);
    const cap=w.ball('hair',.58,0,2.4,-.035,hair,this.body);cap.scaling.set(.87,.64,.93);
    w.box('hair back',.43,.27,.13,0,2.27,-.22,hair,this.body);
    for(const x of [-.26,.26])w.ball('ears',.14,x,2.21,0,'skin',this.body);
    w.ball('nose',.115,0,2.18,.27,'skin',this.body);
    for(const x of [-.115,.115]){w.ball('eyes',.038,x,2.27,.25,'dark',this.body);w.box('eyebrow',.09,.022,.04,x,2.32,.25,hair,this.body);}
    if(police){w.box('moustache',.21,.065,.04,0,2.08,.252,'dark',this.body);const hat=w.cyl('officer cap',.63,.14,0,2.56,0,'uniform',this.body);hat.scaling.z=.9;w.box('cap visor',.49,.045,.3,0,2.51,.24,'dark',this.body);w.box('cap badge',.09,.08,.025,0,2.58,.285,'yellow',this.body);}
    for(const side of [-1,1]){
      const leg=new TransformNode('leg pivot',w.scene);leg.parent=this.body;leg.position.set(side*.23,.95,0);this.legs.push(leg);
      w.cyl('shalwar',.31,.76,0,-.38,0,police?'uniform':'trouser',leg,.28);
      w.box('shoe',.32,.19,.52,0,-.81,.075,'#443e33',leg);
      const arm=new TransformNode('arm pivot',w.scene);arm.parent=this.body;arm.position.set(side*.45,1.72,0);this.arms.push(arm);
      const sleeve=w.cyl('sleeve',.235,.58,side*.045,-.28,0,cloth,arm,.27);sleeve.rotation.z=side*.14;
      w.ball('hand',.22,side*.08,-.64,.06,'skin',arm);
    }
    this.shadow=MeshBuilder.CreateDisc('soft ground shadow',{radius:.6,tessellation:24},w.scene);this.shadow.rotation.x=Math.PI/2;this.shadow.position.y=.019;this.shadow.scaling.y=.7;this.shadow.material=w.mat('shadow','#3d5050');this.shadow.visibility=.36;
  }
  animate(t:number,running:boolean,y:number,slide:boolean) {
    const cycle=t*(running?15:2);this.root.position.y=y;this.body.position.y=running?Math.abs(Math.sin(cycle))*.045:Math.sin(t*2)*.02;
    this.body.rotation.x=slide?-1.12:running?.11:0;this.body.scaling.y=slide?.53:1;
    this.legs.forEach((l,i)=>l.rotation.x=running&&!slide?Math.sin(cycle+i*Math.PI)*.82:slide?(i===0?-1.1:.55):0);
    this.arms.forEach((l,i)=>{l.rotation.x=running?Math.sin(cycle+(i+1)*Math.PI)*.8:-.15;l.rotation.z=i===0?.1:-.1;});
    this.shadow.position.x=this.root.position.x;this.shadow.position.z=this.root.position.z;this.shadow.scaling.x=1-y*.12;this.shadow.visibility=Math.max(.12,.36-y*.08);
  }
}
