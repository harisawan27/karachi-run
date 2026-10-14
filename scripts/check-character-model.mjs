import {readFile} from 'node:fs/promises';

// Inspect glTF metadata without rendering, uploading files, or invoking any remote service.
export function inspectCharacter(bytes){
  if(bytes.length<20||bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw new Error('Expected a GLB version 2 file');
  if(bytes.readUInt32LE(8)!==bytes.length)throw new Error('GLB byte length does not match its header');
  const jsonLength=bytes.readUInt32LE(12);
  if(bytes.readUInt32LE(16)!==0x4e4f534a||20+jsonLength>bytes.length)throw new Error('Invalid GLB JSON chunk');
  const doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
  const meshes=doc.meshes??[],skins=doc.skins??[],animations=doc.animations??[];
  const nodes=doc.nodes??[],skinnedNodes=nodes.filter(n=>n.mesh!==undefined&&n.skin!==undefined);
  const joints=new Set(skins.flatMap(s=>s.joints??[]));
  const skeletalClips=animations.filter(a=>(a.channels??[]).some(c=>joints.has(c.target?.node)&&['translation','rotation','scale'].includes(c.target?.path)));
  const names=skeletalClips.map(a=>a.name??'unnamed');
  const errors=[];
  if(!meshes.length)errors.push('No mesh geometry');
  if(!skinnedNodes.length)errors.push('No skinned character mesh; static models are not animation-ready');
  if(joints.size<15)errors.push('Fewer than 15 joints; supply an articulated humanoid skeleton');
  for(const node of skinnedNodes){for(const p of meshes[node.mesh]?.primitives??[])if(p.attributes?.JOINTS_0===undefined||p.attributes?.WEIGHTS_0===undefined)errors.push('A skinned primitive is missing joint indices or weights');}
  for(const expected of ['idle','run','jump','roll','stumble'])if(!names.some(n=>n.toLowerCase()===expected))errors.push(`Missing skeletal animation named ${expected}`);
  const external=[...(doc.buffers??[]),...(doc.images??[])].filter(x=>x.uri&&!x.uri.startsWith('data:'));
  if(external.length)errors.push('External textures or buffers: export a self-contained GLB');
  return {megabytes:Number((bytes.length/1048576).toFixed(2)),meshes:meshes.length,joints:joints.size,animations:names,errors,readyForVisualReview:errors.length===0};
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/check-character-model.mjs')){
  const path=process.argv[2];
  if(!path){console.error('Usage: node scripts/check-character-model.mjs path/to/character.glb');process.exitCode=2;}
  else try{const report=inspectCharacter(await readFile(path));console.log(JSON.stringify(report,null,2));if(!report.readyForVisualReview)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
}
