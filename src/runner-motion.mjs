const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function stepLane(x,velocity,target,dt){
 const omega=24,error=x-target,b=velocity+omega*error,e=Math.exp(-omega*Math.max(0,dt));
 const next=target+(error+b*dt)*e,nextVelocity=(velocity-omega*b*dt)*e;
 return Math.abs(next-target)<.002&&Math.abs(nextVelocity)<.025?{x:target,velocity:0}:{x:next,velocity:nextVelocity};
}
export function flightCameraTarget(active,blend,height){return active?clamp(height/12,0,1):blend>.05&&height>3?1:0;}
// Hand-authored stride keys: contact, compression, push-off, heel recovery,
// knee drive, extension. The stance and recovery have different timings.
export const ROLL_DURATION=.54;
const STRIDE=[
 [0,-.62,.16,-.08],[.12,-.32,.48,.10],[.30,.48,.20,-.24],
 [.43,.64,.85,-.32],[.58,-.12,1.78,-.12],[.76,-1.02,1.08,.12],
 [.91,-.90,.27,.02],[1,-.62,.16,-.08],
];
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export function sprintPose(phase){
 const p=((phase/(Math.PI*2))%1+1)%1;
 let i=0;while(i<STRIDE.length-2&&p>STRIDE[i+1][0])i++;
 const a=STRIDE[i],b=STRIDE[i+1],t=smooth((p-a[0])/(b[0]-a[0]));
 return {hip:a[1]+(b[1]-a[1])*t,knee:a[2]+(b[2]-a[2])*t,ankle:a[3]+(b[3]-a[3])*t};
}
export function sprintLift(phase){
 // Both feet briefly leave the ground after each push-off. This is visual
 // motion only: collision height remains controlled by the jump simulation.
 const step=((phase/Math.PI)%1+1)%1;
 return .10*Math.sin(Math.PI*smooth((step-.15)/.85))**2;
}
export function flightCoinLane(index){return [0,1,2,1][Math.floor(index/5)%4];}
export function flightDescent(from,to,elapsed){return elapsed>=1.05?to:from+(to-from)*smooth(elapsed/1.05);}
export function openingYaw(progress){return Math.PI*(1-smooth((progress-.48)/.25));}
export function groundCameraRise(height){return Math.min(7.2,Math.max(0,height-2.2)*.90);}
export function jumpCameraPullback(height){return Math.min(2.4,Math.max(0,height-2.2)*.32);}
export function jointPose(name,side,phase,mode,gait=1,landing=0,verticalSpeed=0,native=true){
 const right=/right/.test(name),wave=Math.sin(phase+(right?Math.PI:0));
 const hip=/upleg/.test(name),knee=!hip&&/leg/.test(name)&&!/(end|root)/.test(name);
 const elbow=/forearm/.test(name),arm=!elbow&&/arm/.test(name)&&!/(armature|end|root)/.test(name);
 const foot=/foot/.test(name)&&!/end/.test(name),spine=/spine/.test(name),head=/head|neck/.test(name)&&!/end/.test(name);
 let pitch=0,roll=arm&&native?-side*1.44:0,yaw=0;
 if(mode==='run'){
  const stride=sprintPose(phase+(right?Math.PI:0));
  if(hip)pitch=stride.hip;
  if(knee)pitch=stride.knee+landing*.24;
  if(arm){pitch=-stride.hip*.72-.10;if(native)roll=-side*1.38;}
  if(elbow)pitch=-1.45+stride.hip*.16;
  if(foot)pitch=stride.ankle;
  if(spine){pitch=(.020+landing*.025)*(native?1:3);yaw=-Math.sin(phase)*.035;}
  if(/hips/.test(name))yaw=Math.sin(phase)*.045;
  if(head){pitch=-.045;yaw=Math.sin(phase)*.025;}
  pitch*=gait;yaw*=gait;
 }else if(mode==='jump'){
  const lift=clamp((verticalSpeed+5)/17,0,1);
  if(hip)pitch=right?-.12-lift*.30:-.20-lift*.72;
  if(knee)pitch=(right?.20:.28)+lift*(right?.8:1.05);
  if(arm){pitch=-.25-lift*.38;if(native)roll=-side*1.30;}
  if(elbow)pitch=-.90-lift*.20;
  if(foot)pitch=-.05-lift*.18;
  if(spine)pitch=.025*(native?1:3);
 }else if(mode==='roll'){
  if(hip)pitch=-1.95;if(knee)pitch=2.25;
  if(arm){pitch=-.90;if(native)roll=-side*1.40;}
  if(elbow)pitch=-1.35;if(spine)pitch=.20*(native?1:3);if(head)pitch=.28;
 }else if(mode==='flight'){
  if(hip)pitch=-.12;if(knee)pitch=.28;if(arm){pitch=-.22;if(native)roll=-side*1.23;}
  if(elbow)pitch=-.72;if(foot)pitch=-.08;if(spine)pitch=.015*(native?1:3);
 }else if(mode==='board'){
  if(hip)pitch=-.20;if(knee)pitch=.45;if(arm){pitch=-.35;if(native)roll=-side*1.26;}
  if(elbow)pitch=-.85;if(foot)pitch=-.12;if(spine)pitch=.025*(native?1:3);
 }
 return {pitch,roll,yaw};
}
export function swipeThreshold(width){return Math.max(16,Math.min(24,width*.045));}
export function swipeAction(dx,dy,threshold){if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return null;return Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'slide':'jump';}

// Keep the head and feet inside the vertical field of view while the follow
// camera catches up. This adjusts aim, not the player's physical jump height.
export function frameRunnerTargetY(cameraY,cameraZ,targetY,targetZ,feetY,fov){
 const distance=Math.max(1,-cameraZ),half=fov/2-.09;
 const lowest=Math.atan2(feetY+3.15-cameraY,distance)-half;
 const highest=Math.atan2(feetY-.08-cameraY,distance)+half;
 const aim=Math.atan2(targetY-cameraY,targetZ-cameraZ);
 const pitch=clamp(aim,lowest,highest);
 return cameraY+Math.tan(pitch)*(targetZ-cameraZ);
}
