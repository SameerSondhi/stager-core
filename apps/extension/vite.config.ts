import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const extensionRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: resolve(extensionRoot, 'index.html'),
        sidepanel: resolve(extensionRoot, 'sidepanel.html'),
        background: resolve(extensionRoot, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.',
        },
      ],
    }),
  ],
});
