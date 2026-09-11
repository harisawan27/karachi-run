export const SAVE_KEY = 'karachi-run.save.v1';
export const LANES = [-3.15, 0, 3.15];
export const INITIAL_SAVE = { version: 1, coins: 0, best: 0, totalScore: 0, runs: 0, muted: false };
const safeInt = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(v)) : 0;
export function parseSave(raw) {
  try {
    const d = JSON.parse(raw || '{}');
    if (!d || typeof d !== 'object') return { ...INITIAL_SAVE };
    return { version: 1, coins: safeInt(d.coins), best: safeInt(d.best), totalScore: safeInt(d.totalScore), runs: safeInt(d.runs), muted: d.muted === true };
  } catch { return { ...INITIAL_SAVE }; }
}
export function loadSave(storage) { try { return parseSave(storage.getItem(SAVE_KEY)); } catch { return { ...INITIAL_SAVE }; } }
export function persistSave(storage, value) { try { storage.setItem(SAVE_KEY, JSON.stringify(value)); return true; } catch { return false; } }
export function collides(player, obstacle) {
  if (Math.abs(player.x - obstacle.x) > 1.02 || Math.abs(obstacle.z) > obstacle.depth / 2 + 0.35) return false;
  if (obstacle.kind === 'barrier') return player.y < 1.12;
  if (obstacle.kind === 'arch') return !player.sliding || player.y > 0.25;
  return player.y < obstacle.height;
}
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
