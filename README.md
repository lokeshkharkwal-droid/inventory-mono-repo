# Inventory suite (Turborepo)

Monorepo for the inventory / POS / pharmacy platform migrated from the legacy
EzHealthTrack inventory module. Managed with **Turborepo** + **pnpm workspaces**.

```
inventory/
├── apps/
│   ├── backend/    NestJS + Prisma API (package: inventory-backend)
│   └── frontend/   Vite + React SPA   (package: inventory-frontend)
├── turbo.json          task pipeline
├── pnpm-workspace.yaml workspace packages + approved build scripts
└── package.json        root scripts (proxy to turbo)
```

Both apps share the kalnostics-new PostgreSQL database and business JWT; the
backend integrates with kalnostics-new over its APIs. See
`apps/backend/DEPLOYMENT.md` for the deployment + data-migration runbook.

## Prerequisites

- Node.js LTS, **pnpm 11** (`packageManager` is pinned in `package.json`).
- A reachable PostgreSQL (the shared kalnostics DB) for the backend at runtime.

## Install

```bash
pnpm install        # installs both apps + turbo, runs approved build scripts
```

## Common commands (run from the repo root)

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run every app's dev server (`turbo run dev`) |
| `pnpm build` | Build all apps (cached) |
| `pnpm validate` | type-check + lint (+ format on backend) for all apps |
| `pnpm test` | Unit tests (backend Jest) |
| `pnpm test:e2e` | Backend e2e (hermetic, mocks Prisma) |
| `pnpm check:migration-ownership` | CI guard — migrations touch only `inventory_*` tables |

Target a single app with pnpm filters, e.g.:

```bash
pnpm --filter inventory-backend start:dev
pnpm --filter inventory-frontend dev
pnpm --filter inventory-backend prisma:generate
pnpm --filter inventory-backend migrate:inventory   # legacy MySQL → Postgres ETL
```

Turbo caches `build`/`validate`/`test` by input hash — unchanged packages are
served from cache (`>>> FULL TURBO`).

## Environment

Each app keeps its own `.env` (see each `.env.example`). The backend needs
`DATABASE_URL`, `JWT_SECRET` (identical to kalnostics-new), and
`KALNOSTICS_API_BASE_URL`; the frontend needs `VITE_API_BASE`
(+ optional `VITE_KALNOSTICS_API_BASE`).
