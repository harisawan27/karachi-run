import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {InternalTexture,InternalTextureSource} from '@babylonjs/core/Materials/Textures/internalTexture.js';
import {sceneryWorld} from './helpers/scenery-world.mjs';
const require=createRequire(import.meta.url);
let code=ts.transpileModule(fs.readFileSync('src/progression-scene.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
code=code.replace(/(from\s*|import\s*)['"]([^'"]+)['"]/g,(_,p,s)=>p+JSON.stringify(pathToFileURL(s.startsWith('.')?path.resolve('src',s):require.resolve(s)).href));
const {ProgressionScene}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

test('hidden progression textures are uploaded before the lobby waits for readiness, without activating rewards',()=>{
 const {w,engine,scene}=sceneryWorld(),painted=[];
 // NullEngine does not upload GPU textures. Model that boundary explicitly:
 // a new texture is unready until production code calls DynamicTexture.update.
 engine.createCanvas=(width,height)=>({width,height,getContext:()=>({fillRect(){},strokeRect(){},fillText(text){painted.push(text);}})});
 engine.createDynamicTexture=(width,height)=>{const t=new InternalTexture(engine,InternalTextureSource.Dynamic);t.width=t.baseWidth=width;t.height=t.baseHeight=height;t.isReady=false;return t;};
 engine.updateDynamicTexture=texture=>{texture.isReady=true;};
 try{
  const progression=new ProgressionScene(w);
  for(const name of ['readable daily letter','record banner']){
   const mesh=scene.getMeshByName(name);assert.ok(mesh);assert.equal(mesh.isEnabled(),false);
   assert.equal(mesh.material.diffuseTexture.isReady(),true,`${name} would block Scene.whenReadyAsync even while disabled`);
  }
  assert.equal(progression.active,false);assert.equal(progression.index,-1);assert.deepEqual(painted,[]);
  progression.spawn(0,'2026-10-19',0,60);assert.equal(progression.active,true);assert.deepEqual(painted,['K']);
  assert.equal(progression.update(1/60,60,0,0,1),0);assert.equal(progression.active,false);
  progression.milestone('NEW PERSONAL BEST','KEEP GOING');assert.ok(painted.includes('NEW PERSONAL BEST'));
  progression.reset();assert.ok(scene.getMeshByName('record banner').isEnabled()===false);
 }finally{engine.dispose();}
});

test('skyline celebrations hold for five seconds and never scroll toward the runner',()=>{
 const {w,engine,scene}=sceneryWorld(),painted=[];engine.createCanvas=(width,height)=>({width,height,getContext:()=>({fillRect(){},strokeRect(){},fillText(t){painted.push(t);}})});engine.createDynamicTexture=(width,height)=>{const t=new InternalTexture(engine,InternalTextureSource.Dynamic);t.width=width;t.height=height;return t;};engine.updateDynamicTexture=t=>t.isReady=true;
 try{const p=new ProgressionScene(w);p.milestone('BEST IS CLOSE','KEEP GOING');p.milestone('NEW PERSONAL BEST','GREAT RUN');const board=scene.getMeshByName('record banner'),root=board.parent;let z=0;for(let i=0;i<310;i++){p.update(1/60,32/60,100,0,i/60);if(i===30)z=root.position.z;}assert.equal(root.position.z,z);assert.equal(board.isEnabled(),true);assert.ok(!painted.includes('NEW PERSONAL BEST'),'the next announcement waits for the full hold');for(let i=0;i<20;i++)p.update(1/60,32/60,100,0,6);assert.ok(painted.includes('NEW PERSONAL BEST'));assert.equal(board.material.fogEnabled,false);p.reset();assert.equal(board.isEnabled(),false);}
 finally{engine.dispose();}
});
