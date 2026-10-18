import {createInstallController,installPlatform} from './pwa-install.mjs';

type OfflineState={done:number;total:number;ready:boolean;downloading:boolean;bytes:number};
type Options={production:boolean;changed:()=>void;notice:(text:string)=>void;canUpdate:()=>boolean;beforeUpdate:()=>Promise<void>};

export class GamePwa {
 private registration:ServiceWorkerRegistration|null=null;
 private install=createInstallController({installed:this.standalone(),onChange:()=>this.options.changed()});
 offline:OfflineState={done:0,total:0,ready:false,downloading:false,bytes:0};
 available=false;updateReady=false;updating=false;cacheError=false;
 constructor(private options:Options){
  window.addEventListener('beforeinstallprompt',event=>this.install.capture(event));
  window.addEventListener('appinstalled',()=>{this.install.markInstalled();this.options.notice('Karachi Run is on your Home Screen!');});
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change',()=>{if(this.standalone())this.install.markInstalled();});
  navigator.serviceWorker?.addEventListener('message',event=>{
   const data=event.data;
   if(data?.type==='OFFLINE_STATUS'){
    const wasReady=this.offline.ready;this.offline={done:data.done,total:data.total,ready:data.ready,downloading:data.downloading,bytes:data.bytes??this.offline.bytes};
    if(!wasReady&&data.ready)this.options.notice('Karachi is ready offline. Cloud saves need a connection.');this.options.changed();
   }else if(data?.type==='UPDATE_BLOCKED'){this.updating=false;this.options.notice('Close other Karachi Run tabs or app windows, then update.');this.options.changed();}
   else if(data?.type==='OFFLINE_ERROR'){this.cacheError=true;this.offline.downloading=false;this.options.notice('Offline download did not finish. Free some storage or reconnect, then retry.');this.options.changed();}
  });
  navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(this.updating)window.location.reload();else void this.readStatus();});
 }
 private standalone(){return window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);}
 state(){return this.install.state();}
 platform(){return installPlatform(navigator.userAgent,navigator.maxTouchPoints);}
 async start(){
  // Dev source/HMR is deliberately not put behind an offline worker.
  if(!this.options.production||!window.isSecureContext||!('serviceWorker'in navigator))return;
  try{
   this.registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
   const watch=()=>{this.updateReady=Boolean(this.registration?.waiting);this.options.changed();};
   watch();this.registration.addEventListener('updatefound',()=>this.registration?.installing?.addEventListener('statechange',watch));
   void navigator.serviceWorker.ready.then(()=>{this.available=true;this.options.changed();void this.readStatus();});
  }catch{this.available=false;this.options.changed();}
 }
 async requestInstall(){
  const result=await this.install.request();
  if(result==='accepted')this.options.notice('Adding Karachi Run. Look for the game icon on your Home Screen.');
  else if(result==='dismissed')this.options.notice('No rush. You can install from here whenever you like.');
  else if(result==='failed')this.options.notice('The browser could not open installation. Try its Install app menu.');
  return result;
 }
 async readStatus(){
  const worker=this.registration?.active;if(!worker)return;
  const channel=new MessageChannel();
  await new Promise<void>(resolve=>{
   const timeout=window.setTimeout(()=>{channel.port1.close();resolve();},5000);
   channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();if(event.data?.type==='OFFLINE_STATUS'){this.offline=event.data;this.available=true;this.options.changed();}resolve();};
   worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
  });
 }
 downloadOffline(){
  if(!this.registration?.active||this.offline.downloading||this.offline.ready)return;
  this.cacheError=false;this.offline.downloading=true;this.options.changed();this.registration.active.postMessage({type:'CACHE_GAME'});
 }
 async applyUpdate(){
  if(!this.registration?.waiting||this.updating)return;
  if(this.offline.downloading){this.options.notice('Let the offline download finish, then update.');return;}
  if(!this.options.canUpdate()){this.options.notice('Finish your run, then update from the lobby.');return;}
  try{
   await this.options.beforeUpdate();if(!this.options.canUpdate())return;
   this.updating=true;this.options.changed();this.registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
   window.setTimeout(()=>{if(this.updating){this.updating=false;this.options.changed();this.options.notice('Update is ready. Close and reopen the game to finish.');}},12000);
  }catch{this.options.notice('Your progress is kept here. Close and reopen the game when you are ready.');}
 }
}
