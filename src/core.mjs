export const SAVE_KEY = 'karachi-run.save.v1';
export const LANES = [-3.15, 0, 3.15];
export function jumpImpulse(bounceActive=false){return bounceActive?23.8:11.6;}
export function sideBumpResponse(previousX,obstacle){
 const side=Math.sign(previousX-obstacle.x)||1;
 const x=obstacle.x+side*((obstacle.width??2.6)/2+.32);
 const lane=LANES.reduce((best,value,index)=>Math.abs(value-x)<Math.abs(LANES[best]-x)?index:best,1);
 return {x,lane};
}
export function speedAtDistance(distance) { return Math.min(32,14+Math.max(0,Number.isFinite(distance)?distance:0)*.012); }
export function runCadence(speed) { return 14.8 + Math.min(1.6, Math.max(0, speed - 14) * .09); }
export const POWER_DURATION = Object.freeze({ magnet: 12, boost: 12, chai: 8.5, biryani: 12, shoes: 8 });
export const POWER_MAX_LEVEL = 5;
export const POWER_UPGRADE_BASE_PRICE = Object.freeze({ magnet: 180, boost: 220, chai: 280, biryani: 260, shoes: 200 });
export function powerDuration(kind, level=0) { const base=POWER_DURATION[kind]; if(!base)return 0; const step=kind==='chai'?2.5:kind==='magnet'?3:2; return base+step*Math.min(POWER_MAX_LEVEL,Math.max(0,safeInt(level))); }
export function powerUpgradePrice(kind, level=0) { const base=POWER_UPGRADE_BASE_PRICE[kind]; return base ? base*(Math.max(0,safeInt(level))+1) : 0; }
export const POWER_PICKUP_CHANCE = .70;
function seededUnit(seed, salt=0) { let x=((seed>>>0)^Math.imul((salt+1)>>>0,0x9e3779b9))>>>0; x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);x=(x^(x>>>16))>>>0;return x/4294967296; }
export function powerPickupChoice(seed, opportunity) { if(seededUnit(seed,opportunity*2)>=POWER_PICKUP_CHANCE)return null;const r=seededUnit(seed,opportunity*2+1);return r<.25?'magnet':r<.48?'boost':r<.63?'chai':r<.81?'biryani':'shoes'; }
export function powerPickupDelay(seed, opportunity) { return 18+seededUnit(seed,opportunity*2+701)*10; }
export function firstPowerPickupDistance(seed) { return 110+seededUnit(seed,901)*100; }
export function distanceAfterRunTime(distance, seconds) { const d=Math.max(0,Number.isFinite(distance)?distance:0),t=Math.max(0,Number.isFinite(seconds)?seconds:0),speed=14+.012*d,rate=.012,cap=32,limit=1500;if(d>=limit)return d+cap*t;const toCap=Math.log(cap/speed)/rate;if(t<=toCap)return (d+14/rate)*Math.exp(rate*t)-14/rate;return limit+(t-toCap)*cap; }

