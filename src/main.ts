import './style.css';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { KarachiWorld, type ObstacleKind } from './world';
import { LANES, SAVE_KEY, loadSave, persistSave, collides, makeRow } from './core.mjs';

const icons={sound:'<svg viewBox="0 0 24 24"><path d="M11 4 5 9H2v6h3l6 5zM15 8q5 4 0 8M18 4q9 8 0 16"/></svg>',mute:'<svg viewBox="0 0 24 24"><path d="M11 4 5 9H2v6h3l6 5zM16 9l6 6m0-6-6 6"/></svg>',pause:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 4v.1"/></svg>',save:'<svg viewBox="0 0 24 24"><path d="M4 3h13l4 4v14H3V3zM7 3v7h9V3M7 21v-7h10v7"/></svg>'};
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const fmt=(n:number)=>Math.floor(n).toLocaleString('en-US');
const app=$('app');
app.innerHTML=`<main class="game-shell" id="shell">
  <canvas id="world" tabindex="0" aria-label="Karachi Run. Use left and right arrows to change lanes, up to jump, and down to slide."></canvas>
  <div class="vignette"></div>
  <header class="topbar"><div class="brand"><div class="brand-mark">K</div><div><div class="brand-name">KARACHI RUN</div><div class="brand-sub">THE CITY OF LIGHTS</div></div></div><div class="top-actions"><div class="wallet" aria-label="Saved coins"><span class="coin-icon">₨</span><span id="bank">0</span></div><button class="icon-button" id="sound-button" aria-label="Mute sound">${icons.sound}</button><button class="icon-button" id="help-button" aria-label="How to play">${icons.help}</button><button class="icon-button hidden" id="pause-button" aria-label="Pause game">${icons.pause}</button></div></header>
  <section class="start-panel" id="start-panel"><div class="eyebrow">01 / KARACHI, PAKISTAN</div><h1>KARACHI<span>RUN.</span></h1><div class="urdu title-urdu" lang="ur">شہر کی رفتار، آپ کے قدم</div><p class="intro">Catch the rhythm of the city.<br>Dodge the traffic. Make every coin count.</p><button class="play-button" id="play-button" disabled><span>LET’S RUN</span><span class="arrow">↗</span></button><div class="start-save" id="save-note">${icons.save}<span>Coins & records saved on this device</span></div></section>
  <div class="city-stamp"><div class="urdu" lang="ur">کراچی، میری جان</div><small>SADDAR STREETS · AFTERNOON RUN</small></div>
  <footer class="bottom-bar"><div class="records"><div class="record"><span class="record-icon">♜</span><div><small>PERSONAL BEST</small><strong id="best">0</strong></div></div><div class="record"><span class="record-icon">↗</span><div><small>TOTAL RUNS</small><strong id="runs">0</strong></div></div></div><div class="controls"><span class="control"><kbd>←</kbd><kbd>→</kbd> Switch lanes</span><span class="control"><kbd>↑</kbd> Jump</span><span class="control"><kbd>↓</kbd> Slide</span></div><span class="mobile-hint">Swipe to move<br>Tap arrows too</span><span class="version-label">KARACHI · VOL. 01</span></footer>
  <div class="hud hidden" id="hud"><div class="hud-score" id="score">00000</div><small>POINTS</small></div>
  <div class="multiplier hidden" id="multiplier">×1 <span style="font-size:10px;letter-spacing:.1em">SCORE</span></div>
  <div class="run-stats hidden" id="run-stats"><span class="coin-icon">₨</span><div><span id="run-coins">0</span><small>THIS RUN</small></div></div>
  <div class="game-hint hidden" id="game-hint"></div><div class="active-power hidden" id="power-hud"></div>
  <div class="touch-controls hidden" id="touch-controls"><div class="touch-group"><button class="touch-button" data-action="left" aria-label="Move left">←</button><button class="touch-button" data-action="right" aria-label="Move right">→</button></div><div class="touch-group"><button class="touch-button" data-action="slide" aria-label="Slide">↓</button><button class="touch-button" data-action="jump" aria-label="Jump">↑</button></div></div>
  <div class="modal-scrim hidden" id="modal-layer"></div><div class="toast hidden" id="toast" role="status"></div>
  <div class="loading" id="loading"><div class="brand-mark">K</div><p>WAKING UP KARACHI…</p><div class="loading-track"></div></div>
</main>`;

let storage:Storage|undefined;
try{storage=window.localStorage;}catch{/* In-memory play still works when browser storage is blocked. */}
let saved=loadSave(storage);let saveWarning=false;
function save(){const ok=persistSave(storage,saved);if(!ok&&!saveWarning){saveWarning=true;$('save-note').lastElementChild!.textContent='Storage unavailable — progress lasts this session';toast('Your browser blocked saving. Progress will last this session.');}return ok;}
function updateRecords(){$('bank').textContent=fmt(saved.coins);$('best').textContent=fmt(saved.best);$('runs').textContent=fmt(saved.runs);$('sound-button').innerHTML=saved.muted?icons.mute:icons.sound;$('sound-button').setAttribute('aria-label',saved.muted?'Turn sound on':'Mute sound');$('sound-button').setAttribute('aria-pressed',String(saved.muted));}
updateRecords();
let toastTimer=0;
function toast(message:string){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('toast').classList.add('hidden'),3500);}

