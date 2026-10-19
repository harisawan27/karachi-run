import {KarachiWorld} from './world';
import {THROW_AT} from './shutter-opening.mjs';
const w=new KarachiWorld(document.querySelector<HTMLCanvasElement>('#world')!,'pakistani_boy.glb');
await w.ready;await Promise.all([w.runner.ready,w.pursuer.ready,w.assets.ready]);
document.querySelector('#loading')!.classList.add('hidden');
let playing=false,frozen=false,dirty=true,last=performance.now(),duration=0;
w.engine.renderEvenInBackground=false;
const status=document.querySelector('#status')!;
function frame(dt:number){w.update(dt,0,w.mode==='intro',0,false);}
function settle(clock:number,action:number){
 w.openingElapsed=THROW_AT+action;
 for(let i=0;i<8;i++){w.lobbyClock=clock-.08;frame(.08);}
}
function reset(){w.mode='menu';w.lobbyClock=0;w.openingElapsed=0;settle(0,-THROW_AT);w.lobbyClock=0;w.openingSet.reset();}
function stage(value:string){
 playing=false;frozen=value!=='lobby';dirty=true;reset();
 if(frozen){
  w.mode='intro';w.openingDelay=THROW_AT;
  // Settle the exact release pose first, then inspect the requested beat.
  settle(THROW_AT,0);w.openingSet.reset();frame(0);
  settle(THROW_AT+Number(value),Number(value));frame(0);
 }
 status.textContent=value==='lobby'?'Continuous throw → shutter → return → catch.':value+' seconds after the decisive throw.';
}
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-stage]')))button.onclick=()=>stage(button.dataset.stage!);
document.querySelector<HTMLButtonElement>('#play')!.onclick=()=>{reset();duration=w.beginOpening();w.mode='intro';playing=true;frozen=false;dirty=true;};
stage(new URLSearchParams(location.search).get('stage')||'lobby');
w.engine.runRenderLoop(()=>{if(document.hidden)return;const now=performance.now(),dt=Math.min(.04,(now-last)/1000);last=now;if(playing){w.openingElapsed+=dt;if(w.openingElapsed>=duration){w.openingElapsed=duration;playing=false;frozen=true;status.textContent='Run handoff · opening complete';}else status.textContent='Opening · '+Math.max(0,w.openingElapsed-w.openingDelay).toFixed(2)+'s';}if(!frozen||playing)frame(dt);if(!frozen||dirty){w.scene.render();dirty=false;}});
