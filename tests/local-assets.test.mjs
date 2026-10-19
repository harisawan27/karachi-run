import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {SceneLoader,ImportMeshAsync} from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/index.js';
import {collides} from '../src/core.mjs';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {STREET_FILES} from '../src/asset-manifest.mjs';
const require=createRequire(import.meta.url);
let code=ts.transpileModule(fs.readFileSync('src/local-assets.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
code=code.replace(/(from\s*|import\s*)['"]([^'"]+)['"]/g,(_,prefix,source)=>prefix+JSON.stringify(pathToFileURL(source.startsWith('.')?path.resolve('src',source):require.resolve(source)).href));
const {LocalAssets}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function geometry(bytes){const len=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+len));delete j.materials;delete j.textures;delete j.images;delete j.extensionsRequired;delete j.extensionsUsed;for(const m of j.meshes)for(const p of m.primitives)delete p.material;const json=Buffer.from(JSON.stringify(j)),padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),tail=bytes.subarray(20+len),out=Buffer.alloc(20+padded.length+tail.length);bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);padded.copy(out,20);tail.copy(out,20+padded.length);return out;}
test('real traffic imports include all three large vehicles with grounded, proportional colliders',async()=>{
 const engine=new NullEngine(),scene=new Scene(engine),originalLoader=SceneLoader.ImportMeshAsync,document=globalThis.document,window=globalThis.window,loaded=[];
 try{
  globalThis.document={querySelector:()=>null};globalThis.window={setTimeout:globalThis.setTimeout};
  SceneLoader.ImportMeshAsync=async(_names,_root,file,s)=>{loaded.push(file);return ImportMeshAsync(geometry(fs.readFileSync('public/'+file)),s,{pluginExtension:'.glb'});};
  const assets=new LocalAssets({scene,chunks:[],travel:0,mode:'menu',vehicle(){throw Error('Imported traffic unexpectedly used a fallback');}});await assets.ready;
  assert.deepEqual(loaded,STREET_FILES);
  const traffic=Array.from({length:12},(_,i)=>assets.vehicle('bus',[0,1,6][i%3])),names=new Set(traffic.map(v=>v.name));
  for(const name of ['decorative_pakistani_bus_with_passengers.glb','colorful_decorated_truck.glb','pakistani-truck.glb'])assert.ok([...names].some(n=>n.endsWith(name)),'missing traffic variant '+name);
  for(const v of traffic){const b=v.getHierarchyBoundingVectors(true),size=b.max.subtract(b.min),fit=v.metadata;assert.ok(Math.abs(b.min.y)<.002,'vehicle must sit on the road');for(const axis of ['x','y','z'])assert.ok(Number.isFinite(size[axis]));assert.ok(Math.abs(size.x-fit.width)<.002&&Math.abs(size.z-fit.depth)<.002&&Math.abs(size.y-fit.height)<.002,'visual bounds and collision box must agree');assert.equal(collides({x:0,y:0},{x:0,z:0,kind:'bus',...fit}),true);assert.equal(collides({x:3.15,y:0},{x:0,z:0,kind:'bus',...fit}),false);}
  const truck=traffic.find(v=>v.name.endsWith('pakistani-truck.glb')),fit=truck.metadata;
  assert.ok(fit.height>4.8&&fit.width<=3.45&&fit.depth<=9.5&&fit.depth>fit.width*2,'the new truck must be full sized and point along the road');
  let frontZ=0,frontCount=0;for(const mesh of truck.getChildMeshes()){const positions=mesh.getVerticesData('position');if(!positions)continue;const matrix=mesh.computeWorldMatrix(true);for(let i=0;i<positions.length;i+=3)if(positions[i]>.45){frontZ+=Vector3.TransformCoordinates(new Vector3(positions[i],positions[i+1],positions[i+2]),matrix).z;frontCount++;}}assert.ok(frontCount>0&&frontZ/frontCount<-fit.depth*.35,'cab world-space heading: '+JSON.stringify({frontCount,frontZ:frontZ/frontCount,depth:fit.depth}));
  assert.ok(truck.getChildMeshes().reduce((n,m)=>n+m.getTotalIndices()/3,0)<30000,'keep mobile traffic geometry bounded');
  assert.ok(assets.rooftop().name.endsWith('colorful_decorated_truck.glb'),'keep the approved connected roof vehicle');
  assert.ok(fs.readFileSync('public/licenses/pakistani-truck.txt','utf8').includes('aayanalidev90'));
 }finally{SceneLoader.ImportMeshAsync=originalLoader;globalThis.document=document;globalThis.window=window;engine.dispose();}
});
