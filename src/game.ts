import {storePanel,CHARACTER_CATALOG} from './store-view.mjs';
import {createVehiclePicker,VEHICLE_VARIANTS} from './vehicle-choice.mjs';
import {playTruckHorn} from './vehicle-audio.mjs';
import {CinematicIntro} from './cinematic-intro';
import './cinematic.css';
import {WALL_AFTER,WARDEN_AFTER,WHISTLE_AFTER,openingCueCrossed} from './shutter-opening.mjs';
import {ChaiFlight,CHAI_TAKEOFF_SECONDS,canStartJump} from './air-movement.mjs';
import './style.css';
import {ProgressWriter} from './progress-writer.mjs';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { surfaceHeight, stepVertical, canRide } from './surfaces.mjs';
import './upgrade.css';
import './account.css';
import './progression.css';
import './branding.css';
import './lobby.css';
import './arcade.css';
import './mobile-polish.css';
import {resultsPanel,tutorialPanel,cityPanel} from './arcade-view.mjs';
import {GamePwa} from './pwa';
import {readAccountOwner,rememberAccountOwner} from './account-owner.mjs';
import {ProgressionScene} from './progression-scene';
import {WORD,missionSet,missionReady,dailyReady,baseMultiplier,missionReward,withCurrentDay,advanceProgression,nextLetter,collectLetter,claimLocalReward,dailyLetterLane,progressionHasNotice,markMissionsSeen} from './progression.mjs';
import {wordTiles,countdown,progressionPanel,rewardReveal} from './progression-view.mjs';
import { CharacterPreview } from './character-preview';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { KarachiWorld, type ObstacleKind } from './world';
import { LANES, jumpImpulse, sideBumpResponse, SAVE_KEY, loadSave, mergePlayerSaves, parseSave, persistSave, collides, contactKind, makeRow, buyWapsiTickets, buyAndUseWapsiTicket, WAPSI_TICKET_PRICE, WAPSI_TICKET_PACK, buyCruiserCharges, useCruiserCharge, CRUISER_CHARGE_PRICE, CRUISER_CHARGE_PACK, missionFor, speedAtDistance, stepCoinAttraction, powerPickupChoice, powerPickupDelay, firstPowerPickupDistance, distanceAfterRunTime, powerDuration, powerUpgradePrice, scorePowerMultiplier, coinPowerValue, buyPowerUpgrade } from './core.mjs';
import { stepLane, swipeThreshold, swipeAction, ROLL_DURATION, flightCoinLane, flightDescent } from './runner-motion.mjs';
import { RunReport } from './run-report.mjs';
import { TrackDirector, TRACK_VERSION, TRACK_LOOKAHEAD, materializeEncounter } from './track-director.mjs';
import { ROUTES, routeAt, environmentAt } from './routes.mjs';
import { ONCOMING_BUS_SPEED, trafficZ, stepChaser } from './traffic.mjs';
import type { CloudUser } from './cloud-account';
const icons={download:'<svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>',settings:'<svg viewBox="0 0 24 24"><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></svg>',profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.4 3.1-5.2 7-5.2s6.3 1.8 7 5.2"/></svg>',sound:'<svg viewBox="0 0 24 24"><path d="M11 4 5 9H2v6h3l6 5zM15 8q5 4 0 8M18 4q9 8 0 16"/></svg>',mute:'<svg viewBox="0 0 24 24"><path d="M11 4 5 9H2v6h3l6 5zM16 9l6 6m0-6-6 6"/></svg>',pause:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 4v.1"/></svg>'};
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const fmt=(n:number)=>Math.floor(n).toLocaleString('en-US');
$('app').innerHTML=`<main class="game-shell booting" id="shell"><canvas id="world" tabindex="0" aria-label="Karachi Run. Left and right to change lanes, up to jump, down to roll."></canvas><div class="vignette"></div>
<header class="topbar"><div class="brand"><div class="brand-mark"><img src="/branding/icon-ui.webp" alt="" width="48" height="48"></div><div><div class="brand-name">KARACHI RUN</div><div class="brand-sub">THE CITY OF LIGHTS</div></div></div><div class="top-actions"><div class="wallet" aria-label="Saved coins"><span class="coin-icon" aria-hidden="true"></span><span id="bank">0</span></div><button class="icon-button" id="install-game" aria-label="Install Karachi Run">${icons.download}</button><button class="icon-button" id="help-button" aria-label="How to play">${icons.help}</button><button class="icon-button" id="account-button" aria-label="Account">${icons.profile}</button><button class="icon-button" id="settings-button" aria-label="Settings" disabled>⚙</button><button class="icon-button hidden" id="pause-button" aria-label="Pause game">${icons.pause}</button></div></header>
<section class="start-panel" id="home-panel"><h1 class="lobby-logo"><img src="/branding/wordmark.webp" alt="Karachi Run" width="768" height="512" fetchpriority="high"></h1><div class="lobby-record"><span aria-hidden="true">★</span><div><small>PERSONAL BEST</small><b id="best">0</b></div></div><div class="start-buttons"><div class="urdu title-urdu" lang="ur">پکڑ سکو تو پکڑ لو!</div><button class="play-button" id="play-button" disabled><span>TAP TO RUN</span><span class="arrow">▶</span></button></div></section>
<footer class="bottom-bar"><nav class="game-nav" id="game-nav" aria-label="Game navigation"><button class="nav-item is-active" id="nav-home" data-nav="home" aria-label="Home"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg></span><span>HOME</span></button><button class="nav-item" id="nav-missions" data-nav="missions"><span class="nav-icon">🏆</span><span>MISSIONS</span></button><button class="nav-item" id="nav-me" data-nav="me"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.4 3.1-5.2 7-5.2s6.3 1.8 7 5.2"/></svg></span><span>ME</span></button><button class="nav-item" id="nav-shop" data-nav="shop"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 1.9-1.5L20 9H6"/><circle cx="10" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg></span><span>SHOP</span></button><button class="nav-item" id="nav-city" data-nav="city"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5.1-8 11-8 11S4 15.1 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><span>CITY</span></button></nav></footer>
<div class="daily-run-hud hidden" id="daily-run-hud"><small>DAILY KARACHI HUNT</small><div id="daily-run-letters"></div></div><div class="hud hidden" id="hud"><div class="hud-score" id="score">00000</div><small>POINTS</small></div><div class="multiplier hidden" id="multiplier">×1 SCORE</div><div class="run-stats hidden" id="run-stats"><span class="coin-icon" aria-hidden="true"></span><div><span id="run-coins">0</span><small>THIS RUN</small></div></div>
<div class="challenge hidden" id="challenge"><small id="challenge-number">CHALLENGE 01</small><b id="challenge-label">Collect 30 coins</b><div class="challenge-track"><i id="challenge-fill"></i></div><span id="challenge-progress">0 / 30</span><em id="challenge-reward">+20 coins</em></div><div class="chase-badge hidden" id="chase-badge"><div><small>RIGHT BEHIND YOU</small><b>The Warden</b><span class="chase-line"></span></div></div>
<div class="route-hud hidden" id="route-hud"><div><b id="zone-name">Saddar Bazaar</b><span id="distance">0 m</span></div><div class="route-track"><i id="route-fill"></i></div><small id="next-zone">NEXT · EMPRESS MARKET</small></div><div class="zone-banner hidden" id="zone-banner"><span>NOW ENTERING</span><b id="zone-title"></b><span class="urdu" id="zone-urdu" lang="ur"></span></div><div class="game-hint hidden" id="game-hint"></div><div class="active-power hidden" id="power-hud"></div><div class="resume-count hidden" id="resume-count"></div>
<div class="touch-controls hidden" id="touch-controls"><div class="touch-group"><button class="touch-button" data-action="left" aria-label="Move left">←</button><button class="touch-button" data-action="right" aria-label="Move right">→</button></div><div class="touch-group"><button class="touch-button cruiser-button" data-action="board" aria-label="Karachi Cruiser"><span>🛹</span><small id="board-charge-count">5</small></button></div><div class="touch-group"><button class="touch-button" data-action="slide" aria-label="Roll">↓</button><button class="touch-button" data-action="jump" aria-label="Jump">↑</button></div></div><div class="modal-scrim hidden" id="modal-layer"></div><div class="toast hidden" id="toast" role="status"></div><div class="loading" id="loading"><img class="loading-logo" src="/branding/wordmark.webp" alt="Karachi Run" width="768" height="512"><p>WAKING UP KARACHI…</p><div class="loading-track"></div></div></main>`;
let storage:Storage|undefined;try{storage=window.localStorage;}catch{}
let saved=withCurrentDay(loadSave(storage)),saveWarning=false,toastTimer=0;
const GUEST_SAVE_KEY=SAVE_KEY+'.guest';
const ACCOUNT_OWNER_KEY=SAVE_KEY+'.cloud-owner';
type CloudSyncStatus='guest'|'syncing'|'saved'|'error';
let cloudUser:CloudUser|null=cloudIsConfigured()?readAccountOwner(storage,ACCOUNT_OWNER_KEY)?.user??null:null,cloudSaveTimer=0,cloudSyncWarning=false,cloudSetupError='',cloudSaveReady=false;
let cloudSaveConflict=false,cloudRewardInFlight=false;
let cloudSyncStatus:CloudSyncStatus='guest',localSaveRevision=0,cloudWriteRevision=0,cloudSaveQueue:Promise<void>=Promise.resolve();
let cloudApi:typeof import('./cloud-account')|null=null;
let cloudRetryTimer=0,cloudRetryDelay=2000,cloudAccountInitialization:Promise<void>|null=null;
const pendingKey=(id:string)=>SAVE_KEY+'.pending.'+id;
function cloudIsConfigured(){return Boolean(import.meta.env.VITE_NEON_AUTH_URL?.trim()&&import.meta.env.VITE_NEON_DATA_API_URL?.trim());}
async function getCloudApi(){if(!cloudApi)cloudApi=await import('./cloud-account');return cloudApi;}
function scheduleCloudRetry(){
 if(!navigator.onLine||cloudSaveConflict||cloudRetryTimer||!cloudIsConfigured())return;
 cloudRetryTimer=window.setTimeout(()=>{cloudRetryTimer=0;void (cloudSaveReady&&cloudUser?flushCloudSave():initializeCloudAccount());},cloudRetryDelay);
 cloudRetryDelay=Math.min(30000,cloudRetryDelay*2);
}
function toast(message:string){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('toast').classList.add('hidden'),3000);}
function refreshAccountButton(){
 const button=document.getElementById('account-button');
 if(button){button.classList.toggle('account-linked',Boolean(cloudUser));button.classList.toggle('account-sync-error',cloudSyncStatus==='error');button.setAttribute('aria-label',cloudUser?`Account: ${cloudUser.name}`:'Sign in or view account');button.title=cloudSyncStatus==='error'?cloudSetupError:cloudUser?`Profile · ${cloudUser.name}`:'Sign in or view account';button.innerHTML=icons.profile;}
 const status=document.getElementById('account-sync');
 if(status){status.textContent=cloudSyncStatus==='saved'?'Cloud save is up to date':cloudSyncStatus==='syncing'?'Saving progress…':cloudSyncStatus==='error'?'Cloud sync needs attention':'Guest progress stays on this browser';status.classList.toggle('account-error',cloudSyncStatus==='error');}
}
async function flushCloudSave(){
 if(!cloudUser||!cloudSaveReady||cloudSaveConflict||cloudRewardInFlight)return;
 window.clearTimeout(cloudSaveTimer);cloudSaveTimer=0;
 const owner=cloudUser.id,revision=++cloudWriteRevision,localRevision=localSaveRevision;
 const snapshot=JSON.parse(JSON.stringify(saved)) as Record<string,unknown>;
 try{storage?.setItem(pendingKey(owner),JSON.stringify(snapshot));}catch{}
 cloudSyncStatus='syncing';refreshAccountButton();
 cloudSaveQueue=cloudSaveQueue.catch(()=>{}).then(async()=>{
  if(cloudUser?.id!==owner||cloudSaveConflict||!cloudSaveReady)return;
  const api=await getCloudApi();const ack=await api.writeCloudSave(owner,snapshot);
  if(cloudUser?.id===owner)rememberAccountOwner(storage,ACCOUNT_OWNER_KEY,cloudUser,String(ack.updated_at));
  try{if(cloudUser?.id===owner)storage?.setItem(pendingKey(owner)+'.version',String(ack.updated_at));}catch{}
  if(cloudUser?.id===owner&&revision===cloudWriteRevision&&localRevision===localSaveRevision){
   saved=parseSave(JSON.stringify(ack.save_data));persistSave(storage,saved);updateRecords();updateChallenge();
   cloudSyncStatus='saved';cloudSyncWarning=false;cloudSetupError='';cloudRetryDelay=2000;
   window.clearTimeout(cloudRetryTimer);cloudRetryTimer=0;
   try{storage?.removeItem(pendingKey(owner));storage?.removeItem(pendingKey(owner)+'.version');storage?.removeItem(GUEST_SAVE_KEY);}catch{}
   refreshAccountButton();
  }
 }).catch(error=>{
  if(cloudUser?.id===owner){if(error instanceof Error&&error.name==='CloudSaveConflict'){cloudSaveConflict=true;cloudSaveReady=false;if(mode==='running')pause();}cloudSyncStatus='error';cloudSetupError=error instanceof Error?error.message:'The cloud save could not be confirmed.';scheduleCloudRetry();console.error('Neon cloud save failed',error);refreshAccountButton();if(!cloudSyncWarning){cloudSyncWarning=true;toast(cloudSaveConflict?'Another device updated your save. Open Profile to load the latest cloud progress.':'Cloud sync failed. Your progress remains saved on this device.');}}
 });
 await cloudSaveQueue;
}
let coinPulse:Animation|null=null;
const runSaveWriter=new ProgressWriter(()=>save(),()=>localSaveRevision++);
function scheduleRunSave(){runSaveWriter.schedule();}
function save(syncNow=false){
 runSaveWriter.cancel();
 localSaveRevision++;
 const ok=persistSave(storage,saved);
 if(!cloudUser&&storage){try{storage.setItem(GUEST_SAVE_KEY,JSON.stringify(saved));}catch{}}
 if(cloudUser){try{storage?.setItem(pendingKey(cloudUser.id),JSON.stringify(saved));const version=cloudApi?.cloudSaveVersion(cloudUser.id)??readAccountOwner(storage,ACCOUNT_OWNER_KEY)?.version;if(version)storage?.setItem(pendingKey(cloudUser.id)+'.version',version);}catch{}}
 if(cloudUser&&cloudSaveReady){
  // Do not restart this timer for every coin: continuous play must not starve writes.
  if(syncNow)void flushCloudSave();else if(!cloudSaveTimer)cloudSaveTimer=window.setTimeout(()=>void flushCloudSave(),650);
 }else if(cloudIsConfigured()&&syncNow)void initializeCloudAccount();
 if(!ok&&!saveWarning){saveWarning=true;toast('Browser storage is unavailable. This session still works.');}
 return ok;
}
function initializeCloudAccount(){
 if(cloudSaveConflict)return Promise.resolve();
 if(!cloudAccountInitialization)cloudAccountInitialization=restoreCloudAccount().finally(()=>{cloudAccountInitialization=null;});
 return cloudAccountInitialization;
}
async function restoreCloudAccount(){
 if(!cloudIsConfigured()){refreshAccountButton();return;}
 const cachedOwner=readAccountOwner(storage,ACCOUNT_OWNER_KEY);
 if(!navigator.onLine){cloudSaveReady=false;cloudSyncStatus=cloudUser?'error':'guest';cloudSetupError=cloudUser?'You are offline. This account’s progress stays on this device and will sync when you reconnect.':'';refreshAccountButton();return;}
 const startingRevision=localSaveRevision,startingSave=parseSave(JSON.stringify(saved));
 try{
  const api=await getCloudApi();
  cloudUser=await api.getCloudUser();
  rememberAccountOwner(storage,ACCOUNT_OWNER_KEY,cloudUser);
  const ownerChanged=Boolean(cachedOwner&&cloudUser&&cachedOwner.user.id!==cloudUser.id);
  if(!cloudUser){cloudSaveReady=false;cloudSyncStatus='guest';cloudSetupError='';refreshAccountButton();return;}
  cloudSaveReady=false;cloudSyncStatus='syncing';refreshAccountButton();
  const remote=await api.loadCloudSave(cloudUser.id);
  const pendingRaw=storage?.getItem(pendingKey(cloudUser.id));
  const pendingVersion=storage?.getItem(pendingKey(cloudUser.id)+'.version')??(cachedOwner?.user.id===cloudUser.id?cachedOwner.version:null);
  if(pendingRaw&&pendingVersion&&Date.parse(pendingVersion)!==Date.parse(api.cloudSaveVersion(cloudUser.id)??'')){
   cloudSaveConflict=true;cloudSyncStatus='error';cloudSetupError='Another device updated your save. Open Profile and load the latest cloud progress. Your unsynced snapshot is kept on this browser.';refreshAccountButton();return;
  }
  const guestRaw=storage?.getItem(GUEST_SAVE_KEY);
  const latest=parseSave(JSON.stringify(saved));
  // An unacknowledged account snapshot preserves purchases and spent balances on retry.
  if(pendingRaw)saved=parseSave(pendingRaw);
  else if(remote)saved=guestRaw?mergePlayerSaves(remote,parseSave(guestRaw)):parseSave(JSON.stringify(remote));
  else saved=ownerChanged?parseSave(null):startingSave; // The current local save can be newer than the signup guest snapshot.
  if(!ownerChanged&&localSaveRevision>startingRevision)saved=guestRaw?mergePlayerSaves(saved,latest):latest;
  saved=withCurrentDay(saved);persistSave(storage,saved);updateRecords();updateChallenge();applyAccountPresentation();cloudSaveReady=true;
  await flushCloudSave();
 }catch(error){
  cloudSaveReady=false;cloudSyncStatus='error';cloudSetupError=error instanceof Error?error.message:'Neon account setup could not be reached.';
  console.error('Neon account initialization failed',error);scheduleCloudRetry();
 }finally{refreshAccountButton();}
}
void initializeCloudAccount();
window.addEventListener('online',()=>{void (cloudSaveReady&&cloudUser?flushCloudSave():initializeCloudAccount());});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(cloudUser&&cloudSaveReady)void flushCloudSave();}else if(cloudSyncStatus==='error')void (cloudSaveReady&&cloudUser?flushCloudSave():initializeCloudAccount());});

