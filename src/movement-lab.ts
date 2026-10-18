// Development-only comparison. No account SDK, storage writes or rewards.
import {KarachiWorld,type ObstacleKind} from './world';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import type {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {LANES,jumpImpulse,contactKind,sideBumpResponse} from './core.mjs';
import {stepLane,swipeAction,swipeThreshold,ROLL_DURATION} from './runner-motion.mjs';
import {stepVertical,surfaceHeight,canRide} from './surfaces.mjs';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('world');
type Piece={root:TransformNode;kind:ObstacleKind;width:number;height:number;depth:number;ramp:boolean;exitRamp:boolean;incoming:number;start:number;lane:number;hit:boolean};
async function main(){
 if(!import.meta.env.DEV)throw new Error('The comparison course is available on the development preview.');
 const world=new KarachiWorld(canvas,'pakistani_boy.glb');await world.ready;await Promise.all([world.assets.ready,world.runner.ready,world.pursuer.ready]);
 world.mode='running';world.pursuer.root.setEnabled(false);world.pursuer.shadow.setEnabled(false);world.quality(false);
 const pieces:Piece[]=[];
 function obstacle(kind:ObstacleKind|'roof',lane:number,start:number,incoming=0){
  const root=kind==='roof'?world.assets.rooftop():world.obstacle(kind),width=root.metadata?.width??2.6,depth=root.metadata?.depth??.5,height=root.metadata?.height??(kind==='arch'?3.3:1.4);
  if(kind==='roof'){
   for(const sign of [-1,1]){const ramp=MeshBuilder.CreateBox('practice loading ramp',{width,height:.12,depth:Math.hypot(12,height)},world.scene);ramp.parent=root;ramp.position.set(0,height/2,sign*(depth/2+6));ramp.rotation.x=sign*Math.atan2(height,12);ramp.material=world.mat('practice ramp','#d6ae59');}
  }
  pieces.push({root,kind:kind==='roof'?'bus':kind,lane,start,incoming,width,depth,height,ramp:kind==='roof',exitRamp:kind==='roof',hit:false});
 }
 obstacle('bus',1,100);obstacle('barrier',0,160);obstacle('arch',2,220);obstacle('roof',1,290);obstacle('bus',0,495,6);obstacle('barrier',2,465);obstacle('arch',1,535);
 let lane=1,x=0,vx=0,y=0,vy=0,floor=0,roll=0,jumpBuffer=0,time=0,distance=0,active=false,side=false,hits=0,grace=0,previous=performance.now(),frames:number[]=[],paint=0;
 function hint(text:string){$('hint').textContent=text;}
 function reset(){lane=1;x=vx=y=vy=floor=roll=jumpBuffer=time=distance=hits=grace=0;world.travel=0;world.runner.phase=0;world.runner.root.position.set(0,0,0);world.runner.root.rotation.y=0;world.chunks.forEach((c,i)=>c.position.z=i*18-36);for(const p of pieces){p.root.setEnabled(true);p.root.position.set(LANES[p.lane],0,p.start);p.hit=false;}active=true;$('start').textContent='RESTART ↻';hint('Find your rhythm · swipe left and right. A bus is ahead in the middle lane.');canvas.focus({preventScroll:true});}
 function action(action:string){
  if(!active)return;
  if(action==='left')lane=Math.max(0,lane-1);if(action==='right')lane=Math.min(2,lane+1);
  if(action==='jump'){if(y-floor<.08){vy=jumpImpulse(false);roll=0;}else jumpBuffer=.16;}
  if(action==='slide'&&roll<=0){roll=ROLL_DURATION;if(y-floor>.08)vy=-26;}
 }
 $('start').onclick=reset;
 function choose(clip:boolean){world.runner.useSprintClip=clip;$('clip').setAttribute('aria-pressed',String(clip));$('legacy').setAttribute('aria-pressed',String(!clip));canvas.focus({preventScroll:true});}
 $('clip').onclick=()=>choose(true);$('legacy').onclick=()=>choose(false);
 $('camera').onclick=()=>{side=!side;$('camera').textContent=side?'CHASE VIEW':'SIDE VIEW';canvas.focus({preventScroll:true});};
 document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const key:Record<string,string>={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',w:'jump',ArrowDown:'slide',s:'slide'};if(key[e.key]){e.preventDefault();if(!e.repeat)action(key[e.key]);}else if(e.key==='Escape'){active=false;hint('Paused · press Restart when you are ready.');}});
 let pointer:{x:number;y:number;id:number}|null=null;
 canvas.onpointerdown=e=>{pointer={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(!pointer||pointer.id!==e.pointerId)return;const gesture=swipeAction(e.clientX-pointer.x,e.clientY-pointer.y,swipeThreshold(innerWidth));if(gesture){action(gesture);pointer=null;}};
 canvas.onpointerup=canvas.onpointercancel=()=>{pointer=null;};
 document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.onpointerdown=e=>{e.preventDefault();action(b.dataset.action!);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;hint('Paused while away · Restart for another run.');}});
 reset();active=false;$('start').textContent='START COURSE ▶';world.mode='menu';
 world.engine.runRenderLoop(()=>{
  const now=performance.now(),wall=(now-previous)/1000,dt=Math.min(.04,wall);previous=now;
  if(document.hidden)return;
  let delta=0;world.speed=14+Math.min(3,time*.067);
  if(active){
   time+=dt;delta=world.speed*dt;distance+=delta;grace=Math.max(0,grace-dt);const oldX=x,oldFloor=floor,next=stepLane(x,vx,LANES[lane],dt);x=next.x;vx=next.velocity;floor=0;
   for(const p of pieces){p.root.position.z-=delta+p.incoming*dt;if(p.root.position.z< -p.depth/2-18)p.root.setEnabled(false);if(p.kind==='bus'){const h=surfaceHeight(x,-p.root.position.z,{x:LANES[p.lane],...p});if(h!==null&&(p.ramp||canRide(y,h)))floor=Math.max(floor,h);}}
   if(jumpBuffer>0){jumpBuffer-=dt;if(Math.abs(y-floor)<.08){vy=jumpImpulse(false);roll=jumpBuffer=0;}}
   const vertical=stepVertical(y,vy,oldFloor,floor,dt,world.speed);y=vertical.y;vy=vertical.velocity;if(vertical.landed)world.runner.land();roll=Math.max(0,roll-dt);
   for(const p of pieces){if(p.hit||!p.root.isEnabled())continue;const z=p.root.position.z,h=p.kind==='bus'?surfaceHeight(x,-z,{x:LANES[p.lane],...p}):null;
    const contact=canRide(y,h)?'none':contactKind({x,previousX:oldX,y,sliding:roll>0},{x:LANES[p.lane],z,previousZ:z+delta+p.incoming*dt,width:p.width,depth:p.depth,height:p.height-.06,kind:p.kind});
    if(contact!=='none'&&!grace){p.hit=true;hits++;grace=1;world.shake(.08,.1);
     if(contact==='direct'){active=false;$('start').textContent='TRY AGAIN ↻';hint('Obstacle hit · restart the same course and try another move.');break;}
     const recoil=sideBumpResponse(oldX,{x:LANES[p.lane],width:p.width});x=recoil.x;lane=recoil.lane;vx=0;hint('Side brush · recover and keep going.');
    }
   }
   if(time>=45){active=false;hint('Course complete! Try Previous, then restart to compare the movement.');}
  }
  world.mode=active?'running':'paused';world.groundHeight=floor;world.airborne=y-floor>.12;world.rollRemaining=roll;world.runner.root.position.x=x;world.update(dt,delta,true,y,roll>0);
  if(side){world.camera.position.set(x+9,3.0,-.6);world.camera.setTarget(new Vector3(x,1.4,0));world.camera.fov=.7;}
  world.scene.render();
  if(active){frames.push(wall*1000);if(frames.length>180)frames.shift();}
  if(now-paint>250){paint=now;const sorted=[...frames].sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)]??0;$('readout').textContent=`${Math.min(45,time).toFixed(0)} / 45 SEC · ${Math.floor(distance)} M · ${hits} CLOSE CALLS · ${p95.toFixed(0)} MS P95`;}
 });
 $('loading').classList.add('hidden');$<HTMLButtonElement>('start').disabled=false;
}
main().catch(error=>{$('loading').innerHTML='<h1>COURSE COULD NOT LOAD</h1><p>Refresh the preview to retry.</p>';console.error(error);});
