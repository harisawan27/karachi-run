import {airCameraFov,flightCameraPose} from './air-movement.mjs';
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
import { flightCameraTarget, groundCameraRise, jumpCameraPullback, frameRunnerTargetY, openingYaw, groundRunFov } from './runner-motion.mjs';
import { ModelCharacter as Character } from './model-character';
import { LocalAssets } from './local-assets';
import { mazda } from './mazda';
import { mazar } from './landmarks';
import { CityRoute } from './city-route';
import { coastalPalm, planter, streetLamp, roadBarricade, citySkyline, batchScenery } from './scenery';

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
  chunks: TransformNode[] = []; runner!: Character; pursuer!: Character; cruiserBoard!: TransformNode; landmark!: TransformNode; skyline:TransformNode|null=null; city!:CityRoute; assets!:LocalAssets; ready!:Promise<void>; travel=0;time=0; mode='menu'; speed=0; low=false; chaserBlocked=false; rollRemaining=0;
  groundHeight=0;airborne=false;verticalVelocity=0;jumpLaunchSpeed=0;flightStage='off';flightActive=false;introProgress=0;chaseVisible=true;boardActive=false;private chaiJets:TransformNode|null=null;private chaiJetFlames:Mesh[]=[];private cameraElevation=0;private flightBlend=0;private shakeIntensity=0;private shakeDuration=0;
  constructor(public canvas:HTMLCanvasElement, runnerSource?:string) {
    this.engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,antialias:true,powerPreference:'high-performance'});
    this.engine.setHardwareScalingLevel(Math.max(1.4,window.devicePixelRatio / 1.3));
    this.scene=new Scene(this.engine); this.scene.clearColor=new Color4(.66,.81,.82,1);
    this.scene.fogMode=Scene.FOGMODE_LINEAR; this.scene.fogColor=new Color3(.71,.82,.79);this.scene.fogStart=65;this.scene.fogEnd=190;
    const hemi=new HemisphericLight('sky',new Vector3(-.1,1,-.3),this.scene);hemi.intensity=.8;hemi.groundColor=Color3.FromHexString('#6c807d');
    const sun=new DirectionalLight('sun',new Vector3(-.6,-1,.45),this.scene);sun.intensity=.9;sun.diffuse=Color3.FromHexString('#ffe1b1');
    this.scene.ambientColor=new Color3(.12,.12,.12);
    this.camera=new FreeCamera('camera',new Vector3(-4.1,7,-14),this.scene);this.camera.setTarget(new Vector3(1,1.6,29));this.camera.minZ=.15;this.camera.maxZ=240;this.camera.fov=.85;
    this.signMat=this.makeSigns();
    this.ready=this.initializeWorld(runnerSource);
    window.addEventListener('resize',()=>this.engine.resize());
    this.scene.skipPointerMovePicking=true;
  }
  private status(message:string){const label=document.querySelector<HTMLParagraphElement>('#loading p');if(label)label.textContent=message;}
  private nextFrame(){return new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
  private async initializeWorld(runnerSource?:string){
    this.status('BUILDING KARACHI STREETS…');this.makeStreet();await this.nextFrame();
    for(let i=0;i<12;i++){this.status(`BUILDING STREET ${String(i+1).padStart(2,'0')} / 12…`);this.chunks.push(this.makeChunk(i));await this.nextFrame();}
    this.status('SCULPTING MAZAR-E-QUAID…');this.landmark=this.makeMazar();await this.nextFrame();
    this.status('LOADING YOUR RUNNERS…');this.runner=new Character(this,false,runnerSource);this.runner.root.position.set(0,0,0);this.pursuer=new Character(this,true);this.pursuer.root.position.set(0,0,-6);this.cruiserBoard=this.makeCruiserBoard();
    this.assets=new LocalAssets(this);this.city=new CityRoute(this);await this.city.initialize();this.city.update(0,0);
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
  merge(parent:TransformNode) {batchScenery(parent);}
  makeStreet() {
    this.box('road',13,.14,410,0,-.11,120,'asphalt');
    for(const side of [-1,1]) {
      this.box('pavement',5,.28,410,side*8.7,.04,120,'sidewalk');
      this.box('gutter',.15,.04,410,side*6.48,.01,120,'dark');
    }
    const far=new TransformNode('distant Karachi skyline',this.scene);
    this.skyline=far;
    citySkyline(this,far);
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
    if(index%3===1)streetLamp(this,root,-7,14,-1);
    if(index%3===2)planter(this,root,7.0,1,true);
    for(const side of [-1,1]){
      this.box('pavement inset edge',.08,.018,18,side*6.86,.19,7.5,'#968e7a',root);
      for(let z=0;z<18;z+=1.5)this.box('sidewalk paving joint',.60,.012,.022,side*7.1,.19,z,'#968e7a',root);
    }
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
  palm(root:TransformNode,x:number,z:number,scale:number) {return coastalPalm(this,root,x,z,scale,Math.round(z+Math.abs(x)));}
  fruitCart(root:TransformNode,x:number,z:number) {
    this.box('fruit cart',1.5,.65,2.6,x,.95,z,'teal',root);
    for(const dz of [-.9,.9]){const wheel=this.cyl('cart wheel',.62,.16,x,.45,z+dz,'dark',root);wheel.rotation.z=Math.PI/2;}
    for(let i=0;i<18;i++)this.ball('mangoes',.26,x-.5+(i%3)*.45,1.43,z-.9+Math.floor(i/3)*.34,i%3?'yellow':'red',root);
    this.cyl('umbrella pole',.06,2.8,x,1.6,z,'dark',root);this.cyl('market umbrella',3.1,.55,x,3,z,'red',root,0,8);
  }
  parkedRickshaw(root:TransformNode,x:number,z:number){const r=this.vehicle('rickshaw');r.parent=root;r.position.set(x,0,z);r.rotation.y=.18;}
  makeMazar() { return mazar(this); }
  vehicle(kind:'bus'|'rickshaw') {
    if(kind==='bus')return mazda(this);
    const r=new TransformNode(kind,this.scene);const bus=false;const w=bus?2.62:2;const d=bus?6.3:2.85;
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
    if(kind==='bus'||kind==='rickshaw')return this.assets.vehicle(kind);
    const root=new TransformNode(kind,this.scene);
    if(kind==='barrier'){
      roadBarricade(this,root);
    }else{
      for(const x of [-1.23,1.23])this.box('gantry post',.18,3.45,.4,x,1.725,0,'teal',root);
      this.box('low overhead board',2.73,1.75,.42,0,2.6,0,'yellow',root);
      this.sign(10,2.4,1.24,0,2.65,-.222,0,root);
      this.box('clearance edge',2.73,.18,.46,0,1.69,0,'red',root);
      this.box('gantry top trim',2.73,.08,.46,0,3.44,0,'#294d50',root);
      for(const side of [-1,1]){
        this.box('gantry bolted base',.35,.11,.48,side*1.23,.07,0,'#294d50',root);
        this.box('reflective post face',.10,1.2,.025,side*1.23,.84,-.215,'#e7b94f',root);
        for(const y of [.3,.8,1.3])this.box('post reflector',.11,.13,.026,side*1.23,y,-.23,'#f2dfae',root);
        this.ball('gantry fixing',.07,side*1.18,3.34,-.24,'#f2dfae',root);
      }
      for(let x=-1.15;x<1.2;x+=.32)this.box('clearance edge reflector',.14,.075,.025,x,1.69,-.242,'#f2dfae',root);
    }
    root.metadata={width:2.6,depth:.5,height:kind==='arch'?3.5:1.55};
    this.merge(root);return root;
  }
  coin() {
    const root=new TransformNode('collectible coin',this.scene);
    const coin=this.cyl('gold rupee',.58,.105,0,0,0,'yellow',root,undefined,16);coin.rotation.x=Math.PI/2;
    const inset=this.cyl('coin inset',.44,.113,0,0,0,'#f1ac30',root,undefined,16);inset.rotation.x=Math.PI/2;
    this.box('coin stamp',.085,.28,.13,0,0,0,'white',root);this.merge(root);return root;
  }
  power(kind:'magnet'|'boost'|'chai'|'biryani'|'shoes') {
    const root=new TransformNode(kind,this.scene);
    if(kind==='magnet'){
      const path=[new Vector3(-.38,.55,0),new Vector3(-.38,-.02,0)];
      for(let i=0;i<=12;i++){const a=Math.PI+i*Math.PI/12;path.push(new Vector3(Math.cos(a)*.38,-.02+Math.sin(a)*.38,0));}
      path.push(new Vector3(.38,.55,0));const magnet=MeshBuilder.CreateTube('red horseshoe magnet',{path,radius:.14,tessellation:10},this.scene);magnet.material=this.mat('red');magnet.parent=root;
      for(const x of [-.38,.38])this.cyl('silver magnet pole',.29,.23,x,.54,0,'white',root);
    }else if(kind==='boost'){
      const tile=this.box('double points bonus',.82,.82,.2,0,0,0,'yellow',root);tile.rotation.z=Math.PI/4;
      const tex=new DynamicTexture('double score label',{width:128,height:128},this.scene,false);tex.drawText('×2',null,87,'bold 65px Arial','#214d43','#ffd260',true);const m=new StandardMaterial('double points type',this.scene);m.diffuseTexture=tex;m.emissiveColor=new Color3(.3,.3,.3);const face=MeshBuilder.CreatePlane('x2',{size:.69},this.scene);face.position.z=-.12;face.material=m;face.parent=root;
    }else if(kind==='chai'){
      // A dhaba-style chai glass: translucent sides, visible tea, saucer and spoon.
      const saucer=this.cyl('dhaba saucer',.98,.10,0,.055,0,'#efe0b4',root,undefined,32);
      const saucerRim=MeshBuilder.CreateTorus('raised saucer rim',{diameter:1.04,thickness:.045,tessellation:32},this.scene);saucerRim.position.y=.115;saucerRim.material=this.mat('saucer gold','#d6a947');saucerRim.parent=root;
      const glass=this.cyl('clear chai glass',.57,.76,0,.51,0,'#fff0c8',root,.49,32);
      const glassMaterial=new StandardMaterial('chai glass translucent',this.scene);glassMaterial.diffuseColor=Color3.FromHexString('#ffe3a5');glassMaterial.emissiveColor=Color3.FromHexString('#38200c');glassMaterial.alpha=.34;glassMaterial.backFaceCulling=false;glass.material=glassMaterial;
      this.cyl('karak tea',.43,.47,0,.39,0,'#a94d19',root,.40,28);
      this.cyl('tea surface',.40,.025,0,.635,0,'#bd6828',root,undefined,28);
      const glassLip=MeshBuilder.CreateTorus('bright glass rim',{diameter:.52,thickness:.04,tessellation:28},this.scene);glassLip.position.y=.89;glassLip.material=this.mat('chai rim','#fff0c8');glassLip.parent=root;
      this.cyl('glass foot',.47,.065,0,.135,0,'#f4e4bd',root,undefined,28);
      this.box('chai glass highlight',.035,.48,.025,-.20,.51,-.255,'#fff5da',root);
      this.box('spoon handle',.055,.035,.39,.36,.14,-.08,'#d4d7d1',root);
      const spoonBowl=this.ball('spoon bowl',.15,.36,.15,.17,'#e1e5dd',root);spoonBowl.scaling.z=.60;
      for(let i=0;i<3;i++){const x=(i-1)*.18;const path=[new Vector3(x,.98,-.03),new Vector3(x-.075,1.15,.01),new Vector3(x+.07,1.34,.02),new Vector3(x-.035,1.52,0)];const steam=MeshBuilder.CreateTube(`visible chai steam ${i}`,{path,radius:.035,tessellation:7},this.scene);steam.material=this.mat('white','#fff5dc');steam.parent=root;}
      const sparkle=this.ball('chai glint',.13,.47,.66,-.04,'#ffe38b',root);sparkle.scaling.set(.65,1.3,.65);
    }else if(kind==='biryani'){
      // Open clay handi, piled rice, saffron, herbs and visible masala pieces.
      const body=this.cyl('terracotta biryani handi',1.02,.58,0,.30,0,'#a84d2d',root,.86,32);
      this.cyl('handi painted band',.94,.09,0,.20,0,'#e3ae54',root,.94,32);
      const handiRim=MeshBuilder.CreateTorus('wide handi rim',{diameter:.91,thickness:.085,tessellation:32},this.scene);handiRim.position.y=.59;handiRim.material=this.mat('handi rim gold','#edc36b');handiRim.parent=root;
      const rice=MeshBuilder.CreateSphere('heaped basmati rice',{diameter:.82,segments:20},this.scene);rice.scaling.y=.42;rice.position.set(0,.69,0);rice.material=this.mat('basmati rice','#fff0c7');rice.parent=root;
      for(let i=0;i<22;i++){const a=i*2.399,r=.12+(i%5)*.052,x=Math.cos(a)*r,z=Math.sin(a)*r;const grain=this.box(`long basmati grain ${i}`,.035,.028,.19,x,.81+(i%3)*.015,z,i%4===0?'#dfa64a':'#fff3d4',root);grain.rotation.y=-a*.45;grain.rotation.x=(i%2?.15:-.12);}
      for(let i=0;i<5;i++){const a=i*2.17,x=Math.cos(a)*(.12+(i%2)*.09),z=Math.sin(a)*(.12+(i%2)*.09);const meat=this.ball(`masala chicken piece ${i}`,.20,x,.84,z,'#99431f',root);meat.scaling.set(1,.7,1.2);}
      for(let i=0;i<6;i++){const a=i*1.8,x=Math.cos(a)*(.18+(i%2)*.08),z=Math.sin(a)*(.18+(i%2)*.08);const herb=this.box(`fresh coriander leaf ${i}`,.07,.025,.18,x,.86,z,'#3e8b4e',root);herb.rotation.y=a;}
      for(const side of [-1,1]){const handle=this.box('handi side handle',.20,.12,.28,side*.52,.42,0,'#783824',root);handle.rotation.z=side*.2;}
      for(let i=0;i<2;i++){const x=i?.17:-.17;const path=[new Vector3(x,.93,0),new Vector3(x-.06,1.06,0),new Vector3(x+.05,1.18,0)];const steam=MeshBuilder.CreateTube(`biryani steam ${i}`,{path,radius:.025,tessellation:6},this.scene);steam.material=this.mat('biryani steam','#fff2d2');steam.parent=root;}
      const glint=this.ball('handi glint',.13,.48,.59,-.08,'#ffe38b',root);glint.scaling.set(.7,1.2,.7);
    }else{
      // A clearly readable pair of leather Peshawari sandals with an upward bounce cue.
      for(const side of [-1,1]){const shoe=new TransformNode('Peshawari sandal',this.scene);shoe.parent=root;shoe.position.set(side*.34,.02,side*.04);shoe.rotation.y=side*.14;shoe.rotation.z=side*-.045;
        this.box('dark leather sandal outsole',.62,.13,1.04,0,.04,0,'#5b2b20',shoe);
        this.box('warm leather footbed',.56,.055,.97,0,.13,0,'#c58b43',shoe);
        const front=this.box('broad Peshawari toe strap',.52,.12,.14,0,.24,.30,'#ead18e',shoe);front.rotation.y=side*.08;
        const crossA=this.box('woven cross strap A',.56,.105,.13,0,.24,.02,'#b64c32',shoe);crossA.rotation.y=.48;
        const crossB=this.box('woven cross strap B',.56,.105,.13,0,.24,-.10,'#dd9d50',shoe);crossB.rotation.y=-.48;
        this.box('heel strap',.49,.09,.11,0,.22,-.37,'#ead18e',shoe);
        this.box('strap jewel',.11,.08,.055,0,.30,.02,'#ffe58c',shoe);
      }
      for(const side of [-1,1]){this.box('bounce arrow shaft',.075,.48,.075,side*.86,.54,0,'#ffe26d',root);for(const direction of [-1,1]){const head=this.box('bounce arrow head',.075,.25,.075,side*.86+direction*.085,.82,0,'#fff1af',root);head.rotation.z=direction*-.68;}}
      const base=MeshBuilder.CreateTorus('bounce medal ring',{diameter:1.95,thickness:.045,tessellation:32},this.scene);base.position.y=-.02;base.material=this.mat('bounce base green','#355b3d');base.parent=root;
    }
    this.merge(root);return root;    this.merge(root);return root;
  }
  makeCruiserBoard() {
    const root=new TransformNode('cruiser board',this.scene);
    // Aerodynamic main chassis (Sleek contoured hull)
    this.box('cruiser chassis lower',.86,.05,2.05,0,.025,0,'#103936',root);
    this.box('cruiser main deck',.82,.06,1.95,0,.06,0,'#175651',root);
    this.box('cruiser grip deck',.70,.02,1.70,0,.095,0,'#0d2826',root);

    // Chrome perimeter rub-rails & side bumper trim
    for(const s of [-1,1]){
      this.box('cruiser side bumper',.04,.07,1.92,s*.42,.055,0,'#d9e2ec',root);
      this.box('cruiser gold side pinstripe',.025,.02,1.84,s*.39,.092,0,'#ffd700',root);
      this.box('cruiser neon side edge',.015,.03,1.60,s*.435,.04,0,'#00f0ff',root);
    }

    // Chiseled aerodynamic front nose with upturned angle
    const nose=this.box('cruiser nose wedge',.80,.06,.35,0,.08,1.05,'#175651',root);
    nose.rotation.x=-0.16;
    const noseLip=this.box('cruiser nose chrome lip',.82,.035,.08,0,.105,1.20,'#e2e8f0',root);
    noseLip.rotation.x=-0.16;
    for(const s of [-1,1]){
      const lamp=this.box('nose projector light',.12,.04,.04,s*.24,.09,1.18,'#00f0ff',root);
      lamp.rotation.x=-0.16;
      const lm=this.mat('headlight cyan','#00f0ff');
      lm.emissiveColor=Color3.FromHexString('#00f0ff');
      lamp.material=lm;
    }

    // Raised kicktail & aerodynamic rear stabilizer spoiler
    const tail=this.box('cruiser kicktail deck',.80,.06,.32,0,.08,-1.02,'#175651',root);
    tail.rotation.x=0.18;
    const spoiler=this.box('cruiser chrome wing',.86,.035,.09,0,.13,-1.16,'#e2e8f0',root);
    spoiler.rotation.x=0.18;
    for(const s of [-1,1]){
      const fin=this.box('rear winglet',.03,.08,.18,s*.42,.13,-1.10,'#ffd700',root);
      fin.rotation.x=0.18;
    }

    // Dual 24K Gold center racing stripes
    for(const s of [-1,1]){
      this.box('gold racing stripe',.04,.015,1.82,s*.09,.098,0,'#ffd700',root);
    }

    // Authentic Karachi Truck-Art Medallions & Geometric Rosettes
    for(let z=-0.65;z<=0.65;z+=0.32){
      const diamond=this.box('chamak patti diamond',.14,.02,.14,0,.102,z,'#e63946',root);
      diamond.rotation.y=Math.PI/4;
      const core=this.box('diamond gold core',.06,.025,.06,0,.105,z,'#ffcc00',root);
      core.rotation.y=Math.PI/4;
    }
    const shield=this.box('cruiser emblem shield',.22,.025,.22,0,.103,0,'#ffd700',root);
    shield.rotation.y=Math.PI/4;
    const shieldRuby=this.box('shield ruby star',.12,.03,.12,0,.106,0,'#d90429',root);
    shieldRuby.rotation.y=Math.PI/4;

    // Dual High-Output Levitation Thruster Pods (Underbody)
    for(const z of [-0.68,0.68]){
      this.cyl('thruster housing',.42,.06,0,-.01,z,'#162326',root,undefined,16);
      this.cyl('thruster outer bezel',.46,.025,0,-.005,z,'#ffd700',root,undefined,16);
      const glow=this.cyl('thruster plasma core',.34,.04,0,-.025,z,'#00f0ff',root,undefined,16);
      const gm=this.mat('thruster cyan plasma','#00f0ff');
      gm.emissiveColor=Color3.FromHexString('#00f0ff');
      glow.material=gm;
      this.cyl('turbine spinner',.12,.05,0,-.03,z,'#e2e8f0',root,.02,12);
    }

    // Luminous Anti-Gravity Underglow Field (neon ground wash)
    const underglow=MeshBuilder.CreatePlane('cruiser underglow aura',{width:.96,height:2.1},this.scene);
    underglow.rotation.x=Math.PI/2;
    underglow.position.y=-.035;
    const ugMat=new StandardMaterial('underglow neon aura',this.scene);
    ugMat.diffuseColor=Color3.FromHexString('#00f0ff');
    ugMat.emissiveColor=Color3.FromHexString('#00e5ff');
    ugMat.specularColor=Color3.Black();
    ugMat.alpha=0.55;
    underglow.material=ugMat;
    underglow.parent=root;

    this.merge(root);root.setEnabled(false);return root;
  }
  setBoardActive(active:boolean){this.boardActive=active;this.cruiserBoard.setEnabled(active);}
  setChaiActive(active:boolean){
    this.flightActive=active;
    if(!this.runner?.root)return;
    if(active&&!this.chaiJets){
      const root=new TransformNode('dhaba chai backpack',this.scene);root.parent=this.runner.body;root.position.set(0,1.63,-.31);this.chaiJets=root;
      this.box('insulated chai boiler',.64,.73,.28,0,0,0,'#d4a057',root);
      this.box('pack leather harness',.71,.13,.31,0,.18,0,'#69432d',root);
      for(const side of [-1,1]){
        this.cyl('copper chai canister',.26,.83,side*.30,0,0,'#dbb26b',root,undefined,18);
        this.cyl('chai boiler lid',.29,.07,side*.30,.44,0,'#f8df9f',root,undefined,18);
        this.cyl('jet nozzle',.19,.17,side*.30,-.46,0,'#564838',root,undefined,14);
        const flame=MeshBuilder.CreateCylinder('chai jet plume',{height:.72,diameterTop:.12,diameterBottom:.025,tessellation:10},this.scene);
        flame.position.set(side*.30,-.87,0);flame.material=this.mat('chai jet amber','#ffb847');(flame.material as StandardMaterial).emissiveColor=Color3.FromHexString('#ff8b33');(flame.material as StandardMaterial).alpha=.80;flame.parent=root;this.chaiJetFlames.push(flame);
      }
      const gauge=this.ball('boiler pressure gauge',.18,0,.17,-.18,'#fff1c0',root);gauge.scaling.z=.3;

    }
    this.chaiJets?.setEnabled(active);
  }
  shake(intensity=.2,duration=.25){this.shakeIntensity=Math.max(this.shakeIntensity,intensity);this.shakeDuration=duration;}
  async setRunnerCharacter(source:string){const old=this.runner;const next=new Character(this,false,source);await next.ready;next.root.position.copyFrom(old.root.position);old.dispose();this.chaiJets=null;this.chaiJetFlames=[];this.runner=next;if(this.flightActive)this.setChaiActive(true);}
  quality(low:boolean){this.low=low;this.engine.setHardwareScalingLevel(low?Math.max(1.7,devicePixelRatio):Math.max(1,devicePixelRatio/1.5));this.scene.fogEnd=low?145:190;}
  update(dt:number,distanceDelta:number,playing:boolean,playerY:number,sliding:boolean) {
    if(this.chaiJets?.isEnabled()){const pulse=(this.flightStage==='landing'?.48:1)*(.88+Math.sin(this.time*25)*.12);for(const flame of this.chaiJetFlames)flame.scaling.y=pulse;this.chaiJets.rotation.y=Math.sin(this.time*3)*.035;}
    this.time+=dt;this.travel+=distanceDelta;
    for(const c of this.chunks){c.position.z-=distanceDelta;if(c.position.z< -48)c.position.z+=216;}
    this.city.update(this.travel,this.time);this.assets.update(this.travel);
    const running=this.mode==='running'||(this.mode==='intro'&&this.introProgress>.65),caught=this.mode==='crashed'||this.mode==='over';
    this.runner.animate(this.time,running,playerY,sliding,this.speed,dt,this.rollRemaining,this.boardActive);
    this.pursuer.animate(this.time+.15,(running||this.mode==='intro')&&!this.chaserBlocked,0,false,this.speed,dt);
    this.runner.root.rotation.y+=(playing&&!caught?0:Math.PI-this.runner.root.rotation.y)*(playing&&!caught?0:Math.min(1,dt*6));
    if(this.mode==='intro')this.runner.root.rotation.y=openingYaw(this.introProgress);
    else if(running)this.runner.root.rotation.y*=Math.exp(-dt*18);
    this.pursuer.root.rotation.y+=((caught||!playing?Math.PI:0)-this.pursuer.root.rotation.y)*(1-Math.exp(-dt*12));
    if(!playing)this.pursuer.root.position.z+=(-2-this.pursuer.root.position.z)*Math.min(1,dt*4);
    if(this.boardActive){
      const hoverBob=Math.sin(this.time*8.5)*.035;
      this.cruiserBoard.setEnabled(!this.flightActive);
      this.cruiserBoard.position.set(this.runner.root.position.x,playerY+.06+hoverBob,this.runner.root.position.z);
      this.cruiserBoard.rotation.y=this.runner.root.rotation.y+.30;
      this.cruiserBoard.rotation.z=-this.runner.root.position.x*.042;
      this.cruiserBoard.rotation.x=sliding?0:0.04;
    }
    let sx=0,sy=0;
    if(this.shakeDuration>0){
      this.shakeDuration-=dt;
      sx=(Math.random()-.5)*this.shakeIntensity;
      sy=(Math.random()-.5)*this.shakeIntensity;
      this.shakeIntensity*=Math.exp(-dt*7);
    }
    const jumpHeight=Math.max(0,playerY-this.groundHeight),jumpRise=!this.flightActive&&this.flightBlend<.1?groundCameraRise(jumpHeight):0;
    this.cameraElevation+=(this.groundHeight+jumpRise-this.cameraElevation)*(1-Math.exp(-dt*(jumpRise>0?14:7)));
    const jumpBack=!this.flightActive&&this.flightBlend<.1?jumpCameraPullback(jumpHeight):0;
    const portrait=innerWidth<innerHeight;
    if(!playing&&portrait&&innerWidth<=700)this.pursuer.root.position.set(-1.3,0,2.9);
    const flightTarget=playing?flightCameraTarget(this.flightActive,this.flightBlend,playerY-this.groundHeight):0;this.flightBlend+=(flightTarget-this.flightBlend)*(1-Math.exp(-dt*2.7));
    const desiredGround=playing?new Vector3(this.runner.root.position.x*(portrait?.035:.1)+sx,portrait?5.15+this.cameraElevation*.7+sy:5.4+this.cameraElevation*.7+sy,(portrait?-12.4:-10.8)-jumpBack):portrait&&innerWidth<=700?new Vector3(0,3.3,innerHeight<=700?-9.3:-8):new Vector3(-4.1,7,-14);
    const targetGround=playing?new Vector3(this.runner.root.position.x*(portrait?.025:.08)+sx*.5,2.0+this.cameraElevation*.7+sy*.5,portrait?16:18):portrait&&innerWidth<=700?new Vector3(0,innerHeight<=700?1.05:1.65,0):new Vector3(1,1.8,27);
    const air=flightCameraPose(playerY,portrait);
    const desiredAir=new Vector3(this.runner.root.position.x*(portrait?.035:.09)+sx,air.eyeY+sy,air.eyeZ);
    const targetAir=new Vector3(this.runner.root.position.x*(portrait?.025:.07)+sx*.5,air.targetY+sy*.3,air.targetZ);
    const desired=Vector3.Lerp(desiredGround,desiredAir,this.flightBlend),target=Vector3.Lerp(targetGround,targetAir,this.flightBlend);
    const factor=1-Math.exp(-dt*(this.flightActive||this.flightBlend>.1?8:jumpRise>0?9:5));this.camera.position=Vector3.Lerp(this.camera.position,desired,factor);
    const groundFov=!playing&&portrait&&innerWidth<=700?.74:groundRunFov(innerWidth,innerHeight,running?this.speed:14),airFov=airCameraFov(innerWidth,innerHeight);this.camera.fov=groundFov+(airFov-groundFov)*this.flightBlend;
    if(playing)target.y=frameRunnerTargetY(this.camera.position.y,this.camera.position.z,target.y,target.z,playerY,this.camera.fov);
    this.camera.setTarget(target);
    if(playing){
      const lateralDist=this.runner.root.position.x;
      this.camera.rotation.z+=(-lateralDist*.012-this.camera.rotation.z)*(1-Math.exp(-dt*10));
    }
    if(!playing)this.pursuer.root.position.x+=(-1.15-this.pursuer.root.position.x)*(1-Math.exp(-dt*3));
  }
}
