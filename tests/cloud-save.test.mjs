import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerSaveStore } from '../src/cloud-save.mjs';
import { parseSave } from '../src/core.mjs';
function database(result) {
 const calls=[];
 const query={select(...args){calls.push(['select',...args]);return this;},eq(...args){calls.push(['eq',...args]);return this;},limit(...args){calls.push(['limit',...args]);return Promise.resolve(result);},upsert(...args){calls.push(['upsert',...args]);return this;},then(resolve,reject){return Promise.resolve(result).then(resolve,reject);}};
 return {calls,from(table){assert.equal(table,'player_saves');return query;}};
}
test('a new account without a save loads as empty so its first save can be created',async()=>{
 const db=database({data:[],error:null});assert.equal(await createPlayerSaveStore(db).load('player-1'),null);
 assert.deepEqual(db.calls,[['select','save_data'],['eq','user_id','player-1'],['limit',1]]);
});
test('cloud writes include all progression and require a matching database acknowledgment',async()=>{
 const save=parseSave(JSON.stringify({coins:100,wapsiTickets:3,cruiserCharges:2,best:900,totalScore:2000,runs:4,unlockedCharacters:['imran.glb'],selectedCharacter:'imran.glb',powerLevels:{magnet:2,chai:1},missionIndex:3,missionProgress:8}));
 const db=database({data:[{user_id:'player-1',updated_at:'2026-10-17'}],error:null});await createPlayerSaveStore(db).write('player-1',save);
 assert.equal(db.calls[0][1].user_id,'player-1');assert.deepEqual(db.calls[0][1].save_data,save);assert.deepEqual(db.calls[0][2],{onConflict:'user_id'});
 for(const data of [null,[],[{user_id:'someone-else'}]])await assert.rejects(createPlayerSaveStore(database({data,error:null})).write('player-1',save),/did not confirm/);
});
test('cloud permission and authentication failures are reported instead of appearing saved',async()=>{
 const db=database({data:null,error:{message:'permission denied for table player_saves',code:'42501'}});
 await assert.rejects(createPlayerSaveStore(db).load('player-1'),/permission denied.*42501/);
 await assert.rejects(createPlayerSaveStore(db).write('player-1',{}),/permission denied.*42501/);
});
test('cloud reads restore the complete account snapshot',async()=>{
 const save={coins:22,powerLevels:{chai:3},wapsiTickets:9,missionIndex:4};
 assert.deepEqual(await createPlayerSaveStore(database({data:[{save_data:save}],error:null})).load('player-1'),save);
});
