import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/** Erzeugt sw.js mit der Liste aller gebauten Dateien, damit die App offline läuft. */
function serviceWorker(): Plugin {
  return {
    name: 'noten-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const dateien = [...Object.keys(bundle), ...readdirSync('public')];
      const hash = createHash('sha256');
      for (const datei of Object.values(bundle)) hash.update(datei.type === 'chunk' ? datei.code : datei.source);
      for (const datei of readdirSync('public')) hash.update(readFileSync(`public/${datei}`));
      const quelle = readFileSync('pwa/service-worker.js', 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__DATEIEN__', JSON.stringify(['./', ...dateien.map((d) => `./${d}`)]));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: quelle });
    },
  };
}

export default defineConfig({
  // Relative Pfade, damit die App auch unter einem Unterordner (GitHub Pages) läuft.
  base: './',
  plugins: [svelte(), serviceWorker()],
  server: { host: 'localhost', port: 5173 },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
