/**
 * PM2 process definitions for the inventory monorepo.
 *
 *   pm2 start ecosystem.config.cjs      # start both apps
 *   pm2 logs / pm2 status / pm2 restart all / pm2 delete all
 *
 * Backend reads its env from apps/backend/.env (NestJS ConfigModule, cwd-based).
 * Frontend is the production Vite build served by `vite preview` (SPA fallback
 * included — safe for BrowserRouter deep links). Auth is delegated to
 * kalnostics-new at http://localhost:3000 (start it separately for UI login).
 */
const ROOT = __dirname.replace(/\\/g, '/');

module.exports = {
  apps: [
    {
      name: 'inventory-backend',
      cwd: `${ROOT}/apps/backend`,
      script: `${ROOT}/apps/backend/dist/main.js`,
      interpreter: 'node',
      env: { NODE_ENV: 'production' },
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'inventory-frontend',
      cwd: `${ROOT}/apps/frontend`,
      script: `${ROOT}/apps/frontend/node_modules/vite/bin/vite.js`,
      args: 'preview --port 5174 --host 0.0.0.0 --strictPort',
      interpreter: 'node',
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
