import fs from 'node:fs';
import sharp from 'sharp';

// Deterministic size/format exports of the approved artwork; never redraw it.
fs.mkdirSync('public/branding',{recursive:true});
const icon='art/branding/karachi-run-icon-v1.png',logo='art/branding/karachi-run-logo-v1.png';
for(const size of [32,48,180,192,512])await sharp(icon).resize(size,size).png({compressionLevel:9}).toFile(`public/branding/icon-${size}.png`);
await sharp(icon).resize(96,96).webp({quality:90}).toFile('public/branding/icon-ui.webp');
await sharp(logo).resize({width:768}).webp({quality:90,alphaQuality:100}).toFile('public/branding/wordmark.webp');
// A separate full-bleed export keeps the complete title inside the maskable
// icon's central safe circle; the platform supplies its own outer shape.
const mark=await sharp(logo).resize({width:336}).toBuffer();
await sharp({create:{width:512,height:512,channels:4,background:'#075448'}}).composite([{input:mark,gravity:'center'}]).png({compressionLevel:9}).toFile('public/branding/icon-maskable-512.png');
// Apple applies its own corner mask. Supply an opaque square behind the art.
await sharp(icon).resize(180,180).flatten({background:'#075448'}).png({compressionLevel:9}).toFile('public/branding/apple-touch-icon.png');
const pngs=await Promise.all([32,48].map(size=>sharp(icon).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+pngs.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(pngs.length,4);let offset=header.length;
pngs.forEach((png,i)=>{const k=6+i*16,size=[32,48][i];header[k]=header[k+1]=size;header.writeUInt16LE(1,k+4);header.writeUInt16LE(32,k+6);header.writeUInt32LE(png.length,k+8);header.writeUInt32LE(offset,k+12);offset+=png.length;});
fs.writeFileSync('public/favicon.ico',Buffer.concat([header,...pngs]));
console.log('Approved branding exported: favicon, touch/PWA icons and wordmark.');
