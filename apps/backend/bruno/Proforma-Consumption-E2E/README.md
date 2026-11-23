# Proforma-Consumption E2E (Kaltros ↔ Inventory)

End-to-end coverage of the proforma-driven inventory integration: a kalnostics order's
lab test, when mapped to a proforma **and** the order's branch, deducts the proforma's
products from that **branch's** stock and records a linked **sale** — once (idempotent).

It exercises the **Quantity Method**:

- **Single** (`quantityMethod: 1`) → deduct `configuredQty × number of the order's mapped tests`.
- **Combined** (`quantityMethod: 2`) → deduct `configuredQty` once per order.

## Scenario (requirement #4)

Proforma: **Reagent** qty 1 *Single*, **Bandage** qty 1 *Combined*, mapped to **branch A**
+ **5 lab tests**. Order references all 5 tests →

| Product | Method   | Calculation | Expected deduction |
| ------- | -------- | ----------- | -----------------: |
| Reagent | Single   | 1 × 5       | **5** |
| Bandage | Combined | 1 × 1       | **1** |

## Prerequisites

1. Inventory backend + kalnostics-new running (defaults assume the nginx gateway on
   `:8080` → `inventoryBaseUrl`/`kalnosticsBaseUrl` in `environments/local.bru`).
2. Set env vars in `environments/local.bru` (or pass `--env-var`):
   - `token` — a **business JWT** for a user who has a profile at `branchA`.
     Either paste one, or run `_Auth/login.bru` with real credentials.
   - `branchA`, `branchB` — two real kalnostics branch ids in your tenant (pre-filled
     with the local demo branches; change for your environment).
   - `labTest1..5` — any 5 distinct ids (synthetic UUIDs are fine; they only need to
     match the mappings this collection creates).

## Run

```
cd inventory/apps/backend/bruno
npx @usebruno/cli run Proforma-Consumption-E2E --env local \
  --env-var token=<BUSINESS_JWT> \
  --env-var branchA=<BRANCH_A_ID> \
  --env-var branchB=<BRANCH_B_ID>
```

Requests run in `seq` order and chain ids through env vars. Each run uses a fresh
per-run suffix, so products, the proforma, and the order id are unique and the flow is
re-runnable without cleanup. The `_Auth/` folder holds optional login/switch helpers and
is not part of the numbered sequence.

## What is asserted

- `31 validate` → Reagent required **5**, Bandage **1**, `ok=true`.
- `40 consume` → `consumed=true`; `50/51` → branch-A stock **95 / 99**; `52` → sale items
  Reagent ×5 (subtotal 100), Bandage ×1 (subtotal 15), status COMPLETED.
- `41` retry → `alreadyConsumed=true`, same sale (idempotent, no double deduction).
- `60` branch B → `hasMapping=false` (branch isolation); `61` unmapped test → `hasMapping=false`.
- `74` insufficient stock → **409 INSUFFICIENT_INVENTORY_STOCK**, full rollback (no sale/ledger).
