// Regenerate only from the supplied, untouched source GLB.
import {NodeIO} from '@gltf-transform/core';
import {EXTTextureWebP} from '@gltf-transform/extensions';
import {weld,simplify,textureCompress,prune,dedup} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {stat} from 'node:fs/promises';
await MeshoptSimplifier.ready;
const source='public/pakistani_truck_models.glb',target='public/pakistani-truck.glb';
const io=new NodeIO().registerExtensions([EXTTextureWebP]),doc=await io.read(source);
// Refuse to collapse UV channels if a replacement source uses different layouts.
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){const uv=p.getAttribute('TEXCOORD_0').getArray();for(const name of ['TEXCOORD_1','TEXCOORD_2','TEXCOORD_3']){const other=p.getAttribute(name)?.getArray();if(other&&(other.length!==uv.length||!other.every((v,i)=>v===uv[i])))throw Error('Source uses distinct texture coordinates: '+name);}}
// The source exports four identical UV channels; use one for all textures.
for(const material of doc.getRoot().listMaterials())for(const slot of ['BaseColor','Normal','MetallicRoughness'])material['get'+slot+'TextureInfo']()?.setTexCoord(0);
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())for(const name of ['TEXCOORD_1','TEXCOORD_2','TEXCOORD_3'])p.setAttribute(name,null);
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.045,error:.003}),prune(),dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:88}));
await io.write(target,doc);
const triangles=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+(p.getIndices()?.getCount()??0)/3,0);
console.log(JSON.stringify({sourceBytes:(await stat(source)).size,runtimeBytes:(await stat(target)).size,triangles}));
