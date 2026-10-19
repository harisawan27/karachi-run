import test from 'node:test';import assert from 'node:assert/strict';
import {parseSave,mergePlayerSaves,persistSave,loadSave} from '../src/core.mjs';
import {WORD,pakistanDay,resetIn,missionSet,baseMultiplier,advanceProgression,missionReady,collectLetter,nextLetter,dailyReady,claimLocalReward,withCurrentDay,dailyLetterLane,potReward,progressionHasNotice,markMissionsSeen} from '../src/progression.mjs';
const now=Date.parse('2026-10-18T12:00:00Z');const fresh=()=>withCurrentDay(parseSave(null),now);
test('legacy challenges, wallet and unlocks migrate into mission sets without a reset',()=>{
 const s=parseSave(JSON.stringify({version:7,coins:450,best:1200,missionIndex:8,missionProgress:3,unlockedCharacters:['imran.glb'],wapsiTickets:4,powerLevels:{chai:3}}));
 assert.equal(s.version,8);assert.equal(s.progression.set,2);assert.equal(baseMultiplier(s),3);assert.equal(s.coins,450);assert.equal(s.wapsiTickets,4);assert.equal(s.powerLevels.chai,3);assert.ok(s.unlockedCharacters.includes('imran.glb'));assert.ok(s.progression.counts[0]===missionSet(2)[0].target);assert.ok(s.progression.counts[1]===missionSet(2)[1].target);assert.equal(s.progression.counts[2],3);
});
test('three missions progress independently across saved runs and pay only when claimed',()=>{
 let s=fresh();s=advanceProgression(s,'coins',40);s=advanceProgression(s,'jump',4);s=advanceProgression(s,'distance',700);assert.equal(missionReady(s),false);assert.equal(s.coins,0);
 s=parseSave(JSON.stringify(s));s=advanceProgression(s,'coins',40);assert.equal(missionReady(s),true);
 const result=claimLocalReward(s,'mission',now);assert.equal(result.save.coins,120);assert.equal(baseMultiplier(result.save),2);assert.deepEqual(result.save.progression.counts,[0,0,0]);assert.equal(claimLocalReward(result.save,'mission',now),null);
});
test('multiplier caps at thirty while later mission sets remain playable',()=>{
 let s=fresh();s.progression.set=29;s.progression.counts=missionSet(29).map(m=>m.target);assert.equal(baseMultiplier(s),30);const n=claimLocalReward(s,'mission',now).save;assert.equal(baseMultiplier(n),30);assert.equal(n.progression.set,30);assert.ok(n.coins>0);
});
test('daily KARACHI has seven positions including both As and survives crashes/reloads',()=>{
 let s=fresh();for(let i=0;i<7;i++){assert.equal(nextLetter(s,now),i);s=collectLetter(s,i,now);s=parseSave(JSON.stringify(s));}
 assert.equal(WORD,'KARACHI');assert.equal(s.progression.daily.mask,127);assert.equal(nextLetter(s,now),-1);assert.equal(dailyReady(s,now),true);
 const reward=claimLocalReward(s,'daily',now);assert.ok(reward.save.coins>=350);assert.equal(reward.save.progression.daily.claimed,true);assert.equal(claimLocalReward(reward.save,'daily',now),null);
});
test('Pakistan midnight resets only daily letters, preserving wallet, multiplier and ownership',()=>{
 const before=Date.parse('2026-10-18T18:59:59Z'),after=Date.parse('2026-10-18T19:00:00Z');assert.equal(pakistanDay(before),'2026-10-18');assert.equal(pakistanDay(after),'2026-10-19');assert.equal(resetIn(before),1000);
 let s=withCurrentDay(fresh(),before);s.coins=812;s.progression.set=4;s=collectLetter(s,0,before);const reset=withCurrentDay(s,after);assert.equal(reset.progression.daily.mask,0);assert.equal(reset.progression.daily.day,'2026-10-19');assert.equal(reset.coins,812);assert.equal(baseMultiplier(reset),5);assert.equal(dailyReady(s,after),false);
});
test('guest-to-account merge unions daily letters and never reopens an already collected pot',()=>{
 let a=fresh(),b=fresh();a=collectLetter(a,1,now);b=collectLetter(b,3,now);a.progression.daily.claimed=true;
 const merged=mergePlayerSaves(a,b);assert.equal(merged.progression.daily.mask,10);assert.equal(merged.progression.daily.claimed,true);
 b.progression.set=3;b.progression.counts=[1,2,3];assert.equal(mergePlayerSaves(a,b).progression.set,3);
});
test('a newer mission set cannot inherit unrelated counters from an older device',()=>{
 const a=fresh(),b=fresh();a.progression.set=4;a.progression.counts=[4,5,1];b.progression.set=3;b.progression.counts=missionSet(3).map(m=>m.target);assert.deepEqual(mergePlayerSaves(a,b).progression.counts,[4,5,1]);
});
test('daily letters choose reachable street lanes and refuse all-lane traffic',()=>{
 const obstacles=[{x:0,z:50,width:4.15,depth:8,vehicleSpeed:8}];const lane=dailyLetterLane(1,36,20,obstacles);assert.notEqual(lane,1);
 assert.equal(dailyLetterLane(1,36,20,[-3.15,0,3.15].map(x=>({x,z:36,width:3,depth:10,vehicleSpeed:0}))),null);
});
test('progression persists the complete snapshot and malformed counters are bounded',()=>{
 let s=fresh();s=collectLetter(s,3,now);s=advanceProgression(s,'coins',13);const db=new Map(),storage={getItem:k=>db.get(k),setItem:(k,v)=>db.set(k,v)};persistSave(storage,s);assert.deepEqual(loadSave(storage),s);
 const bad=parseSave(JSON.stringify({progression:{set:-9,counts:[-1,'999',Infinity],daily:{day:'<script>',mask:-1}}}));assert.equal(bad.progression.set,0);assert.deepEqual(bad.progression.counts,[0,0,0]);assert.equal(bad.progression.daily.mask,0);assert.ok(potReward('2026-10-18','guest').coins>0);
});