class GameAudio {
  ctx:AudioContext|null=null;lastStep=0;
  unlock(){try{this.ctx??=new AudioContext();void this.ctx.resume();}catch{/* Audio is optional. */}}
  tone(freq:number,duration:number,volume=.05,type:OscillatorType='sine',end?:number){if(!this.ctx||saved.muted)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);if(end)o.frequency.exponentialRampToValueAtTime(end,c.currentTime+duration);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration);}
  coin(){this.tone(1046,.1,.035,'sine',1568);}
  jump(){this.tone(240,.17,.035,'sine',520);}
  slide(){this.tone(160,.16,.025,'triangle',55);}
  crash(){this.tone(110,.42,.09,'sawtooth',32);}
  power(){this.tone(660,.35,.055,'triangle',1320);}
  step(t:number){if(t-this.lastStep>.24){this.lastStep=t;this.tone(65,.045,.022,'triangle',38);}}
}
const audio=new GameAudio();
type Mode='menu'|'running'|'paused'|'over';
type Item={root:TransformNode;type:'obstacle'|'coin'|'magnet'|'shield';kind?:ObstacleKind;active:boolean;depth:number;height:number;phase:number;};
let world:KarachiWorld;
let mode:Mode='menu',lane=1,x=0,y=0,vy=0,slideTime=0,distance=0,score=0,scoreExact=0,runCoins=0,speed=14,elapsed=0,magnetTime=0,shieldTime=0,invincible=0,rowIndex=0,nextRow=0,lastSave=0,oldBest=0,finished=false;
const pools:Record<string,Item[]>={bus:[],rickshaw:[],barrier:[],arch:[],coin:[],magnet:[],shield:[]};
const all:Item[]=[];
function createItem(key:string):Item{
  const obstacle=['bus','rickshaw','barrier','arch'].includes(key);const root=obstacle?world.obstacle(key as ObstacleKind):key==='coin'?world.coin():world.power(key as 'magnet'|'shield');
  const item:Item={root,type:obstacle?'obstacle':key as Item['type'],kind:obstacle?key as ObstacleKind:undefined,active:false,depth:key==='bus'?6.3:key==='rickshaw'?2.85:.5,height:key==='bus'?3.5:key==='rickshaw'?2.4:1.4,phase:all.length*.63};root.setEnabled(false);pools[key].push(item);all.push(item);return item;
}
function spawn(key:string,laneIndex:number,z:number,height=1){const item=pools[key].find(i=>!i.active)||createItem(key);item.active=true;item.root.setEnabled(true);item.root.position.set(LANES[laneIndex],item.type==='obstacle'?0:height,z);item.root.rotation.set(0,0,0);return item;}
function release(item:Item){item.active=false;item.root.setEnabled(false);}
function spawnRow(z:number){const row=makeRow(rowIndex++);for(const o of row.obstacles)spawn(o.kind,o.lane,z);for(let i=0;i<6;i++)spawn('coin',row.safeLane,z-6+i*2.2,1.15);if(rowIndex%5===0)spawn(rowIndex%10===0?'shield':'magnet',row.safeLane,z+9,1.3);nextRow=z+28;}
function setGameUI(show:boolean){$('shell').classList.toggle('playing',show);for(const id of ['hud','run-stats','multiplier','pause-button','touch-controls'])$(id).classList.toggle('hidden',!show);$('help-button').classList.toggle('hidden',show);}
function resetScene(){all.forEach(release);world.chunks.forEach((c,i)=>c.position.z=i*18-36);world.runner.root.position.set(0,0,0);world.pursuer.root.position.set(0,0,-6);world.runner.body.rotation.z=0;world.runner.root.getChildMeshes().forEach(m=>m.visibility=1);scoreExact=0;rowIndex=0;for(const z of [40,68,96,124])spawnRow(z);}
function startRun(){if(!world)return;audio.unlock();mode='running';lane=1;x=0;y=0;vy=0;slideTime=0;distance=0;score=0;runCoins=0;speed=14;elapsed=0;magnetTime=0;shieldTime=0;invincible=0;lastSave=0;oldBest=saved.best;finished=false;resetScene();setGameUI(true);closeModal();$('run-coins').textContent='0';$('score').textContent='00000';$('game-hint').textContent=innerWidth<700?'Swipe ← → to dodge · ↑ jump · ↓ slide':'← → Switch lanes     ↑ Jump     ↓ Slide     Esc Pause';$('game-hint').classList.remove('hidden');$('power-hud').classList.add('hidden');audio.tone(440,.18,.03,'triangle',880);$('world').focus({preventScroll:true});}
function checkpoint(){if(score>saved.best)saved.best=score;save();updateRecords();}
function finish(){if(finished)return;finished=true;mode='over';saved.runs++;saved.totalScore+=score;checkpoint();audio.crash();$('game-hint').classList.add('hidden');$('power-hud').classList.add('hidden');$('touch-controls').classList.add('hidden');$('pause-button').classList.add('hidden');showResults();}
function showResults(){showModal(`<div class="eyebrow">ANOTHER STORY FROM THE STREETS</div><h2>What a run.</h2><div class="modal-score">${fmt(score)}</div><div class="score-label">POINTS</div>${score>oldBest?'<p class="new-best">✦ NEW PERSONAL BEST</p>':'<p>Karachi has another run in you.</p>'}<div class="result-details"><div><strong><span class="coin-icon">₨</span> ${fmt(runCoins)}</strong><small>COINS COLLECTED</small></div><div><strong>${fmt(distance)} m</strong><small>DISTANCE</small></div></div><button class="play-button" id="retry-button"><span>RUN IT BACK</span><span class="arrow">↗</span></button><button class="secondary" id="home-button">Back to Karachi</button>`);$('retry-button').onclick=startRun;$('home-button').onclick=home;}
function home(){mode='menu';setGameUI(false);closeModal();$('game-hint').classList.add('hidden');$('power-hud').classList.add('hidden');resetScene();updateRecords();$('play-button').focus({preventScroll:true});}
function pause(){if(mode!=='running')return;mode='paused';checkpoint();showModal(`<div class="eyebrow">TAKE A BREATHER</div><h2>City on pause.</h2><p>Your run is right where you left it.</p><div class="setting-row"><label for="quality-select">Graphics quality</label><select id="quality-select"><option value="standard" ${world.low?'':'selected'}>Standard</option><option value="low" ${world.low?'selected':''}>Battery saver</option></select></div><button class="play-button" id="resume-button"><span>KEEP RUNNING</span><span class="arrow">↗</span></button><button class="secondary" id="end-button">Finish this run</button>`);$('resume-button').onclick=resume;$('end-button').onclick=finish;$<HTMLSelectElement>('quality-select').onchange=e=>world.quality((e.target as HTMLSelectElement).value==='low');}
function resume(){if(mode!=='paused')return;mode='running';closeModal();audio.unlock();$('world').focus({preventScroll:true});}
let lastFocus:HTMLElement|null=null;
function showModal(html:string){lastFocus=document.activeElement as HTMLElement;$('modal-layer').innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-label="${mode==='over'?'Run results':mode==='paused'?'Game paused':'How to play'}">${html}</section>`;$('modal-layer').classList.remove('hidden');$('modal-layer').querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});}
function closeModal(){$('modal-layer').classList.add('hidden');$('modal-layer').innerHTML='';lastFocus?.focus({preventScroll:true});}
function help(){showModal(`<div class="eyebrow">YOUR GUIDE TO THE STREETS</div><h2>Keep moving.</h2><div class="help-grid"><div><b>← → Dodge</b><p>Switch between three lanes. Swipe left or right on mobile.</p></div><div><b>↑ Jump</b><p>Clear striped barriers. Swipe up or press Space.</p></div><div><b>↓ Slide</b><p>Duck under low signs. Swipe down to slide.</p></div><div><b>Collect & survive</b><p>Red magnets attract coins. Teal shields absorb one hit.</p></div></div><p>Coins and records save on this browser. Clearing browser data clears your progress.</p><p style="font-size:11px">An original, fictional political-satire runner. Stylized Karachi scenery and characters.</p><button class="play-button" id="close-help"><span>GOT IT</span><span class="arrow">✓</span></button>`);$('close-help').onclick=closeModal;}
function action(type:string){if(mode!=='running')return;if(type==='left')lane=Math.max(0,lane-1);if(type==='right')lane=Math.min(2,lane+1);if(type==='jump'&&y<.05){vy=10.5;slideTime=0;audio.jump();}if(type==='slide'){slideTime=.85;if(y>.1)vy=-18;audio.slide();}}
$('play-button').onclick=startRun;$('pause-button').onclick=pause;$('help-button').onclick=help;
$('sound-button').onclick=()=>{audio.unlock();saved.muted=!saved.muted;save();updateRecords();};
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();action(b.dataset.action!);}));
document.addEventListener('keydown',e=>{
  const modalOpen=!$('modal-layer').classList.contains('hidden');
  if(e.key==='Tab'&&modalOpen){const focusables=Array.from($('modal-layer').querySelectorAll<HTMLElement>('button,select'));const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
  if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();if(mode==='running')pause();else if(mode==='paused')resume();else if(modalOpen&&mode==='menu')closeModal();return;}
  if(mode!=='running'||e.ctrlKey||e.metaKey||e.altKey)return;
  const keyMap:Record<string,string>={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',w:'jump',' ':'jump',ArrowDown:'slide',s:'slide'};
  const a=keyMap[e.key];if(a){e.preventDefault();if(!e.repeat)action(a);}
});
let pointer:{x:number;y:number;id:number}|null=null;
$('world').addEventListener('pointerdown',e=>{if(mode!=='running')return;pointer={x:e.clientX,y:e.clientY,id:e.pointerId};$('world').setPointerCapture(e.pointerId);});
$('world').addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.max(Math.abs(dx),Math.abs(dy))>25){action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'slide':'jump');pointer=null;}});
$('world').addEventListener('pointerup',()=>{pointer=null;});$('world').addEventListener('pointercancel',()=>{pointer=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='running')pause();});
window.addEventListener('blur',()=>{if(mode==='running')pause();});
window.addEventListener('pagehide',()=>{if(world&&mode==='running')checkpoint();});
window.addEventListener('storage',e=>{if(e.key===SAVE_KEY&&mode==='menu'){saved=loadSave(storage);updateRecords();}});

function update(dt:number){
  let delta=0;
  if(mode==='running'){
    elapsed+=dt;speed=Math.min(28,14+elapsed*.11);delta=speed*dt;distance+=delta;scoreExact+=delta*(1+Math.floor(elapsed/30));score=Math.floor(scoreExact);x+=(LANES[lane]-x)*(1-Math.exp(-18*dt));
    if(y>0||vy>0){vy-=27*dt;y=Math.max(0,y+vy*dt);if(y===0)vy=0;}
    slideTime=Math.max(0,slideTime-dt);magnetTime=Math.max(0,magnetTime-dt);shieldTime=Math.max(0,shieldTime-dt);invincible=Math.max(0,invincible-dt);
    world.runner.root.position.x=x;
    if(y<.05&&!slideTime)audio.step(elapsed);
    nextRow-=delta;while(nextRow<145)spawnRow(nextRow);
    for(const item of all){if(!item.active)continue;item.root.position.z-=delta;
      if(item.root.position.z< -12){release(item);continue;}
      if(item.type==='coin'){
        item.root.rotation.y=world.time*2.7+item.phase;
        if(magnetTime>0&&Math.abs(item.root.position.z)<9){item.root.position.x+=(x-item.root.position.x)*Math.min(1,dt*9);item.root.position.y+=(y+1.1-item.root.position.y)*Math.min(1,dt*9);}
        if(Math.abs(item.root.position.z)<1.1&&Math.abs(item.root.position.x-x)<1.1&&Math.abs(item.root.position.y-(y+1))<1.2){release(item);runCoins++;saved.coins++;save();$('bank').textContent=fmt(saved.coins);$('run-coins').textContent=fmt(runCoins);audio.coin();}
      }else if(item.type==='magnet'||item.type==='shield'){
        item.root.position.y=1.35+Math.sin(world.time*3+item.phase)*.18;item.root.rotation.y=Math.sin(world.time*2)*.18;
        if(Math.abs(item.root.position.z)<1.2&&Math.abs(item.root.position.x-x)<1.15&&y<1.9){release(item);if(item.type==='magnet')magnetTime=12;else shieldTime=16;audio.power();toast(item.type==='magnet'?'Coin magnet · 12 seconds':'Shield · one hit protected');}
      }else if(!invincible&&collides({x,y,sliding:slideTime>0},{x:item.root.position.x,z:item.root.position.z,depth:item.depth,height:item.height,kind:item.kind!})){
        if(shieldTime>0){shieldTime=0;invincible=1.5;release(item);audio.crash();toast('Shield saved you. Keep running!');}else{finish();break;}
      }
    }
    if(elapsed>7)$('game-hint').classList.add('hidden');
    $('score').textContent=String(score).padStart(5,'0');$('multiplier').innerHTML=`×${1+Math.floor(elapsed/30)} <span style="font-size:10px;letter-spacing:.1em">SCORE</span>`;
    const powers=[];if(magnetTime>0)powers.push(`MAGNET ${Math.ceil(magnetTime)}s`);if(shieldTime>0)powers.push(`SHIELD ${Math.ceil(shieldTime)}s`);$('power-hud').classList.toggle('hidden',powers.length===0||finished);$('power-hud').textContent=powers.join('  ·  ');
    world.runner.root.getChildMeshes().forEach(m=>m.visibility=invincible>0?.35+Math.sin(elapsed*35)*.3:1);
    if(elapsed-lastSave>2){lastSave=elapsed;checkpoint();}
  }
  if(mode==='menu'){for(const item of all)if(item.active&&item.type==='coin')item.root.rotation.y=world.time*2+item.phase;}
  if(mode==='over')world.pursuer.root.position.z+=(-1.75-world.pursuer.root.position.z)*Math.min(1,dt*2.5);
  if(mode!=='paused')world.update(dt,delta,mode!=='menu',y,slideTime>0);
  world.scene.render();
}
async function init(){
  try{
    await Promise.race([document.fonts.load('bold 60px "Noto Nastaliq Urdu"'),new Promise(r=>setTimeout(r,4500))]);
    world=new KarachiWorld($<HTMLCanvasElement>('world'));
    for(const [key,count] of Object.entries({bus:5,rickshaw:5,barrier:7,arch:7,coin:60,magnet:2,shield:2}))for(let i=0;i<count;i++)createItem(key);
    resetScene();
    await world.scene.whenReadyAsync();
    let previous=performance.now();world.engine.runRenderLoop(()=>{const now=performance.now();const dt=Math.min((now-previous)/1000,.04);previous=now;update(dt);});
    $('loading').classList.add('hidden');$<HTMLButtonElement>('play-button').disabled=false;
    // Repaint if a slow font download finishes after the first scene is ready.
    void document.fonts.ready.then(()=>{if(!document.fonts.check('60px "Noto Nastaliq Urdu"'))return;const fresh=world.makeSigns();world.signMat.diffuseTexture?.dispose();world.signMat.diffuseTexture=fresh.diffuseTexture;fresh.diffuseTexture=null;fresh.dispose();});
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown)=>void}}).modelContext;
    if(context?.registerTool){try{context.registerTool({name:'get_karachi_run_progress',description:'Read saved Karachi Run coins, best score, and completed runs on this browser.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(input===null||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');return {coins:saved.coins,best:saved.best,runs:saved.runs,mode};}});}catch{/* Unsupported experimental agent registry is optional. */}}
  }catch(error){console.error(error);$('loading').innerHTML='<div class="brand-mark">K</div><p>THE STREET COULDN’T LOAD</p><div style="max-width:290px;text-align:center;line-height:1.6;font-size:14px">This game needs a browser with WebGL enabled. Try a current Chrome, Edge, or Safari.</div><button class="play-button" id="reload-button">TRY AGAIN ↗</button>';$('reload-button').onclick=()=>location.reload();}
}
void init();
