import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
import { RUNTIME_MODELS } from './src/asset-manifest.mjs';

export default defineConfig({
  build: { copyPublicDir: false },
  plugins: [{
    name: 'copy-game-assets',
    closeBundle() {
      for (const file of RUNTIME_MODELS) cpSync(`public/${file}`, `dist/${file}`);
      for (const folder of ['characters', 'models']) cpSync(`public/${folder}`, `dist/${folder}`, { recursive: true });
    },
  }],
});