export function scorePowerMultiplier(boostActive, biryaniActive) { return (boostActive ? 2 : 1) * (biryaniActive ? 2 : 1); }
export function coinPowerValue(biryaniActive) { return biryaniActive ? 2 : 1; }
export function buyPowerUpgrade(save, kind) { const level=save.powerLevels?.[kind]??0, price=powerUpgradePrice(kind,level); if(!price || level>=POWER_MAX_LEVEL || save.coins<price)return null; return {...save,coins:save.coins-price,powerLevels:{...save.powerLevels,[kind]:level+1}}; }
export function stepCoinAttraction(current, anchor, runner, dt, magnetActive) {
  const approach=(from,to,rate)=>from+(to-from)*rate;
  const recovering=1-Math.exp(-18*dt);
  if(!magnetActive||anchor.z<=-3||anchor.z>=36) return {x:approach(current.x,anchor.x,recovering),y:approach(current.y,anchor.y,recovering),z:approach(current.z,anchor.z,recovering)};
  const pull=1-Math.exp(-24*dt);
  const zPull=anchor.z>0&&anchor.z<22?pull:0;
  return {x:approach(current.x,runner.x,pull),y:approach(current.y,runner.y,pull),z:approach(current.z,0,zPull)};
}
export const INITIAL_SAVE = { version: 7, coins: 0, wapsiTickets: 0, cruiserCharges: 5, best: 0, totalScore: 0, runs: 0, muted: false, musicMuted: false, voiceMuted: false, lowGraphics: false, selectedCharacter: 'pakistani_boy.glb', unlockedCharacters: ['pakistani_boy.glb'], powerLevels: { magnet: 0, boost: 0, chai: 0, biryani: 0, shoes: 0 }, missionIndex: 0, missionProgress: 0 };
export const WAPSI_TICKET_PRICE = 90;
export const WAPSI_TICKET_PACK = { count: 5, price: 350 };
export const CRUISER_CHARGE_PRICE = 90;
export const CRUISER_CHARGE_PACK = { count: 5, price: 350 };
const safeInt = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(v)) : 0;
export function parseSave(raw) {
  try {
    const d = JSON.parse(raw || '{}');
    if (!d || typeof d !== 'object') return { ...INITIAL_SAVE };
    const allowed = ['pakistani_boy.glb','imran.glb','asim.glb'];
    const unlockedCharacters = [...new Set(['pakistani_boy.glb', ...(Array.isArray(d.unlockedCharacters) ? d.unlockedCharacters.filter(x => allowed.includes(x)) : [])])];
    const selectedCharacter = unlockedCharacters.includes(d.selectedCharacter) ? d.selectedCharacter : 'pakistani_boy.glb';
    const energies = d.energies && typeof d.energies === 'object' ? d.energies : {};
    const levels = d.powerLevels && typeof d.powerLevels === 'object' ? d.powerLevels : Object.fromEntries(['magnet','boost','chai','biryani','shoes'].map(k=>[k,energies[k]??0]));
    return { version: 7, coins: safeInt(d.coins), wapsiTickets: safeInt(d.wapsiTickets), cruiserCharges: d.cruiserCharges === undefined ? 5 : safeInt(d.cruiserCharges), best: safeInt(d.best), totalScore: safeInt(d.totalScore), runs: safeInt(d.runs), muted: d.muted === true, musicMuted: d.musicMuted === true, voiceMuted: d.voiceMuted === true, lowGraphics: d.lowGraphics === true, selectedCharacter, unlockedCharacters, powerLevels: { magnet: Math.min(5,safeInt(levels.magnet)), boost: Math.min(5,safeInt(levels.boost)), chai: Math.min(5,safeInt(levels.chai)), biryani: Math.min(5,safeInt(levels.biryani)), shoes: Math.min(5,safeInt(levels.shoes)) }, missionIndex: safeInt(d.missionIndex), missionProgress: safeInt(d.missionProgress) };
  } catch { return { ...INITIAL_SAVE }; }
}
export function mergePlayerSaves(cloudValue, guestValue) {
  const cloud = parseSave(JSON.stringify(cloudValue ?? {}));
  const guest = parseSave(JSON.stringify(guestValue ?? {}));
  const missionSource = guest.missionIndex > cloud.missionIndex ? guest : cloud;
  const selectedCharacter = guest.selectedCharacter !== 'pakistani_boy.glb'
    ? guest.selectedCharacter
    : cloud.selectedCharacter;
  return {
    ...cloud,
    coins: Math.max(cloud.coins, guest.coins),
    wapsiTickets: Math.max(cloud.wapsiTickets, guest.wapsiTickets),
    cruiserCharges: Math.max(cloud.cruiserCharges, guest.cruiserCharges),
    best: Math.max(cloud.best, guest.best),
    totalScore: Math.max(cloud.totalScore, guest.totalScore),
    runs: Math.max(cloud.runs, guest.runs),
    selectedCharacter,
    unlockedCharacters: [...new Set([...cloud.unlockedCharacters, ...guest.unlockedCharacters])],
    powerLevels: { magnet: Math.max(cloud.powerLevels.magnet, guest.powerLevels.magnet), boost: Math.max(cloud.powerLevels.boost, guest.powerLevels.boost), chai: Math.max(cloud.powerLevels.chai, guest.powerLevels.chai), biryani: Math.max(cloud.powerLevels.biryani, guest.powerLevels.biryani), shoes: Math.max(cloud.powerLevels.shoes, guest.powerLevels.shoes) },
    missionIndex: Math.max(cloud.missionIndex, guest.missionIndex),
    missionProgress: guest.missionIndex > cloud.missionIndex ? guest.missionProgress : cloud.missionIndex > guest.missionIndex ? cloud.missionProgress : Math.max(cloud.missionProgress, guest.missionProgress),
  };
}
export function loadSave(storage) { try { return parseSave(storage.getItem(SAVE_KEY)); } catch { return { ...INITIAL_SAVE }; } }
export function persistSave(storage, value) { try { storage.setItem(SAVE_KEY, JSON.stringify(value)); return true; } catch { return false; } }

