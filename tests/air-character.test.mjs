import test from 'node:test';
import assert from 'node:assert/strict';
import clip from '../src/haris-jump.mjs';
import sprint from '../src/haris-sprint.mjs';
import {character,vertices} from './helpers/character-model.mjs';
import {jumpImpulse} from '../src/core.mjs';
import {stepVertical} from '../src/surfaces.mjs';
import {ChaiFlight,airCameraFov,flightCameraPose} from '../src/air-movement.mjs';
import {frameRunnerTargetY} from '../src/runner-motion.mjs';

test('the authored jump retains the approved model and contains normalized rotations for both shoulders',()=>{
 assert.equal(clip.modelSha256,sprint.modelSha256);assert.equal(clip.sourceSha256,sprint.sourceSha256);assert.match(clip.source,/jump_running/);
 assert.equal(Object.keys(clip.tracks).length,16);assert.ok(clip.tracks.LeftShoulder_015&&clip.tracks.RightShoulder_034);
 for(const frames of Object.values(clip.tracks)){assert.equal(frames.length,51);for(const q of frames)assert.ok(Math.abs(Math.hypot(...q)-1)<1e-5);}
});

test('actual Haris jumps, lands and resumes the approved sprint at every tested refresh rate',async()=>{
 for(const fps of [30,60,120])for(const powered of [false,true]){
  const {model,world,engine}=await character('pakistani_boy.glb');
  try{
   for(let i=0;i<30;i++)model.animate(i/60,true,0,false,22,1/60);
   world.jumpLaunchSpeed=jumpImpulse(powered);let y=0,v=world.jumpLaunchSpeed,landedAt=-1,landingPhase=0;
   for(let i=0;i<fps*2;i++){
    const state=stepVertical(y,v,0,0,1/fps,22);y=state.y;v=state.velocity;
    if(state.landed){model.land(state.impactSpeed);landedAt=i;landingPhase=model.phase;}
    world.verticalVelocity=v;world.airborne=y>.12;model.animate(i/fps,true,y,false,22,1/fps);
    if(i%Math.max(1,Math.round(fps/15)))continue;
    let min=Infinity,max=-Infinity;
    for(const {points}of vertices(model))for(let k=1;k<points.length;k+=3){min=Math.min(min,points[k]);max=Math.max(max,points[k]);}
    assert.ok(min>y-.07&&min<y+.23,`feet lost the jump reference at ${fps} FPS, powered ${powered}: ${min-y}`);
    assert.ok(max-min<3.15,'jump stretched the supplied model');
   }
   assert.ok(landedAt>0);assert.ok(model.phase>landingPhase+.2,'the sprint froze after landing');
  }finally{model.dispose();engine.dispose();}
 }
});

test('real flight geometry stays readable across all lanes on phone and landscape screens',async()=>{
 const {model,world,engine}=await character('pakistani_boy.glb');
 try{
  const sky=new ChaiFlight();sky.start(3,0);let i=0;
  while(sky.active){const s=sky.step(1/60,0);world.flightActive=sky.active;world.flightStage=sky.stage;world.airborne=s.y>.12;world.verticalVelocity=s.velocity;world.jumpLaunchSpeed=0;if(s.landed)model.land(12);model.animate(i/60,true,s.y,false,22,1/60);
   if(i++%12||sky.stage!=='cruise')continue;
   for(const [w,h]of [[320,568],[360,800],[320,960],[844,390]]){
    const fov=airCameraFov(w,h),aspect=w/h,tan=Math.tan(fov/2),pose=flightCameraPose(s.y,w<h),cy=pose.eyeY,cz=pose.eyeZ,targetY=frameRunnerTargetY(cy,cz,pose.targetY,pose.targetZ,s.y,fov),d=Math.hypot(targetY-cy,pose.targetZ-cz),fy=(targetY-cy)/d,fz=(pose.targetZ-cz)/d;
    for(const {points:p}of vertices(model))for(let k=0;k<p.length;k+=3){const dy=p[k+1]-cy,dz=p[k+2]-cz,depth=dy*fy+dz*fz;
     assert.ok(depth>0);assert.ok(Math.abs((dy*fz-dz*fy)/(depth*tan))<.97,'flying body was cropped vertically');
     for(const lane of [-3.15,0,3.15])assert.ok(Math.abs((p[k]+lane)/(depth*tan*aspect))<.97,'flying outer lane was cropped');
    }
   }
  }
 }finally{model.dispose();engine.dispose();}
});
