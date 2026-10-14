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
