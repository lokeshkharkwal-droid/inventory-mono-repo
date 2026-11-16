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

/**
 * Keep the dotLottie player out of the eager bundle.
 *
 * `@lottiefiles/dotlottie-react` (+ its WASM runtime) is loaded lazily by the
 * shared <LottieLoader> via dynamic `import()`. Routing it into its own chunk
 * means Rollup fetches it only the first time a loader actually renders, so the
 * branded loader costs ~nothing on initial page load.
 */
function manualChunks(id: string): string | undefined {
  if (id.includes('@lottiefiles') || id.includes('dotlottie')) return 'lottie';
  return undefined;
}

// Dev server on 5174 (the inventory-backend CORS allowlist default).
// Served under /inventory-app/ behind the shared nginx front door, so assets +
// routes are base-prefixed. Override with VITE_BASE_PATH=/ for standalone use.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/inventory-app/',
  // Treat dotLottie animation files as static assets, so `import x from "*.lottie"`
  // resolves to a bundled, content-hashed URL (dotlottie-react fetches it at
  // runtime). Vite does not recognise the `.lottie` extension out of the box.
  assetsInclude: ['**/*.lottie'],
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // Never inline dotLottie animations as base64 `data:` URIs. Vite inlines any
    // asset under 4 KB by default, but @lottiefiles/dotlottie-react fetches `src`
    // as a URL and cannot load a `data:` URI — it would render blank. Force it to
    // be emitted as a real, fetchable asset file; keep Vite's default elsewhere.
    assetsInlineLimit: (filePath: string) =>
      filePath.endsWith('.lottie') ? false : undefined,
    rollupOptions: { output: { manualChunks } },
  },
  server: { port: 5174, proxy: kalnosticsProxy },
  preview: { port: 5174, proxy: kalnosticsProxy },
});
