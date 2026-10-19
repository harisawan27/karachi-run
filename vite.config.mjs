import { defineConfig, loadEnv } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { RUNTIME_MODELS, RUNTIME_MEDIA } from './src/asset-manifest.mjs';
import { writeServiceWorker } from './scripts/build-pwa.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: { watch: {
      usePolling: process.env.KARACHI_POLL_WATCH === '1', interval: 1500,
      ignored: ['**/.tmp/**', '**/art/**', '**/.openai/**', '**/.sites-runtime/**', '**/tests/**', '**/public/*.zip', '**/public/*.mp4'],
    } },
    // Neon keeps managed URLs unprefixed in .env.local. Expose only the public
    // Auth and Data API endpoints to browser code; never expose DATABASE_URL.
    define: {
      'import.meta.env.VITE_NEON_AUTH_URL': JSON.stringify(env.VITE_NEON_AUTH_URL || env.NEON_AUTH_BASE_URL || ''),
      'import.meta.env.VITE_NEON_DATA_API_URL': JSON.stringify(env.VITE_NEON_DATA_API_URL || env.NEON_DATA_API_URL || ''),
    },
    build: { copyPublicDir: false },
    plugins: [{
      name: 'copy-game-assets',
      closeBundle() {
        for (const file of RUNTIME_MODELS) cpSync(`public/${file}`, `dist/${file}`);
        for(const file of RUNTIME_MEDIA){mkdirSync('dist/'+file.slice(0,file.lastIndexOf('/')),{recursive:true});cpSync('public/'+file,'dist/'+file);}
        for (const folder of ['characters', 'models', 'branding', 'licenses']) cpSync(`public/${folder}`, `dist/${folder}`, { recursive: true });
        for (const file of ['manifest.webmanifest','favicon.ico']) cpSync('public/'+file,'dist/'+file);
        writeServiceWorker('dist');
      },
    }],
  };
});
