import test from 'node:test';import assert from 'node:assert/strict';
import {createPlayerSaveStore} from '../src/cloud-save.mjs';import {parseSave} from '../src/core.mjs';
function database(read,reply){const calls=[];const query={select(...a){calls.push(['select',...a]);return this;},eq(...a){calls.push(['eq',...a]);return this;},limit(...a){calls.push(['limit',...a]);return Promise.resolve(read);}};return {calls,from(table){assert.equal(table,'player_saves');return query;},rpc(name,args){calls.push(['rpc',name,args]);return Promise.resolve(typeof reply==='function'?reply(name,args):reply);}};}
const stamp='2026-10-18T12:00:00.123456Z';
test('new account loads empty and creates its first save with an explicit null revision',async()=>{
 const s=parseSave(null),db=database({data:[],error:null},{data:{user_id:'p1',save_data:s,updated_at:stamp},error:null}),store=createPlayerSaveStore(db);assert.equal(await store.load('p1'),null);await store.write('p1',s);assert.deepEqual(db.calls.at(-1),['rpc','sync_player_save',{p_expected_updated_at:null,p_save:s}]);
});
test('every progression field is included and the database must confirm the matching player',async()=>{
 const s=parseSave(JSON.stringify({coins:100,wapsiTickets:3,cruiserCharges:2,best:900,totalScore:2000,runs:4,missionIndex:3,missionProgress:8,powerLevels:{magnet:2,chai:1}}));
 const db=database({data:[{save_data:s,updated_at:stamp}],error:null},{data:{user_id:'p1',save_data:s,updated_at:'2026-10-18T13:00:00Z'},error:null}),store=createPlayerSaveStore(db);await store.load('p1');await store.write('p1',s);
 assert.deepEqual(db.calls.at(-1)[2].p_save,s);assert.equal(db.calls.at(-1)[2].p_expected_updated_at,stamp);assert.equal(store.version('p1'),'2026-10-18T13:00:00Z');
 for(const data of [null,[],{user_id:'other',save_data:s,updated_at:stamp}])await assert.rejects(createPlayerSaveStore(database({data:[],error:null},{data,error:null})).write('p1',s),/did not confirm/);
});
test('stale devices receive an explicit conflict instead of overwriting another save',async()=>{
 const store=createPlayerSaveStore(database({data:[{save_data:{},updated_at:stamp}],error:null},{error:{code:'40001',message:'Another device updated this save'}}));await store.load('p1');await assert.rejects(store.write('p1',{}),e=>e.name==='CloudSaveConflict');assert.equal(store.version('p1'),stamp);
});
test('atomic reward replies update the revision used by the next cloud save',async()=>{
 const s=parseSave(null),db=database({data:[],error:null},()=>({data:{user_id:'p1',save_data:s,updated_at:stamp,reward:{coins:500},already_claimed:false},error:null})),store=createPlayerSaveStore(db);const r=await store.claim('p1','daily','daily:2026-10-18');assert.equal(r.reward.coins,500);await store.write('p1',s);assert.equal(db.calls.at(-1)[2].p_expected_updated_at,stamp);assert.deepEqual(db.calls[0],['rpc','claim_player_reward',{p_kind:'daily',p_key:'daily:2026-10-18'}]);
});
test('permission and authentication errors never appear as a successful save',async()=>{
 const store=createPlayerSaveStore(database({error:{code:'42501',message:'permission denied'}},{error:{code:'28000',message:'Sign in'}}));await assert.rejects(store.load('p1'),/permission denied.*42501/);await assert.rejects(store.claim('p1','mission','mission:0'),/Sign in.*28000/);
});

import {NeonPostgrestClient} from '@neondatabase/postgrest-js';
test('installed Neon SDK sends revision-aware saves through the expected RPC endpoint',async()=>{
 const s=parseSave(null),requests=[];
 const client=new NeonPostgrestClient({dataApiUrl:'https://phase3-test.invalid',options:{global:{fetch:async(url,options)=>{requests.push({url:String(url),method:options.method,body:options.body?JSON.parse(options.body):null});return new Response(JSON.stringify(String(url).includes('/rpc/')?{user_id:'p1',save_data:s,updated_at:stamp}:[]),{status:200,headers:{'Content-Type':'application/json'}});}}}});
 const store=createPlayerSaveStore(client);await store.load('p1');await store.write('p1',s);assert.ok(requests.at(-1).url.endsWith('/rpc/sync_player_save'));assert.equal(requests.at(-1).method,'POST');assert.deepEqual(requests.at(-1).body,{p_expected_updated_at:null,p_save:s});
});
