-- Manual Inventory Adjustment ledger. Adds a per-scope, per-product "currently
-- deducted" state table + an immutable adjustment-history table, and extends the
-- per-order consumption row with scope + auto-deducted flag. Both auto-consumption
-- and manual adjustment converge on inventory_consumption_lines.current_qty so stock
-- is never double-deducted. Idempotent (IF NOT EXISTS), mirrors 0042 style.

-- AlterTable: inventory_order_consumptions
ALTER TABLE "inventory_order_consumptions"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'ORDER';
ALTER TABLE "inventory_order_consumptions"
  ADD COLUMN IF NOT EXISTS "is_auto_deducted" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: inventory_consumption_lines
CREATE TABLE IF NOT EXISTS "inventory_consumption_lines" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "kalnostics_order_id" TEXT NOT NULL,
  "lab_test_source_id" TEXT NOT NULL DEFAULT '',
  "product_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "product_code" TEXT,
  "planned_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "current_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "consumption_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_consumption_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_consumption_lines_scope_key"
  ON "inventory_consumption_lines" ("kalnostics_order_id", "scope", "lab_test_source_id", "product_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_lines_tenant_id_idx"
  ON "inventory_consumption_lines" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_lines_branch_id_idx"
  ON "inventory_consumption_lines" ("branch_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_lines_consumption_id_idx"
  ON "inventory_consumption_lines" ("consumption_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_lines_kalnostics_order_id_idx"
  ON "inventory_consumption_lines" ("kalnostics_order_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_lines_product_id_idx"
  ON "inventory_consumption_lines" ("product_id");

-- CreateTable: inventory_consumption_adjustments
CREATE TABLE IF NOT EXISTS "inventory_consumption_adjustments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "consumption_id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "kalnostics_order_id" TEXT NOT NULL,
  "lab_test_source_id" TEXT NOT NULL DEFAULT '',
  "product_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "planned_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "previous_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "final_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "difference" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "reason" TEXT,
  "note" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_consumption_adjustments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_consumption_adjustments_tenant_id_idx"
  ON "inventory_consumption_adjustments" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_adjustments_branch_id_idx"
  ON "inventory_consumption_adjustments" ("branch_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_adjustments_consumption_id_idx"
  ON "inventory_consumption_adjustments" ("consumption_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_adjustments_kalnostics_order_id_idx"
  ON "inventory_consumption_adjustments" ("kalnostics_order_id");
CREATE INDEX IF NOT EXISTS "inventory_consumption_adjustments_product_id_idx"
  ON "inventory_consumption_adjustments" ("product_id");
