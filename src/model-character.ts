import { CHARACTER_FILES } from './asset-manifest.mjs';
import { runCadence } from './core.mjs';
import { jointPose, sprintLift, ROLL_DURATION } from './runner-motion.mjs';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { createScanRig } from './scan-rig.mjs';
import sprintClip from './haris-sprint.mjs';
import jumpClip from './haris-jump.mjs';
import {jumpClipProgress} from './air-movement.mjs';
import '@babylonjs/loaders/glTF';
import type { KarachiWorld } from './world';

export class ModelCharacter {
  root:TransformNode;body:TransformNode;shadow:Mesh;ready:Promise<void>;phase=0;source='';
  private surfaces:{mesh:Mesh;points:number[];indices:number[];weights:number[];feet:number[]}[]=[];
  private gait=0;private landing=0;private lastX=0;private lastY=0;private groundOffset=0;
  // The comparison playground can select the previous gait without changing physics.
  useSprintClip=true;
  private sprintTracks=new Map<string,Quaternion[]>();private jumpTracks=new Map<string,Quaternion[]>();private clipBlend=0;
  private clipTarget=new Quaternion();
  private squashFactor=1;private squashTarget=1;private squashDuration=0;
  squash(factor=.78,duration=.14){this.squashTarget=factor;this.squashDuration=duration;}
  stretch(factor=1.15,duration=.14){this.squashTarget=factor;this.squashDuration=duration;}
  land(impactSpeed=14){this.landing=Math.max(.3,Math.min(1,impactSpeed/22));this.phase=Math.round(this.phase/Math.PI)*Math.PI;this.squash(.98,.08);}
  dispose(){for(const skeleton of new Set(this.surfaces.map(surface=>surface.mesh.skeleton)))skeleton?.dispose();this.root.dispose(false,true);this.shadow.dispose();this.snack?.dispose(false,true);}
  private armMask:Uint8Array|null=null;
  private nativeJoints:{node:TransformNode;rest:Quaternion;name:string;side:number;armsDown:boolean}[]=[];
  private snack:TransformNode|null=null;
  constructor(private w:KarachiWorld,private police:boolean,runnerSource?:string){
    this.root=new TransformNode(police?'warden model':'runner model',w.scene);this.body=new TransformNode('animated model',w.scene);this.body.parent=this.root;this.body.setPivotPoint(new Vector3(0,1.25,0));
    this.shadow=MeshBuilder.CreateDisc('model ground shadow',{radius:.58,tessellation:32},w.scene);this.shadow.rotation.x=Math.PI/2;this.shadow.position.y=.019;this.shadow.scaling.y=.7;this.shadow.material=w.mat('shadow','#3d5050');this.shadow.visibility=.36;
    this.source=runnerSource??CHARACTER_FILES[police?1:0];this.ready=this.load();
    if(!police){this.snack=new TransformNode('gola ganda',w.scene);const ice=MeshBuilder.CreateSphere('rose ice',{diameter:.18,segments:8},w.scene);ice.material=w.mat('rose ice','#e84d78');ice.parent=this.snack;const stick=MeshBuilder.CreateCylinder('ice stick',{height:.22,diameter:.025,tessellation:6},w.scene);stick.position.y=-.13;stick.material=w.mat('ice stick','#e3c592');stick.parent=this.snack;this.snack.setEnabled(false);}
  }
  private async load(){
    if(this.source==='imran.glb'){const response=await fetch('/models/imran-arm-weights.bin');if(!response.ok)throw new Error('Missing character arm weights');this.armMask=new Uint8Array(await response.arrayBuffer());}
    const result=await SceneLoader.ImportMeshAsync(null,this.source==='imran.glb'||this.source==='asim.glb'?'/models/':'/',this.source,this.w.scene);
    const container=new TransformNode('supplied model normalization',this.w.scene);container.rotation.y=0;
    for(const mesh of result.meshes)if(!mesh.parent)mesh.parent=container;
    const meshes=result.meshes.filter((m):m is Mesh=>m instanceof Mesh&&m.getTotalVertices()>0);
    const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
    for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;min.minimizeInPlace(b.minimumWorld);max.maximizeInPlace(b.maximumWorld);}
    const height=max.y-min.y,scale=2.86/height;container.scaling.setAll(scale);container.position.set(-(min.x+max.x)/2*scale,-min.y*scale,-(min.z+max.z)/2*scale);container.parent=this.body;
    // Use supplied skeletons when present; otherwise bind a small GPU skin to the static model.
    if(result.skeletons.length){
      for(const skeleton of result.skeletons)this.registerJoints(skeleton,false);
      for(const mesh of meshes){const p=mesh.getVerticesData(VertexBuffer.PositionKind),ix=mesh.getVerticesData(VertexBuffer.MatricesIndicesKind),wt=mesh.getVerticesData(VertexBuffer.MatricesWeightsKind);if(!p||!ix||!wt||!mesh.skeleton)continue;const points:number[]=[],indices:number[]=[],weights:number[]=[],feet:number[]=[];for(let v=0;v<p.length/3;v+=Math.max(1,Math.floor(p.length/3/240))){points.push(...p.slice(v*3,v*3+3));indices.push(...ix.slice(v*4,v*4+4));weights.push(...wt.slice(v*4,v*4+4));let footWeight=0;for(let j=0;j<4;j++)if(/foot|toe/i.test(mesh.skeleton.bones[ix[v*4+j]]?.name??''))footWeight+=wt[v*4+j];feet.push(footWeight>.25?1:0);}this.surfaces.push({mesh,points,indices,weights,feet});}
    }else for(const mesh of meshes)this.rig(mesh);
    for(const mesh of meshes){mesh.alwaysSelectAsActiveMesh=true;mesh.isPickable=false;}
    if(this.source==='pakistani_boy.glb'){
      for(const [name,frames]of Object.entries(sprintClip.tracks))this.sprintTracks.set(name,frames.map(q=>Quaternion.FromArray(q)));
      for(const [name,frames]of Object.entries(jumpClip.tracks))this.jumpTracks.set(name,frames.map(q=>Quaternion.FromArray(q)));
    }
  }
  private registerJoints(skeleton:Skeleton,armsDown:boolean){
    for(const bone of skeleton.bones){
      const node=bone.getTransformNode();if(!node)continue;node.computeWorldMatrix(true);
      this.nativeJoints.push({node,rest:node.rotationQuaternion?.clone()??Quaternion.FromEulerVector(node.rotation),name:bone.name.toLowerCase(),side:node.getAbsolutePosition().x>=0?1:-1,armsDown});
    }
  }
  private rig(mesh:Mesh){
    const {skeleton,fit}=createScanRig(mesh,{armMask:this.armMask,longShirt:this.source==='imran.glb'});
    this.registerJoints(skeleton,true);
    const p=mesh.getVerticesData(VertexBuffer.PositionKind)!,indices=mesh.getVerticesData(VertexBuffer.MatricesIndicesKind)!,weights=mesh.getVerticesData(VertexBuffer.MatricesWeightsKind)!;
    const points:number[]=[],sampleIndices:number[]=[],sampleWeights:number[]=[],feet:number[]=[];
    for(let v=0;v<p.length/3;v+=Math.max(1,Math.floor(p.length/3/900))){points.push(...p.slice(v*3,v*3+3));sampleIndices.push(...indices.slice(v*4,v*4+4));sampleWeights.push(...weights.slice(v*4,v*4+4));feet.push((p[v*3+1]-fit.minY)/fit.height<.14?1:0);}
    this.surfaces.push({mesh,points,indices:sampleIndices,weights:sampleWeights,feet});
  }
  animate(t:number,running:boolean,y:number,slide:boolean,speed=14,dt=.016,rollRemaining=0,boardRiding=false){
    const blend=1-Math.exp(-dt*(slide?42:34));
    const gaitTarget=running?1:0,gaitBefore=this.gait,gaitDecay=Math.exp(-dt*12);
    this.gait=gaitTarget+(gaitBefore-gaitTarget)*gaitDecay;
    // Integrate the acceleration envelope analytically so startup cadence
    // does not change with the display's refresh rate.
    const gaitAdvance=gaitTarget*dt+(gaitBefore-gaitTarget)*(1-gaitDecay)/12;
    const flying=!this.police&&this.w.flightActive,airborne=!this.police&&this.w.airborne;
    const moving=this.gait>.01&&!boardRiding;
    if(moving&&!airborne&&!slide)this.phase+=gaitAdvance*runCadence(speed);
    const cycle=this.phase,verticalSpeed=this.w.verticalVelocity??(y-this.lastY)/Math.max(dt,.001);this.lastY=y;
    const settling=flying&&this.w.flightStage==='landing'&&y-(this.w.groundHeight??0)<3;
    const pose=slide?'roll':flying&&!settling?'flight':airborne?'jump':boardRiding?'board':moving?'run':'idle';
    const authored=pose==='run'&&this.useSprintClip&&this.sprintTracks.size>0;
    const jumping=pose==='jump'&&this.jumpTracks.size>0;
    this.clipBlend+=((authored?1:0)-this.clipBlend)*(1-Math.exp(-dt*24));
    const clipFrame=jumping?Math.min(jumpClip.frames-.00001,jumpClipProgress(verticalSpeed,this.w.jumpLaunchSpeed??11.6)*jumpClip.frames):((cycle/(Math.PI*2))%1+1)%1*sprintClip.frames,clipIndex=Math.floor(clipFrame),clipFraction=clipFrame-clipIndex;
    this.root.position.y=y;
    const roll=slide?Math.max(0,Math.min(1,1-rollRemaining/ROLL_DURATION)):0;
    this.landing*=Math.exp(-dt*13);
    const lateral=(this.root.position.x-this.lastX)/Math.max(dt,.001);this.lastX=this.root.position.x;
    if(this.squashDuration>0){this.squashDuration-=dt;this.squashFactor+=(this.squashTarget-this.squashFactor)*blend;if(this.squashDuration<=0)this.squashTarget=1;}
    else this.squashFactor+=(1-this.squashFactor)*blend;
    const sY=Math.max(.94,Math.min(1.04,this.squashFactor)),sXZ=Math.sqrt(1/sY);
    this.body.scaling.set(sXZ,sY,sXZ);
    const lean=slide?Math.PI*2*roll:pose==='flight'?.08:pose==='jump'?.04:boardRiding?.06:this.gait*.145*(1-this.clipBlend)+this.landing*.055;
    const bank=running&&!slide?Math.max(flying?-.20:-.15,Math.min(flying?.20:.15,-lateral*(flying?.020:.015))):0;
    const bodyTarget=Quaternion.FromEulerAngles(lean,boardRiding?.22:pose==='run'?Math.sin(cycle)*.035+Math.max(-.12,Math.min(.12,lateral*.012)):0,bank);
    this.body.rotationQuaternion=Quaternion.Slerp(this.body.rotationQuaternion??Quaternion.Identity(),bodyTarget,blend);
    const stepHop=pose==='run'?0:pose==='board'?Math.sin(t*8.5)*.014:pose==='idle'?Math.sin(t*1.7)*.007:0;
    this.body.position.set(0,stepHop,0);
    for(const joint of this.nativeJoints){
      const baked=jumping?this.jumpTracks.get(joint.node.name):authored?this.sprintTracks.get(joint.node.name):undefined;
      if(baked&&(jumping||this.clipBlend>.999)){
        Quaternion.SlerpToRef(baked[clipIndex],baked[clipIndex+1],clipFraction,this.clipTarget);
        if(authored&&this.landing>.005&&/leg/i.test(joint.name)&&!/foot|toe/.test(joint.name)){
          const inverse=joint.node.parent!.computeWorldMatrix(true).clone().invert(),frame=this.body.computeWorldMatrix(true);
          const axis=Vector3.TransformNormal(Vector3.TransformNormal(Vector3.Right(),frame),inverse).normalize().scaleInPlace(inverse.determinant()<0?-1:1);
          this.clipTarget.copyFrom(Quaternion.RotationAxis(axis,(joint.name.includes('upleg')?-.12:.24)*this.landing).multiply(this.clipTarget));
        }
        Quaternion.SlerpToRef(joint.node.rotationQuaternion??joint.rest,this.clipTarget,blend,joint.node.rotationQuaternion!);
        continue;
      }
      const angles=jointPose(joint.name,joint.side,pose==='flight'?t*2.4:cycle,pose,this.gait,this.landing,verticalSpeed);
      // Haris starts in a T-pose; the supplied scans already have their arms down.
      // Retarget the rest-angle difference without changing the shared motion.
      if(joint.armsDown&&/arm/.test(joint.name)&&!/forearm/.test(joint.name))angles.roll+=joint.side*1.44;
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
      const track=authored?this.sprintTracks.get(joint.node.name):undefined;
      if(track){Quaternion.SlerpToRef(track[clipIndex],track[clipIndex+1],clipFraction,this.clipTarget);target=Quaternion.Slerp(target,this.clipTarget,this.clipBlend);}
      joint.node.rotationQuaternion=Quaternion.Slerp(joint.node.rotationQuaternion??joint.rest,target,blend);
    }
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
    const offset=Number.isFinite(ground)?Math.max(slide?-1.5:jumping?-1.2:-.4,Math.min(slide?1.5:jumping?1.2:.5,y+.025-ground)):0;
    if(slide||authored||jumping)this.groundOffset=offset;else this.groundOffset+=(offset-this.groundOffset)*(1-Math.exp(-dt*25));
    if(!airborne&&offset>this.groundOffset)this.groundOffset=offset;
    const flightLift=authored?sprintClip.clearance[clipIndex]+(sprintClip.clearance[clipIndex+1]-sprintClip.clearance[clipIndex])*clipFraction:sprintLift(cycle);
    this.body.position.y+=this.groundOffset+(pose==='run'?flightLift*this.gait:0)-this.landing*.045;
    this.shadow.position.x=this.root.position.x;this.shadow.position.z=this.root.position.z;const floor=this.police?0:(this.w.groundHeight??0),altitude=Math.max(0,y-floor);this.shadow.position.y=floor+.019;this.shadow.visibility=Math.max(.045,.36/(1+altitude*.45));this.shadow.scaling.set(1+altitude*.025,.7+altitude*.018,1);
    if(this.snack){this.snack.setEnabled(this.w.mode==='intro'&&this.w.introProgress<.50);if(this.w.mode==='intro'){const hand=this.nativeJoints.find(j=>/right.*hand/.test(j.name)&&!/(index|thumb|middle|ring|pinky)/.test(j.name));if(hand){hand.node.computeWorldMatrix(true);this.snack.position.copyFrom(hand.node.getAbsolutePosition());this.snack.position.y+=.08;}}}
  }
}