function updateRecords(){ $('bank').textContent=fmt(saved.coins);const ticketCount=document.getElementById('ticket-count');if(ticketCount)ticketCount.textContent=saved.wapsiTickets>0?String(saved.wapsiTickets):'';$('board-charge-count').textContent=String(saved.cruiserCharges);$('best').textContent=fmt(saved.best);$('nav-missions').classList.toggle('has-notice',progressionHasNotice(saved));$('nav-missions').setAttribute('aria-label',progressionHasNotice(saved)?'Missions · new progress or reward ready':'Missions');$('shell').classList.toggle('touch-assist',saved.touchAssist===true);}
updateRecords();
class GameAudio {
  ctx:AudioContext|null=null;music:GainNode|null=null;sfx:GainNode|null=null;noise:AudioBuffer|null=null;lastCoin=0;lastStep=0;lastHorn=-Infinity;coinCombo=0;lastCoinTime=0;musicTimer=0;nextBeat=0;beat=0;lastVoice=0;
  unlock(){try{if(!this.ctx){this.ctx=new AudioContext();this.music=this.ctx.createGain();this.sfx=this.ctx.createGain();const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.004;compressor.release.value=.22;compressor.connect(this.ctx.destination);this.music.gain.value=.32;this.sfx.gain.value=.8;this.music.connect(compressor);this.sfx.connect(compressor);this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}void this.ctx.resume();}catch{}}
  private toneAt(freq:number,duration:number,volume:number,type:OscillatorType,end:number|undefined,at:number,bus:GainNode|null=this.sfx){const c=this.ctx;if(!c||!bus||saved.muted&&bus===this.sfx||saved.musicMuted&&bus===this.music)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(1,freq),at);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+duration);g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(volume,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(bus);o.start(at);o.stop(at+duration+.025);}
  private noiseAt(duration:number,volume:number,frequency:number,at:number,lowpass=false,bus:GainNode|null=this.sfx){const c=this.ctx;if(!c||!this.noise||!bus||saved.muted&&bus===this.sfx||saved.musicMuted&&bus===this.music)return;const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();src.buffer=this.noise;filter.type=lowpass?'lowpass':'bandpass';filter.frequency.setValueAtTime(frequency,at);filter.Q.value=lowpass?.7:1.1;g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);src.connect(filter);filter.connect(g);g.connect(bus);src.start(at);src.stop(at+duration);}
  tone(freq:number,duration:number,volume=.025,type:OscillatorType='sine',end?:number){if(!this.ctx||saved.muted)return;this.toneAt(freq,duration,volume,type,end,this.ctx.currentTime);}
  private pluck(freq:number,at:number,volume=.045){this.toneAt(freq,.24,volume,'triangle',freq*.48,at,this.music);this.toneAt(freq*2.01,.11,volume*.28,'sine',freq*1.2,at,this.music);}
  startMusic(){this.unlock();this.stopMusic();if(saved.musicMuted||!this.ctx)return;this.nextBeat=this.ctx.currentTime+.08;this.beat=0;this.musicTimer=window.setInterval(()=>this.scheduleBeat(),55);}
  stopMusic(){if(this.musicTimer)clearInterval(this.musicTimer);this.musicTimer=0;}
  private scheduleBeat(){if(!this.ctx||saved.musicMuted)return;const c=this.ctx,bpm=118+Math.min(34,Math.max(0,speed-14)*1.9),step=60/bpm/2;while(this.nextBeat<c.currentTime+.14){const at=this.nextBeat,beat=this.beat%16,bar=Math.floor(this.beat/16),root=[146.83,164.81,196,174.61][bar%4],scale=[1,1.25,1.5,1.875,2,1.5,1.25,1.125];if(beat%4===0){this.toneAt(90,.19,.17,'sine',42,at,this.music);this.noiseAt(.12,.10,130,at,true,this.music);}if(beat%4===2)this.noiseAt(.105,.07,1500,at,false,this.music);if(beat%2===1)this.noiseAt(.035,.025,6500,at,false,this.music);if([1,3,5,7].includes(beat%8))this.pluck(root*scale[(beat+bar*2)%scale.length],at,.036);if(beat%8===6)this.pluck(root*2,at,.022);this.nextBeat+=step;this.beat++;}}
  coin(){const t=performance.now();if(t-this.lastCoin<70||!this.ctx||saved.muted)return;this.lastCoin=t;const gap=(t-this.lastCoinTime)/1000;this.lastCoinTime=t;if(gap>.45)this.coinCombo=0;else this.coinCombo=Math.min(7,this.coinCombo+1);const scale=[659.25,783.99,880,987.77,1174.66,1318.51,1567.98,1760],freq=scale[this.coinCombo],at=this.ctx.currentTime;this.toneAt(freq,.17,.035,'sine',freq*1.13,at);this.toneAt(freq*2.76,.12,.009,'sine',freq*2.9,at+.01);if(this.coinCombo===7){this.toneAt(2093,.24,.024,'sine',2637,at+.05);this.quip('واہ، کیا سلسلہ!');}}
  whoosh(dir:number){if(!this.ctx)return;this.noiseAt(.16,.055,dir>0?1100:850,this.ctx.currentTime,true);this.tone(dir>0?360:300,.13,.018,'sine',dir>0?680:560);}
  jump(){if(!this.ctx)return;this.tone(245,.20,.03,'sine',720);this.noiseAt(.13,.035,900,this.ctx.currentTime,true);}
  land(){if(!this.ctx)return;this.tone(105,.16,.055,'sine',48);this.noiseAt(.11,.045,170,this.ctx.currentTime,true);}
  slide(){if(!this.ctx)return;this.noiseAt(.23,.052,1200,this.ctx.currentTime,true);this.tone(180,.2,.015,'triangle',80);}
  crash(){if(!this.ctx)return;this.tone(118,.38,.085,'triangle',38);this.noiseAt(.28,.10,250,this.ctx.currentTime,true);}
  power(){if(!this.ctx)return;const t=this.ctx.currentTime;[784,988,1175].forEach((f,i)=>this.toneAt(f,.24,.035,'sine',f*1.03,t+i*.075));}
  chai(){if(!this.ctx)return;const t=this.ctx.currentTime;[392,523,659,784,988].forEach((f,i)=>this.toneAt(f,.34,.045,'sine',f*1.04,t+i*.055));this.noiseAt(.7,.045,1900,t,true);}
  biryani(){if(!this.ctx)return;const t=this.ctx.currentTime;[220,330,440,660,880].forEach((f,i)=>this.toneAt(f,.5,.04,'triangle',f*1.01,t+i*.065));this.noiseAt(.35,.04,2200,t,true);}
  boardActivate(){this.power();}
  boardBreak(){this.crash();}
  graze(){if(!this.ctx)return;this.tone(225,.18,.035,'triangle',105);this.noiseAt(.12,.025,700,this.ctx.currentTime,true);}
  horn(side=0){if(!this.ctx||!this.sfx||saved.muted)return;const now=this.ctx.currentTime;if(now-this.lastHorn<1.4)return;this.lastHorn=now;playTruckHorn(this.ctx,this.sfx,{pan:Math.max(-.8,Math.min(.8,side/6))});}
  step(phase:number){const contact=Math.floor(phase/Math.PI);if(contact!==this.lastStep){this.lastStep=contact;this.tone(86,.045,.010,'triangle',52);}}
  quip(line:string,speaker:'runner'|'warden'='runner'){const t=performance.now();if(saved.voiceMuted||t-this.lastVoice<5500||!('speechSynthesis'in window))return;const voices=speechSynthesis.getVoices(),voice=voices.find(v=>/^ur(-|_)?(PK|IN)?$/i.test(v.lang))||voices.find(v=>/^ur/i.test(v.lang));if(!voice)return;this.lastVoice=t;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(line);utterance.lang=voice.lang;utterance.voice=voice;utterance.rate=speaker==='warden'?1.04:.96;utterance.pitch=speaker==='warden'?.86:(saved.selectedCharacter==='imran.glb'?.94:saved.selectedCharacter==='asim.glb'?1.1:1.04);utterance.volume=speaker==='warden'?.58:.72;speechSynthesis.speak(utterance);}
}
const audio=new GameAudio();
const runReport=new RunReport();let runSeed=0,frameWallDt=0,cinematicTrack=false;let trackDirector:TrackDirector|null=null;let pickTraffic=createVehiclePicker();
type Mode='intro'|'menu'|'running'|'paused'|'crashed'|'resuming'|'over';
type Item={rolled:boolean;root:TransformNode;skyTrail:boolean;type:'obstacle'|'coin'|'magnet'|'boost'|'chai'|'biryani'|'shoes';kind?:ObstacleKind;active:boolean;width:number;depth:number;height:number;phase:number;counted:boolean;jumped:boolean;vehicleSpeed:number;previousZ:number;baseX:number;baseY:number;baseZ:number;ramp:boolean;entryRamp:boolean;exitRamp:boolean;grazed:boolean;honked:boolean};
let world:KarachiWorld,mode:Mode='menu';
let progressionScene:ProgressionScene|null=null,phase3Busy=false,nextLetterAt=65,foundLetters=0,recordNearShown=false,recordBeatenShown=false;
let runProgressStart=structuredClone(saved.progression),progressTab='missions',lastChallengePaint=0;
let chaserState:{x:number;z:number;targetX?:number;hold?:number}={x:-.55,z:-4.6};
let laneVelocity=0;
const skyFlight=new ChaiFlight();
let floorY=0,stumbleUntil=0,jumpBuffer=0,boardTime=0,boardCooldown=0,invincibleUntil=0;
let lane=1,x=0,y=0,vy=0,shoesTime=0,slideTime=0,distance=0,score=0,scoreExact=0,runCoins=0,speed=14,elapsed=0,magnetTime=0,boostTime=0,chaiTime=0,biryaniTime=0,chaiLanding=false,chaiLandingGrace=0,chaiCoinNextDistance=0,chaiCoinIndex=0,nextPowerAt=0,powerOpportunity=0,lastSave=0,oldBest=0,finished=false,revives=0,deadline=0,selectedStart=0,runStart=0,lastZone='',zoneUntil=0,announcedZones=new Set<string>(),hiddenAt=0;
const discovered=new Set<string>();const pools:Record<string,Item[]>={bus:[],rickshaw:[],barrier:[],arch:[],coin:[],magnet:[],boost:[],chai:[],biryani:[],shoes:[]};const all:Item[]=[];pools.rooftop=[];
const pwa=new GamePwa({production:import.meta.env.PROD,changed:refreshPwaUI,notice:toast,canUpdate:()=>mode==='menu'&&!phase3Busy&&!cloudRewardInFlight,beforeUpdate:async()=>{save();await flushCloudSave();}});
function offlineCopy(){
 if(pwa.offline.ready)return 'Saved on this device. Cloud saves sync when you reconnect.';
 if(pwa.offline.downloading)return 'Saving Karachi for offline play… '+Math.round(pwa.offline.done/Math.max(1,pwa.offline.total)*100)+'%';
 if(pwa.cacheError)return 'Download paused. Reconnect or free some storage, then retry.';
 if(!pwa.available)return import.meta.env.DEV?'Offline download is available in the live game.':'Preparing offline play. You can keep playing.';
 return 'Download the city and all three runners'+(pwa.offline.bytes?' · about '+Math.ceil(pwa.offline.bytes/1048576)+' MB':'')+'. Cloud saves and reward claims need a connection.';
}
function refreshPwaUI(){
 const state=pwa.state(),install=document.getElementById('install-game');if(install)install.classList.toggle('hidden',state.installed);
 document.querySelectorAll<HTMLButtonElement>('[data-pwa-install-label]').forEach(button=>button.textContent=state.installed?'APP & OFFLINE PLAY':'INSTALL GAME');
 const native=document.getElementById('pwa-native-install') as HTMLButtonElement|null;if(native){native.classList.toggle('hidden',!state.available||state.installed);native.disabled=state.busy||state.installed;native.textContent=state.installed?'ADDED TO HOME SCREEN':state.busy?'OPENING INSTALL…':'INSTALL GAME';}
 document.querySelectorAll<HTMLElement>('[data-install-guide]').forEach(el=>el.classList.toggle('hidden',state.available||state.installed));
 document.querySelectorAll<HTMLElement>('[data-offline-status]').forEach(el=>el.textContent=offlineCopy());
 document.querySelectorAll<HTMLButtonElement>('[data-offline-download]').forEach(button=>{button.disabled=!pwa.available||pwa.offline.downloading||pwa.offline.ready;button.textContent=pwa.offline.ready?'✓ READY OFFLINE':pwa.offline.downloading?'SAVING…':'SAVE FOR OFFLINE';});
 document.querySelectorAll<HTMLProgressElement>('[data-offline-progress]').forEach(bar=>{bar.max=Math.max(1,pwa.offline.total);bar.value=pwa.offline.done;bar.hidden=!pwa.offline.downloading;});
 document.querySelectorAll<HTMLElement>('[data-pwa-update]').forEach(el=>el.classList.toggle('hidden',!pwa.updateReady));
 document.querySelectorAll<HTMLButtonElement>('[data-pwa-update-button]').forEach(button=>{button.disabled=pwa.updating;button.textContent=pwa.updating?'SAVING & UPDATING…':'UPDATE GAME';});
}
function pwaUpdateCard(){return '<div class="pwa-update '+(pwa.updateReady?'':'hidden')+'" data-pwa-update><small>A fresh version of Karachi is ready. Update from the lobby when you are done running.</small><button class="pwa-action" data-pwa-update-button>UPDATE GAME</button></div>';}
function wirePwaUI(){
 document.querySelectorAll<HTMLButtonElement>('[data-pwa-open]').forEach(button=>button.onclick=showInstall);
 document.querySelectorAll<HTMLButtonElement>('[data-offline-download]').forEach(button=>button.onclick=()=>pwa.downloadOffline());
 document.querySelectorAll<HTMLButtonElement>('[data-pwa-update-button]').forEach(button=>button.onclick=()=>void pwa.applyUpdate());
 refreshPwaUI();
}
function pwaSettings(){return '<div class="pwa-settings"><img src="/branding/icon-ui.webp" alt="" width="54" height="54"><div><b>Karachi in your pocket</b><p>Add the game to your Home Screen and keep the city close.</p></div><button class="pwa-action" data-pwa-open data-pwa-install-label>INSTALL GAME</button></div>'+pwaUpdateCard();}
function showInstall(){
 if(mode!=='menu'||phase3Busy||pwa.updating)return;
 const state=pwa.state(),platform=pwa.platform();
 const steps=platform==='ios'?['Tap the Share button in your browser.','Choose Add to Home Screen.','Tap Add, then launch the Karachi Run icon.']:platform==='android'?['Open your browser’s menu (⋮).','Choose Install app or Add to Home screen.','Confirm, then launch the Karachi Run icon.']:['Open the install icon in the address bar or the browser menu.','Choose Install Karachi Run or Install this site as an app.','Confirm and launch Karachi Run from your apps.'];
 showModal('<img class="pwa-hero" src="/branding/icon-192.png" alt="Karachi Run" width="96" height="96"><div class="eyebrow">YOUR CITY. ONE TAP AWAY.</div><h2>'+ (state.installed?'Ready to run.':'Take Karachi with you.')+'</h2><p>Launch straight into the streets from your Home Screen.</p>'+(state.installed?'<p class="new-best">✓ ADDED TO YOUR HOME SCREEN</p>':'<button class="pwa-action hidden" id="pwa-native-install">INSTALL GAME</button><div data-install-guide><ol class="pwa-steps">'+steps.map(step=>'<li>'+step+'</li>').join('')+'</ol><p class="pwa-footnote">If your browser has no install option, open Karachi Run in Safari on iPhone or Chrome / Edge on Android and desktop.</p></div>')+'<div class="pwa-offline"><strong>Keep the city ready</strong><p class="pwa-status" data-offline-status></p><progress data-offline-progress hidden aria-label="Offline game download"></progress><button class="pwa-action" data-offline-download>SAVE FOR OFFLINE</button></div><p class="pwa-footnote">Sign in from Profile to carry progress across browsers and devices. Cloud saves need an internet connection.</p>'+pwaUpdateCard());
 const install=document.getElementById('pwa-native-install');if(install)install.onclick=async()=>{const result=await pwa.requestInstall();if(result==='help')showInstall();};wirePwaUI();void pwa.readStatus();
}
$('install-game').onclick=showInstall;refreshPwaUI();

