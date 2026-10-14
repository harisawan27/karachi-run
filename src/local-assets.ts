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
      const result=await SceneLoader.ImportMeshAsync(null,'/',files[i],this.world.scene);
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
  private copy(i:number){const root=this.templates[i].clone('Karachi street asset',null)!;root.metadata=this.templates[i].metadata;root.setEnabled(true);return root;}
  rooftop(){return this.copy(1);}
  vehicle(kind:'bus'|'rickshaw'){return this.copy(kind==='bus'?(this.serial++%3===2?1:0):2+this.serial++%2);}
  update(travel:number){this.openingStall?.setEnabled(this.world.mode==='menu'||this.world.mode==='intro');for(const stall of this.stalls){const z=((stall.offset-travel)%192+192)%192-20;stall.root.position.z=z;stall.root.setEnabled(travel<8||environmentAt(travel+z).kind!=='street');}}
}


