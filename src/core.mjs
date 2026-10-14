export const SAVE_KEY = 'karachi-run.save.v1';
export const LANES = [-3.15, 0, 3.15];
export const INITIAL_SAVE = { version: 2, coins: 0, best: 0, totalScore: 0, runs: 0, muted: false, missionIndex: 0, missionProgress: 0 };
const safeInt = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(v)) : 0;
export function parseSave(raw) {
  try {
    const d = JSON.parse(raw || '{}');
    if (!d || typeof d !== 'object') return { ...INITIAL_SAVE };
    return { version: 2, coins: safeInt(d.coins), best: safeInt(d.best), totalScore: safeInt(d.totalScore), runs: safeInt(d.runs), muted: d.muted === true, missionIndex: safeInt(d.missionIndex), missionProgress: safeInt(d.missionProgress) };
  } catch { return { ...INITIAL_SAVE }; }
}
export function loadSave(storage) { try { return parseSave(storage.getItem(SAVE_KEY)); } catch { return { ...INITIAL_SAVE }; } }
export function persistSave(storage, value) { try { storage.setItem(SAVE_KEY, JSON.stringify(value)); return true; } catch { return false; } }
export function collides(player, obstacle) {
  const halfWidth = (obstacle.kind === 'rickshaw' ? 1 : 1.3) + .29;
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
  const safeLane = Math.floor(random() * 3);
  const kinds = ['bus', 'barrier', 'arch', 'rickshaw', 'barrier'];
  const obstacles = [];
  for (let lane = 0; lane < 3; lane++) {
    if (lane !== safeLane && (index > 3 || random() > 0.4)) obstacles.push({ lane, kind: kinds[(index + lane) % kinds.length] });
  }
  return { safeLane, obstacles };
}
