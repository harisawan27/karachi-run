const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const CHAI_HEIGHT=34;
export const CHAI_TAKEOFF_SECONDS=1.15;
export const CHAI_LANDING_SECONDS=1.05;
const ease=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));};
const slope=t=>30*t*t*(1-t)*(1-t);
export function jumpClipProgress(velocity,launchSpeed=11.6){return launchSpeed<=0?clamp(.78-velocity*.02,.78,1):clamp((launchSpeed-velocity)/(2*Math.max(1,launchSpeed)),0,1);}
export function canStartJump(y,floor,velocity){return Math.abs(y-floor)<.08&&velocity<=.01;}
export function flightDescent(from,to,elapsed){return elapsed>=CHAI_LANDING_SECONDS?to:from+(to-from)*ease(elapsed/CHAI_LANDING_SECONDS);}
// Keep the hero close, with a city-and-coins view 32–35 degrees below the horizon.
export function flightCameraPose(height,portrait=true){
 const eyeY=height+(portrait?10.5:9.5),eyeZ=portrait?-11:-10,targetZ=20;
 const pitch=(portrait?35:32)*Math.PI/180;
 return {eyeY,eyeZ,targetY:eyeY-Math.tan(pitch)*(targetZ-eyeZ),targetZ};
}
export function airCameraFov(width,height){const aspect=Math.max(.2,width/Math.max(1,height));return width<height?Math.max(1.18,2*Math.atan(Math.tan(.32)/aspect)):1.04;}
// A shared flight timeline for the game and practice course. Retarget a moving
// landing surface from the current position/velocity instead of teleporting
// when a lane change exposes a different roof height.
export class ChaiFlight{
 stage='off';remaining=0;elapsed=0;y=0;velocity=0;cruiseHeight=CHAI_HEIGHT;startHeight=0;startVelocity=0;
 landingAge=0;landingDuration=CHAI_LANDING_SECONDS;landingFrom=0;landingVelocity=0;landingFloor=0;
 constructor(){this.reset();}
 reset(){this.stage='off';this.remaining=0;this.elapsed=0;this.y=0;this.velocity=0;this.cruiseHeight=CHAI_HEIGHT;this.startHeight=0;this.startVelocity=0;this.landingAge=0;this.landingDuration=CHAI_LANDING_SECONDS;this.landingFrom=0;this.landingVelocity=0;this.landingFloor=0;}
 get active(){return this.stage!=='off';}
 get takeoffProgress(){return clamp(this.elapsed/CHAI_TAKEOFF_SECONDS,0,1);}
 start(seconds,height,velocity=0){this.reset();this.remaining=Math.max(CHAI_TAKEOFF_SECONDS+.2,seconds);this.startHeight=this.y=height;this.cruiseHeight=Math.max(CHAI_HEIGHT,height+8);this.startVelocity=clamp(velocity,-8,(this.cruiseHeight-height)*3/CHAI_TAKEOFF_SECONDS);this.stage='takeoff';}
 step(dt,floor=0){
  dt=Math.max(0,dt);let beganLanding=false,landed=false;
  if(!this.active)return {active:false,landed:false,beganLanding:false,y:this.y,velocity:0};
  if(this.stage!=='landing'){
   const spent=Math.min(dt,this.remaining);this.remaining=Math.max(0,this.remaining-spent);this.elapsed+=spent;
   const u=this.takeoffProgress;this.y=this.startHeight+(this.cruiseHeight-this.startHeight)*ease(u)+this.startVelocity*CHAI_TAKEOFF_SECONDS*u*(1-u)*(1-u)*(1-u);
   this.velocity=u<1?(this.cruiseHeight-this.startHeight)*slope(u)/CHAI_TAKEOFF_SECONDS+this.startVelocity*(1-u)*(1-u)*(1-4*u):0;
   this.stage=u<1?'takeoff':'cruise';
   if(this.remaining>1e-8)return {active:true,landed:false,beganLanding:false,y:this.y,velocity:this.velocity};
   this.remaining=0;this.stage='landing';this.landingFrom=this.y;this.landingVelocity=0;this.landingFloor=floor;this.landingAge=0;beganLanding=true;dt-=spent;
  }
  if(Math.abs(floor-this.landingFloor)>.01){
   this.landingDuration=Math.max(.28,this.landingDuration-this.landingAge);this.landingAge=0;
   this.landingFrom=this.y;this.landingVelocity=this.velocity;this.landingFloor=floor;
  }
  this.landingAge+=dt;const t=clamp(this.landingAge/this.landingDuration,0,1),T=this.landingDuration;
  // Quintic endpoint easing, plus a C1 velocity continuation when replanning.
  const carry=t*(1-t)*(1-t)*(1-t);
  const value=this.landingFrom+(floor-this.landingFrom)*ease(t)+this.landingVelocity*T*carry;
  this.y=Math.max(floor,Math.min(this.y,value));
  this.velocity=(floor-this.landingFrom)*slope(t)/T+this.landingVelocity*(1-t)*(1-t)*(1-4*t);
  if(t>=1||this.y<=floor+.001){this.y=floor;this.velocity=0;this.stage='off';landed=true;}
  return {active:this.active,landed,beganLanding,y:this.y,velocity:this.velocity};
 }
}
