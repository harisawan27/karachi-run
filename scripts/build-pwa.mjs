import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RUNTIME_MODELS} from '../src/asset-manifest.mjs';

export function writeServiceWorker(directory='dist'){
 const shell=['/','/licenses/sketchbook.txt','/manifest.webmanifest','/favicon.ico',...readdirSync(directory+'/assets').filter(file=>/\.(js|css)$/.test(file)).map(file=>'/assets/'+file),...readdirSync(directory+'/branding').map(file=>'/branding/'+file)];
 const game=[...RUNTIME_MODELS.map(file=>'/'+file),...readdirSync(directory+'/models').filter(file=>/\.(glb|bin)$/.test(file)).map(file=>'/models/'+file),...readdirSync(directory+'/characters').filter(file=>file.endsWith('.webp')).map(file=>'/characters/'+file)];
 const template=readFileSync('src/service-worker.js','utf8');
 const hash=createHash('sha256');hash.update(template);
 for(const path of [...shell,...game].sort()){hash.update(path);hash.update(readFileSync(directory+(path==='/'?'/index.html':path)));}
 const version=hash.digest('hex').slice(0,16),configuration={version,shell,game,gameBytes:game.reduce((sum,path)=>sum+readFileSync(directory+path).length,0)};
 writeFileSync(directory+'/sw.js',template.replace('__PWA_CONFIG__',JSON.stringify(configuration)));
 writeFileSync(directory+'/pwa-assets.json',JSON.stringify(configuration,null,2));
 console.log(`PWA build ${version}: ${shell.length} shell files, ${game.length} optional offline game files.`);
 return configuration;
}
