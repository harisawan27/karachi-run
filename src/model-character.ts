import { CHARACTER_FILES } from './asset-manifest.mjs';
import { runCadence } from './core.mjs';
import { jointPose, sprintLift, ROLL_DURATION } from './runner-motion.mjs';
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
  private surfaces:{mesh:Mesh;points:number[];indices:number[];weights:number[];feet:number[]}[]=[];
  private gait=0;private landing=0;private lastX=0;private lastY=0;private groundOffset=0;
  private squashFactor=1;private squashTarget=1;private squashDuration=0;
  squash(factor=.78,duration=.14){this.squashTarget=factor;this.squashDuration=duration;}
  stretch(factor=1.15,duration=.14){this.squashTarget=factor;this.squashDuration=duration;}
  land(){this.landing=1;this.squash(.96,.10);}
  dispose(){this.root.dispose(false,true);this.shadow.dispose();this.snack?.dispose(false,true);}
  private armMask:Uint8Array|null=null;
  private nativeJoints:{node:TransformNode;rest:Quaternion;axisX:Vector3;axisZ:Vector3;name:string;side:number}[]=[];
  private snack:TransformNode|null=null;
  constructor(private w:KarachiWorld,private police:boolean,runnerSource?:string){
    this.root=new TransformNode(police?'Asim supplied GLB':'Imran supplied GLB',w.scene);this.body=new TransformNode('animated model',w.scene);this.body.parent=this.root;this.body.setPivotPoint(new Vector3(0,1.25,0));
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
    // Use supplied skeletons when present; otherwise bind a small GPU skin to the static model.
    if(result.skeletons.length){
      for(const skeleton of result.skeletons)for(const bone of skeleton.bones){const node=bone.getTransformNode();if(!node)continue;node.computeWorldMatrix(true);const parent=node.parent as TransformNode|null;const inverse=parent?parent.computeWorldMatrix(true).clone().invert():Matrix.Identity();this.nativeJoints.push({node,rest:node.rotationQuaternion?.clone()??Quaternion.FromEulerVector(node.rotation),axisX:Vector3.TransformNormal(Vector3.Right(),inverse).normalize().scaleInPlace(inverse.determinant()<0?-1:1),axisZ:Vector3.TransformNormal(Vector3.Forward(),inverse).normalize().scaleInPlace(inverse.determinant()<0?-1:1),name:bone.name.toLowerCase(),side:node.getAbsolutePosition().x>=0?1:-1});}
      for(const mesh of meshes){const p=mesh.getVerticesData(VertexBuffer.PositionKind),ix=mesh.getVerticesData(VertexBuffer.MatricesIndicesKind),wt=mesh.getVerticesData(VertexBuffer.MatricesWeightsKind);if(!p||!ix||!wt||!mesh.skeleton)continue;const points:number[]=[],indices:number[]=[],weights:number[]=[],feet:number[]=[];for(let v=0;v<p.length/3;v+=Math.max(1,Math.floor(p.length/3/240))){points.push(...p.slice(v*3,v*3+3));indices.push(...ix.slice(v*4,v*4+4));weights.push(...wt.slice(v*4,v*4+4));let footWeight=0;for(let j=0;j<4;j++)if(/foot|toe/i.test(mesh.skeleton.bones[ix[v*4+j]]?.name??''))footWeight+=wt[v*4+j];feet.push(footWeight>.25?1:0);}this.surfaces.push({mesh,points,indices,weights,feet});}
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
    const points:number[]=[],sampleIndices:number[]=[],sampleWeights:number[]=[],footSamples:number[]=[];
    for(let v=0;v<p.length/3;v+=Math.max(1,Math.floor(p.length/3/900))){points.push(p[v*3],p[v*3+1],p[v*3+2]);sampleIndices.push(...indices.slice(v*4,v*4+4));sampleWeights.push(...weights.slice(v*4,v*4+4));footSamples.push((p[v*3+1]-minY)/h<.14?1:0);}
    this.surfaces.push({mesh,points,indices:sampleIndices,weights:sampleWeights,feet:footSamples});
  }
  animate(t:number,running:boolean,y:number,slide:boolean,speed=14,dt=.016,rollRemaining=0,boardRiding=false){
    const blend=1-Math.exp(-dt*(slide?42:34));
    this.gait+=((running?1:0)-this.gait)*(1-Math.exp(-dt*12));
    const flying=!this.police&&this.w.flightActive,airborne=!this.police&&this.w.airborne;
    const moving=this.gait>.01&&!boardRiding;
    if(moving&&!airborne&&!slide)this.phase+=this.gait*dt*runCadence(speed);
    const cycle=this.phase,verticalSpeed=(y-this.lastY)/Math.max(dt,.001);this.lastY=y;
    const pose=slide?'roll':flying?'flight':boardRiding?'board':airborne?'jump':moving?'run':'idle';
    this.root.position.y=y;
    const roll=slide?Math.max(0,Math.min(1,1-rollRemaining/ROLL_DURATION)):0;
    this.landing*=Math.exp(-dt*13);
    const lateral=(this.root.position.x-this.lastX)/Math.max(dt,.001);this.lastX=this.root.position.x;
    if(this.squashDuration>0){this.squashDuration-=dt;this.squashFactor+=(this.squashTarget-this.squashFactor)*blend;if(this.squashDuration<=0)this.squashTarget=1;}
    else this.squashFactor+=(1-this.squashFactor)*blend;
    const sY=Math.max(.94,Math.min(1.04,this.squashFactor)),sXZ=Math.sqrt(1/sY);
    this.body.scaling.set(sXZ,sY,sXZ);
    const lean=slide?Math.PI*2*roll:flying?.025:boardRiding?.06:this.gait*.145+this.landing*.055;
    const bank=running&&!slide?Math.max(-.15,Math.min(.15,-lateral*.015)):0;
    const bodyTarget=Quaternion.FromEulerAngles(lean,boardRiding?.22:pose==='run'?Math.sin(cycle)*.035+Math.max(-.12,Math.min(.12,lateral*.012)):0,bank);
    this.body.rotationQuaternion=Quaternion.Slerp(this.body.rotationQuaternion??Quaternion.Identity(),bodyTarget,blend);
    const stepHop=pose==='run'?0:pose==='board'?Math.sin(t*8.5)*.014:pose==='idle'?Math.sin(t*1.7)*.007:0;
    this.body.position.set(0,stepHop,0);
    for(const joint of this.nativeJoints){
      const angles=jointPose(joint.name,joint.side,cycle,pose,this.gait,this.landing,verticalSpeed);
      if(this.w.mode==='intro'&&this.w.introProgress<.50&&this.source==='pakistani_boy.glb'&&joint.name.includes('right')){
        if(/forearm/.test(joint.name))angles.pitch=-1.7;else if(/arm/.test(joint.name))angles.pitch=-.65;
      }
      // Recompute hinges in the current parent frame. Lowering a T-pose arm
      // rotates its elbow's bind-frame hinge; a cached axis twists the forearm.
      let target=joint.rest;
      if(Math.abs(angles.pitch)+Math.abs(angles.roll)+Math.abs(angles.yaw)>.00001){
      const parent=joint.node.parent as TransformNode|null;
      const inverse=parent?parent.computeWorldMatrix(true).clone().invert():Matrix.Identity();
      const frame=this.body.computeWorldMatrix(true),handed=inverse.determinant()<0?-1:1;
      const axis=(direction:Vector3)=>Vector3.TransformNormal(Vector3.TransformNormal(direction,frame),inverse).normalize().scaleInPlace(handed);
      target=Quaternion.RotationAxis(axis(Vector3.Right()),angles.pitch).multiply(Quaternion.RotationAxis(axis(Vector3.Forward()),angles.roll)).multiply(Quaternion.RotationAxis(axis(Vector3.Up()),angles.yaw)).multiply(joint.rest);
      }
      joint.node.rotationQuaternion=Quaternion.Slerp(joint.node.rotationQuaternion??joint.rest,target,blend);
    }
    const names=['hips','leftupleg','leftleg','rightupleg','rightleg','leftarm','leftforearm','rightarm','rightforearm','spine'];
    this.bones.forEach((bone,i)=>{
      const n=i%10,angles=jointPose(names[n],n===1||n===2||n===5||n===6?-1:1,cycle,pose,this.gait,this.landing,verticalSpeed,false);
      const relaxed=pose==='idle'?(n===6?1.22:n===8?-1.22:0):0;
      const target=Quaternion.RotationYawPitchRoll(angles.yaw,angles.pitch,relaxed);
      bone.setRotationQuaternion(Quaternion.Slerp(bone.getRotationQuaternion()??Quaternion.Identity(),target,blend));
    });
    // Plant feet during locomotion; use the tucked body's silhouette during a roll.
    // Avoid per-vertex Vector3 allocations and sudden pelvis-height corrections.
    let ground=Infinity;
    for(const surface of this.surfaces){
      const skeleton=surface.mesh.skeleton!;skeleton.prepare(true);
      const matrices=skeleton.getTransformMatrices(surface.mesh),world=surface.mesh.computeWorldMatrix(true).m;
      for(let v=0;v<surface.points.length/3;v++){
        if(!slide&&!surface.feet[v])continue;
        const px=surface.points[v*3],py=surface.points[v*3+1],pz=surface.points[v*3+2];let ax=0,ay=0,az=0;
        for(let j=0;j<4;j++){const weight=surface.weights[v*4+j];if(!weight)continue;const m=surface.indices[v*4+j]*16;ax+=(px*matrices[m]+py*matrices[m+4]+pz*matrices[m+8]+matrices[m+12])*weight;ay+=(px*matrices[m+1]+py*matrices[m+5]+pz*matrices[m+9]+matrices[m+13])*weight;az+=(px*matrices[m+2]+py*matrices[m+6]+pz*matrices[m+10]+matrices[m+14])*weight;}
        ground=Math.min(ground,ax*world[1]+ay*world[5]+az*world[9]+world[13]);
      }
    }
    const offset=Number.isFinite(ground)?Math.max(slide?-1.5:-.4,Math.min(slide?1.5:.5,y+.025-ground)):0;
    if(slide)this.groundOffset=offset;else this.groundOffset+=(offset-this.groundOffset)*(1-Math.exp(-dt*25));
    if(!airborne&&offset>this.groundOffset)this.groundOffset=offset;
    this.body.position.y+=this.groundOffset+(pose==='run'?sprintLift(cycle)*this.gait:0)-this.landing*.045;
    this.shadow.position.x=this.root.position.x;this.shadow.position.z=this.root.position.z;const floor=this.police?0:(this.w.groundHeight??0),altitude=Math.max(0,y-floor);this.shadow.position.y=floor+.019;this.shadow.visibility=Math.max(.045,.36/(1+altitude*.45));this.shadow.scaling.set(1+altitude*.025,.7+altitude*.018,1);
    if(this.snack){this.snack.setEnabled(this.w.mode==='intro'&&this.w.introProgress<.50);if(this.w.mode==='intro'){const hand=this.nativeJoints.find(j=>/right.*hand/.test(j.name)&&!/(index|thumb|middle|ring|pinky)/.test(j.name));if(hand){hand.node.computeWorldMatrix(true);this.snack.position.copyFrom(hand.node.getAbsolutePosition());this.snack.position.y+=.08;}}}
  }
}
