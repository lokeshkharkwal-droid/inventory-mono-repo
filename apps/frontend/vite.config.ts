import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// Dev server on 5174 (the inventory-backend CORS allowlist default).
// Served under /inventory-app/ behind the shared nginx front door, so assets +
// routes are base-prefixed. Override with VITE_BASE_PATH=/ for standalone use.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/inventory-app/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5174 },
  preview: { port: 5174 },
});
