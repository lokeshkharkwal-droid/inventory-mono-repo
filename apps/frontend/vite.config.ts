import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// Same-origin proxy to kalnostics-new for login/refresh, so the browser never
// makes a cross-origin call (kalnostics-new's CORS allowlist doesn't include
// this host). Set VITE_KALNOSTICS_API_BASE=/kalnostics-api/api/v1 to use it.
const kalnosticsProxy = {
  '/kalnostics-api': {
    target: 'https://v2.kalnostic.com',
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/kalnostics-api/, ''),
  },
};

// Dev server on 5174 (the inventory-backend CORS allowlist default).
// Served under /inventory-app/ behind the shared nginx front door, so assets +
// routes are base-prefixed. Override with VITE_BASE_PATH=/ for standalone use.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/inventory-app/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5174, proxy: kalnosticsProxy },
  preview: { port: 5174, proxy: kalnosticsProxy },
});
