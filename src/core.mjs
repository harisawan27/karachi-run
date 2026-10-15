export const SAVE_KEY = 'karachi-run.save.v1';
export const LANES = [-3.15, 0, 3.15];
export function speedAtDistance(distance) { return Math.min(32,14+Math.max(0,Number.isFinite(distance)?distance:0)*.012); }
export function runCadence(speed) { return 11.5 + Math.min(2, Math.max(0, speed - 14) * .11); }
export function stepCoinAttraction(current, anchor, runner, dt, magnetActive) {
  const approach=(from,to,rate)=>from+(to-from)*rate;
  const recovering=1-Math.exp(-18*dt);
  if(!magnetActive||anchor.z<=-3||anchor.z>=36) return {x:approach(current.x,anchor.x,recovering),y:approach(current.y,anchor.y,recovering),z:approach(current.z,anchor.z,recovering)};
  const pull=1-Math.exp(-24*dt);
  const zPull=anchor.z>0&&anchor.z<22?pull:0;
  return {x:approach(current.x,runner.x,pull),y:approach(current.y,runner.y,pull),z:approach(current.z,0,zPull)};
}
export const INITIAL_SAVE = { version: 4, coins: 0, wapsiTickets: 0, best: 0, totalScore: 0, runs: 0, muted: false, lowGraphics: false, selectedCharacter: 'pakistani_boy.glb', unlockedCharacters: ['pakistani_boy.glb'], energies: { magnet: 0, boost: 0 }, missionIndex: 0, missionProgress: 0 };
export const WAPSI_TICKET_PRICE = 90;
export const WAPSI_TICKET_PACK = { count: 5, price: 350 };
const safeInt = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(v)) : 0;
export function parseSave(raw) {
  try {
    const d = JSON.parse(raw || '{}');
    if (!d || typeof d !== 'object') return { ...INITIAL_SAVE };
    const allowed = ['pakistani_boy.glb','imran.glb','asim.glb'];
    const unlockedCharacters = [...new Set(['pakistani_boy.glb', ...(Array.isArray(d.unlockedCharacters) ? d.unlockedCharacters.filter(x => allowed.includes(x)) : [])])];
    const selectedCharacter = unlockedCharacters.includes(d.selectedCharacter) ? d.selectedCharacter : 'pakistani_boy.glb';
    const energies = d.energies && typeof d.energies === 'object' ? d.energies : {};
    return { version: 4, coins: safeInt(d.coins), wapsiTickets: safeInt(d.wapsiTickets), best: safeInt(d.best), totalScore: safeInt(d.totalScore), runs: safeInt(d.runs), muted: d.muted === true, lowGraphics: d.lowGraphics === true, selectedCharacter, unlockedCharacters, energies: { magnet: safeInt(energies.magnet), boost: safeInt(energies.boost) }, missionIndex: safeInt(d.missionIndex), missionProgress: safeInt(d.missionProgress) };
  } catch { return { ...INITIAL_SAVE }; }
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
 return max>=obstacle.x-half+.4&&min<=obstacle.x+half-.4?'direct':'graze';
}
