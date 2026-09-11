import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, persistSave, loadSave, SAVE_KEY, collides, makeRow } from '../src/core.mjs';
test('saves coins and records across a fresh load', () => {
  const data = new Map(); const storage = { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v) };
  const save = { ...parseSave(null), coins: 47, best: 890, totalScore: 1430, runs: 3 };
  assert.equal(persistSave(storage, save), true); assert.deepEqual(loadSave(storage), save); assert.ok(data.has(SAVE_KEY));
});
test('corrupt and unavailable storage does not break the game', () => {
  assert.equal(parseSave('{nope').coins, 0);
  assert.equal(parseSave('{"coins":-5,"best":"oops","runs":null}').coins, 0);
  assert.equal(parseSave('null').best, 0);
  assert.equal(persistSave({ setItem() { throw Error('full'); } }, {}), false);
  assert.equal(loadSave({ getItem() { throw Error('blocked'); } }).coins, 0);
});
test('jump and slide collisions distinguish the matching actions', () => {
  const p = { x: 0, y: 0, sliding: false }; const o = { x: 0, z: 0, depth: 1, height: 4 };
  assert.equal(collides(p, { ...o, kind: 'barrier' }), true);
  assert.equal(collides({ ...p, y: 1.3 }, { ...o, kind: 'barrier' }), false);
  assert.equal(collides({ ...p, sliding: true }, { ...o, kind: 'arch' }), false);
  assert.equal(collides({ ...p, sliding: true }, { ...o, kind: 'bus' }), true);
  assert.equal(collides({ ...p, x: 3.15 }, { ...o, kind: 'bus' }), false);
});
test('generated rows always contain a safe lane', () => {
  for (let i = 0; i < 1000; i++) { const row = makeRow(i); assert.ok(row.safeLane >= 0 && row.safeLane < 3); assert.ok(row.obstacles.every(o => o.lane !== row.safeLane)); }
});
