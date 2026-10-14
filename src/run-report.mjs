// Local, bounded diagnostics. No requests, identifiers, accounts or wallet data.
export class RunReport {
 constructor(){this.start({});}
 start(meta){this.meta={...meta};this.frames=[];this.events=[];this.nextSample=0;this.frameCount=0;this.wallSeconds=0;this.slowFrames=0;this.frozen=false;}
 event(type,time,details={}){if(this.frozen)return;this.events.push({type,time,...details});if(this.events.length>160)this.events.shift();}
 frame(time,wallDt,state,obstacles){
  if(this.frozen)return;
  this.frameCount++;this.wallSeconds+=Math.max(0,wallDt);if(wallDt>.05)this.slowFrames++;
  if(time<this.nextSample)return;this.nextSample=time+.1;
  this.frames.push({time,...state,obstacles:obstacles.slice(0,24).map(o=>({...o}))});
  if(this.frames.length>120)this.frames.shift();
 }
 freeze(time,details){this.event('collision',time,details);this.frozen=true;}
 continue(time){this.frozen=false;this.event('revive',time);}
 snapshot(){return structuredClone({version:1,build:'2026.09-core.1',meta:this.meta,performance:{frames:this.frameCount,averageFps:this.wallSeconds>0?Math.round(this.frameCount/this.wallSeconds):0,slowFrames:this.slowFrames},events:this.events,frames:this.frames});}
}
