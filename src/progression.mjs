export const WORD='KARACHI';
export const MAX_MULTIPLIER=30;
const integer=v=>Number.isFinite(v)&&v>=0?Math.min(999999999,Math.floor(v)):0;
export function pakistanDay(now=Date.now()){const d=new Date(Number(now)+5*3600000);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):new Date().toISOString().slice(0,10);}
export function resetIn(now=Date.now()){const shifted=Number(now)+5*3600000;return 86400000-((shifted%86400000)+86400000)%86400000;}
const CATALOG=[
 [['coins',80,'Collect','coins'],['distance',700,'Run','metres'],['jump',4,'Jump over','barriers']],
 [['roll',6,'Roll under','signs'],['coins',150,'Collect','coins'],['roof',10,'Run on roofs for','seconds']],
 [['power',3,'Collect','power-ups'],['distance',1400,'Run','metres'],['dodge',25,'Pass','obstacles']],
 [['jump',10,'Jump over','barriers'],['roll',10,'Roll under','signs'],['coins',240,'Collect','coins']],
];
export function missionSet(set=0){set=Math.min(9999,integer(set));const scale=1+Math.min(3,Math.floor(set/4)*.35);return CATALOG[set%4].map(([type,base,verb,unit])=>{const target=Math.round(base*scale);return {type,target,label:`${verb} ${target} ${unit}`,icon:{coins:'◉',distance:'↗',jump:'↑',roll:'↓',roof:'▰',power:'✦',dodge:'↔'}[type]};});}
export function baseMultiplier(save){return Math.min(MAX_MULTIPLIER,1+integer(save.progression?.set));}
export function missionReward(set){return Math.min(400,120+integer(set)*10);}
export const POT_REWARDS=[{coins:500,boards:2,tickets:0,name:'Street Cruiser Pack'},{coins:350,boards:0,tickets:2,name:'Wapsi Pack'},{coins:800,boards:1,tickets:0,name:'Karachi Gold Pack'}];
export function potReward(day,identity='guest'){let sum=0;for(const c of day+identity)sum=(sum+c.charCodeAt(0))%3;return {...POT_REWARDS[sum]};}
const rewardDays=value=>[...new Set((Array.isArray(value)?value:[]).filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))))].sort();
export function completedMissionMask(save){return missionSet(save.progression.set).reduce((mask,m,i)=>mask|(save.progression.counts[i]>=m.target?1<<i:0),0);}
export function progressionHasNotice(save){const p=save.progression,seen=p.seen?.set===p.set?p.seen.mask:0;return missionReady(save)||dailyReady(save)||Boolean(completedMissionMask(save)&~seen);}
export function markMissionsSeen(save){const mask=completedMissionMask(save),p=save.progression;if(p.seen?.set===p.set&&p.seen.mask===mask)return save;return {...save,progression:{...p,seen:{set:p.set,mask}}};}
export function normalizeProgression(value,legacy={},now=Date.now()){
 const p=value&&typeof value==='object'?value:null;
 const set=Math.min(9999,p?integer(p.set):Math.floor(integer(legacy.missionIndex)/3));
 const missions=missionSet(set);let counts=missions.map((m,i)=>Math.min(m.target,Number.isFinite(p?.counts?.[i])?Math.max(0,p.counts[i]):0));
 if(!p){const completed=integer(legacy.missionIndex)%3;counts=missions.map((m,i)=>i<completed?m.target:i===completed?Math.min(m.target,integer(legacy.missionProgress)):0);}
 const today=pakistanDay(now),d=p?.daily;
 const validDay=typeof d?.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.day)&&Number.isFinite(Date.parse(d.day));
 const day=validDay?d.day:today;
 const claimedDaily=rewardDays(p?.claimedDaily);if(d?.claimed===true&&!claimedDaily.includes(day))claimedDaily.push(day);
 const pendingDaily=rewardDays(p?.pendingDaily).filter(day=>!claimedDaily.includes(day));
 return {set,counts,pendingDaily,claimedDaily,seen:{set:integer(p?.seen?.set),mask:Math.min(7,integer(p?.seen?.mask))},daily:{day,mask:Math.min(127,integer(d?.mask)),claimed:d?.claimed===true||claimedDaily.includes(day)},lastReward:typeof p?.lastReward==='string'?p.lastReward.slice(0,60):''};
}
export function withCurrentDay(save,now=Date.now()){
 const day=pakistanDay(now),p=save.progression;
 if(p.daily.day===day)return save;
 const pendingDaily=rewardDays([...(p.pendingDaily||[]),...(p.daily.mask===127&&!p.daily.claimed?[p.daily.day]:[])]).filter(d=>!(p.claimedDaily||[]).includes(d));
 return {...save,progression:{...p,pendingDaily,daily:{day,mask:0,claimed:false}}};
}
export function mergeProgression(a,b){
 const advanced=a.set>b.set?a:b,counts=a.set===b.set?a.counts.map((n,i)=>Math.max(n,b.counts[i])):[...advanced.counts];
 const daily=a.daily.day>b.daily.day?a.daily:b.daily.day>a.daily.day?b.daily:{day:a.daily.day,mask:a.daily.mask|b.daily.mask,claimed:a.daily.claimed||b.daily.claimed};
 const claimedDaily=rewardDays([...(a.claimedDaily||[]),...(b.claimedDaily||[]),...(a.daily.claimed?[a.daily.day]:[]),...(b.daily.claimed?[b.daily.day]:[])]);
 const pendingDaily=rewardDays([...(a.pendingDaily||[]),...(b.pendingDaily||[]),...([a.daily,b.daily].filter(d=>d.day!==daily.day&&d.mask===127&&!d.claimed).map(d=>d.day))]).filter(day=>day!==daily.day&&!claimedDaily.includes(day));
 const seen={set:advanced.set,mask:(a.seen?.set===advanced.set?a.seen.mask:0)|(b.seen?.set===advanced.set?b.seen.mask:0)};
 return {...advanced,counts,pendingDaily,claimedDaily,seen,daily:{...daily,claimed:daily.claimed||claimedDaily.includes(daily.day)}};
}
export function missionReady(save){return missionSet(save.progression.set).every((m,i)=>save.progression.counts[i]>=m.target);}
export function dailyReady(save,now=Date.now()){const d=save.progression.daily;return Boolean(save.progression.pendingDaily?.length)||d.day===pakistanDay(now)&&d.mask===127&&!d.claimed;}
export function advanceProgression(save,type,amount){
 if(!Number.isFinite(amount)||amount<=0)return save;let changed=false;const p=save.progression;
 const counts=missionSet(p.set).map((m,i)=>{const n=m.type===type?Math.min(m.target,p.counts[i]+amount):p.counts[i];if(n!==p.counts[i])changed=true;return n;});
 return changed?{...save,progression:{...p,counts}}:save;
}
export function nextLetter(save,now=Date.now()){const d=save.progression.daily;if(d.day!==pakistanDay(now)||d.claimed)return -1;for(let i=0;i<WORD.length;i++)if(!(d.mask&(1<<i)))return i;return -1;}
export function collectLetter(save,index,now=Date.now()){
 save=withCurrentDay(save,now);if(!Number.isInteger(index)||index<0||index>=7||save.progression.daily.claimed)return save;
 return {...save,progression:{...save.progression,daily:{...save.progression.daily,mask:save.progression.daily.mask|(1<<index)}}};
}
export function claimLocalReward(save,kind,now=Date.now(),identity='guest'){
 save=withCurrentDay(save,now);const p=save.progression;
 if(kind==='mission'&&missionReady(save)){
  const coins=missionReward(p.set),next={...save,coins:save.coins+coins,missionIndex:Math.max(save.missionIndex,(p.set+1)*3),missionProgress:0,progression:{...p,set:Math.min(9999,p.set+1),counts:[0,0,0],lastReward:`mission:${p.set}`}};
  return {save:next,reward:{coins,boards:0,tickets:0,name:baseMultiplier(next)>baseMultiplier(save)?'Multiplier level up!':'Mission set complete!'},key:`mission:${p.set}`};
 }
 if(kind==='daily'&&dailyReady(save,now)){
  const day=p.pendingDaily?.[0]??p.daily.day,reward=potReward(day,identity);return {save:{...save,coins:save.coins+reward.coins,cruiserCharges:save.cruiserCharges+reward.boards,wapsiTickets:save.wapsiTickets+reward.tickets,progression:{...p,pendingDaily:(p.pendingDaily||[]).filter(d=>d!==day),claimedDaily:rewardDays([...(p.claimedDaily||[]),day]),daily:{...p.daily,claimed:p.daily.day===day?true:p.daily.claimed},lastReward:`daily:${day}`}},reward,key:`daily:${day}`};
 }
 return null;
}
export function dailyLetterLane(preferred,z,speed,obstacles){
 const lanes=[0,1,2].sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred));const t=z/Math.max(14,speed);
 for(const lane of lanes){const x=[-3.15,0,3.15][lane];if(!obstacles.some(o=>Math.abs(x-o.x)<(o.width??3.4)/2+.6&&Math.abs(o.z-(speed+(o.vehicleSpeed||0))*t)<o.depth/2+5))return lane;}
 return null;
}
