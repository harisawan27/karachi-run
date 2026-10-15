import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { vehicleFit } from './vehicle-scale.mjs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { KarachiWorld } from './world';
import { environmentAt } from './routes.mjs';

import { STREET_FILES as files } from './asset-manifest.mjs';
/** Share geometry and textures across traffic; match collision dimensions to each model. */
export class LocalAssets {
  ready:Promise<void>; private templates:TransformNode[]=[]; private serial=0;
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
      const bounds=root.getHierarchyBoundingVectors(true),size=bounds.max.subtract(bounds.min);
      const fit=i<4?vehicleFit(size,i<2?'bus':'rickshaw'):null;const scale=fit?.scale??3.6/Math.max(size.x,size.z);
      const normal=new TransformNode('normalized asset',this.world.scene);root.parent=normal;root.scaling.setAll(scale);root.position=new Vector3(-(bounds.max.x+bounds.min.x)*scale/2,-bounds.min.y*scale,-(bounds.max.z+bounds.min.z)*scale/2);
      // Keep model heading inside the pooled root, which resets on every spawn.
      if(i<4){const heading=new TransformNode("front-facing vehicle",this.world.scene);heading.parent=normal;heading.rotation.y=Math.PI;root.parent=heading;}
      for(const mesh of result.meshes)mesh.isPickable=false;
      normal.metadata=fit;normal.setEnabled(false);this.templates.push(normal);
    }
    for(const chunk of this.world.chunks)for(const old of chunk.getChildren())if(old instanceof TransformNode&&old.name==="rickshaw"){const parked=this.vehicle("rickshaw");parked.parent=chunk;parked.position.copyFrom(old.position);parked.rotation.copyFrom(old.rotation);old.dispose();}
    for(let i=0;i<6;i++){const root=this.copy(4+i%2);root.position.x=i%2?7.6:-7.6;root.rotation.y=i%2?-.3:.3;this.stalls.push({root,offset:i*32});}
    this.openingStall=this.copy(5);this.openingStall.position.set(-5.7,0,1.8);
  }
  private fallback(i:number){
    const scene=this.world.scene,root=new TransformNode(`fallback street asset ${i}`,scene);
    if(i<4){
      const kind=i<2?'bus':'rickshaw',vehicle=this.world.vehicle(kind);vehicle.parent=root;
      root.metadata=i<2?{width:2.8,depth:6.3,height:3.8}:{width:2.1,depth:2.85,height:2.5};
    }else{
      this.world.box('fallback bazaar counter',2.6,1.2,1.25,0,.65,0,i===4?'#b8563c':'#d63e73',root);
      this.world.box('fallback bazaar canopy',3.5,.2,1.8,0,1.55,0,i===4?'#e5b74c':'#7bc5c2',root);
      for(const x of [-1.45,1.45])this.world.box('fallback stall post',.12,1.5,.12,x,.8,0,'#e9dfc5',root);
      this.world.sign(i===4?0:3,2.2,.45,0,1.25,-.66,0,root);
    }
    root.setEnabled(false);return root;
  }
  private copy(i:number){const root=this.templates[i].clone('Karachi street asset',null)!;root.metadata=this.templates[i].metadata;root.setEnabled(true);return root;}
  rooftop(){return this.copy(1);}
  vehicle(kind:'bus'|'rickshaw'){return this.copy(kind==='bus'?(this.serial++%3===2?1:0):2+this.serial++%2);}
  update(travel:number){this.openingStall?.setEnabled(this.world.mode==='menu'||this.world.mode==='intro');for(const stall of this.stalls){const z=((stall.offset-travel)%192+192)%192-20;stall.root.position.z=z;stall.root.setEnabled(travel<8||environmentAt(travel+z).kind!=='street');}}
}


