import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, persistSave, loadSave, SAVE_KEY, collides, makeRow, reviveCost, buyRevive, speedAtDistance, runCadence, stepCoinAttraction, buyCruiserCharges, useCruiserCharge, POWER_DURATION, powerDuration, powerUpgradePrice, powerPickupChoice, powerPickupDelay, firstPowerPickupDistance, distanceAfterRunTime, scorePowerMultiplier, coinPowerValue, buyPowerUpgrade } from '../src/core.mjs';
import { routeAt, ROUTES, ROUTE_LENGTH } from '../src/routes.mjs';

test('distance increases speed progressively with a safe maximum', () => {
  assert.equal(speedAtDistance(0),14);
  assert.equal(speedAtDistance(500),20);
  assert.equal(speedAtDistance(1000),26);
  assert.equal(speedAtDistance(1500),32);
  assert.equal(speedAtDistance(10000),32);
  assert.equal(speedAtDistance(-5),14);
});
test('runner cadence stays controlled as game speed rises', () => {
  assert.equal(runCadence(14), 11.5);
  assert.ok(runCadence(32) < 14);
  assert.ok(runCadence(32) > runCadence(14));
});
test('Phase 2 power upgrades migrate safely, scale pickup duration, and spend coins', () => {
  const legacy=parseSave(JSON.stringify({coins:31,energies:{magnet:2,boost:1}}));
  assert.equal(legacy.coins,31);assert.deepEqual(legacy.powerLevels,{magnet:2,boost:1,chai:0,biryani:0,shoes:0});
  assert.equal(legacy.musicMuted,false);assert.equal(legacy.voiceMuted,false);
  assert.equal(POWER_DURATION.chai,8.5);assert.equal(POWER_DURATION.biryani,12);assert.equal(POWER_DURATION.shoes,8);
  assert.equal(powerDuration('chai',0),8.5);assert.equal(powerDuration('chai',5),21);assert.equal(powerDuration('magnet',5),27);assert.equal(powerDuration('shoes',5),18);
  assert.equal(scorePowerMultiplier(false,false),1);assert.equal(scorePowerMultiplier(true,false),2);
  assert.equal(scorePowerMultiplier(false,true),2);assert.equal(scorePowerMultiplier(true,true),4);
  assert.equal(coinPowerValue(false),1);assert.equal(coinPowerValue(true),2);
  const buyer={...legacy,coins:1000}, upgraded=buyPowerUpgrade(buyer,'chai');
  assert.equal(powerUpgradePrice('chai',0),280);assert.equal(upgraded.coins,720);assert.equal(upgraded.powerLevels.chai,1);
  assert.equal(buyPowerUpgrade({...buyer,coins:279},'chai'),null);assert.equal(buyPowerUpgrade(buyer,'bad'),null);
  assert.equal(buyPowerUpgrade({...buyer,powerLevels:{...buyer.powerLevels,shoes:5}},'shoes'),null);
});
test('route energy pickups are spaced, varied and never guaranteed in every interval', () => {
  assert.equal(firstPowerPickupDistance(1234),firstPowerPickupDistance(1234));
  assert.ok(firstPowerPickupDistance(1234)>=110&&firstPowerPickupDistance(1234)<=210);
  assert.ok(powerPickupDelay(1234,4)>=18&&powerPickupDelay(1234,4)<28);
  const choices=Array.from({length:200},(_,i)=>powerPickupChoice(9876,i));
  assert.ok(choices.includes(null));for(const kind of ['magnet','boost','chai','biryani','shoes'])assert.ok(choices.includes(kind));
  assert.ok(distanceAfterRunTime(0,10)>140);assert.ok(distanceAfterRunTime(1800,10)-1800===320);
});
test('fresh saves receive five Cruiser rides and legacy saves are migrated once', () => {
  assert.equal(parseSave(null).cruiserCharges,5);
  assert.equal(parseSave('{"coins":3,"cruiserCharges":0}').cruiserCharges,0);
  assert.equal(parseSave('{"coins":3}').cruiserCharges,5);
});
test('Cruiser rides are purchased in singles or a five-pack and consumed on activation', () => {
  const save={...parseSave(null),coins:500,cruiserCharges:0};
  const one=buyCruiserCharges(save,1);
  assert.equal(one.coins,410); assert.equal(one.cruiserCharges,1);
  const pack=buyCruiserCharges(save,5);
  assert.equal(pack.coins,150); assert.equal(pack.cruiserCharges,5);
  assert.equal(buyCruiserCharges({...save,coins:89},1),null);
  assert.equal(buyCruiserCharges(save,2),null);
  assert.equal(useCruiserCharge(one).cruiserCharges,0);
  assert.equal(useCruiserCharge({...save,cruiserCharges:0}),null);
});
test('coins stay on their route without magnet and only attract while active', () => {
  const anchor={x:-3.15,y:1.1,z:8}, runner={x:0,y:1.05,z:0};
  assert.deepEqual(stepCoinAttraction(anchor,anchor,runner,1/60,false),anchor);
  const returned=stepCoinAttraction({x:0,y:1.05,z:0},anchor,runner,1/60,false);
  assert.ok(returned.x<0 && returned.z>0);
  const pulled=stepCoinAttraction(anchor,anchor,runner,1/60,true);
  assert.ok(pulled.x>anchor.x && pulled.z<anchor.z);
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
