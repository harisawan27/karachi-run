import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
const require=createRequire(import.meta.url);
export function loadScenery(){
 let code=ts.transpileModule(fs.readFileSync('src/scenery.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 code=code.replace(/(from\s*|import\s*)['"]([^'"]+)['"]/g,(_,prefix,source)=>prefix+JSON.stringify(pathToFileURL(source.startsWith('.')?path.resolve('src',source):require.resolve(source)).href));
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
const {batchScenery}=await loadScenery();
export function sceneryWorld(){
 const engine=new NullEngine(),scene=new Scene(engine),materials=new Map();
 const w={scene,mat(hex){if(materials.has(hex))return materials.get(hex);const m=new StandardMaterial(hex,scene);m.diffuseColor=Color3.FromHexString(hex);materials.set(hex,m);return m;},
 box(name,width,height,depth,x,y,z,color,parent){const m=MeshBuilder.CreateBox(name,{width,height,depth},scene);m.position.set(x,y,z);m.material=w.mat(color);m.parent=parent;return m;},
 cyl(name,diameter,height,x,y,z,color,parent,top=diameter,tess=12){const m=MeshBuilder.CreateCylinder(name,{height,diameter,diameterTop:top,tessellation:tess},scene);m.position.set(x,y,z);m.material=w.mat(color);m.parent=parent;return m;},
 ball(name,diameter,x,y,z,color,parent){const m=MeshBuilder.CreateSphere(name,{diameter,segments:8},scene);m.position.set(x,y,z);m.material=w.mat(color);m.parent=parent;return m;},
 merge:batchScenery
 };
 return {w,scene,engine,root:()=>new TransformNode('scenery test section',scene)};
}
