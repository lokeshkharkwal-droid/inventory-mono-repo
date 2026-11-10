# Deployment & Cutover Runbook — Inventory

Deploys the two new repos (`inventory-backend`, `inventory-frontend`) on a
separate machine, sharing the existing **kalnostics-new PostgreSQL** database and
the **kalnostics-new business JWT**, and migrates the legacy EzHealthTrack
inventory data. See `../.claude/plans/complete-migration-of-sunny-kettle.md` for
the full blueprint.

## 1. Architecture at deploy time

```
inventory-frontend (Vite static)  ──HTTP──▶  inventory-backend (Nest, :3100)
        │  login/refresh                              │ Prisma (inventory_* only)
        ▼                                             ▼
   kalnostics-new API (:3000) ◀── integration ── shared PostgreSQL (kalnostics DB)
```

- **inventory-backend** owns ONLY `inventory_*` tables in the shared DB.
- It validates the kalnostics JWT locally (shared `JWT_SECRET`) and calls
  kalnostics-new APIs for branches/patients/etc. via the `integration` module.

## 2. Backend deploy

```bash
pnpm install
cp .env.example .env     # fill in (see below)
pnpm prisma:generate
pnpm build
# migrations (coordinate with kalnostics — never db push on the shared DB):
# applies every numbered migration in order (0001 … 0010):
for f in prisma/migrations/0*/; do
  psql "$DATABASE_URL" -f "$f/migration.sql"
done
psql "$DATABASE_URL" -f prisma/rls.sql    # when RLS_ENABLED=true
node dist/main
```

Required env (`.env`): `DATABASE_URL` (shared Postgres), `JWT_SECRET` (identical
to kalnostics-new), `KALNOSTICS_API_BASE_URL`, `CORS_ORIGIN` (frontend origin),
`PORT=3100`. Optional: `RLS_ENABLED=true` (needs a non-owner DB role + rls.sql).

### Migration ownership guard
`pnpm check:migration-ownership` fails CI if any migration touches a
non-`inventory_` table — run it in the deploy pipeline before applying SQL.

## 3. Frontend deploy

```bash
pnpm install
cp .env.example .env     # VITE_API_BASE=https://<inventory-api>/api/v1
                         # VITE_KALNOSTICS_API_BASE=https://<kalnostics-api>/api/v1
pnpm build               # → dist/  (serve via nginx/CDN)
```

CORS: inventory-backend must allow the frontend origin; kalnostics-new must allow
the inventory-backend origin (service-to-service) and the frontend origin
(login/refresh).

## 4. Data migration (legacy MySQL → shared Postgres)

Per legacy per-tenant DB (`ezhealthtrackv2_business3`, `_soum`, …), run once
against its matching kalnostics tenant:

```bash
# in inventory-backend, with RLS_ENABLED=false for the run:
export TARGET_TENANT_ID=<kalnostics tenant uuid>
export TARGET_BRANCH_ID=<kalnostics branch uuid>     # loads opening stock + transaction history
export TARGET_TO_BRANCH_ID=<kalnostics branch uuid>  # optional: destination branch for transfers
export LEGACY_MYSQL_HOST=... LEGACY_MYSQL_USER=... LEGACY_MYSQL_PASSWORD=...
export LEGACY_MYSQL_DATABASE=ezhealthtrackv2_business3 LEGACY_MYSQL_TABLE_PREFIX=ez_

# 1. DRY-RUN (read-only): preview the legacy source row counts that WOULD migrate.
#    Touches only the legacy MySQL DB — never Postgres. Safe to run anytime.
pnpm preview:inventory

# 2. MIGRATE: idempotent (safe to re-run); prints a created/skipped summary.
pnpm migrate:inventory

# 3. RECONCILE: legacy vs migrated row counts + a stock-quantity checksum;
#    exits non-zero on any gap.
pnpm reconcile:inventory
```

The recommended sequence is **preview → migrate → reconcile**: the dry-run gives
the pre-flight picture (what will move, per source table), and reconcile is the
post-flight check (counts match, and the summed stock quantity matches to 4 dp).

The ETL covers master data, parties, products, opening stock, AND transactional
history — purchases, sales (both with line items + payments), requisitions, and
transfers (transfers need `TARGET_TO_BRANCH_ID`). Historical documents are
inserted as **records only** (no stock movement) because the current stock
balance is already captured by the opening-stock snapshot from
`warehouses_products` — this avoids double-counting. `reconcile:inventory`
checks row counts for all of the above.

> ⚠️ Legacy column names in the ETL are best-effort for the Stock-Manager-Advance
> schema; verify against the actual `ez_*` tables and adjust the `SELECT`s before
> a production run. The `legacy*` id columns make every run idempotent.

## 5. Cutover checklist

1. Apply all migrations + `rls.sql` to the shared DB; run the ownership guard.
2. Deploy inventory-backend; confirm `GET /api/v1/health` and (with a JWT)
   `GET /api/v1/health/whoami` (proves JWT + tenant context + kalnostics reach).
3. Deploy inventory-frontend; log in with a kalnostics account.
4. Run `preview:inventory` → `migrate:inventory` → `reconcile:inventory` per
   tenant; resolve any count/stock-checksum gaps before proceeding.
5. Smoke-test the real flows per module (create→view→pay→report, POS sale,
   a GST/report) in the app.
6. Point users at the new app; retire the legacy PHP `/inventory`.

## 6. Verify (per the project "run the real flow" rule)

- `pnpm validate` + `pnpm build` green (both repos).
- `/health` + `/health/whoami` OK.
- A full manual pass: master data → product → purchase (stock in) → sale
  (stock out) → transfer send/receive → POS checkout → reports reflect it.