function createItem(key:string,assetIndex?:number):Item{const obstacle=['bus','rickshaw','barrier','arch','rooftop'].includes(key);const root=key==='rooftop'?world.assets.rooftop():key==='bus'||key==='rickshaw'?world.assets.vehicle(key,assetIndex):obstacle?world.obstacle(key as ObstacleKind):key==='coin'?world.coin():world.power(key as 'magnet'|'boost'|'chai'|'biryani'|'shoes');const item:Item={rolled:false,root,skyTrail:false,type:obstacle?'obstacle':key as Item['type'],kind:obstacle?(key==='rooftop'?'bus':key) as ObstacleKind:undefined,active:false,width:root.metadata?.width??2.6,depth:root.metadata?.depth??.5,height:root.metadata?.height??1.4,phase:all.length*.63,counted:false,jumped:false,vehicleSpeed:0,previousZ:0,baseX:0,baseY:0,baseZ:0,ramp:key==='rooftop',entryRamp:key==='rooftop',exitRamp:false,grazed:false,honked:false};if(item.ramp){const deck=MeshBuilder.CreateBox('walkable cargo deck',{width:item.width,height:.08,depth:item.depth},world.scene);deck.parent=root;deck.position.y=item.height;deck.material=world.mat('cargo deck','#987446');const ramp=MeshBuilder.CreateBox('loading ramp',{width:item.width,height:.12,depth:Math.hypot(12,item.height)},world.scene);ramp.parent=root;ramp.position.set(0,item.height/2,-item.depth/2-6);ramp.rotation.x=-Math.atan2(item.height,12);ramp.material=world.mat('loading ramp','#d6ae59');const exit=ramp.clone('exit ramp',root)!;exit.position.z=item.depth/2+6;exit.rotation.x=Math.atan2(item.height,12);exit.setEnabled(false);}root.setEnabled(false);pools[key].push(item);all.push(item);return item;}
function spawn(key:string,l:number,z:number,height=1.1){const variant=key==='bus'||key==='rickshaw'?pickTraffic(key):undefined;const item=pools[key].find(i=>!i.active&&(variant===undefined||i.root.metadata?.assetIndex===variant))||createItem(key,variant);item.active=true;item.rolled=false;item.skyTrail=false;item.grazed=false;item.honked=false;item.entryRamp=item.ramp;item.exitRamp=false;for(const child of item.root.getChildMeshes()){if(child.name==='loading ramp')child.setEnabled(true);if(child.name==='exit ramp')child.setEnabled(false);}item.vehicleSpeed=key==='bus'?ONCOMING_BUS_SPEED:0;item.previousZ=z;item.counted=false;item.jumped=false;item.root.setEnabled(true);item.root.position.set(LANES[l],item.type==='obstacle'?0:height,z);item.baseX=LANES[l];item.baseY=item.type==='obstacle'?0:height;item.baseZ=z;item.root.rotation.set(0,0,0);return item;}
function release(item:Item){item.active=false;item.skyTrail=false;item.root.setEnabled(false);}
function trackObstacles(){return all.filter(i=>i.active&&i.type==='obstacle').map(i=>({x:i.root.position.x,z:i.root.position.z,width:i.width,depth:i.depth+(i.ramp?24:0),kind:i.kind!,vehicleSpeed:i.vehicleSpeed}));}
function spawnScheduledPower(laneIndex:number,z:number){
 const at=distance+z;if(at<nextPowerAt)return;
 const kind=powerPickupChoice(runSeed,powerOpportunity),safeLane=dailyLetterLane(laneIndex,z,speed,trackObstacles());
 if(kind&&safeLane!==null)spawn(kind,safeLane,z,1.35);
 nextPowerAt=distanceAfterRunTime(at,powerPickupDelay(runSeed,powerOpportunity));powerOpportunity++;
}
function spawnTrackAhead(atDistance:number){
 if(!trackDirector)return;
 for(const group of trackDirector.takeThrough(atDistance+TRACK_LOOKAHEAD)){
  const ready=materializeEncounter(group,atDistance,trackObstacles(),speed);
  for(const obstacle of ready.obstacles){
   const item=spawn(obstacle.key,obstacle.lane,obstacle.z);
   if(obstacle.key==='rooftop'){
    item.entryRamp=obstacle.ramp;item.exitRamp=obstacle.exitRamp;
    for(const child of item.root.getChildMeshes()){if(child.name==='loading ramp')child.setEnabled(item.entryRamp);if(child.name==='exit ramp')child.setEnabled(item.exitRamp);}
   }
  }
  for(const coin of ready.coins){const item=spawn('coin',coin.lane,coin.at-atDistance,coin.y);item.root.position.x=item.baseX=coin.x;}
  // Rewards share the clear ground fork; never place one inside a loading ramp.
  const rewardZ=group.end-atDistance-4;
  spawnScheduledPower(group.safeLane,rewardZ);scheduleDailyLetter(group.safeLane,rewardZ-5);
 }
}
function setGameUI(show:boolean){$('daily-run-hud').classList.add('hidden');$('shell').classList.toggle('playing',show);for(const id of ['hud','run-stats','multiplier','pause-button','touch-controls'])$(id).classList.toggle('hidden',!show);$('help-button').classList.toggle('hidden',show);$('account-button').classList.toggle('hidden',show);$('install-game').classList.toggle('hidden',show||pwa.state().installed);$('settings-button').classList.toggle('hidden',show);$('game-nav').classList.toggle('hidden',show);}
function resetScene(start:number){pickTraffic=createVehiclePicker(runSeed);world.resetCinematicCamera();progressionScene?.reset();nextLetterAt=65;x=0;laneVelocity=0;y=0;vy=0;floorY=0;magnetTime=0;boostTime=0;chaiTime=0;biryaniTime=0;shoesTime=0;skyFlight.reset();chaiLanding=false;chaiLandingGrace=0;slideTime=0;stumbleUntil=0;jumpBuffer=0;boardTime=0;boardCooldown=0;invincibleUntil=0;world.setBoardActive(false);world.setChaiActive(false);world.groundHeight=0;world.airborne=false;world.verticalVelocity=0;world.jumpLaunchSpeed=0;world.flightStage='off';world.rollRemaining=0;chaserState={x:-.55,z:-4.6};all.forEach(release);world.travel=start;world.speed=14;world.chunks.forEach((c,i)=>c.position.z=i*18-36);world.city.update(start,world.time);world.runner.root.position.set(0,0,0);world.runner.root.rotation.y=0;world.pursuer.root.position.set(-.55,0,-4.6);world.pursuer.root.rotation.y=0;world.openingSet.reset();if(mode==='menu'){world.lobbyClock=0;world.openingElapsed=0;}distance=0;powerOpportunity=0;nextPowerAt=firstPowerPickupDistance(runSeed);chaiCoinNextDistance=0;chaiCoinIndex=0;const envelope=(key:string)=>{const items=pools[key];return {width:Math.max(...items.map(i=>i.width)),height:Math.max(...items.map(i=>i.height)),depth:Math.max(...items.map(i=>i.depth))};};trackDirector=new TrackDirector(runSeed,{roof:envelope('rooftop'),bus:envelope('bus'),rickshaw:envelope('rickshaw'),barrier:envelope('barrier'),arch:envelope('arch')},cinematicTrack?0x4b415241:runSeed);if(mode==='running')spawnTrackAhead(0);}
let introTime=0,introDuration=0,moviePrepared=false;
const introMovie=new CinematicIntro(()=>launchRun(true,true),()=>{
  document.getElementById('skip-intro')?.remove();document.getElementById('cinematic-wait')?.remove();
  if(moviePrepared){mode='running';world.mode='running';world.releaseCinematicHandoff();revealRunUI();moviePrepared=false;}
});
function opening(){
  if(mode!=='menu'||phase3Busy||pwa.updating)return;if(cloudSaveConflict){showAccount();return;}
  audio.unlock();world.introProgress=0;mode='intro';$('shell').classList.add('opening');$('game-hint').textContent='';$('game-hint').classList.add('hidden');
  const skip=document.createElement('button');skip.id='skip-intro';skip.className='secondary intro-skip';skip.textContent='Skip intro →';skip.onclick=()=>introMovie.active?introMovie.skip():startRun();$('shell').append(skip);
  // The approved film stars Haris on the starting street. Other runners/routes
  // retain their real selected model and the live opening, without a costume cut.
  if(world.runner.source==='pakistani_boy.glb'&&selectedStart===0){
    moviePrepared=false;introMovie.begin(world.lobbyClock,saved.muted);
    const wait=document.createElement('div');wait.id='cinematic-wait';wait.className='cinematic-wait';wait.textContent='ONE LAST CATCH…';$('shell').append(wait);return;
  }
  introTime=0;introDuration=world.beginOpening();
}
function startRun(){introMovie.cancel();moviePrepared=false;document.getElementById('cinematic-wait')?.remove();launchRun();}
function launchRun(cinematic=false,hold=false){if(phase3Busy)return;if(cloudSaveConflict){mode='menu';document.getElementById('skip-intro')?.remove();$('shell').classList.remove('opening');setGameUI(false);showAccount();return;}saved=withCurrentDay(saved);runProgressStart=structuredClone(saved.progression);foundLetters=0;recordNearShown=false;recordBeatenShown=false;document.getElementById('skip-intro')?.remove();$('shell').classList.remove('opening');if(!world)return;audio.unlock();mode='running';lane=1;x=0;laneVelocity=0;y=0;vy=0;floorY=0;stumbleUntil=0;slideTime=0;jumpBuffer=0;boardTime=0;boardCooldown=0;invincibleUntil=0;world.setBoardActive(false);distance=0;score=0;scoreExact=0;runCoins=0;speed=14;elapsed=0;magnetTime=0;boostTime=0;chaiTime=0;biryaniTime=0;shoesTime=0;skyFlight.reset();chaiLanding=false;chaiLandingGrace=0;chaiCoinNextDistance=0;chaiCoinIndex=0;lastSave=0;oldBest=saved.best;finished=false;revives=0;cinematicTrack=cinematic;runSeed=crypto.getRandomValues(new Uint32Array(1))[0];runReport.start({seed:runSeed,openingSeed:cinematic?0x4b415241:runSeed,trackVersion:TRACK_VERSION,start:selectedStart,viewport:{width:innerWidth,height:innerHeight},quality:world.low?'low':'standard'});runStart=selectedStart;lastZone='';announcedZones.clear();discovered.clear();resetScene(runStart);world.setChaiActive(chaiTime>0);if(cinematic)world.prepareCinematicHandoff();if(hold){moviePrepared=true;mode='intro';$('shell').classList.add('opening');return;}revealRunUI();}
function revealRunUI(){document.getElementById('skip-intro')?.remove();$('shell').classList.remove('opening');setGameUI(true);closeModal();$('run-coins').textContent='0';$('score').textContent='00000';$('game-hint').textContent=innerWidth<700?`← → LANES · ↑ JUMP · ↓ ROLL · DOUBLE-TAP = CRUISER (${saved.cruiserCharges})`:`← → Dodge    ↑ / W: Jump    ↓ / S: Roll    SPACE: 🛹 Cruiser (${saved.cruiserCharges})`;$('game-hint').classList.remove('hidden');$('power-hud').classList.add('hidden');audio.tone(440,.2,.02,'sine',660);audio.startMusic();audio.quip('چلو، کراچی!');$('world').focus({preventScroll:true});updateChallenge();toast('Follow the coins · gold ramps lead to rooftops');}
function checkpoint(syncNow=false){saved.best=Math.max(saved.best,score);save(syncNow);updateRecords();}
function finish(){if(finished)return;finished=true;audio.stopMusic();mode='over';saved.runs++;saved.totalScore+=score;checkpoint(true);for(const id of ['game-hint','power-hud','touch-controls','pause-button','resume-count','zone-banner'])$(id).classList.add('hidden');showResults();}
function crash(item?:Item,reason='direct'){if(mode!=='running')return;audio.stopMusic();audio.quip('اوئے، آخر پکڑ ہی لیا!','warden');runReport.freeze(elapsed,{reason,player:{x,y,vy,floorY,lane,slideTime,distance,speed},obstacle:item?{kind:item.kind,x:item.root.position.x,z:item.root.position.z,previousZ:item.previousZ,width:item.width,depth:item.depth,height:item.height,ramp:item.ramp,entryRamp:item.entryRamp,exitRamp:item.exitRamp}:null});mode='crashed';deadline=performance.now()+8000;checkpoint(true);audio.crash();for(const id of ['game-hint','power-hud','touch-controls','zone-banner'])$(id).classList.add('hidden');renderCrashModal();}
function renderCrashModal(){const canBuy=saved.coins>=WAPSI_TICKET_PRICE;showModal(`<div class="eyebrow">THE WARDEN CAUGHT UP</div><div class="revive-portrait"><span class="revive-clock" id="revive-clock">8</span></div><h2>One more chance?</h2><p>Your run stops here. Use a Wapsi Ticket to get back in.</p><div class="crash-score">${fmt(score)} <small>POINTS</small><span>${fmt(runCoins)} COINS collected</span></div>${saved.wapsiTickets>0?`<button class="play-button" id="revive-button"><span>USE WAPSI TICKET · ${fmt(saved.wapsiTickets)} OWNED</span><span class="arrow">↗</span></button>`:`<button class="play-button" id="revive-button" ${canBuy?'':'disabled'}><span>${canBuy?`BUY TICKET & REVIVE · ${WAPSI_TICKET_PRICE} COINS`:'NO WAPSI TICKETS'}</span><span class="arrow">↗</span></button>`}<p class="revive-cost">${saved.wapsiTickets>0?'One ticket will be used. You can also get more in the Bazaar.':canBuy?`You have ${fmt(saved.coins)} coins. This ticket is bought and used now.`:`A ticket costs ${WAPSI_TICKET_PRICE} coins. Earn more in a run to revive.`}</p><button class="secondary" id="bank-run-button">END RUN & KEEP MY SCORE</button>`);$('revive-button').onclick=revive;$('bank-run-button').onclick=finish;}
function revive(){if(mode!=='crashed')return;if(performance.now()>=deadline){finish();return;}const next=buyAndUseWapsiTicket(saved);if(!next){renderCrashModal();return;}saved=next;revives++;runReport.continue(elapsed);save();updateRecords();all.forEach(i=>{if(i.active&&i.root.position.z<38)release(i);});y=0;vy=0;floorY=0;stumbleUntil=0;slideTime=0;magnetTime=0;boostTime=0;x=LANES[lane];laneVelocity=0;world.runner.root.position.x=x;mode='resuming';deadline=performance.now()+3000;closeModal();$('resume-count').classList.remove('hidden');$('resume-count').innerHTML='<b>3</b><span>BACK TO THE STREETS</span>';audio.power();}
let lastStoreTab='';let storeTab='characters';let characterPreview:CharacterPreview|null=null;let previewCharacter='';

