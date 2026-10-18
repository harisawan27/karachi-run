// Bound synchronous storage work during a run. Immediate saves at crash,
// finish, pause and pagehide cancel the pending timer and write directly.
export class ProgressWriter {
 constructor(write,changed,{delay=200,setTimer=(callback,ms)=>globalThis.setTimeout(callback,ms),clearTimer=id=>globalThis.clearTimeout(id)}={}){
  this.write=write;this.changed=changed;this.delay=delay;this.setTimer=setTimer;this.clearTimer=clearTimer;this.timer=null;
 }
 schedule(){
  this.changed();
  if(this.timer===null)this.timer=this.setTimer(()=>{this.timer=null;this.write();},this.delay);
 }
 cancel(){if(this.timer!==null){this.clearTimer(this.timer);this.timer=null;}}
}
