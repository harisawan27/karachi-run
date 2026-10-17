// The approach ramp rises toward a stationary vehicle roof.
export function surfaceHeight(playerX, localZ, surface){
 if(Math.abs(playerX-surface.x)>surface.width/2+.08)return null;
 const front=-surface.depth/2;
 if(localZ>=front&&localZ<=surface.depth/2)return surface.height;
 if(surface.ramp&&localZ>=front-12&&localZ<front)return surface.height*(localZ-front+12)/12;
 if(surface.exitRamp&&localZ>surface.depth/2&&localZ<=surface.depth/2+12)return surface.height*(1-(localZ-surface.depth/2)/12);
 return null;
}
export function stepVertical(y,velocity,oldFloor,floor,dt,speed){
 const grounded=velocity<=0&&Math.abs(y-oldFloor)<.06;
 const climb=floor-oldFloor;
 if(grounded&&Math.abs(climb)<=speed*dt*.45+.08)return {y:floor,velocity:0,landed:false};
 const gravity = (velocity > -2.5 && velocity < 2.5) ? 22 : 27;
 const nextVelocity=velocity-gravity*dt,nextY=y+nextVelocity*dt;
 if(nextY<=floor&&climb>=0&&climb<=speed*dt*.45+.08&&y>=oldFloor-.06)return {y:floor,velocity:0,landed:!grounded};
 if(nextVelocity<=0&&nextY<=floor&&(y>=floor-.15||(y>=oldFloor-.06&&climb>=0&&climb<=speed*dt*.45+.08)))return {y:floor,velocity:0,landed:!grounded};
 return {y:Math.max(0,nextY),velocity:nextY<=0?0:nextVelocity,landed:nextY<=0&&!grounded};
}

export function canRide(y,height){return height!==null&&y>=height-.15;}
