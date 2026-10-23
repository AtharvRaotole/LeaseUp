import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { fontPreloadPlugin } from './vite-font-preload';
import { loadPagesHeaders } from './load-pages-headers.mjs';

const productionPageHeaders = loadPagesHeaders();
const workerProxyTarget = `http://127.0.0.1:${process.env.CSP_E2E_WORKER_PORT || '8787'}`;

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
        target: workerProxyTarget,
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
    headers: productionPageHeaders,
    proxy: {
      '/api': {
        target: workerProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
