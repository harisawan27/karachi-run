const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Hands hang below the waist in the supplied meshes. Classify arms before legs.
export function limbWeights(x,y,width){
  const arm=y>.34&&y<.84?smooth(width*.22,width*.29,Math.abs(x))*(1-smooth(.77,.84,y)):0;
  const leg=y<.48?(1-arm)*(1-smooth(.37,.48,y)):0;
  const forearm=1-smooth(.56,.66,y),knee=1-smooth(.20,.30,y);
  return {arm,upperArm:arm*(1-forearm),forearm:arm*forearm,thigh:leg*(1-knee),calf:leg*knee,torso:1-arm-leg};
}
