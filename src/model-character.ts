import { CHARACTER_FILES } from './asset-manifest.mjs';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { limbWeights } from './rig-weights.mjs';
import '@babylonjs/loaders/glTF';
import type { KarachiWorld } from './world';

export class ModelCharacter {
  root:TransformNode;body:TransformNode;shadow:Mesh;ready:Promise<void>;phase=0;bones:Bone[]=[];source='';
  private surfaces:{mesh:Mesh;points:number[];indices:number[];weights:number[]}[]=[];
  private gait=0;private landing=0;private lastX=0;
  private squashFactor=1;private squashTarget=1;private squashDuration=0;
  squash(factor=.78,duration=.14){this.squashTarget=factor;this.squashDuration=duration;}
  stretch(factor=1.15,duration=.14){this.squashTarget=factor;this.squashDuration=duration;}
  land(){this.landing=1;this.squash(.80,.14);}
  dispose(){this.root.dispose(false,true);this.shadow.dispose();this.snack?.dispose(false,true);}
  private armMask:Uint8Array|null=null;
  private nativeJoints:{node:TransformNode;rest:Quaternion;axisX:Vector3;axisZ:Vector3;name:string;side:number}[]=[];
  private snack:TransformNode|null=null;
  constructor(private w:KarachiWorld,police:boolean,runnerSource?:string){
    this.root=new TransformNode(police?'Asim supplied GLB':'Imran supplied GLB',w.scene);this.body=new TransformNode('animated model',w.scene);this.body.parent=this.root;
    this.shadow=MeshBuilder.CreateDisc('model ground shadow',{radius:.58,tessellation:32},w.scene);this.shadow.rotation.x=Math.PI/2;this.shadow.position.y=.019;this.shadow.scaling.y=.7;this.shadow.material=w.mat('shadow','#3d5050');this.shadow.visibility=.36;
    this.source=runnerSource??CHARACTER_FILES[police?1:0];this.ready=this.load();
    if(!police){this.snack=new TransformNode('gola ganda',w.scene);const ice=MeshBuilder.CreateSphere('rose ice',{diameter:.18,segments:8},w.scene);ice.material=w.mat('rose ice','#e84d78');ice.parent=this.snack;const stick=MeshBuilder.CreateCylinder('ice stick',{height:.22,diameter:.025,tessellation:6},w.scene);stick.position.y=-.13;stick.material=w.mat('ice stick','#e3c592');stick.parent=this.snack;this.snack.setEnabled(false);}
  }
  private async load(){
    if(this.source==='imran.glb'){const response=await fetch('/models/imran-arms.bin');if(!response.ok)throw new Error('Missing character skin mask');this.armMask=new Uint8Array(await response.arrayBuffer());}
    const result=await SceneLoader.ImportMeshAsync(null,this.source==='imran.glb'||this.source==='asim.glb'?'/models/':'/',this.source,this.w.scene);
    const container=new TransformNode('supplied model normalization',this.w.scene);container.rotation.y=0;
    for(const mesh of result.meshes)if(!mesh.parent)mesh.parent=container;
    const meshes=result.meshes.filter((m):m is Mesh=>m instanceof Mesh&&m.getTotalVertices()>0);
    const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
    for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;min.minimizeInPlace(b.minimumWorld);max.maximizeInPlace(b.maximumWorld);}
    const height=max.y-min.y,scale=2.86/height;container.scaling.setAll(scale);container.position.set(-(min.x+max.x)/2*scale,-min.y*scale,-(min.z+max.z)/2*scale);container.parent=this.body;
    // The supplied meshes have no skin or clips. Add a small GPU skin in the existing bind pose.
    if(result.skeletons.length){
      for(const skeleton of result.skeletons)for(const bone of skeleton.bones){const node=bone.getTransformNode();if(!node)continue;node.computeWorldMatrix(true);const parent=node.parent as TransformNode|null;const inverse=parent?parent.computeWorldMatrix(true).clone().invert():Matrix.Identity();this.nativeJoints.push({node,rest:node.rotationQuaternion?.clone()??Quaternion.FromEulerVector(node.rotation),axisX:Vector3.TransformNormal(Vector3.Right(),inverse).normalize().scaleInPlace(inverse.determinant()<0?-1:1),axisZ:Vector3.TransformNormal(Vector3.Forward(),inverse).normalize().scaleInPlace(inverse.determinant()<0?-1:1),name:bone.name.toLowerCase(),side:node.getAbsolutePosition().x>=0?1:-1});}
      for(const mesh of meshes){const p=mesh.getVerticesData(VertexBuffer.PositionKind),ix=mesh.getVerticesData(VertexBuffer.MatricesIndicesKind),wt=mesh.getVerticesData(VertexBuffer.MatricesWeightsKind);if(!p||!ix||!wt||!mesh.skeleton)continue;const points:number[]=[],indices:number[]=[],weights:number[]=[];for(let v=0;v<p.length/3;v+=Math.max(1,Math.floor(p.length/3/240))){points.push(...p.slice(v*3,v*3+3));indices.push(...ix.slice(v*4,v*4+4));weights.push(...wt.slice(v*4,v*4+4));}this.surfaces.push({mesh,points,indices,weights});}
    }else for(const mesh of meshes)this.rig(mesh);
    for(const mesh of meshes){mesh.alwaysSelectAsActiveMesh=true;mesh.isPickable=false;}
  }
  private rig(mesh:Mesh){
    const p=mesh.getVerticesData(VertexBuffer.PositionKind);if(!p)return;
    let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity;for(let i=0;i<p.length;i+=3){minX=Math.min(minX,p[i]);maxX=Math.max(maxX,p[i]);minY=Math.min(minY,p[i+1]);maxY=Math.max(maxY,p[i+1]);}
    const h=maxY-minY,cx=(minX+maxX)/2,width=maxX-minX;
    // Remove the baked forward/back foot stagger before creating the bind pose.
    const feet=[{z:0,n:0},{z:0,n:0}];
    for(let i=0;i<p.length;i+=3)if((p[i+1]-minY)/h<.085){const f=feet[p[i]<cx?0:1];f.z+=p[i+2];f.n++;}
    const centers=feet.map(f=>f.n?f.z/f.n:0),mid=(centers[0]+centers[1])/2;
    for(let i=0;i<p.length;i+=3){const y=(p[i+1]-minY)/h;if(y<.47){const leg=limbWeights(p[i]-cx,y,width);p[i+2]-=(centers[p[i]<cx?0:1]-mid)*Math.max(0,1-y/.47)*(1-leg.arm);}}
    mesh.setVerticesData(VertexBuffer.PositionKind,p);
    const normals=mesh.getVerticesData(VertexBuffer.NormalKind),triangles=mesh.getIndices();if(normals&&triangles){VertexData.ComputeNormals(p,triangles,normals);mesh.setVerticesData(VertexBuffer.NormalKind,normals);}
    const skeleton=new Skeleton(this.source+' automatic run rig',this.source,this.w.scene),root=new Bone('pelvis and torso',skeleton,null,Matrix.Identity());
    const bones=[root],hipY=minY+h*.47,kneeY=minY+h*.245,shoulderY=minY+h*.79,elbowY=minY+h*.62;
    for(const side of [-1,1]){const hip=new Bone('thigh '+side,skeleton,root,Matrix.Translation(cx+side*width*.17,hipY,0));const knee=new Bone('calf '+side,skeleton,hip,Matrix.Translation(0,kneeY-hipY,0));bones.push(hip,knee);}
    const spineY=minY+h*.52;
    const spine=new Bone('flexible spine',skeleton,root,Matrix.Translation(0,spineY,0));
    for(const side of [-1,1]){const arm=new Bone('upper arm '+side,skeleton,spine,Matrix.Translation(cx+side*width*.32,shoulderY-spineY,0));const forearm=new Bone('forearm '+side,skeleton,arm,Matrix.Translation(0,elbowY-shoulderY,0));bones.push(arm,forearm);}
    bones.push(spine);
    const indices=new Float32Array(p.length/3*4),weights=new Float32Array(indices.length);
    const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
    for(let v=0;v<p.length/3;v++){
      const x=p[v*3]-cx,y=(p[v*3+1]-minY)/h,side=x<0?0:1,ix=v*4;indices[ix]=0;weights[ix]=1;
      const limb=limbWeights(x,y,width);
      // The loose shirt occupies the same horizontal band as the hands. Use the
      // supplied texture's skin mask so lower shirt vertices stay with the torso.
      if(this.armMask&&y>.34&&y<.57&&this.armMask[v]===0){limb.torso+=limb.arm;limb.arm=0;limb.upperArm=0;limb.forearm=0;}
      if(limb.arm>.001){const arm=5+side*2;indices[ix]=y>.52?skeleton.bones.indexOf(spine):0;weights[ix]=limb.torso;indices[ix+1]=skeleton.bones.indexOf(bones[arm]);weights[ix+1]=limb.upperArm;indices[ix+2]=skeleton.bones.indexOf(bones[arm+1]);weights[ix+2]=limb.forearm;indices[ix+3]=1+side*2;weights[ix+3]=limb.thigh+limb.calf;}
      else if(y<.48){const thigh=1+side*2;indices[ix+1]=thigh;indices[ix+2]=thigh+1;weights[ix]=limb.torso;weights[ix+1]=limb.thigh;weights[ix+2]=limb.calf;}
      else {const torsoWeight=smooth(.48,.60,y);indices[ix+3]=skeleton.bones.indexOf(spine);weights[ix]=1-torsoWeight;weights[ix+3]=torsoWeight;
      }
    }
    mesh.setVerticesData(VertexBuffer.MatricesIndicesKind,indices,false,4);mesh.setVerticesData(VertexBuffer.MatricesWeightsKind,weights,false,4);mesh.numBoneInfluencers=4;mesh.skeleton=skeleton;skeleton.prepare();this.bones.push(...bones);
    const points:number[]=[],sampleIndices:number[]=[],sampleWeights:number[]=[];
    for(let v=0;v<p.length/3;v+=Math.max(1,Math.floor(p.length/3/900))){points.push(p[v*3],p[v*3+1],p[v*3+2]);sampleIndices.push(...indices.slice(v*4,v*4+4));sampleWeights.push(...weights.slice(v*4,v*4+4));}
    this.surfaces.push({mesh,points,indices:sampleIndices,weights:sampleWeights});
  }
  animate(t:number,running:boolean,y:number,slide:boolean,speed=14,dt=.016,rollRemaining=0,boardRiding=false){
    this.gait+=((running?1:0)-this.gait)*(1-Math.exp(-dt*12));const moving=this.gait>.01&&!boardRiding;
    if(moving)this.phase+=this.gait*dt*(16.0+Math.max(0,speed-14)*.26);const cycle=this.phase,airborne=this.source==='pakistani_boy.glb'?this.w.airborne:y>.12;
    this.root.position.y=y;
    const roll=slide?Math.max(0,Math.min(1,1-rollRemaining/.68)):0;
    this.landing*=Math.exp(-dt*13);const lateral=(this.root.position.x-this.lastX)/Math.max(dt,.001);this.lastX=this.root.position.x;
    if(this.squashDuration>0){
      this.squashDuration-=dt;
      this.squashFactor+=(this.squashTarget-this.squashFactor)*(1-Math.exp(-dt*28));
      if(this.squashDuration<=0)this.squashTarget=1;
    }else{
      this.squashFactor+=(1-this.squashFactor)*(1-Math.exp(-dt*18));
    }
    const sY=this.squashFactor;
    const sXZ=Math.sqrt(1/Math.max(.2,sY));
    this.body.scaling.set(sXZ,sY,sXZ);
    const fwdLean=slide?0:boardRiding?.08:this.gait*.22+this.landing*.14;
    this.body.rotation.set(
      slide?Math.PI*2*(roll*roll*(3-2*roll)):fwdLean,
      boardRiding?.35:running&&!slide?Math.sin(cycle)*.07:0,
      running&&!slide?Math.max(-.25,Math.min(.25,-lateral*.024))+(boardRiding?0:Math.sin(cycle)*.025):0
    );
    const stepHop=running&&!boardRiding&&!slide?Math.abs(Math.sin(cycle))*.10:boardRiding?Math.sin(t*8.5)*.02:Math.sin(t*1.7)*.009;
    const slideDrop=slide?-0.42*(1-Math.abs(roll-.5)*2):0;
    this.body.position.set(0,stepHop+slideDrop,0);
    for(const joint of this.nativeJoints){const n=joint.name;const wave=Math.sin(cycle+(n.includes('right')?Math.PI:0));let pitch=0,lower=0;
      if(boardRiding&&!slide){
        if(/upleg/.test(n))pitch=-.22;
        else if(/leg/.test(n)&&!/(end|root)/.test(n))pitch=.48;
        else if(/forearm/.test(n))pitch=-.75;
        else if(/arm/.test(n)&&!/(forearm|end)/.test(n)){lower=-joint.side*1.50;pitch=-.42;}
        else if(/foot/.test(n))pitch=-.16;
        else if(/spine/.test(n))pitch=.10;
      }else if(slide){
        if(/upleg/.test(n))pitch=-2.45;
        else if(/leg/.test(n)&&!/(end|root)/.test(n))pitch=2.85;
        else if(/forearm/.test(n))pitch=-2.25;
        else if(/arm/.test(n)&&!/(forearm|end)/.test(n)){lower=-joint.side*1.15;pitch=-1.35;}
        else if(/foot/.test(n))pitch=-.38;
        else if(/spine/.test(n))pitch=.98;
      }else if(airborne){
        const isRight=n.includes('right');
        if(/upleg/.test(n))pitch=isRight?-1.35:.50;
        else if(/leg/.test(n)&&!/(end|root)/.test(n))pitch=isRight?1.85:.40;
        else if(/forearm/.test(n))pitch=-.95;
        else if(/arm/.test(n)&&!/(forearm|end)/.test(n)){lower=-joint.side*1.55;pitch=-.60;}
        else if(/foot/.test(n))pitch=-.20;
        else if(/spine/.test(n))pitch=.22;
      }else{
        if(/upleg/.test(n))pitch=wave*1.12*this.gait;
        else if(/leg/.test(n)&&!/(end|root)/.test(n))pitch=(.22+Math.max(0,-wave)*1.85)*this.gait;
        else if(/forearm/.test(n))pitch=(-1.50+Math.sin(cycle)*.30)*this.gait;
        else if(/arm/.test(n)&&!/(forearm|end)/.test(n)){lower=-joint.side*1.35;pitch=-wave*1.15*this.gait;}
        else if(/foot/.test(n))pitch=-wave*.32*this.gait;
        else if(/spine/.test(n))pitch=.16*this.gait+this.landing*.08;
      }
      if(this.w.mode==='intro'&&this.source==='pakistani_boy.glb'&&n.includes('right')){if(/forearm/.test(n))pitch=-1.7;else if(/arm/.test(n))pitch=-.65;}
      joint.node.rotationQuaternion=Quaternion.RotationAxis(joint.axisX,pitch).multiply(Quaternion.RotationAxis(joint.axisZ,lower)).multiply(joint.rest);
    }
    this.bones.forEach((b,i)=>{const n=i%10;let a=0;
      if(boardRiding&&!slide){
        if(n===1||n===3)a=-.22;
        if(n===2||n===4)a=.48;
        if(n===5||n===7)a=-.48;
        if(n===6||n===8)a=-.82;
        if(n===9)a=.10;
      }else if(slide){
        if(n===1||n===3)a=-2.45;
        if(n===2||n===4)a=2.85;
        if(n===5||n===7)a=-1.25;
        if(n===6||n===8)a=-2.05;
        if(n===9)a=1.35;
      }else if(airborne){
        if(n===1)a=-1.30;if(n===3)a=.45;if(n===2)a=1.80;if(n===4)a=.38;if(n===5||n===7)a=-.70;if(n===6||n===8)a=-.95;if(n===9)a=.22;
      }else if(moving){
        if(n===1||n===3)a=Math.sin(cycle+(n===3?Math.PI:0))*1.08-.12;
        if(n===2||n===4)a=.24+Math.max(0,-Math.sin(cycle+(n===4?Math.PI:0)))*1.85;
        if(n===5||n===7)a=Math.sin(cycle+(n===5?Math.PI:0))*1.05;
        if(n===6||n===8)a=-1.45+Math.sin(cycle+(n===8?Math.PI:0))*.30;
        if(n===9)a=.15+Math.sin(cycle*2)*.04;
      }
      if(!slide&&!boardRiding&&!airborne)a*=this.gait;
      const twist=running&&!slide&&!boardRiding&&n===0?Math.sin(cycle)*.09:running&&!slide&&!boardRiding&&n===9?-Math.sin(cycle)*.11:0;
      const relaxedArmRoll=n===6?1.22:n===8?-1.22:0;
      b.setRotationQuaternion(Quaternion.RotationYawPitchRoll(twist,a,relaxedArmRoll*(1-this.gait)));
    });
    // Ground the bent, rotating mesh itself; do not flatten or shrink the person's body.
    if(moving||slide){let ground=Infinity;
      for(const s of this.surfaces){s.mesh.skeleton!.prepare();const matrices=s.mesh.skeleton!.getTransformMatrices(s.mesh),world=s.mesh.computeWorldMatrix(true);
        for(let v=0;v<s.points.length/3;v++){const px=s.points[v*3],py=s.points[v*3+1],pz=s.points[v*3+2];let ax=0,ay=0,az=0;
          for(let j=0;j<4;j++){const weight=s.weights[v*4+j];if(!weight)continue;const m=s.indices[v*4+j]*16;ax+=(px*matrices[m]+py*matrices[m+4]+pz*matrices[m+8]+matrices[m+12])*weight;ay+=(px*matrices[m+1]+py*matrices[m+5]+pz*matrices[m+9]+matrices[m+13])*weight;az+=(px*matrices[m+2]+py*matrices[m+6]+pz*matrices[m+10]+matrices[m+14])*weight;}
          const pos=Vector3.TransformCoordinates(new Vector3(ax,ay,az),world);ground=Math.min(ground,pos.y);
        }
      }
      if(Number.isFinite(ground))this.body.position.y+=y+.025-ground+(slide?0:Math.abs(Math.sin(cycle))*.045);
    }
    this.shadow.position.x=this.root.position.x;this.shadow.position.z=this.root.position.z;this.shadow.visibility=Math.max(.12,.36-y*.08);
    if(this.snack){this.snack.setEnabled(this.w.mode==='intro');if(this.w.mode==='intro'){const hand=this.nativeJoints.find(j=>/right.*hand/.test(j.name)&&!/(index|thumb|middle|ring|pinky)/.test(j.name));if(hand){hand.node.computeWorldMatrix(true);this.snack.position.copyFrom(hand.node.getAbsolutePosition());this.snack.position.y+=.08;}}}
  }
}
