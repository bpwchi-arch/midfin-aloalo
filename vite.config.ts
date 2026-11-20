import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const loop = fileURLToPath(new URL('./public/film/loop-720.mp4', import.meta.url));

export default defineConfig({
  base: './',
  define: {
    // The hero plays public/film/loop-*.mp4 when they exist; otherwise the poster carries it.
    __HAS_LOOP__: JSON.stringify(existsSync(loop)),
  },
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/ogl')) return 'ogl';
        },
      },
    },
  },
});
