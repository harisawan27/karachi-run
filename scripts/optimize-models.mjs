import { NodeIO } from '@gltf-transform/core';
import { EXTTextureWebP } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { rename, stat } from 'node:fs/promises';

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions([EXTTextureWebP]);
for (const name of ['imran', 'asim']) {
  const path = `public/models/${name}.glb`;
  const before = (await stat(path)).size;
  const doc = await io.read(path);
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: .3, error: .002 }), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 90 }));
  await io.write(`${path}.tmp.glb`, doc);
  await rename(`${path}.tmp.glb`, path);
  console.log(`${name}: ${(before/1048576).toFixed(1)} MB -> ${((await stat(path)).size/1048576).toFixed(1)} MB`);
}