export function buyWapsiTickets(save, count=1) {
  const price = count===1 ? WAPSI_TICKET_PRICE : count===WAPSI_TICKET_PACK.count ? WAPSI_TICKET_PACK.price : null;
  if(price===null || save.coins<price) return null;
  return {...save,coins:save.coins-price,wapsiTickets:save.wapsiTickets+count};
}
export function useWapsiTicket(save) {
  if(save.wapsiTickets<1) return null;
  return {...save,wapsiTickets:save.wapsiTickets-1};
}
export function buyAndUseWapsiTicket(save) {
  if(save.wapsiTickets>0) return useWapsiTicket(save);
  if(save.coins<WAPSI_TICKET_PRICE) return null;
  return {...save,coins:save.coins-WAPSI_TICKET_PRICE};
}
export function buyCruiserCharges(save, count=1) {
  const price=count===1?CRUISER_CHARGE_PRICE:count===CRUISER_CHARGE_PACK.count?CRUISER_CHARGE_PACK.price:null;
  if(price===null||save.coins<price)return null;
  return {...save,coins:save.coins-price,cruiserCharges:save.cruiserCharges+count};
}
export function useCruiserCharge(save) {
  if(save.cruiserCharges<1)return null;
  return {...save,cruiserCharges:save.cruiserCharges-1};
}

export function collides(player, obstacle) {
  const halfWidth = (obstacle.width !== undefined ? obstacle.width / 2 : obstacle.kind === 'rickshaw' ? 1 : 1.3) + .50;
  const minX = Math.min(player.previousX ?? player.x, player.x);
  const maxX = Math.max(player.previousX ?? player.x, player.x);
  if (maxX < obstacle.x - halfWidth || minX > obstacle.x + halfWidth) return false;
  const nearZ = Math.min(obstacle.previousZ ?? obstacle.z, obstacle.z);
  const farZ = Math.max(obstacle.previousZ ?? obstacle.z, obstacle.z);
  if (nearZ > obstacle.depth / 2 + .4 || farZ < -obstacle.depth / 2 - .4) return false;
  if (obstacle.kind === 'barrier') return player.y < 1.12;
  if (obstacle.kind === 'arch') return !player.sliding || player.y > 0.25;
  return player.y < obstacle.height;
}
export function reviveCost(used) { return used === 0 ? 0 : Math.min(200, 25 * 2 ** Math.min(used - 1, 3)); }
export function buyRevive(save, used) { const cost = reviveCost(used); if (save.coins < cost) return null; return { ...save, coins: save.coins - cost }; }
const missionTypes = [
  { type:'coins', target:30, label:'Collect 30 coins', verb:'Collect', unit:'coins' },
  { type:'dodge', target:12, label:'Pass 12 obstacles', verb:'Pass', unit:'obstacles' },
  { type:'distance', target:350, label:'Run 350 metres', verb:'Run', unit:'metres' },
  { type:'jump', target:5, label:'Clear 5 barriers', verb:'Clear', unit:'barriers' },
];
export function missionFor(index) { const base=missionTypes[index%missionTypes.length]; const target=Math.round(base.target*(1+Math.min(2,Math.floor(index/4)*.25))); return {...base,target,label:`${base.verb} ${target} ${base.unit}`,reward:Math.min(60,20+Math.floor(index/4)*5)}; }
// Every row reserves one completely unobstructed lane; avoid reaction-time traps.
export function makeRow(index, random = Math.random) {
  const safeLane = ([1,1,0,0,2,2,1,1][index%8]+Math.floor(index/8))%3;
  const kinds = ['bus', 'barrier', 'bus', 'arch', 'rickshaw', 'bus', 'barrier'];
  const obstacles = [];
  for (let lane = 0; lane < 3; lane++) {
    if (lane !== safeLane && (index > 3 || random() > 0.4)) obstacles.push({ lane, kind: kinds[(index + lane) % kinds.length] });
  }
  return { safeLane, obstacles };
}

// Clothing and swinging hands are outside this narrower gameplay body.
export function contactKind(player,obstacle){
 if(!collides(player,obstacle))return 'none';
 const half=(obstacle.width??(obstacle.kind==='rickshaw'?2:2.6))/2;
 const min=Math.min(player.previousX??player.x,player.x),max=Math.max(player.previousX??player.x,player.x);
 if(max<obstacle.x-half-.22||min>obstacle.x+half+.22)return 'none';
 const lateralShift=Math.abs(player.x-(player.previousX??player.x));
 return lateralShift>.12?'graze':Math.abs(player.x-obstacle.x)<=half-.4?'direct':'graze';
}
