import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { fontPreloadPlugin } from './vite-font-preload';

export default defineConfig({
  plugins: [
    react(),
    fontPreloadPlugin(),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false }),
    viteCompression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: false }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) return 'maplibre';
          if (id.includes('packages/fixtures') || id.includes('@leaseup/fixtures')) {
            return 'fixtures';
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/@tanstack')) return 'vendor-query';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
        },
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
