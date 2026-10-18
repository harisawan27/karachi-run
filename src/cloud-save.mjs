/** Revision-aware saves plus idempotent, account-owned Neon reward claims. */
export function createPlayerSaveStore(client) {
 const versions=new Map();
 const rpc=(name,args)=>{const q=client.rpc(name,args);return typeof q.abortSignal==='function'&&typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?q.abortSignal(AbortSignal.timeout(15000)):q;};
 const fail=(error,action)=>{const e=new Error(`Cloud ${action} failed: ${error.message} (${error.code||'network'})`);e.name=error.code==='40001'?'CloudSaveConflict':'Error';throw e;};
 const acknowledge=(data,userId)=>{const row=Array.isArray(data)?data[0]:data;if(!row||row.user_id!==userId||!row.updated_at||!row.save_data)throw new Error('The database did not confirm your cloud save. Check the player_saves permissions.');versions.set(userId,row.updated_at);return row;};
 return {
  version(userId){return versions.get(userId)??null;},
  async load(userId){
   const {data,error}=await client.from('player_saves').select('save_data,updated_at').eq('user_id',userId).limit(1);
   if(error)fail(error,'load');versions.set(userId,data?.[0]?.updated_at??null);return data?.[0]?.save_data??null;
  },
  async write(userId,save){
   if(!versions.has(userId))await this.load(userId);
   const {data,error}=await rpc('sync_player_save',{p_expected_updated_at:versions.get(userId),p_save:save});
   if(error)fail(error,'save');return acknowledge(data,userId);
  },
  async claim(userId,kind,key){
   const {data,error}=await rpc('claim_player_reward',{p_kind:kind,p_key:key});
   if(error)fail(error,'reward');return acknowledge(data,userId);
  },
 };
}
