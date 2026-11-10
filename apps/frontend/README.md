# inventory-frontend

React (Vite) frontend for the inventory / POS / pharmacy module, migrated from
the legacy EzHealthTrack inventory UI. A visual + functional replica built on the
kaltros-fe conventions (Vite + React 18 + TypeScript + Tailwind + Radix +
TanStack Query).

See the migration blueprint: `../.claude/plans/complete-migration-of-sunny-kettle.md`.

## Architecture

- Calls the **inventory-backend** (`VITE_API_BASE`, `/api/v1`, `{success,data,meta}`
  envelope). The shared `src/lib/http.ts` attaches the JWT, unwraps the envelope,
  and refreshes on 401.
- **Identity is owned by kalnostics-new** — login + token refresh hit
  `VITE_KALNOSTICS_API_BASE`. The issued business JWT authenticates both apps.

## Setup

```bash
pnpm install
cp .env.example .env    # set VITE_API_BASE + VITE_KALNOSTICS_API_BASE
pnpm dev                # http://localhost:5174
```

## Verify the Phase-0 slice

1. `pnpm dev`, open http://localhost:5174 → redirected to `/login`.
2. Sign in with kalnostics-new credentials (needs kalnostics-new + inventory-backend running).
3. Go to **Categories** → create / edit / delete (hits inventory-backend `/categories`).

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm preview`
- `pnpm type-check` / `pnpm lint`

## Status

Phase 0 (foundations) + the Categories page (end-to-end CRUD against
inventory-backend). Phase 1 pages (Products, Purchases, Sales, Transfers,
Requisitions) follow — see the plan roadmap §9.
