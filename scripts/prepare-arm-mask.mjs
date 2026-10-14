import {NodeIO} from '@gltf-transform/core';
import {EXTTextureWebP} from '@gltf-transform/extensions';
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const doc=await new NodeIO().registerExtensions([EXTTextureWebP]).read('public/models/imran.glb');
const primitive=doc.getRoot().listMeshes()[0].listPrimitives()[0];
const uv=primitive.getAttribute('TEXCOORD_0').getArray();
const {data,info}=await sharp(primitive.getMaterial().getBaseColorTexture().getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true});
const mask=new Uint8Array(uv.length/2);
for(let i=0;i<mask.length;i++){
  const x=Math.max(0,Math.min(info.width-1,Math.floor(uv[i*2]*info.width))),y=Math.max(0,Math.min(info.height-1,Math.floor(uv[i*2+1]*info.height)));
  const k=(y*info.width+x)*info.channels,[r,g,b]=data.subarray(k,k+3);
  // Warm exposed skin versus the neutral cream kameez. Geometry limits this to lower arms.
  mask[i]=r>g*1.08&&g>b*1.025&&r-b>18?255:0;
}
await writeFile('public/models/imran-arms.bin',mask);
console.log(`${mask.length} vertices; ${mask.filter(v=>v).length} skin vertices`);
