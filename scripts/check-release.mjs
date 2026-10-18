import {readFileSync,statSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {RUNTIME_MODELS} from '../src/asset-manifest.mjs';
assert.ok(statSync('dist/index.html').size>0);
for(const file of RUNTIME_MODELS){
 const source=readFileSync(`public/${file}`),built=readFileSync(`dist/${file}`);
 assert.equal(built.readUInt32LE(0),0x46546c67,`${file}: invalid GLB`);
 assert.ok(source.equals(built),`${file}: missing or altered production model`);
}
assert.ok(!readdirSync('dist').some(file=>/\.(zip|mp4)$/i.test(file)),'Source archives or reference video leaked into release');
console.log(`Release assets verified: ${RUNTIME_MODELS.length} runtime models; archives and reference footage excluded.`);

const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8')),pwa=JSON.parse(readFileSync('dist/pwa-assets.json','utf8'));
for(const icon of manifest.icons)assert.ok(statSync('dist'+icon.src).size>0,'Missing install icon: '+icon.src);
assert.ok(readFileSync('dist/favicon.ico').equals(readFileSync('public/favicon.ico')),'Favicon missing or altered');
for(const path of [...pwa.shell,...pwa.game]){assert.ok(!/\.(zip|mp4)$|\.env|player.saves|neon/i.test(path),'Private or source-only URL in offline pack');assert.ok(statSync('dist'+(path==='/'?'/index.html':path)).size>0,'Offline asset missing: '+path);}
const worker=readFileSync('dist/sw.js','utf8');assert.ok(!worker.includes('__PWA_CONFIG__')&&worker.includes(pwa.version),'Worker build configuration is missing');
console.log('PWA release verified: manifest, branded icons, worker and complete public asset list.');

assert.ok(readFileSync('dist/licenses/sketchbook.txt','utf8').includes('Copyright (c) 2020 swift502'),'Animation attribution must ship with the game');
