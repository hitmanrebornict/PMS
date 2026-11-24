import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Browser files only. The server bundle is built into dist/server next
      // to this folder, and Express serves dist/client alone — so it is never
      // downloadable from the site.
      outDir: 'dist/client',
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: ['yichengsolution.com', '.yichengsolution.com'],
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        },
      },
    },
  };
});
