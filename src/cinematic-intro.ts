import {nextReadyDelay} from './shutter-opening.mjs';
import {cinematicBackdropCrop} from './cinematic-framing.mjs';

/** A user-started film. The game stays frozen until its last frame is prepared. */
export class CinematicIntro {
  private root:HTMLDivElement|null=null;private video:HTMLVideoElement|null=null;
  private backdrop:HTMLCanvasElement|null=null;private backdropFrame:number|null=null;
  private state:'idle'|'waiting'|'playing'|'fading'='idle';private wait=0;private age=0;private prepared=false;private primed=false;
  private resume:HTMLButtonElement|null=null;private generation=0;
  constructor(private prepare:()=>void,private complete:()=>void){}
  get active(){return this.state==='waiting'||this.state==='playing';}
  get waiting(){return this.state==='waiting';}
  begin(clock:number,muted:boolean){
    this.cancel();const generation=++this.generation;this.state='waiting';this.wait=nextReadyDelay(clock);this.age=0;this.prepared=false;this.primed=false;
    const root=this.root=document.createElement('div');root.className='cinematic-intro';root.setAttribute('role','dialog');root.setAttribute('aria-label','Haris and the warden opening');
    const ambient=document.createElement('div');ambient.className='cinematic-ambient';ambient.setAttribute('aria-hidden','true');
    const backdrop=this.backdrop=document.createElement('canvas');backdrop.className='cinematic-backdrop';
    // Preserve the real lobby beneath the translucent fill, including during the
    // brief viewport expansion at the end. This is a local frame, not extra media.
    const underlay=document.createElement('canvas');underlay.className='cinematic-underlay';
    const city=document.querySelector<HTMLCanvasElement>('#world');
    if(city&&city.clientWidth/city.clientHeight>.75&&city.width&&city.height){
      underlay.width=Math.min(1280,city.width);underlay.height=Math.max(1,Math.round(underlay.width*city.height/city.width));
      try{underlay.getContext('2d')?.drawImage(city,0,0,underlay.width,underlay.height);}catch{/* The live city remains visible if copying is unavailable. */}
    }
    const shade=document.createElement('div');shade.className='cinematic-vignette';ambient.append(underlay,backdrop,shade);
    const picture=document.createElement('div');picture.className='cinematic-picture';
    const video=this.video=document.createElement('video');video.src='/cinematics/haris-intro.mp4';video.preload='auto';video.playsInline=true;video.muted=muted;video.disablePictureInPicture=true;video.setAttribute('aria-label','Haris throws a tape ball at the shop shutter. It rebounds towards the warden, who gives chase.');
    const skip=document.createElement('button');skip.className='cinematic-skip';skip.textContent='SKIP INTRO ›';skip.onclick=()=>this.finish();
    const resume=this.resume=document.createElement('button');resume.className='cinematic-resume';resume.textContent='TAP TO CONTINUE ▶';resume.hidden=true;resume.onclick=()=>this.play();
    picture.append(video);root.append(ambient,picture,skip,resume);document.body.append(root);
    video.onended=()=>this.finish();video.onerror=()=>{console.warn('[Karachi Run] Intro unavailable; starting the live game.');this.finish();};
    video.ontimeupdate=()=>this.prepareEndFrame();video.onseeked=()=>this.paintBackdrop();
    // Prime this exact media element inside the Run gesture. It can resume after
    // the lobby finishes its catch without losing mobile playback permission.
    void video.play().then(()=>{if(this.generation!==generation||this.state!=='waiting')return;video.pause();video.currentTime=0;this.primed=true;}).catch(()=>{if(this.generation===generation)this.primed=true;});
  }
  tick(dt:number){
    if(!this.active||document.hidden)return;this.age+=dt;
    if(this.state==='waiting'){
      this.wait=Math.max(0,this.wait-dt);
      if(this.age>8){this.finish();return;}
      if(this.wait===0&&this.primed&&this.video&&this.video.readyState>=2){this.state='playing';this.root?.classList.add('is-visible');this.play();}
    }else{if(this.video&&typeof this.video.requestVideoFrameCallback!=='function')this.paintBackdrop();this.prepareEndFrame();}
  }
  private play(){
    const video=this.video;if(!video)return;this.resume!.hidden=true;
    void video.play().then(()=>{if(this.video===video&&this.state==='playing'){this.paintBackdrop();this.followVideoFrames();}}).catch(()=>{if(this.video===video&&this.resume)this.resume.hidden=false;});
  }
  private paintBackdrop(){
    const video=this.video,canvas=this.backdrop;
    // CSS disables the backdrop on portrait phones. No extra canvas work there.
    if(!video||!canvas||video.readyState<2||!canvas.clientWidth||!canvas.clientHeight)return;
    const crop=cinematicBackdropCrop(video.videoWidth,video.videoHeight,canvas.clientWidth,canvas.clientHeight);if(!crop)return;
    const width=480,height=Math.max(1,Math.round(width*canvas.clientHeight/canvas.clientWidth));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const context=canvas.getContext('2d',{alpha:false});if(!context)return;
    try{context.drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,width,height);}catch{/* A pending seek keeps the previous backdrop frame. */}
  }
  private followVideoFrames(){
    const video=this.video;if(!video||this.backdropFrame!==null||typeof video.requestVideoFrameCallback!=='function')return;
    const draw=()=>{this.backdropFrame=null;if(this.video!==video||this.state!=='playing')return;this.paintBackdrop();this.backdropFrame=video.requestVideoFrameCallback(draw);};
    this.backdropFrame=video.requestVideoFrameCallback(draw);
  }
  private stopVideoFrames(){if(this.video&&this.backdropFrame!==null)this.video.cancelVideoFrameCallback?.(this.backdropFrame);this.backdropFrame=null;}
  private prepareEndFrame(){const video=this.video;if(video&&Number.isFinite(video.duration)&&video.duration-video.currentTime<=.35)this.prepareOnce();}
  private prepareOnce(){if(!this.prepared){this.prepared=true;this.prepare();}}
  private finish(){
    if(!this.active)return;this.prepareOnce();this.paintBackdrop();this.state='fading';this.stopVideoFrames();
    const video=this.video,root=this.root;
    if(video){video.onended=null;video.onerror=null;video.ontimeupdate=null;video.onseeked=null;video.pause();}
    root?.setAttribute('aria-hidden','true');root?.classList.add('is-finished');this.complete();
    this.video=null;this.root=null;this.resume=null;this.backdrop=null;
    // The center clears quickly; the soft sides dissolve while the real camera
    // expands back to full width. Release the media decoder after that dissolve.
    setTimeout(()=>{root?.remove();if(video){video.removeAttribute('src');video.load();}},700);
  }
  skip(){this.finish();}
  visibility(){if(!this.active)return;if(document.hidden)this.video?.pause();else if(this.state==='playing')this.play();}
  cancel(){this.generation++;this.stopVideoFrames();this.state='idle';if(this.video){this.video.onended=null;this.video.onerror=null;this.video.ontimeupdate=null;this.video.onseeked=null;this.video.pause();this.video.removeAttribute('src');this.video.load();}this.root?.remove();this.root=null;this.video=null;this.resume=null;this.backdrop=null;this.prepared=false;}
}
