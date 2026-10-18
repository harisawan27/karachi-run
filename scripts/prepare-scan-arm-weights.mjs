import fs from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {EXTTextureWebP} from '@gltf-transform/extensions';
import sharp from 'sharp';

// Run after replacing/optimizing Imran's GLB. Derives a skin hint from the
// texture, then smooths complete arm weights across welded mesh topology.
const doc=await new NodeIO().registerExtensions([EXTTextureWebP]).read('public/models/imran.glb'),primitive=doc.getRoot().listMeshes()[0].listPrimitives()[0],p=primitive.getAttribute('POSITION').getArray(),ix=primitive.getIndices().getArray();
const uv=primitive.getAttribute('TEXCOORD_0').getArray(),texture=await sharp(primitive.getMaterial().getBaseColorTexture().getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true}),mask=new Uint8Array(p.length/3);
for(let i=0;i<mask.length;i++){const x=Math.max(0,Math.min(texture.info.width-1,Math.floor(uv[i*2]*texture.info.width))),y=Math.max(0,Math.min(texture.info.height-1,Math.floor(uv[i*2+1]*texture.info.height))),k=(y*texture.info.width+x)*texture.info.channels,[r,g,b]=texture.data.subarray(k,k+3);mask[i]=r>g*1.08&&g>b*1.025&&r-b>18?255:0;}
let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity;for(let i=0;i<p.length;i+=3){minY=Math.min(minY,p[i+1]);maxY=Math.max(maxY,p[i+1]);minX=Math.min(minX,p[i]);maxX=Math.max(maxX,p[i]);}const h=maxY-minY,w=maxX-minX,cx=(minX+maxX)/2;
const map=new Map(),ids=new Uint32Array(p.length/3),groups=[];
for(let i=0;i<ids.length;i++){const key=[p[i*3],p[i*3+1],p[i*3+2]].map(v=>Math.round(v*1e5)).join(',');let id=map.get(key);if(id===undefined){id=groups.length;map.set(key,id);groups.push({x:Math.abs(p[i*3]-cx),y:(p[i*3+1]-minY)/h,skin:false,neighbors:new Set(),value:0,seed:null});}ids[i]=id;if(mask[i])groups[id].skin=true;}
for(let i=0;i<ix.length;i+=3){const ids3=[ids[ix[i]],ids[ix[i+1]],ids[ix[i+2]]];for(let j=0;j<3;j++)for(let k=0;k<3;k++)if(j!==k)groups[ids3[j]].neighbors.add(ids3[k]);}
for(const g of groups){
 if(g.x<w*.25||g.y<.34||g.y>.83)g.seed=0;
 else if(g.skin&&g.y<.57)g.seed=1;
 else if(g.y>.58&&g.y<.74&&g.x>w*.34)g.seed=1;
 else if(g.y<.56&&g.x<w*.34)g.seed=0;
 g.value=g.seed??0;
}
for(let pass=0;pass<100;pass++){
 const values=groups.map(g=>g.seed??[...g.neighbors].reduce((s,id)=>s+groups[id].value,0)/Math.max(1,g.neighbors.size));
 groups.forEach((g,i)=>g.value=values[i]);
}
// Release noisy colour seeds and smooth the actual deformation weights over
// welded topology. Shared seam vertices get exactly the same weights.
for(let pass=0;pass<8;pass++){
 const values=groups.map(g=>g.seed===0?0:(g.value+[...g.neighbors].reduce((s,id)=>s+groups[id].value,0))/(1+g.neighbors.size));groups.forEach((g,i)=>g.value=values[i]);
}
const out=Uint8Array.from(ids,id=>Math.round(groups[id].value*255));fs.writeFileSync('public/models/imran-arm-weights.bin',out);console.log(out.length,'arm weights prepared');
