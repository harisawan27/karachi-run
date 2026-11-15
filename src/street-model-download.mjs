// Time out a stalled network transfer, not a slow download or GPU/GLB decoding.
/** @param {string} url
 * @param {{idleMs?:number,onProgress?:(percent:number)=>void}} [options]
 */
export async function downloadStreetModel(url,{idleMs=22000,onProgress=()=>{}}={}){
 const controller=new AbortController();
 let timer;
 const resetDeadline=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),idleMs);};
 resetDeadline();
 try{
  const response=await fetch(url,{signal:controller.signal});
  if(!response.ok)throw new Error('Model download failed: '+response.status);
  const total=Number(response.headers.get('content-length'))||0;
  if(!response.body)return new Uint8Array(await response.arrayBuffer());
  let loaded=0;
  const stream=response.body.pipeThrough(new TransformStream({
   transform(chunk,out){
    resetDeadline();loaded+=chunk.byteLength;
    if(total>0)onProgress(Math.min(100,Math.floor(loaded/total*100)));
    out.enqueue(chunk);
   }
  }),{signal:controller.signal});
  return new Uint8Array(await new Response(stream).arrayBuffer());
 }finally{clearTimeout(timer);}
}
