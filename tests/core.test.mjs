import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, persistSave, loadSave, SAVE_KEY, collides, makeRow, reviveCost, buyRevive, speedAtDistance } from '../src/core.mjs';
import { routeAt, ROUTES, ROUTE_LENGTH } from '../src/routes.mjs';

test('distance increases speed progressively with a safe maximum', () => {
  assert.equal(speedAtDistance(0),14);
  assert.equal(speedAtDistance(500),20);
  assert.equal(speedAtDistance(1000),26);
  assert.equal(speedAtDistance(1500),32);
  assert.equal(speedAtDistance(10000),32);
  assert.equal(speedAtDistance(-5),14);
});
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
test('fast direct hits cannot tunnel through thin barriers',()=>{
  assert.equal(collides({x:0,y:0,sliding:false},{x:0,z:-2,previousZ:2,depth:.5,height:1.4,kind:'barrier'}),true);
  assert.equal(collides({x:1.3,y:0,sliding:false},{x:0,z:0,depth:6,height:3.5,kind:'bus'}),true);
});
test('revives have an explicit cost and cannot overspend',()=>{
  const save={...parseSave(null),coins:40};
  assert.equal(reviveCost(0),0); assert.equal(buyRevive(save,0).coins,40);
  assert.equal(buyRevive(save,1).coins,15); assert.equal(buyRevive(save,2),null); assert.equal(save.coins,40);
});
test('all landmarks and sea view occur in one continuous route',()=>{
  for(const route of ROUTES)assert.equal(routeAt(route.start+1).id,route.id);
  assert.equal(routeAt(ROUTE_LENGTH).id,'saddar');assert.equal(routeAt(ROUTE_LENGTH).lap,1);
  assert.equal(routeAt(ROUTES.find(r=>r.id==='seaview').start+1).kind,'coast');
});
