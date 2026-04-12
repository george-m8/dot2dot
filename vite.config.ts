import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'Dot2Dot',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'dot2dot.esm.js' : 'dot2dot.umd.js')
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    },
    sourcemap: true,
    emptyOutDir: true,
    minify: false
  }
});
