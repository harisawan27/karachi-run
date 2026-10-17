import { LANES } from './core.mjs';

export const ONCOMING_BUS_SPEED = 8;
export function trafficZ(z,dt,runnerSpeed,vehicleSpeed=0){return z-dt*(runnerSpeed+vehicleSpeed);}
const width=o=>(o.width!==undefined?o.width/2:o.kind==='rickshaw'?1:1.36)+.60;
const depth=o=>o.depth/2+.58;

// Segment versus an expanded box, in obstacle-relative coordinates. Includes moving buses.
export function sweepObstacle(from,to,o){
  const ax=from.x-o.x,az=from.z-(o.previousZ??o.z),dx=to.x-from.x,dz=(to.z-o.z)-az;
  let enter=0,leave=1;
  for(const [origin,delta,half] of [[ax,dx,width(o)],[az,dz,depth(o)]]){
    if(Math.abs(delta)<1e-8){if(Math.abs(origin)>half)return false;continue;}
    let a=(-half-origin)/delta,b=(half-origin)/delta;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);leave=Math.min(leave,b);if(enter>leave)return false;
  }
  return leave>=0&&enter<=1;
}
export function overlapsChaser(s,o){return Math.abs(s.x-o.x)<width(o)&&Math.abs(s.z-o.z)<depth(o);}

export function canPlaceTraffic(candidate,existing,runnerSpeed){
  const moving=candidate.vehicleSpeed>0;
  // Keep oncoming vehicles out of lanes occupied by stationary props; they must not drive through them.
  for(const o of existing){if(o.z< -12||o.x!==candidate.x)continue;if((moving||o.vehicleSpeed>0)&&((moving!==(o.vehicleSpeed>0))||Math.abs(o.z-candidate.z)<12))return false;}
  const all=[...existing,candidate].filter(o=>o.z>0),intervals=all.map(o=>{const v=runnerSpeed+(o.vehicleSpeed||0);return {lane:LANES.indexOf(o.x),start:Math.max(0,(o.z-o.depth/2-2)/v),end:(o.z+o.depth/2+2)/v};});
  for(const t of intervals.flatMap(i=>[i.start,(i.start+i.end)/2,i.end])){const occupied=new Set(intervals.filter(i=>t>=i.start&&t<=i.end).map(i=>i.lane));if(occupied.size===3)return false;}
  return true;
}

export function stepChaser(state,obstacles,dt,targetX,runnerSpeed,caught=false,retreat=false){
  // The warden leaves the shot by losing ground, never by changing opacity.
  const desiredZ=caught?-1.8:retreat?-19:-4.6,zSpeed=caught?9:retreat?6.5:2.1,maxStep=7.8*dt;
  const preferred=LANES.reduce((best,l)=>Math.abs(l-targetX)<Math.abs(best-targetX)?l:best,LANES[0]);
  const candidates=[state.targetX??preferred,...LANES,state.x];
  let best=state.x,bestCost=Infinity;
  for(const candidate of candidates){
    let unsafe=false;const horizon=Math.max(.9,Math.abs(candidate-state.x)/7.8+.30);
    for(let t=.12;t<=horizon;t+=.12){
      const x=state.x+Math.sign(candidate-state.x)*Math.min(Math.abs(candidate-state.x),7.8*t);
      const z=state.z+Math.sign(desiredZ-state.z)*Math.min(Math.abs(desiredZ-state.z),t*zSpeed);
      if(obstacles.some(o=>overlapsChaser({x,z},{...o,z:o.z-t*(runnerSpeed+(o.vehicleSpeed||0))}))){unsafe=true;break;}
    }
    // Hysteresis: finish a safe dodge before considering a different lane.
    const committed=Math.abs(candidate-(state.targetX??preferred))<.01;
    const cost=Math.abs(candidate-preferred)+Math.abs(candidate-state.x)*.22-(committed?((state.hold??0)>0?100:1.5):0);
    if(!unsafe&&cost<bestCost){best=candidate;bestCost=cost;}
  }
  let next={x:state.x+Math.sign(best-state.x)*Math.min(Math.abs(best-state.x),maxStep),z:state.z+Math.sign(desiredZ-state.z)*Math.min(Math.abs(desiredZ-state.z),dt*zSpeed),blocked:false,targetX:best,hold:Math.abs(best-(state.targetX??state.x))>.01?.85:Math.max(0,(state.hold??0)-dt)};
  const swept=obstacles.filter(o=>sweepObstacle(state,next,o));
  if(swept.length){
    // A failed dodge is a physical setback: remain on the near side of the vehicle/prop.
    next.x=state.x;next.blocked=true;
    for(const o of obstacles)if(Math.abs(next.x-o.x)<width(o)&&sweepObstacle(state,next,o)){
      if(state.z>=(o.previousZ??o.z)+depth(o))next.z=Math.max(next.z,o.z+depth(o)+.04);
      else next.z=Math.min(next.z,o.z-depth(o)-.04);
    }
  }
  // Resolve a newly spawned or already overlapping body as well as continuous contacts.
  for(let pass=0;pass<obstacles.length+1;pass++)for(const o of obstacles)if(overlapsChaser(next,o)){next.z=state.z>=(o.previousZ??o.z)+depth(o)?o.z+depth(o)+.04:o.z-depth(o)-.04;next.blocked=true;}
  return next;
}

// Clear a lane before each oncoming wave so stationary props cannot starve traffic.
export function trafficWave(row){const phase=row%16;return {lane:Math.floor(row/16)%3,reserve:phase>=6,spawn:phase>=12};}