function showAccount(){
 const configured=cloudIsConfigured();
 const safe=(value:string)=>value.replace(/[&<>"\x27]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\x27":"&#39;"}[c]||c));
 const accountBody=cloudUser
  ? '<div class="account-card"><div class="account-avatar">'+'🏃'+'</div><div><b>'+safe(cloudUser.name)+'</b><small>'+safe(cloudUser.email||'Google account')+'</small><span class="account-sync" id="account-sync"></span></div></div>'+(cloudSyncStatus==='error'?'<p class="account-error">'+safe(cloudSetupError||'Your local progress is safe. Try syncing again.')+'</p><button class="secondary" id="account-retry">RETRY CLOUD SYNC</button>':'')+'<button class="play-button" id="account-signout"><span>SIGN OUT</span><span class="arrow">↗</span></button>'
  : configured
   ? '<p>Keep coins, characters, tickets, powers and records when you change browser or device.</p><button class="play-button" id="account-google"><span>CONTINUE WITH GOOGLE</span><span class="arrow">↗</span></button><p class="account-footnote">Your guest progress will be added to this account.</p>'+(cloudSetupError?'<p class="account-error">'+safe(cloudSetupError)+'</p>':'')
   : '<div class="account-card account-setup"><div class="account-avatar">☁</div><div><b>Play as a guest</b><small>Your runs save on this device.</small></div></div><p>Keep running. You can connect an account when cloud saves are available.</p>';
 showModal('<div class="profile-stats"><span>★ '+fmt(saved.best)+' BEST</span><span>'+fmt(saved.runs)+' RUNS</span></div><div class="eyebrow">YOUR RUNNER PROFILE</div><h2>'+(cloudUser?'Your account':configured?'Save your progress':'Guest profile')+'</h2>'+accountBody+(cloudSaveConflict?'<button class="phase3-action" id="account-reload-cloud">LOAD LATEST CLOUD SAVE</button>':''));
 refreshAccountButton();
 const reload=document.getElementById('account-reload-cloud');if(reload)reload.onclick=()=>void loadLatestCloudProgress();
 const google=document.getElementById('account-google');if(google)google.onclick=async()=>{try{if(storage)storage.setItem(GUEST_SAVE_KEY,JSON.stringify(saved));const api=await getCloudApi();await api.signInWithGoogle();}catch(error){cloudSetupError=error instanceof Error?error.message:'Google sign-in could not start.';showAccount();}};
 const retry=document.getElementById('account-retry');if(retry)(retry as HTMLButtonElement).onclick=async()=>{(retry as HTMLButtonElement).disabled=true;cloudSetupError='';await initializeCloudAccount();showAccount();};
 const signout=document.getElementById('account-signout');if(signout)signout.onclick=async()=>{try{await flushCloudSave();const api=await getCloudApi();await api.signOutCloud();window.clearTimeout(cloudSaveTimer);cloudSaveTimer=0;window.clearTimeout(cloudRetryTimer);cloudRetryTimer=0;rememberAccountOwner(storage,ACCOUNT_OWNER_KEY,null);cloudUser=null;cloudSaveReady=false;cloudSaveConflict=false;cloudRewardInFlight=false;cloudSyncStatus='guest';cloudSetupError='';saved=parseSave(storage?.getItem(GUEST_SAVE_KEY)??null);persistSave(storage,saved);updateRecords();refreshAccountButton();showAccount();}catch{toast('Could not sign out. Try again.');}};
}
function showStore(tab='characters'){if(tab==='characters'&&!document.getElementById('character-preview'))previewCharacter=saved.selectedCharacter;storeTab=tab;setActiveNav(tab==='characters'?'me':'shop');renderStore();}
function setActiveNav(screen:string){document.querySelectorAll<HTMLButtonElement>('[data-nav]').forEach(button=>button.classList.toggle('is-active',button.dataset.nav===screen));}
function renderStore(){
 const keepScroll=lastStoreTab===storeTab?(document.querySelector<HTMLElement>('.shop-content')?.scrollTop??0):0;lastStoreTab=storeTab;
 showModal(storePanel(saved,storeTab,previewCharacter));
 const itemPane=document.querySelector<HTMLElement>('.shop-content');if(itemPane)itemPane.scrollTop=keepScroll;
 if(storeTab==='characters'){previewCharacter=previewCharacter||saved.selectedCharacter;characterPreview=new CharacterPreview($<HTMLCanvasElement>('character-preview'));void setCharacterPreview(previewCharacter);}
 document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.onclick=()=>showStore(b.dataset.tab));
 document.querySelectorAll<HTMLButtonElement>('[data-preview]').forEach(b=>b.onclick=()=>{previewCharacter=b.dataset.preview!;$('preview-name').textContent=CHARACTER_CATALOG.find(c=>c.id===previewCharacter)?.name??'Haris';document.querySelectorAll('.character-card').forEach(card=>card.classList.toggle('previewed',card.querySelector('[data-preview]')?.getAttribute('data-preview')===previewCharacter));void setCharacterPreview(previewCharacter);});
 document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>b.onclick=()=>selectCharacter(b.dataset.character!));document.querySelectorAll<HTMLButtonElement>('[data-energy]').forEach(b=>b.onclick=()=>buyEnergy(b.dataset.energy as 'magnet'|'boost'|'chai'|'biryani'|'shoes'));$('shop-buy-one')?.addEventListener('click',()=>buyTicket(1));$('shop-buy-pack')?.addEventListener('click',()=>buyTicket(WAPSI_TICKET_PACK.count));$('shop-buy-board-one')?.addEventListener('click',()=>buyBoard(1));$('shop-buy-board-pack')?.addEventListener('click',()=>buyBoard(CRUISER_CHARGE_PACK.count));
}
async function setCharacterPreview(source:string){const preview=characterPreview;try{if(preview)await preview.show(source);}catch{if(preview!==characterPreview)return;const name=$('preview-name');if(name)name.textContent=`${name.textContent} · PREVIEW UNAVAILABLE`;}}
function selectCharacter(id:string){if(phase3Busy||cloudSaveConflict)return;const item=CHARACTER_CATALOG.find(c=>c.id===id);if(!item)return;if(!saved.unlockedCharacters.includes(id)){if(saved.coins<item.price)return;saved.coins-=item.price;saved.unlockedCharacters.push(id);toast(`${item.name} unlocked!`);}saved.selectedCharacter=id;previewCharacter=id;save();updateRecords();void world.setRunnerCharacter(id).then(()=>{audio.power();if(document.querySelector('.shop-tabs'))renderStore();});}
function buyEnergy(kind:'magnet'|'boost'|'chai'|'biryani'|'shoes'){if(phase3Busy||cloudSaveConflict)return;const next=buyPowerUpgrade(saved,kind);if(!next){toast(saved.powerLevels[kind]>=5?'That power is already max level.':'Not enough coins for that upgrade.');return;}saved=next;save();updateRecords();audio.power();renderStore();toast(`${kind==='shoes'?'Peshawari Bounce':kind==='chai'?'Dhabba Chai Jetpack':kind==='biryani'?'Khazana Biryani':kind==='boost'?'Double Points':'Coin Magnet'} upgraded to level ${saved.powerLevels[kind]}.`);}
function buyTicket(count:number){if(phase3Busy||cloudSaveConflict)return;const next=buyWapsiTickets(saved,count);if(!next){toast('Not enough coins for this ticket pack.');return;}saved=next;save();updateRecords();audio.power();renderStore();toast(`${count} Wapsi ${count===1?'Ticket':'Tickets'} added to your bag.`);}
function buyBoard(count:number){if(phase3Busy||cloudSaveConflict)return;const next=buyCruiserCharges(saved,count);if(!next){toast('Not enough coins for that Cruiser deal.');return;}saved=next;save();updateRecords();audio.power();renderStore();toast(`${count} Cruiser ${count===1?'ride':'rides'} added to your bag.`);}
function showMissions(tab='missions'){progressTab=tab;saved=withCurrentDay(saved);setActiveNav('missions');const html=progressionPanel(saved,tab,{busy:phase3Busy,signedIn:Boolean(cloudUser),offline:!navigator.onLine});if(!phase3Busy){const seen=markMissionsSeen(saved);if(seen!==saved){saved=seen;save();}}showModal(html);wireProgression();updateRecords();}
function showSettings(page='audio'){
 const toggle=(id:string,label:string,detail:string,on:boolean)=>'<div class="settings-choice"><div><b>'+label+'</b><small>'+detail+'</small></div><button class="setting-toggle '+(on?'':'off')+'" id="'+id+'" aria-pressed="'+on+'">'+(on?'ON':'OFF')+'</button></div>';
 const content=page==='audio'?toggle('sound-toggle','Sound effects','Coins, traffic and movement',!saved.muted)+toggle('music-toggle','Karachi beat','Music for the chase',!saved.musicMuted)+toggle('voice-toggle','Urdu voices','Requires an installed Urdu voice',!saved.voiceMuted):page==='game'?'<div class="settings-choice"><div><b>Graphics</b><small>Choose what feels smooth on your device.</small></div></div><div class="quality-buttons"><button data-quality="standard" aria-pressed="'+!saved.lowGraphics+'">HIGH</button><button data-quality="low" aria-pressed="'+saved.lowGraphics+'">BATTERY SAVER</button></div>'+toggle('assist-toggle','Touch buttons','Show extra lane, jump and roll buttons',saved.touchAssist===true)+'<div class="settings-links"><button id="settings-help">HOW TO PLAY</button><button id="settings-about">CREDITS</button><button id="report-button">SAVE PROBLEM REPORT</button></div>':pwaSettings()+'<p class="settings-offline-copy">Your last saved progress stays on this device offline. Account sync resumes when you reconnect.</p>';
 showModal('<div class="arcade-settings"><header class="arcade-heading"><span class="eyebrow">YOUR WAY TO PLAY</span><h2>SETTINGS</h2></header><div class="settings-pages" role="tablist" aria-label="Settings categories">'+[['audio','AUDIO'],['game','GAME'],['offline','OFFLINE']].map(([id,label])=>'<button role="tab" '+(id==='offline'&&mode==='paused'?'disabled title="Available from the lobby" ':'')+'aria-selected="'+(page===id)+'" data-settings="'+id+'">'+label+'</button>').join('')+'</div><div class="settings-list">'+content+'</div><button class="play-button" id="settings-done">DONE ✓</button></div>');
 document.querySelectorAll<HTMLButtonElement>('[data-settings]').forEach(b=>b.onclick=()=>showSettings(b.dataset.settings));
 const on=(id:string,fn:()=>void)=>{const b=document.getElementById(id);if(b)b.onclick=fn;};
 on('sound-toggle',()=>{audio.unlock();saved.muted=!saved.muted;save();showSettings(page);});on('music-toggle',()=>{audio.unlock();saved.musicMuted=!saved.musicMuted;save();if(saved.musicMuted)audio.stopMusic();showSettings(page);});on('voice-toggle',()=>{saved.voiceMuted=!saved.voiceMuted;save();if(saved.voiceMuted&&'speechSynthesis'in window)speechSynthesis.cancel();showSettings(page);});on('assist-toggle',()=>{saved.touchAssist=!saved.touchAssist;save();updateRecords();showSettings(page);});
 document.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(b=>b.onclick=()=>{saved.lowGraphics=b.dataset.quality==='low';world.quality(saved.lowGraphics);save();showSettings(page);});
 on('settings-help',()=>help());on('settings-about',showAbout);on('report-button',downloadRunReport);$('settings-done').onclick=()=>mode==='paused'?renderPause():closeModal();wirePwaUI();
}
function showResults(){showModal(resultsPanel({score,coins:runCoins,distance,best:oldBest}));$('retry-button').onclick=startRun;$('result-home').onclick=home;updateRecords();}
function downloadRunReport(){const blob=new Blob([JSON.stringify(runReport.snapshot())],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`karachi-run-report-${runSeed}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Report download requested. Nothing was sent automatically.');}
function home(){if(!world)return;introMovie.cancel();moviePrepared=false;cinematicTrack=false;document.getElementById('skip-intro')?.remove();document.getElementById('cinematic-wait')?.remove();$('shell').classList.remove('opening');audio.stopMusic();mode='menu';setGameUI(false);setActiveNav('home');closeModal();for(const id of ['game-hint','power-hud','zone-banner','resume-count'])$(id).classList.add('hidden');resetScene(selectedStart);updateRecords();$('play-button').focus({preventScroll:true});}
function pause(){if(mode!=='running')return;audio.stopMusic();mode='paused';runReport.event('pause',elapsed);checkpoint();renderPause();}
function renderPause(){showModal('<div class="pause-screen"><span class="eyebrow">THE CITY CAN WAIT</span><h2>PAUSED</h2><div class="pause-emblem" aria-hidden="true">Ⅱ</div><button class="play-button" id="resume-button">KEEP RUNNING ▶</button><button class="pause-settings" id="pause-settings">SOUND & SETTINGS</button><button class="secondary" id="end-button">FINISH THIS RUN</button></div>');$('resume-button').onclick=resume;$('pause-settings').onclick=()=>showSettings();$('end-button').onclick=finish;}
function resume(){if(mode!=='paused')return;mode='running';runReport.event('resume',elapsed);closeModal();audio.unlock();audio.startMusic();$('world').focus({preventScroll:true});}
let lastFocus:HTMLElement|null=null;
function showModal(html:string){disposeCharacterPreview();lastFocus=document.activeElement as HTMLElement;$('game-nav').classList.toggle('hidden',mode!=='menu');$('modal-layer').innerHTML=`<section class="modal arcade-panel" role="dialog" aria-modal="true" aria-label="${mode==='crashed'?'Save your run':mode==='over'?'Run results':mode==='paused'?'Game paused':'Karachi Run'}"><button class="modal-close" id="modal-close" type="button" aria-label="Close">×</button>${html}</section>`;$('modal-layer').classList.remove('hidden');$('shell').classList.add('menu-open');$('modal-close').onclick=()=>{if(mode==='paused')resume();else if(mode==='crashed')finish();else if(mode==='over')home();else closeModal();};$('modal-layer').querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true});}
function disposeCharacterPreview(){characterPreview?.dispose();characterPreview=null;}
function closeModal(){if(phase3Busy)toast('Saving your prize…');disposeCharacterPreview();$('modal-layer').classList.add('hidden');$('modal-layer').innerHTML='';$('shell').classList.remove('menu-open');$('game-nav').classList.toggle('hidden',mode!=='menu');if(mode==='menu')setActiveNav('home');lastFocus?.focus({preventScroll:true});}
let lessonPage=0,keyboardLesson=false;function help(page=0){lessonPage=Math.max(0,Math.min(7,page));showModal(tutorialPanel(lessonPage,keyboardLesson));$('tutorial-prev').onclick=()=>help(lessonPage-1);$('tutorial-next').onclick=()=>lessonPage===7?(mode==='paused'?renderPause():closeModal()):help(lessonPage+1);$('tutorial-controls').onclick=()=>{keyboardLesson=!keyboardLesson;help(lessonPage);};document.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(b=>b.onclick=()=>help(Number(b.dataset.lesson)));}
function showAbout(){showModal('<div class="about-screen"><div class="arcade-heading"><span class="eyebrow">MADE FOR THE CITY OF LIGHTS</span><h2>KARACHI RUN</h2></div><p>A Karachi-inspired arcade chase. Coins are earned in the game.</p><p>Warden: <a href="https://sketchfab.com/3d-models/police-man-from-the-usa-t-pose-rig-mixamo-c6d330c59f6c41eea41c71e00e39334b" target="_blank" rel="noopener noreferrer">ustoopia · CC BY 4.0</a></p><p>Pakistani Truck: <a href="/licenses/pakistani-truck.txt" target="_blank" rel="noopener noreferrer">aayanalidev90 · CC BY 4.0</a></p><p>Authored motion: <a href="/licenses/sketchbook.txt" target="_blank" rel="noopener noreferrer">Sketchbook · MIT</a></p><button class="play-button" id="about-help">HOW TO PLAY</button></div>');$('about-help').onclick=()=>help();}
let cityPageIndex=0;function chooseRoute(index=ROUTES.findIndex(r=>r.start===selectedStart)){cityPageIndex=(index+ROUTES.length)%ROUTES.length;setActiveNav('city');showModal(cityPanel(ROUTES,cityPageIndex,selectedStart));$('city-prev').onclick=()=>chooseRoute(cityPageIndex-1);$('city-next').onclick=()=>chooseRoute(cityPageIndex+1);document.querySelectorAll<HTMLButtonElement>('[data-city-page]').forEach(b=>b.onclick=()=>chooseRoute(Number(b.dataset.cityPage)));$('city-select').onclick=()=>{const r=ROUTES[cityPageIndex];selectedStart=r.start;resetScene(selectedStart);closeModal();toast('Next run · '+r.name);};}
function updateChallenge(){
 const missions=missionSet(saved.progression.set),completed=missions.filter((m,i)=>saved.progression.counts[i]>=m.target).length;
 const i=missions.findIndex((m,j)=>saved.progression.counts[j]<m.target),m=missions[Math.max(0,i)],p=Math.min(m.target,saved.progression.counts[Math.max(0,i)]);
 $('challenge-number').textContent=`MISSION SET ${saved.progression.set+1} · ${completed}/3`;$('challenge-label').textContent=i<0?'Set complete · collect your reward!':m.label;$('challenge-progress').textContent=i<0?'READY TO COLLECT':`${Math.floor(p)} / ${m.target}`;$('challenge-reward').textContent=baseMultiplier(saved)<30?`NEXT ×${baseMultiplier(saved)+1}`:`+${missionReward(saved.progression.set)} COINS`;$('challenge-fill').style.width=`${i<0?100:p/m.target*100}%`;updateDailyHud();updateRecords();
}
function advanceMission(type:string,amount:number){
 const before=missionReady(saved),next=advanceProgression(saved,type,amount);if(next===saved)return;saved=next;scheduleRunSave();
 if(performance.now()-lastChallengePaint>160||!before&&missionReady(saved)){lastChallengePaint=performance.now();updateChallenge();}
 if(!before&&missionReady(saved)){toast('All three missions complete! Collect your multiplier reward.');audio.power();}
}
function activateBoard(){
  if(mode!=='running')return;
  if(boardTime>0)return;
  if(boardCooldown>0){toast(`Cruiser ready in ${Math.ceil(boardCooldown)}s`);return;}
  const next=useCruiserCharge(saved);if(!next){toast('No Cruiser rides left. Refill in the Shop after your run.');return;}
  saved=next;save();updateRecords();boardTime=25;world.setBoardActive(true);audio.boardActivate();world.shake(.12,.2);toast(`🛹 Karachi Cruiser ready · 1 ride used · ${saved.cruiserCharges} left`);
}
function action(type:string){
  if(mode!=='running'||chaiTime>0||chaiLanding){if(type==='left'&&mode==='running'&&lane>0){lane--;audio.whoosh(-1);}if(type==='right'&&mode==='running'&&lane<2){lane++;audio.whoosh(1);}if(type==='jump'&&mode==='running'&&chaiLanding&&y-floorY<2)jumpBuffer=.16;return;}
  runReport.event('input',elapsed,{action:type,x,y,lane});
  if(type==='left'){if(lane>0){lane--;audio.whoosh(-1);}}
  if(type==='right'){if(lane<2){lane++;audio.whoosh(1);}}
  if(type==='jump'){
    const grounded=canStartJump(y,floorY,vy);
    if(grounded){vy=jumpImpulse(shoesTime>0);world.jumpLaunchSpeed=vy;slideTime=0;jumpBuffer=0;world.runner.stretch(1.035,.10);audio.jump();}
    else{jumpBuffer=.16;}
  }
  if(type==='slide'){
    if(slideTime>0)return;
    slideTime=ROLL_DURATION;
    if(y-floorY>.08){vy=-26;world.runner.squash(.97,.10);}
    audio.slide();
  }
  if(type==='board')activateBoard();
}
$('play-button').onclick=opening;$('account-button').onclick=showAccount;$('settings-button').onclick=()=>showSettings();$('pause-button').onclick=pause;$('help-button').onclick=()=>help();$('nav-home').onclick=home;$('nav-missions').onclick=()=>showMissions();$('nav-me').onclick=()=>showStore('characters');$('nav-shop').onclick=()=>showStore('energies');$('nav-city').onclick=()=>chooseRoute();
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();action(b.dataset.action!);}));
document.addEventListener('keydown',e=>{const modalOpen=!$('modal-layer').classList.contains('hidden');if(e.key==='Tab'&&modalOpen){const f=Array.from($('modal-layer').querySelectorAll<HTMLElement>('button:not(:disabled),select'));if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0]?.focus();}return;}if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();if(mode==='running')pause();else if(mode==='paused')resume();else if(modalOpen&&mode==='menu')closeModal();return;}if(mode!=='running'||e.ctrlKey||e.metaKey||e.altKey)return;const keys:Record<string,string>={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'board',Spacebar:'board',ArrowDown:'slide',s:'slide',S:'slide',b:'board',B:'board',Enter:'board'};if(keys[e.key]){e.preventDefault();if(!e.repeat)action(keys[e.key]);}});
let pointer:{x:number;y:number;id:number;time:number}|null=null,lastTapTime=0,lastTapPos={x:0,y:0};
$('world').addEventListener('pointerdown',e=>{if(mode!=='running')return;pointer={x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()};$('world').setPointerCapture(e.pointerId);});
$('world').addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;const gesture=swipeAction(e.clientX-pointer.x,e.clientY-pointer.y,swipeThreshold(innerWidth));if(gesture){action(gesture);lastTapTime=0;pointer=null;}});
for(const event of ['pointerup','pointercancel'])$('world').addEventListener(event,e=>{
  if(pointer&&pointer.id===(e as PointerEvent).pointerId){
    if(event==='pointercancel'){pointer=null;lastTapTime=0;return;}
    const pe=e as PointerEvent;
    const dist=Math.hypot(pe.clientX-pointer.x,pe.clientY-pointer.y);
    const dur=performance.now()-pointer.time;
    const gesture=swipeAction(pe.clientX-pointer.x,pe.clientY-pointer.y,swipeThreshold(innerWidth));
    if(gesture&&dur<700&&mode==='running'){action(gesture);lastTapTime=0;}
    else if(dist<swipeThreshold(innerWidth)&&dur<350&&mode==='running'){
      const now=performance.now();
      if(now-lastTapTime<380&&Math.hypot(pe.clientX-lastTapPos.x,pe.clientY-lastTapPos.y)<60){
        action('board');lastTapTime=0;
      }else{
        lastTapTime=now;lastTapPos={x:pe.clientX,y:pe.clientY};
      }
    }
    pointer=null;
  }
});
document.addEventListener('visibilitychange',()=>{introMovie.visibility();if(document.hidden){hiddenAt=performance.now();if(mode==='running')pause();}else if(hiddenAt){if(mode==='crashed'||mode==='resuming')deadline+=performance.now()-hiddenAt;hiddenAt=0;}});window.addEventListener('blur',()=>{if(mode==='running')pause();});window.addEventListener('pagehide',()=>{if(world)checkpoint(true);});window.addEventListener('storage',e=>{if(e.key===SAVE_KEY&&mode==='menu'){saved=loadSave(storage);updateRecords();}});
function updateRoute(){const r=routeAt(runStart+distance),local=r.progress*r.length;$('zone-name').textContent=r.name;$('distance').textContent=`${fmt(distance)} m`;$('route-fill').style.width=`${r.progress*100}%`;$('next-zone').textContent=r.landmark?`LANDMARK · ${r.name.toUpperCase()} · ${fmt(Math.max(0,r.landmark-local))} m`:`NEXT · ${r.next.toUpperCase()} · ${r.remaining} m`;const key=`${r.lap}-${r.id}`,announceAt=r.landmark?Math.max(0,r.landmark-Math.max(65,Math.min(140,speed*5))):0;if(!announcedZones.has(key)&&local>=announceAt){announcedZones.add(key);lastZone=key;zoneUntil=elapsed+3.2;$('zone-banner').querySelector('span')!.textContent=r.landmark?'LANDMARK AHEAD · ABOUT 5 SECONDS':'NOW ENTERING';$('zone-title').textContent=r.name;$('zone-urdu').textContent=r.urdu;$('zone-banner').classList.remove('hidden');}if(elapsed>zoneUntil||progressionScene?.celebrating)$('zone-banner').classList.add('hidden');if(r.landmark&&local>=r.landmark&&!discovered.has(key)){discovered.add(key);scoreExact+=100;toast(`${r.name} discovered · +100 points`);}}
function update(dt:number,now:number){let delta=0;introMovie.tick(dt);
  if(mode==='intro'&&!introMovie.active&&!document.hidden){
    const before=introTime-world.openingDelay;introTime+=dt;world.openingElapsed=introTime;world.introProgress=Math.min(1,introTime/introDuration);
    const action=introTime-world.openingDelay;
    if(openingCueCrossed(before,action,WALL_AFTER)){audio.tone(175,.13,.04,'triangle',85);audio.tone(420,.16,.015,'triangle',200);}
    if(openingCueCrossed(before,action,WARDEN_AFTER))audio.tone(230,.065,.018,'sine',110);
    if(openingCueCrossed(before,action,WHISTLE_AFTER)){audio.tone(1800,.34,.027,'sine',2250);}
    if(introTime>=introDuration)startRun();
  }
  if(mode==='crashed'&&!document.hidden){const remain=Math.max(0,(deadline-now)/1000);if($('revive-clock')){$('revive-clock').textContent=String(Math.ceil(remain));$('revive-clock').style.setProperty('--remaining',`${remain/8*360}deg`);}if(remain<=0)finish();}
  if(mode==='resuming'&&!document.hidden){const remain=Math.ceil((deadline-now)/1000);$('resume-count').innerHTML=`<b>${Math.max(1,remain)}</b><span>BACK TO THE STREETS</span>`;if(remain<=0){mode='running';$('resume-count').classList.add('hidden');$('touch-controls').classList.remove('hidden');$('world').focus({preventScroll:true});}}
  if(mode==='running'){
    elapsed+=dt;speed=speedAtDistance(distance);world.speed=speed;delta=speed*dt;distance+=delta;const multiplier=baseMultiplier(saved)*(scorePowerMultiplier(boostTime>0,biryaniTime>0));scoreExact+=delta*multiplier;score=Math.floor(scoreExact);const previousX=x,previousY=y,lateral=stepLane(x,laneVelocity,LANES[lane],dt);x=lateral.x;laneVelocity=lateral.velocity;
    if(jumpBuffer>0){jumpBuffer=Math.max(0,jumpBuffer-dt);if(!skyFlight.active&&canStartJump(y,floorY,vy)){vy=jumpImpulse(shoesTime>0);world.jumpLaunchSpeed=vy;slideTime=0;jumpBuffer=0;audio.jump();}}
    if(boardTime>0){boardTime=Math.max(0,boardTime-dt);if(boardTime===0){world.setBoardActive(false);boardCooldown=15;toast('Cruiser power depleted');}}
    if(boardCooldown>0)boardCooldown=Math.max(0,boardCooldown-dt);
    if(invincibleUntil>elapsed){const b=Math.sin(elapsed*26)>0;for(const m of world.runner.root.getChildMeshes())m.visibility=b?.35:1;}
    else if(world.runner.root.getChildMeshes().length&&world.runner.root.getChildMeshes()[0].visibility!==1){for(const m of world.runner.root.getChildMeshes())m.visibility=1;}
    const oldFloor=floorY;floorY=0;for(const item of all)if(item.active&&item.type==='obstacle'&&(item.ramp||item.kind==='bus')){const predicted=trafficZ(item.root.position.z,dt,speed,item.vehicleSpeed);const h=surfaceHeight(x,-predicted,{x:item.root.position.x,width:item.width,depth:item.depth,height:item.height,ramp:item.entryRamp,exitRamp:item.exitRamp});if(h!==null&&(item.ramp||canRide(y,h)))floorY=Math.max(floorY,h);}magnetTime=Math.max(0,magnetTime-dt);boostTime=Math.max(0,boostTime-dt);biryaniTime=Math.max(0,biryaniTime-dt);shoesTime=Math.max(0,shoesTime-dt);chaiLandingGrace=Math.max(0,chaiLandingGrace-dt);const previousChai=chaiTime,flight=skyFlight.step(dt,floorY);chaiTime=skyFlight.remaining;chaiLanding=skyFlight.stage==='landing';
    if(previousChai>2&&chaiTime<=2){toast('☕ Landing soon · choose your lane');audio.tone(660,.12,.015);audio.tone(880,.18,.012);}
    if(flight.beganLanding)for(const item of all)if(item.active&&item.skyTrail&&item.root.position.z>6)release(item);
    if(flight.active){
      y=flight.y;vy=flight.velocity;slideTime=0;
      if(chaiTime>0){
        if(chaiCoinNextDistance===0)chaiCoinNextDistance=distanceAfterRunTime(distance,Math.max(0,CHAI_TAKEOFF_SECONDS-skyFlight.elapsed))+1.2;
        const trailEnd=distanceAfterRunTime(distance,chaiTime),lookAhead=distanceAfterRunTime(distance,2.4);
        while(chaiCoinNextDistance<=Math.min(trailEnd,lookAhead)){const coin=spawn('coin',flightCoinLane(chaiCoinIndex),chaiCoinNextDistance-distance,skyFlight.cruiseHeight+1.05);coin.skyTrail=true;chaiCoinIndex++;chaiCoinNextDistance+=3.1;}
        if(trailEnd<=lookAhead&&trailEnd-(chaiCoinNextDistance-3.1)>1.2){const coin=spawn('coin',flightCoinLane(chaiCoinIndex),trailEnd-distance,skyFlight.cruiseHeight+1.05);coin.skyTrail=true;chaiCoinIndex++;chaiCoinNextDistance=trailEnd+3.1;}
      }
    }else if(flight.landed){
      y=floorY;vy=0;world.jumpLaunchSpeed=0;chaiLandingGrace=.18;world.setChaiActive(false);world.runner.land(12);audio.land();
      if(jumpBuffer>0){vy=jumpImpulse(shoesTime>0);world.jumpLaunchSpeed=vy;jumpBuffer=0;audio.jump();}
    }else{
      const vertical=stepVertical(y,vy,oldFloor,floorY,dt,speed);y=vertical.y;vy=vertical.velocity;
      if(vertical.landed){world.jumpLaunchSpeed=0;world.runner.land(vertical.impactSpeed);audio.land();if(vertical.impactSpeed>28)world.shake(.045,.10);}
    }
    world.verticalVelocity=vy;world.flightStage=skyFlight.stage;
    world.groundHeight=floorY;world.flightActive=skyFlight.active;world.airborne=y-floorY>.12;slideTime=Math.max(0,slideTime-dt);world.runner.root.position.x=x;if(y-floorY<.08&&!slideTime&&!boardTime&&!chaiTime&&!chaiLanding)audio.step(world.runner.phase);advanceMission('distance',delta);
    runReport.frame(elapsed,frameWallDt,{x,y,vy,floorY,lane,slideTime,distance,speed},elapsed>=runReport.nextSample?all.filter(i=>i.active&&i.type==='obstacle'&&i.root.position.z<40).map(i=>({kind:i.kind,x:i.root.position.x,z:i.root.position.z,width:i.width,depth:i.depth,height:i.height,vehicleSpeed:i.vehicleSpeed,ramp:i.ramp,entryRamp:i.entryRamp,exitRamp:i.exitRamp})):[]);
    for(const item of all){if(!item.active)continue;const previousZ=item.root.position.z;item.previousZ=previousZ;if(item.type==='coin'){item.baseZ=trafficZ(item.baseZ,dt,speed,item.vehicleSpeed);const position=stepCoinAttraction({x:item.root.position.x,y:item.root.position.y,z:item.root.position.z},{x:item.baseX,y:item.baseY,z:item.baseZ},{x,y:y+1.05,z:0},dt,magnetTime>0);item.root.position.set(position.x,position.y,position.z);}else item.root.position.z=trafficZ(previousZ,dt,speed,item.vehicleSpeed);const z=item.root.position.z;
      if(item.type==='obstacle'){const deckHeight=item.kind==='bus'?surfaceHeight(x,-z,{...item,x:item.root.position.x,ramp:item.entryRamp}):null;const riding=canRide(y,deckHeight);if(Math.abs(z)<item.depth/2+.8&&Math.abs(x-item.root.position.x)<1.5&&y>1.15)item.jumped=true;const contact=chaiTime>0||chaiLanding||chaiLandingGrace>0||riding?'none':contactKind({x,previousX,y,previousY,sliding:slideTime>0},{x:item.root.position.x,z,previousZ,width:item.width,depth:item.depth,height:item.height-.06,kind:item.kind!});if(item.kind==='bus'&&!item.ramp&&!item.honked&&z<35&&z>14){item.honked=true;audio.horn(item.root.position.x-x);if(Math.random()<.14)audio.quip('اوئے، بس آ رہی ہے!','warden');}
        if(contact==='direct'){
          if(elapsed<invincibleUntil){}
          else if(boardTime>0){boardTime=0;world.setBoardActive(false);boardCooldown=20;audio.boardBreak();world.shake(.35,.4);invincibleUntil=elapsed+1.8;item.counted=true;toast('💥 Cruiser absorbed the crash! Keep running!');item.root.position.z=-item.depth-4;}
          else{crash(item);break;}
        }
        if(contact==='graze'&&!item.grazed&&elapsed>=invincibleUntil){
          item.grazed=true;
          if(elapsed<stumbleUntil){
            if(boardTime>0){boardTime=0;world.setBoardActive(false);boardCooldown=20;audio.boardBreak();world.shake(.35,.4);invincibleUntil=elapsed+1.8;toast('💥 Cruiser absorbed the stumble!');}
            else{crash(item,'second-stumble');break;}
          }else{
            const recoil=sideBumpResponse(previousX,{x:item.root.position.x,width:item.width});lane=recoil.lane;x=recoil.x;laneVelocity=0;world.runner.root.position.x=x;invincibleUntil=elapsed+.4;stumbleUntil=elapsed+5;world.runner.land();world.shake(.15,.24);audio.graze();audio.quip('بال بال بچے!');toast('⚡ BUMP! The warden is right behind you!');
          }
        }
        if(item.kind==='arch'&&slideTime>0&&Math.abs(z)<item.depth/2+.8&&Math.abs(x-item.root.position.x)<1.05&&y<.25)item.rolled=true;
        if(!item.counted&&z< -item.depth/2-1){if(item.rolled)advanceMission('roll',1);item.counted=true;advanceMission('dodge',1);if(item.kind==='barrier'&&item.jumped){advanceMission('jump',1);scoreExact+=15;}}
      }
      else if(item.type==='coin'){item.root.rotation.y=world.time*2.7+item.phase;const caught=magnetTime>0?(Math.abs(z)<2.6&&Math.abs(item.root.position.x-x)<2.4&&Math.abs(item.root.position.y-(y+1))<2.2)||(z<=0&&z>-3.5&&Math.abs(item.root.position.x-x)<3.6&&Math.abs(item.root.position.y-(y+1))<2.5):(Math.abs(z)<1.12&&Math.abs(item.root.position.x-x)<1.10&&Math.abs(item.root.position.y-(y+1))<1.22);if(caught){release(item);const coinValue=coinPowerValue(biryaniTime>0);runCoins+=coinValue;saved.coins+=coinValue;advanceMission('coins',1);scheduleRunSave();$('bank').textContent=fmt(saved.coins);$('run-coins').textContent=fmt(runCoins);coinPulse?.cancel();coinPulse=$('run-stats').animate([{transform:'scale(1)'},{transform:'scale(1.035)',offset:.35},{transform:'scale(1)'}],{duration:130,easing:'ease-out'});audio.coin();}}
      else{item.root.position.y=(item.type==='chai'?1.48:item.type==='biryani'?1.38:1.45)+Math.sin(world.time*3+item.phase)*.17;item.root.rotation.y=Math.sin(world.time*2)*.2;if(Math.abs(z)<1.2&&Math.abs(item.root.position.x-x)<1.15&&Math.abs(item.root.position.y-(y+1))<2.0){release(item);advanceMission('power',1);if(item.type==='magnet'){magnetTime=powerDuration('magnet',saved.powerLevels.magnet);audio.power();toast('Magnet · coins come to you');}else if(item.type==='boost'){boostTime=powerDuration('boost',saved.powerLevels.boost);audio.power();toast('Double points · pickup bonus!');}else if(item.type==='chai'){skyFlight.start(powerDuration('chai',saved.powerLevels.chai),y,vy);chaiTime=skyFlight.remaining;chaiLanding=false;world.jumpLaunchSpeed=0;jumpBuffer=0;chaiLandingGrace=0;world.setChaiActive(true);chaiCoinNextDistance=0;chaiCoinIndex=0;audio.chai();audio.quip('چائے، کراچی کی جان!');toast('☕ Dhabba Chai · rooftop flight!');}else if(item.type==='biryani'){biryaniTime=powerDuration('biryani',saved.powerLevels.biryani);audio.biryani();audio.quip('واہ، کیا مزہ ہے!');toast('🍲 Biryani frenzy · double coins and score!');}else{shoesTime=powerDuration('shoes',saved.powerLevels.shoes);audio.power();toast('👟 Peshawari Bounce · spring-loaded jumps!');}}}if(z< -(item.ramp?item.depth/2+14:12))release(item);
    }
    spawnTrackAhead(distance);
    const pickedLetter=progressionScene?.update(dt,delta,x,y,world.time)??-1;
    if(pickedLetter>=0&&progressionScene?.day===saved.progression.daily.day){saved=collectLetter(saved,pickedLetter);foundLetters|=1<<pickedLetter;save(true);updateDailyHud();updateRecords();audio.power();toast(saved.progression.daily.mask===127&&!saved.progression.daily.claimed?'KARACHI complete! Your free Khazana is ready.':'Found '+WORD[pickedLetter]+' · keep the hunt going!');}
    if(floorY>2&&!world.airborne)advanceMission('roof',dt);
    if(!recordNearShown&&oldBest>=200&&score<oldBest&&oldBest-score<=Math.max(150,Math.min(5000,oldBest*.1))){recordNearShown=true;progressionScene?.milestone('YOUR BEST IS CLOSE',fmt(oldBest-score)+' POINTS TO GO');}
    if(!recordBeatenShown&&score>Math.max(99,oldBest)){recordBeatenShown=true;progressionScene?.milestone('NEW PERSONAL BEST',fmt(score)+' POINTS · KEEP IT GOING!');audio.power();}
    if(elapsed>=(innerWidth<700?5.5:7))$('game-hint').classList.add('hidden');$('score').textContent=String(score).padStart(5,'0');$('multiplier').textContent=`×${multiplier} SCORE`;const powers=[];if(magnetTime>0)powers.push(`∪ MAGNET ${Math.ceil(magnetTime)}s`);if(boostTime>0)powers.push(`×2 POINTS ${Math.ceil(boostTime)}s`);if(chaiTime>0)powers.push(`☕ SKY RUN ${Math.ceil(chaiTime)}s`);if(biryaniTime>0)powers.push(`🍲 ×2 FRENZY ${Math.ceil(biryaniTime)}s`);if(shoesTime>0)powers.push(`👟 BOUNCE ${Math.ceil(shoesTime)}s`);if(boardTime>0)powers.push(`🛹 CRUISER ${Math.ceil(boardTime)}s`);$('power-hud').classList.toggle('hidden',!powers.length||mode!=='running');$('power-hud').textContent=powers.join(' · ');if(mode==='running')updateRoute();if(elapsed-lastSave>2){lastSave=elapsed;checkpoint();}
  }
  audio.music?.gain.setTargetAtTime(saved.musicMuted||mode!=='running'?0:.32,audio.ctx?.currentTime??0,.25);if(mode==='menu')for(const item of all)if(item.active&&item.type==='coin')item.root.rotation.y=world.time*2+item.phase;world.mode=introMovie.waiting?'menu':mode;world.chaseVisible=mode!=='running'||elapsed<2||elapsed<stumbleUntil;world.rollRemaining=slideTime;if(mode!=='menu'&&mode!=='intro'&&mode!=='paused'){const obstacles=all.filter(i=>i.active&&i.type==='obstacle').map(i=>({x:i.root.position.x,z:i.root.position.z,previousZ:mode==='running'?i.previousZ:i.root.position.z,width:i.width,depth:i.depth+(i.ramp?24:0),kind:i.kind!,vehicleSpeed:mode==='running'?i.vehicleSpeed:0}));const chase=stepChaser(chaserState,obstacles,dt,x,mode==='running'?speed:0,mode==='crashed'||mode==='over'||(mode==='running'&&elapsed<stumbleUntil),mode==='running'&&!world.chaseVisible);chaserState=chase;world.pursuer.root.position.x=chase.x;world.pursuer.root.position.z=chase.z;world.chaserBlocked=chase.blocked;}if(mode!=='paused'&&(!introMovie.active||introMovie.waiting))world.update(dt,delta,mode!=='menu'&&!introMovie.waiting,y,slideTime>0);if(!introMovie.active||introMovie.waiting)world.scene.render();
}

function applyAccountPresentation(){
 if(!world)return;world.quality(saved.lowGraphics);
 if(world.runner&&$('loading').classList.contains('hidden')&&world.runner.source!==saved.selectedCharacter)void world.setRunnerCharacter(saved.selectedCharacter).catch(()=>toast('Your character model could not load. Reopen Me to retry.'));
}
function updateDailyHud(){const el=document.getElementById('daily-run-letters');if(el){const mask=String(saved.progression.daily.mask);if(el.dataset.mask!==mask){el.innerHTML=wordTiles(saved);el.dataset.mask=mask;}}}
function scheduleDailyLetter(preferred:number,z:number){
 if(mode!=='running'||!progressionScene||progressionScene.active||distance+z<nextLetterAt)return;
 const index=nextLetter(saved);if(index<0)return;
 const obstacles=all.filter(o=>o.active&&o.type==='obstacle').map(o=>({x:o.root.position.x,z:o.root.position.z,width:o.width,depth:o.depth+(o.ramp?24:0),vehicleSpeed:o.vehicleSpeed}));
 const safeLane=dailyLetterLane(preferred,z,speed,obstacles);if(safeLane===null)return;
 progressionScene.spawn(index,saved.progression.daily.day,LANES[safeLane],z);nextLetterAt=distance+z+175+(runSeed%55);
}
document.addEventListener('click',event=>{if((pwa.updating||phase3Busy&&!(event.target as Element)?.closest('#modal-close'))&&(event.target as Element)?.closest('button,a')){event.preventDefault();event.stopImmediatePropagation();}},true);
function setRewardBusy(busy:boolean){phase3Busy=busy;const play=document.getElementById('play-button') as HTMLButtonElement|null;if(play)play.disabled=busy;}
function wireProgression(){
 document.querySelectorAll<HTMLButtonElement>('[data-progress-tab]').forEach(b=>b.onclick=()=>{if(!phase3Busy)showMissions(b.dataset.progressTab);});
 document.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach(b=>b.onclick=()=>void collectProgressionReward(b.dataset.claim!));
 const tabs=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-progress-tab]'));tabs.forEach((b,i)=>b.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=tabs[(i+1)%tabs.length];next.click();document.querySelector<HTMLButtonElement>(`[data-progress-tab="${next.dataset.progressTab}"]`)?.focus();}});
}
async function collectProgressionReward(kind:string){
 if(phase3Busy||cloudSaveConflict)return;const local=claimLocalReward(saved,kind);if(!local)return;
 setRewardBusy(true);showMissions(kind==='daily'?'hunt':'missions');
 try{
  let reward=local.reward,already=false;
  if(cloudUser){
   const owner=cloudUser.id;if(!cloudSaveReady||!navigator.onLine)throw new Error('Reconnect and sync your account to collect this reward.');
   await flushCloudSave();if(cloudSyncStatus!=='saved')throw new Error(cloudSetupError||'Cloud sync must finish before collecting.');
   cloudRewardInFlight=true;const api=await getCloudApi(),ack=await api.claimCloudReward(owner,kind,local.key);cloudRewardInFlight=false;if(cloudUser?.id!==owner)throw new Error('Your account changed. Reopen Profile.');
   rememberAccountOwner(storage,ACCOUNT_OWNER_KEY,cloudUser,String(ack.updated_at));
   saved=withCurrentDay(parseSave(JSON.stringify(ack.save_data)));reward=ack.reward;already=ack.already_claimed===true;localSaveRevision++;
   persistSave(storage,saved);try{storage?.removeItem(pendingKey(owner));storage?.removeItem(pendingKey(owner)+'.version');}catch{}
   cloudSyncStatus='saved';refreshAccountButton();
  }else{saved=local.save;save(true);}
  setRewardBusy(false);updateRecords();updateChallenge();audio.power();if(!$('modal-layer').classList.contains('hidden')){showModal(rewardReveal(reward,baseMultiplier(saved),kind,already));$('reward-continue').onclick=()=>showMissions(kind==='daily'?'hunt':'missions');}else toast('Reward collected · '+fmt(reward.coins)+' coins saved');
 }catch(error){cloudRewardInFlight=false;phase3Busy=false;if(!$('modal-layer').classList.contains('hidden'))showMissions(kind==='daily'?'hunt':'missions');toast(error instanceof Error?error.message:'Reward could not be confirmed. Your progress is safe.');}
}
async function loadLatestCloudProgress(){
 if(!cloudUser||phase3Busy)return;const owner=cloudUser.id;phase3Busy=true;
 try{const pending=storage?.getItem(pendingKey(owner));if(pending)storage?.setItem(pendingKey(owner)+'.backup',pending);
  await cloudSaveQueue;const api=await getCloudApi(),remote=await api.loadCloudSave(owner);if(!remote)throw new Error('Your cloud save could not be found.');
  rememberAccountOwner(storage,ACCOUNT_OWNER_KEY,cloudUser,api.cloudSaveVersion(owner));saved=withCurrentDay(parseSave(JSON.stringify(remote)));storage?.removeItem(pendingKey(owner));storage?.removeItem(pendingKey(owner)+'.version');cloudSaveConflict=false;cloudSaveReady=true;cloudSyncStatus='saved';cloudSetupError='';persistSave(storage,saved);updateRecords();updateChallenge();applyAccountPresentation();if(mode!=='menu')home();toast('Latest cloud save loaded. An unsynced backup is kept on this browser.');
 }catch(error){cloudSetupError=error instanceof Error?error.message:'Could not reload cloud progress.';}finally{phase3Busy=false;showAccount();}
}
window.setInterval(()=>{
 const next=phase3Busy?saved:withCurrentDay(saved);if(next!==saved){saved=next;progressionScene?.resetLetter();nextLetterAt=distance+70;save(true);updateChallenge();if(document.querySelector('.phase3-panel')&&!phase3Busy)showMissions(progressTab);}
 document.querySelectorAll<HTMLElement>('[data-hunt-countdown]').forEach(el=>el.textContent=countdown());
},1000);

async function init(){try{$('loading').querySelector('p')!.textContent='PREPARING KARACHI…';world=new KarachiWorld($<HTMLCanvasElement>('world'),saved.selectedCharacter);await world.ready;world.quality(saved.lowGraphics);await world.assets.ready;progressionScene=new ProgressionScene(world);for(const [key,count] of Object.entries({bus:6,rickshaw:5,barrier:7,arch:7,coin:85,magnet:2,boost:2,chai:2,biryani:2,shoes:2,rooftop:2}))for(let i=0;i<count;i++)createItem(key,key==='bus'||key==='rickshaw'?VEHICLE_VARIANTS[key][i%VEHICLE_VARIANTS[key].length]:undefined);resetScene(0);const loadingText=$('loading').querySelector('p');if(loadingText)loadingText.textContent='LOADING YOUR 3D CHARACTERS…';await Promise.all([world.runner.ready,world.pursuer.ready]);console.info('[Karachi Run] Character models ready');if(world.runner.source!==saved.selectedCharacter)await world.setRunnerCharacter(saved.selectedCharacter);if(loadingText)loadingText.textContent='FINISHING THE CITY…';console.info('[Karachi Run] Waiting for scene shaders and textures');await world.scene.whenReadyAsync();console.info('[Karachi Run] Scene ready');let previous=performance.now();world.engine.runRenderLoop(()=>{const now=performance.now(),dt=Math.min((now-previous)/1000,.04);frameWallDt=(now-previous)/1000;previous=now;update(dt,now);});$('loading').classList.add('hidden');$('shell').classList.remove('booting');void pwa.start();$<HTMLButtonElement>('play-button').disabled=false;$<HTMLButtonElement>('settings-button').disabled=false;
  void document.fonts.ready.then(()=>{if(!document.fonts.check('60px "Noto Nastaliq Urdu"'))return;const fresh=world.makeSigns();world.signMat.diffuseTexture?.dispose();world.signMat.diffuseTexture=fresh.diffuseTexture;fresh.diffuseTexture=null;fresh.dispose();});
  const context=(document as Document & {modelContext?:{registerTool:(tool:unknown)=>void}}).modelContext;if(context?.registerTool)try{context.registerTool({name:'get_karachi_run_progress',description:'Read saved Karachi Run records, challenge progress, current district, and run state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(input===null||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');return {coins:saved.coins,best:saved.best,runs:saved.runs,mode,speed:Number(speed.toFixed(2)),speedPercent:Math.round(speed/14*100),distance:Math.floor(distance),district:routeAt(world.travel).name,revives,challenge:missionFor(saved.missionIndex).label,challengeProgress:Math.floor(saved.missionProgress),characterModels:[world.runner.source,world.pursuer.source],oncomingBuses:all.filter(i=>i.active&&i.vehicleSpeed>0).length,chaserBlocked:world.chaserBlocked};}});}catch{}
}catch(error){console.error(error);$('loading').innerHTML='<img class="loading-icon" src="/branding/icon-ui.webp" alt="Karachi Run" width="96" height="96"><p>THE STREET COULDN’T LOAD</p><div style="max-width:290px;text-align:center;line-height:1.6;font-size:14px">The 3D scene or character files could not load. Check the connection and try again.</div><button class="play-button" id="reload-button">TRY AGAIN ↗</button>';$('reload-button').onclick=()=>location.reload();}}
void init();
