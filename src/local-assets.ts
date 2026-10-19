import {VEHICLE_VARIANTS} from './vehicle-choice.mjs';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { vehicleFit } from './vehicle-scale.mjs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { KarachiWorld } from './world';
import { environmentAt } from './routes.mjs';

import { STREET_FILES as files, STREET_ASSETS } from './asset-manifest.mjs';
/** Share geometry and textures across traffic; match collision dimensions to each model. */
export class LocalAssets {
  ready:Promise<void>; private templates:TransformNode[]=[];
  private stalls:{root:TransformNode;offset:number}[]=[];
  private openingStall:TransformNode|null=null;
  constructor(private world:KarachiWorld){this.ready=this.load();}
  private async load(){
    for(let i=0;i<files.length;i++){
      const label=document.querySelector<HTMLParagraphElement>('#loading p');
      if(label)label.textContent=`LOADING KARACHI ASSETS · ${i+1}/${files.length} · ${files[i].replaceAll('_',' ').replace('.glb','').toUpperCase()}`;
      console.info(`[Karachi Run] Loading street asset ${i+1}/${files.length}: ${files[i]}`);
      const pending=SceneLoader.ImportMeshAsync(null,'/',files[i],this.world.scene);
      let timer:number|undefined;
      let result;
      try{
        result=await Promise.race([pending,new Promise<never>((_,reject)=>{timer=window.setTimeout(()=>reject(new Error(`Timed out loading ${files[i]}`)),8000);})]);
      }catch(error){
        console.warn('[Karachi Run] Using lightweight fallback for street asset:',files[i],error);
        pending.then(late=>late.meshes.forEach(mesh=>mesh.dispose(false,true))).catch(()=>{});
        this.templates.push(this.fallback(i));
        continue;
      }finally{if(timer!==undefined)clearTimeout(timer);}
      console.info(`[Karachi Run] Loaded street asset: ${files[i]}`);
      const root=new TransformNode(files[i],this.world.scene);
      for(const mesh of result.meshes)if(!mesh.parent)mesh.parent=root;
      const asset=STREET_ASSETS[i];root.rotation.y=asset.yaw;
      const bounds=root.getHierarchyBoundingVectors(true),size=bounds.max.subtract(bounds.min);
      const fit=asset.kind!=='stall'?vehicleFit(size,asset.kind):null;const scale=fit?.scale??3.6/Math.max(size.x,size.z);
      const normal=new TransformNode('normalized asset',this.world.scene);root.parent=normal;root.scaling.setAll(scale);root.position=new Vector3(-(bounds.max.x+bounds.min.x)*scale/2,-bounds.min.y*scale,-(bounds.max.z+bounds.min.z)*scale/2);
      // Keep model heading inside the pooled root, which resets on every spawn.
      if(asset.kind!=='stall'){const heading=new TransformNode("front-facing vehicle",this.world.scene);heading.parent=normal;heading.rotation.y=Math.PI;root.parent=heading;}
      for(const mesh of result.meshes)mesh.isPickable=false;
      normal.metadata=fit?{...fit,assetIndex:i}:null;normal.setEnabled(false);this.templates.push(normal);
    }
    for(const chunk of this.world.chunks)for(const old of chunk.getChildren())if(old instanceof TransformNode&&old.name==="rickshaw"){const parked=this.vehicle("rickshaw");parked.parent=chunk;parked.position.copyFrom(old.position);parked.rotation.copyFrom(old.rotation);old.dispose();}
    for(let i=0;i<6;i++){const root=this.copy(4+i%2);root.position.x=i%2?7.6:-7.6;root.rotation.y=i%2?-.3:.3;root.setEnabled(false);this.stalls.push({root,offset:i*32});}
    this.openingStall=this.copy(4);this.openingStall.position.set(-8.5,0,8.4);this.update(this.world.travel);
  }
  private fallback(i:number){
    const scene=this.world.scene,root=new TransformNode(`fallback street asset ${i}`,scene);
    const asset=STREET_ASSETS[i];
    if(asset.kind!=='stall'){
      const kind=asset.kind==='rickshaw'?'rickshaw':'bus',vehicle=this.world.vehicle(kind);vehicle.parent=root;
      // Fit fallback geometry and collider from the same dimensions as imported traffic.
      const bounds=vehicle.getHierarchyBoundingVectors(true),fit=vehicleFit(bounds.max.subtract(bounds.min),asset.kind);
      vehicle.scaling.setAll(fit.scale);vehicle.position.set(-(bounds.min.x+bounds.max.x)*fit.scale/2,-bounds.min.y*fit.scale,-(bounds.min.z+bounds.max.z)*fit.scale/2);
      root.metadata={...fit,assetIndex:i};
    }else{
      this.world.box('fallback bazaar counter',2.6,1.2,1.25,0,.65,0,i===4?'#b8563c':'#d63e73',root);
      this.world.box('fallback bazaar canopy',3.5,.2,1.8,0,1.55,0,i===4?'#e5b74c':'#7bc5c2',root);
      for(const x of [-1.45,1.45])this.world.box('fallback stall post',.12,1.5,.12,x,.8,0,'#e9dfc5',root);
      this.world.sign(i===4?0:3,2.2,.45,0,1.25,-.66,0,root);
    }
    root.setEnabled(false);return root;
  }
  private copy(i:number){const root=this.templates[i].clone('Karachi street asset '+files[i],null)!;root.metadata=this.templates[i].metadata;root.setEnabled(true);return root;}
  rooftop(){return this.copy(1);}
  vehicle(kind:'bus'|'rickshaw',assetIndex?:number){const choices=VEHICLE_VARIANTS[kind];return this.copy(assetIndex!==undefined&&choices.includes(assetIndex)?assetIndex:choices[Math.floor(Math.random()*choices.length)]);}
  private stallCanShow(travel:number,z:number){
    if(environmentAt(travel+z).kind==='street')return false;
    // Match the visible street chunks, including shop depth and the stall's footprint.
    // A route boundary can pass through a chunk before its shop facade disappears.
    return !this.world.chunks.some(chunk=>chunk.isEnabled()&&z>chunk.position.z-7&&z<chunk.position.z+16);
  }
  update(travel:number){
    const opening=this.openingStall;
    if(opening)opening.setEnabled(this.world.mode==='intro'&&this.world.openingElapsed-this.world.openingDelay>=.51);
    for(const stall of this.stalls){
      const z=((stall.offset-travel)%192+192)%192-20;
      stall.root.position.z=z;stall.root.setEnabled(this.world.mode!=='menu'&&this.world.mode!=='intro'&&this.stallCanShow(travel,z));
    }
  }
}


