// One clock drives the hand, ball, reaction and camera. No random physics in the opening.
const clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const CATCH_CYCLE=3.2;
export const THROW_AT=.84;
export const WALL_AFTER=.46;
export const CATCH_AFTER=1.14;
export const WARDEN_AFTER=1.42;
export const WHISTLE_AFTER=2.12;
export const ESCAPE_AFTER=2.62;
export const OPENING_AFTER=4.42;
export const SHUTTER={x:-6.89,y:1.90,z:1.35};
export const HERO={x:-3.15,y:0,z:1.0,yaw:-Math.PI/2};
export const WARDEN={x:-6.35,y:0,z:8.2,yaw:-Math.PI/2};
const mod=(x,n)=>((x%n)+n)%n;
// Wait for a completed catch before cutting to the video's ball-in-hand frame.
export function nextReadyDelay(clock){const phase=mod(clock,CATCH_CYCLE);return phase<.23||phase>=2.65?0:2.65-phase;}
export function nextThrowDelay(clock){const delay=mod(THROW_AT-mod(clock,CATCH_CYCLE),CATCH_CYCLE);return delay<.08?delay+CATCH_CYCLE:delay;}
export function escapeBlend(action){return ease((action-ESCAPE_AFTER)/(OPENING_AFTER-ESCAPE_AFTER));}
export function openingCueCrossed(before,after,at){return before<at&&after>=at;}
export function catchPhase(clock){return mod(clock,CATCH_CYCLE);}
function keys(time,frames){for(let i=0;i<frames.length-1;i++){const a=frames[i],b=frames[i+1];if(time<=b[0])return a[1]+(b[1]-a[1])*ease((time-a[0])/(b[0]-a[0]));}return frames.at(-1)[1];}
export function openingJoint(name,clock,action,police=false){
 const right=/right/.test(name),forearm=/forearm/.test(name),arm=!forearm&&/arm/.test(name)&&!/(armature|end|root)/.test(name),head=/head|neck/.test(name)&&!/end/.test(name),spine=/spine/.test(name);
 let pitch=0,yaw=0;
 if(police){
  // A held pause between bites, not a repeating spoon wave. The whistle is a separate pose.
  const react=ease((action-WARDEN_AFTER)/.24),whistle=ease((action-1.80)/.28),release=ease((action-2.30)/.26);
  if(arm)pitch=right?-1.05+.57*react-.51*whistle*(1-release):-.40+react*.10;
  if(forearm)pitch=right?-1.65+.47*react-.70*whistle*(1-release):-1.35+react*.20;
  if(head){pitch=-.015+react*-.035;yaw=-.22*react;}
  if(spine)pitch=-.015*react;
 }else{
  const p=Number.isFinite(action)&&action>=0?Math.min(THROW_AT+action,1.20):catchPhase(clock),turn=ease((action-1.74)/.35);
  if(arm)pitch=right?keys(p,[[0,-.45],[.37,-.45],[.57,-.28],[THROW_AT,-.94],[.99,-.70],[1.20,-.45],[CATCH_CYCLE,-.45]]):-.08;
  if(forearm)pitch=right?keys(p,[[0,-1.35],[.37,-1.35],[.57,-1.72],[THROW_AT,-.22],[.99,-.70],[1.20,-1.35],[CATCH_CYCLE,-1.35]]):-.10;
  if(head)yaw=.32*turn;
 }
 return {pitch,yaw};
}
export function openingActors(action){
 const escape=escapeBlend(action),turn=ease((action-2.30)/.34);
 return {escape,hero:{x:HERO.x*(1-escape),y:0,z:HERO.z*(1-escape),yaw:HERO.yaw*(1-turn)},warden:{x:WARDEN.x+(-.55-WARDEN.x)*escape,y:0,z:WARDEN.z+(-4.6-WARDEN.z)*escape,yaw:WARDEN.yaw+(-3.54-WARDEN.yaw)*ease((action-WARDEN_AFTER)/.54)+(-Math.PI*2+3.54)*ease((action-(OPENING_AFTER-.42))/.42)},wardenVisible:action>=WALL_AFTER+.05};
}
export function ballArc(a,b,t,lift){t=clamp(t);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t+4*lift*t*(1-t),z:a.z+(b.z-a.z)*t};}
export function normalBall(released,hand,age){return age<WALL_AFTER?ballArc(released,SHUTTER,age/WALL_AFTER,.14):ballArc(SHUTTER,hand,(age-WALL_AFTER)/(CATCH_AFTER-WALL_AFTER),.12);}
export function badBall(released,bowl,action){
 if(action<WALL_AFTER)return ballArc(released,SHUTTER,action/WALL_AFTER,.14);
 if(action<WARDEN_AFTER)return ballArc(SHUTTER,bowl,(action-WALL_AFTER)/(WARDEN_AFTER-WALL_AFTER),.30);
 const floor={x:bowl.x+.45,y:.15,z:bowl.z+.65};
 if(action<WARDEN_AFTER+.42)return ballArc(bowl,floor,(action-WARDEN_AFTER)/.42,.09);
 const roll=ease((action-WARDEN_AFTER-.42)/1.1);return {x:floor.x+roll*.45,y:.15,z:floor.z+roll*.60};
}
const mix=(a,b,p)=>a.map((v,i)=>v+(b[i]-v)*p);
export function openingCamera(portrait,action=-Infinity){
 // The warden lives around the corner, outside the lobby's composition.
 const idle={eye:portrait?[-4.70,2.85,-6.50]:[-5.3,3.15,-7.6],target:portrait?[-4.45,1.80,1.05]:[-4.1,1.7,1.3]};
 const reaction={eye:portrait?[-2.45,3.10,3.65]:[-1.1,3.45,2.0],target:[-6.6,1.95,8.1]};
 const runner={eye:portrait?[-.35,3.3,-6.7]:[1.2,3.4,-7.7],target:[-2.4,1.7,.8]};
 const reveal=ease((action-.47)/.83),returning=ease((action-2.23)/.54);
 return {eye:mix(mix(idle.eye,reaction.eye,reveal),runner.eye,returning),target:mix(mix(idle.target,reaction.target,reveal),runner.target,returning)};
}