test('an earned daily prize survives midnight, reload and delayed collection without resetting the new hunt',()=>{
 const after=Date.parse('2026-10-19T12:00:00Z');let s=fresh();for(let i=0;i<7;i++)s=collectLetter(s,i,now);s=withCurrentDay(s,after);assert.deepEqual(s.progression.pendingDaily,['2026-10-18']);s=parseSave(JSON.stringify(s));s=collectLetter(s,2,after);assert.equal(dailyReady(s,after),true);const result=claimLocalReward(s,'daily',after);assert.equal(result.key,'daily:2026-10-18');assert.equal(result.save.progression.daily.day,'2026-10-19');assert.equal(result.save.progression.daily.mask,4);assert.equal(result.save.progression.daily.claimed,false);assert.deepEqual(result.save.progression.pendingDaily,[]);assert.equal(claimLocalReward(parseSave(JSON.stringify(result.save)),'daily',after),null);
});
test('merging an old device cannot resurrect a collected archived prize',()=>{
 const later=Date.parse('2026-10-19T12:00:00Z');let s=fresh();for(let i=0;i<7;i++)s=collectLetter(s,i,now);s=withCurrentDay(s,later);const stale=structuredClone(s),paid=claimLocalReward(s,'daily',later).save,merged=mergePlayerSaves(stale,paid);assert.deepEqual(merged.progression.pendingDaily,[]);assert.ok(merged.progression.claimedDaily.includes('2026-10-18'));assert.equal(dailyReady(merged,later),false);
});
test('mission dots track real unseen completions and stay on for an unclaimed set',()=>{
 let s=fresh();assert.equal(progressionHasNotice(s),false);s=advanceProgression(s,'jump',4);assert.equal(progressionHasNotice(s),true);s=markMissionsSeen(s);assert.equal(progressionHasNotice(s),false);s=advanceProgression(s,'coins',80);s=advanceProgression(s,'distance',700);s=markMissionsSeen(s);assert.equal(progressionHasNotice(s),true);const paid=claimLocalReward(s,'mission',now).save;assert.equal(progressionHasNotice(paid),false);
});
