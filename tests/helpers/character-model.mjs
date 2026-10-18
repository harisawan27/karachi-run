import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { SceneLoader, ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import '@babylonjs/loaders/glTF/index.js';
// Load the production TypeScript class, replacing only file transport and textures.
// Animation, rig creation, skin matrices and model geometry are the real game code.
const require=createRequire(import.meta.url);
let code=ts.transpileModule(fs.readFileSync('src/model-character.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
code=code.replace(/(from\s*|import\s*)['"]([^'"]+)['"]/g,(match,prefix,source)=>{
 const file=source.startsWith('.')?path.resolve('src',source):require.resolve(source);
 return prefix+JSON.stringify(pathToFileURL(file).href);
});
const {ModelCharacter}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function withoutTextures(bytes){
 const n=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+n));delete json.materials;delete json.textures;delete json.images;for(const m of json.meshes)for(const p of m.primitives)delete p.material;
 const js=Buffer.from(JSON.stringify(json)),j=Buffer.concat([js,Buffer.alloc((4-js.length%4)%4,32)]),tail=bytes.subarray(20+n),out=Buffer.alloc(20+j.length+tail.length);bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(j.length,12);j.copy(out,20);tail.copy(out,20+j.length);return out;
}
export async function character(source){
 const engine=new NullEngine(),scene=new Scene(engine),world={scene,mode:'running',airborne:false,flightActive:false,groundHeight:0,mat:()=>null};
 const loader=SceneLoader.ImportMeshAsync,fetch=globalThis.fetch;
 try{
  SceneLoader.ImportMeshAsync=async(_names,root,name,scene)=>ImportMeshAsync(withoutTextures(fs.readFileSync('public'+root+name)),scene,{pluginExtension:'.glb'});
  globalThis.fetch=async url=>{if(url!=='/models/imran-arm-weights.bin')throw new Error('Unexpected character request');return new Response(fs.readFileSync('public/models/imran-arm-weights.bin'));};
  const model=new ModelCharacter(world,false,source);await model.ready;
  return {model,world,engine,scene};
 }catch(error){engine.dispose();throw error;}
 finally{SceneLoader.ImportMeshAsync=loader;globalThis.fetch=fetch;}
}
export function vertices(model){
 const out=[];
 for(const mesh of model.root.getChildMeshes()){
  const p=mesh.getVerticesData(VertexBuffer.PositionKind),ix=mesh.getVerticesData(VertexBuffer.MatricesIndicesKind),wt=mesh.getVerticesData(VertexBuffer.MatricesWeightsKind);if(!p||!mesh.skeleton)continue;
  mesh.skeleton.prepare(true);const matrices=mesh.skeleton.getTransformMatrices(mesh),world=mesh.computeWorldMatrix(true).m,points=new Float32Array(p.length);
  for(let v=0;v<p.length/3;v++){
   const px=p[v*3],py=p[v*3+1],pz=p[v*3+2];let ax=0,ay=0,az=0;
   for(let j=0;j<4;j++){const weight=wt[v*4+j];if(!weight)continue;const m=ix[v*4+j]*16;ax+=(px*matrices[m]+py*matrices[m+4]+pz*matrices[m+8]+matrices[m+12])*weight;ay+=(px*matrices[m+1]+py*matrices[m+5]+pz*matrices[m+9]+matrices[m+13])*weight;az+=(px*matrices[m+2]+py*matrices[m+6]+pz*matrices[m+10]+matrices[m+14])*weight;}
   points[v*3]=ax*world[0]+ay*world[4]+az*world[8]+world[12];points[v*3+1]=ax*world[1]+ay*world[5]+az*world[9]+world[13];points[v*3+2]=ax*world[2]+ay*world[6]+az*world[10]+world[14];
  }
  out.push({mesh,points,rest:p,indices:mesh.getIndices(),uv:mesh.getVerticesData(VertexBuffer.UVKind)});
 }
 return out;
}
