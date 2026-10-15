/**
 * Vite configuration.
 *
 * The dev server proxies `/api/*` to the backend (CEF dev server on port 8888), so the
 * browser only ever talks to one origin. This avoids CORS entirely: CEF's dev server answers
 * CORS preflight requests itself and does not allow PATCH or the Authorization header.
 */
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:8888';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
