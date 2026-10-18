// Cached display identity and last acknowledged revision only: never a token.
// This keeps an offline account run under its owner instead of a guest wallet.
export function readAccountOwner(storage,key){
 try{const value=JSON.parse(storage?.getItem(key)??'null'),user=value?.user;if(!user||typeof user.id!=='string'||!user.id||user.id.length>200)return null;return {user:{id:user.id,name:typeof user.name==='string'?user.name.slice(0,120):'Karachi Runner',email:typeof user.email==='string'?user.email.slice(0,254):''},version:typeof value.version==='string'&&Number.isFinite(Date.parse(value.version))?value.version:null};}catch{return null;}
}
export function rememberAccountOwner(storage,key,user,version){
 try{if(!user){storage?.removeItem(key);return;}const previous=readAccountOwner(storage,key);storage?.setItem(key,JSON.stringify({user:{id:user.id,name:user.name,email:user.email??''},version:version??(previous?.user.id===user.id?previous.version:null)}));}catch{}
}
