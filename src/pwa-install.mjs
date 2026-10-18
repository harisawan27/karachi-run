/** One browser install event can only be used once, even after dismissal. */
export function createInstallController({installed=false,onChange=()=>{}}={}){
 let deferred=null,busy=false;
 const state=()=>({installed,busy,available:Boolean(deferred)});
 const emit=()=>onChange(state());
 return {
  state,
  capture(event){if(installed)return;event.preventDefault();deferred=event;emit();},
  markInstalled(){installed=true;deferred=null;emit();},
  async request(){
   if(installed)return 'installed';if(busy)return 'busy';if(!deferred)return 'help';
   const event=deferred;deferred=null;busy=true;emit();
   try{const result=await event.prompt();const choice=result?.outcome?result:await event.userChoice;return choice?.outcome==='accepted'?'accepted':'dismissed';}
   catch{return 'failed';}
   finally{busy=false;emit();}
  }
 };
}
export function installPlatform(userAgent,maxTouchPoints=0){return /iPad|iPhone|iPod/.test(userAgent)||/Macintosh/.test(userAgent)&&maxTouchPoints>1?'ios':/Android/i.test(userAgent)?'android':'desktop';}
