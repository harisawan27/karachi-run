import {LANES,distanceAfterRunTime,jumpImpulse,speedAtDistance} from './core.mjs';
import {ONCOMING_BUS_SPEED,canPlaceTraffic} from './traffic.mjs';

export const TRACK_VERSION=4;
export const TRACK_LOOKAHEAD=145;
export const TRACK_PROFILES={
 roof:{width:3.45,height:5,depth:9.5},
 bus:{width:4.15,height:6,depth:11.8},
 rickshaw:{width:2.7,height:3.15,depth:6.5},
 barrier:{width:2.6,height:1.55,depth:.5},
 arch:{width:2.6,height:3.5,depth:.5},
};
const OPENING=[['welcome',4],['weave',6],['traffic',6],['roof',7],['weave',6],['traffic',6],['skills',6],['roof',7],['traffic',6],['weave',6],['skills',6],['traffic',6],['roof',7],['weave',6],['traffic',5]];
const D=t=>distanceAfterRunTime(0,Math.max(0,t));
export function trackTimeAtDistance(distance){const d=Math.max(0,distance),toCap=Math.log(32/14)/.012;return d<=1500?Math.log(1+.012*d/14)/.012:toCap+(d-1500)/32;}
function hash(seed,index){let x=(seed^Math.imul(index+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);return (x^(x>>>15))>>>0;}

// A normal-jump trail samples the existing ballistic arc; a roll trail begins
// close enough to the gate that following it fits inside the approved .54s roll.
export function skillCoins(kind,lane,at){
 const speed=speedAtDistance(at),v=jumpImpulse(false),duration=2*v/32;
 const lead=kind==='barrier'?speed*duration/2:speed*.20;
 const tail=kind==='barrier'?lead:speed*.12,coins=[];
 const count=Math.max(4,Math.ceil((lead+tail)/1.9));
 for(let i=0;i<=count;i++){
  const offset=-lead+(lead+tail)*i/count,t=(offset+lead)/speed;
  coins.push({at:at+offset,lane,x:LANES[lane],y:kind==='barrier'?1.05+Math.max(0,v*t-16*t*t):.62});
 }
 return coins;
}

/** Plans immutable encounter snapshots ahead of the scrolling scene.
 * Ground bypasses, optional skill lines, connected roofs and moving traffic
 * share one timeline; no account state, renderer, random calls or frame rate.
 */
export class TrackDirector{
 constructor(seed=0,profiles=TRACK_PROFILES,openingSeed=seed){
  this.seed=openingSeed>>>0;this.profiles={...TRACK_PROFILES,...profiles};this.pending=[];this.chapters=[];
  this.lane=1;this.time=0;this.serial=0;this.cycle=0;this.lastRoofLane=-1;this.lastTrafficLane=-1;this.chapterSerial=0;this.roofSerial=0;
  // A cinematic can pin its visible opening without fixing the rest of every run.
  for(const [kind,seconds]of OPENING){this.chapter(kind,seconds);if(this.time>=16)this.seed=seed>>>0;}
  this.pending.sort((a,b)=>a.at-b.at||a.id-b.id);
 }
 nextLane(){return this.lane===1?(hash(this.seed,this.serial)%2?0:2):1;}
 group(section,start,end,lane){
  const previousLane=this.lane,g={id:this.serial++,section,startTime:start,endTime:end,safeLane:lane,previousLane,at:D(start+.12),end:D(end),obstacles:[],coins:[],bonuses:[],roofs:[]};
  const begin=D(start+(lane===previousLane?.12:.45)),finish=D(end-.10),spacing=4.5;
  for(let at=begin;at<=finish;at+=spacing){const x=LANES[lane];g.coins.push({at,lane,x,y:1.1});}
  this.lane=lane;this.pending.push(g);return g;
 }
 obstacle(g,key,lane,time){
  const at=D(time),p=this.profiles[key],o={id:g.id+':'+g.obstacles.length,key,lane,at,time,...p};g.obstacles.push(o);return o;
 }
 bonus(g,o){g.bonuses.push({obstacle:o.id,coins:skillCoins(o.key,o.lane,o.at)});g.at=Math.min(g.at,g.bonuses.at(-1).coins[0].at);}
 reserveTraffic(lane,from){
  // Reserve the visible approach in earlier, still-unspawned encounters. Otherwise
  // an oncoming bus would be rejected by a stationary prop from the prior section.
  for(const g of this.pending){
   const removed=new Set(g.obstacles.filter(o=>o.key!=='bus'&&o.lane===lane&&o.at>=from).map(o=>o.id));
   if(!removed.size)continue;g.obstacles=g.obstacles.filter(o=>!removed.has(o.id));g.bonuses=g.bonuses.filter(b=>!removed.has(b.obstacle));
  }
 }
 chapter(kind,seconds){
  const start=this.time,end=start+seconds,chapterIndex=this.chapterSerial++;
  this.chapters.push({kind,start,end,at:D(start),until:D(end)});
  // Cadence is authored in time, rather than becoming sparse as the speed rises.
  // Every row has pressure in at least one lane, with one adjacent ground route.
  const cadence=kind==='welcome'?1.65:start<16?1.35:start<45?1.2:1.05;
  const beats=Math.max(2,Math.round(seconds/cadence));
  let trafficLane=-1,roofLane=-1,roofExit=0;
  if(kind==='traffic'){
   const choices=[0,2].filter(l=>l!==this.lane);
   trafficLane=choices.find(l=>l!==this.lastRoofLane)??choices[0];
   this.reserveTraffic(trafficLane,D(start+.12)-TRACK_LOOKAHEAD-24);this.lastTrafficLane=trafficLane;
  }
  if(kind==='roof'){
   const choices=[0,1,2].filter(l=>l!==this.lane&&Math.abs(l-this.lane)===1);
   roofLane=choices.find(l=>l!==this.lastTrafficLane)??choices[0];
   trafficLane=[0,1,2].find(l=>l!==this.lane&&l!==roofLane);
   this.reserveTraffic(trafficLane,D(start+.12)-TRACK_LOOKAHEAD-24);this.lastTrafficLane=trafficLane;
   this.lastRoofLane=roofLane;
  }
  for(let beat=0;beat<beats;beat++){
   const a=start+seconds*beat/beats,b=start+seconds*(beat+1)/beats;
   let safe=this.lane;
   // Brief single-lane relief replaces the old five-second empty chapters.
   const relief=kind!=='welcome'&&kind!=='roof'&&beat===beats-1&&chapterIndex%3===2;
   if(kind==='traffic'){
    const alternate=[0,1,2].find(l=>l!==trafficLane&&l!==safe);
    if(beat>0&&beat%2===0&&Math.abs(alternate-safe)===1)safe=alternate;
   }else if(kind!=='roof'&&!(kind==='welcome'&&beat===0)&&!relief)safe=this.nextLane();
   const g=this.group(kind,a,b,safe),time=a+(b-a)*.72;
   const other=[0,1,2].filter(l=>l!==safe);
   if(kind==='roof'&&beat===0){
    const p=this.profiles.roof,entry=D(start+.95),count=2+this.roofSerial++%2,first=entry+12+p.depth/2;
    for(let i=0;i<count;i++)g.roofs.push({key:'rooftop',lane:roofLane,at:first+i*p.depth,...p,ramp:i===0,exitRamp:i===count-1});
    roofExit=first+(count-1)*p.depth+p.depth/2+12;
    for(let at=entry+1;at<=roofExit;at+=2.7){const h=at<entry+12?p.height*(at-entry)/12:at>roofExit-12?p.height*(roofExit-at)/12:p.height;g.bonuses.push({obstacle:'roof',coins:[{at,lane:roofLane,x:LANES[roofLane],y:h+1.1}]});}
   }
   if(kind==='traffic'){
    // Traffic now shares its section with a staggered jump/roll/parked lane.
    if(beat%2===0)this.obstacle(g,'bus',trafficLane,time);
    const lane=other.find(l=>l!==trafficLane),key=beat%3===2?'rickshaw':beat%2?'arch':'barrier';
    const o=this.obstacle(g,key,lane,time);if(key!=='rickshaw')this.bonus(g,o);
   }else if(kind==='roof'){
    if(beat%2===1)this.obstacle(g,'bus',trafficLane,time);
    // Keep the actual approach/deck/descent intact; occupy that lane again only
    // after the ramp's tail has cleared, so it doesn't become a long empty road.
    if(D(time)>roofExit+speedAtDistance(roofExit)*.9){const o=this.obstacle(g,beat%2?'barrier':'arch',roofLane,time);this.bonus(g,o);}
   }else{
    for(let i=0;i<other.length;i++){
     if((relief||kind==='welcome'&&beat===0)&&i===1)continue;
     const key=i===0&&beat%3!==1?'rickshaw':(beat+i)%2?'arch':'barrier';
     const o=this.obstacle(g,key,other[i],time);if(key!=='rickshaw')this.bonus(g,o);
    }
   }
  }
  this.time=end;
 }
 extend(){
  const rotation=hash(this.seed,++this.cycle)%3,patterns=rotation===0?['weave','traffic','roof','skills','traffic']:rotation===1?['skills','traffic','weave','roof','traffic']:['roof','weave','traffic','skills','traffic'];
  for(const kind of patterns)this.chapter(kind,kind==='roof'?6.5:kind==='traffic'?6:5.2);
  this.pending.sort((a,b)=>a.at-b.at||a.id-b.id);
 }
 takeThrough(limit){
  const time=trackTimeAtDistance(Math.max(0,limit-TRACK_LOOKAHEAD));
  while(this.time<time+25)this.extend();
  let count=0;while(count<this.pending.length&&this.pending[count].at<=limit)count++;
  const ready=this.pending.splice(0,count);
  // Keep only a short chapter history during very long runs; generation remains seeded.
  if(this.chapters.length>64)this.chapters.splice(0,this.chapters.length-48);
  return ready;
 }
}

export function approachingBusZ(obstacle,distance){
 return obstacle.at-distance+ONCOMING_BUS_SPEED*Math.max(0,obstacle.time-trackTimeAtDistance(distance));
}

/** Shared by the game and the complete-course collision simulator. */
export function materializeEncounter(group,distance,existing,speed=speedAtDistance(distance)){
 const obstacles=[],accepted=new Set();
 if(group.roofs.length){
  const first=group.roofs[0],last=group.roofs.at(-1),entry=first.at-first.depth/2-12,exit=last.at+last.depth/2+12;
  const whole={x:LANES[first.lane],z:(entry+exit)/2-distance,width:first.width,depth:exit-entry,kind:'bus',vehicleSpeed:0};
  if(canPlaceTraffic(whole,existing,speed)){
   for(const roof of group.roofs)obstacles.push({...roof,x:LANES[roof.lane],z:roof.at-distance,kind:'bus',vehicleSpeed:0});
   accepted.add('roof');
  }
 }
 for(const o of group.obstacles){
  const candidate={...o,x:LANES[o.lane],z:o.key==='bus'?approachingBusZ(o,distance):o.at-distance,kind:o.key,vehicleSpeed:o.key==='bus'?ONCOMING_BUS_SPEED:0};
  const occupied=[...existing,...obstacles.map(o=>({...o,depth:o.depth+(o.key==='rooftop'?24:0)}))];
  if(canPlaceTraffic(candidate,occupied,speed)){obstacles.push(candidate);accepted.add(o.id);}
 }
 return {obstacles,coins:[...group.coins,...group.bonuses.filter(b=>accepted.has(b.obstacle)).flatMap(b=>b.coins)]};
}
