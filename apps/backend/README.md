# inventory-backend

NestJS/Prisma backend for the inventory / POS / pharmacy domain, migrated from
the legacy EzHealthTrack CodeIgniter inventory module.

See the migration blueprint: `../.claude/plans/complete-migration-of-sunny-kettle.md`
(and the canonical rules in `../Master/CLAUDE.md` + `SKILL.md`).

## Architecture (key decisions)

- **Shared database.** Uses the SAME PostgreSQL database as kalnostics-new. This
  service owns and migrates **only** the `inventory_*` tables; kalnostics-owned
  tables (tenants, branches, patients, orders, …) are referenced by id and read
  at runtime through the kalnostics-new **API** (`src/integration`). A CI guard
  (`pnpm check:migration-ownership`) enforces the table-ownership boundary.
- **Shared identity.** Authenticates with the kalnostics-new business JWT
  (`JWT_SECRET` must match). This service only *validates* tokens — login/refresh
  live in kalnostics-new.
- **Multi-tenancy = RLS.** Replicates the kalnostics RLS pattern
  (`app.current_tenant_id` + `AsyncLocalStorage`); policies live in
  `prisma/rls.sql`.
- **Warehouse = Branch.** Inventory "warehouses" are kalnostics branches
  (`BranchType.INVENTORY` / `BLOOD_BANK`), resolved via the integration client.

## Setup

```bash
pnpm install
cp .env.example .env          # set DATABASE_URL (shared DB), JWT_SECRET (match kalnostics), KALNOSTICS_API_BASE_URL
pnpm prisma:generate
# Apply migrations against the shared DB (coordinate with kalnostics-new — never db push):
#   psql "$DATABASE_URL" -f prisma/migrations/0001_init_inventory_categories/migration.sql
#   psql "$DATABASE_URL" -f prisma/rls.sql      # when RLS_ENABLED=true
pnpm start:dev
```

## Verify the Phase-0 slice

```bash
# Liveness (public):
curl http://localhost:3100/api/v1/health

# Identity + integration (needs a kalnostics-new business JWT):
curl http://localhost:3100/api/v1/health/whoami -H "Authorization: Bearer <token>"

# Categories CRUD (tenant-scoped):
curl http://localhost:3100/api/v1/categories -H "Authorization: Bearer <token>"
```

## Scripts

- `pnpm validate` — type-check + lint + format check (run before committing).
- `pnpm check:migration-ownership` — fail if a migration touches a non-`inventory_` table.
- `pnpm migrate:inventory` — legacy MySQL → shared Postgres data migration (idempotent).
- `pnpm reconcile:inventory` — post-migration legacy-vs-migrated row-count reconciliation.

See `DEPLOYMENT.md` for the full deploy + data-migration + cutover runbook.

## Status

Phases 0–7 implemented (plan roadmap §9), all type-check + lint + build green:

- **0 Foundations** — infra, auth (kalnostics JWT), RLS, integration layer, Categories slice.
- **1 Core stock flow** — master data, products (+ variants, per-branch stock, adjustments,
  batches, bulk import), purchases, sales, transfers (two-stage), requisitions.
- **2 Settings & parties** — suppliers, customers, currencies, customer groups,
  expense/income categories, billers, settings singleton + numbering.
- **3 Quotes, proformas, materials** (+ convert-to-sale, lab lines, damages/repairs).
- **4 POS** — registers, sessions (open/close + cash reconciliation), checkout, lookup.
- **5 Reports** — dashboard, sales/purchase, product-sales, inventory valuation,
  low-stock + expiry alerts, GST/tax, profit, payments.
- **6 Blood-bank** (donors/donations/inventory/requests) + **IPD** admissions.
- **7 Hardening** — settings-driven numbering, expanded migration ETL + reconciliation,
  deployment/cutover runbook.

Deferred (noted): sale/purchase returns, deliveries, gift cards, PDF/barcode/receipt
rendering, cashier PIN, payment-gateway balances, RBAC permission matrix, transactional
history ETL, blood-bank cross-matching, IPD billing.
