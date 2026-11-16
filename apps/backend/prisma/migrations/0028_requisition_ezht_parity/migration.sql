-- EZHT requisition parity: extend the requisition header + line-item tables with
-- the full legacy add-requisition field set (from/to departments, local purchase,
-- order discount/tax specs, shipping, resolved money totals, attachment, convert-
-- to-transfer link) and add a status-history table for the approval comment trail.
-- All header/item changes are additive + nullable or defaulted so existing rows
-- migrate cleanly and inherit each table's existing RLS policy. The new
-- inventory_requisition_status_history table gets its RLS in the 0029 migration.

-- ── Requisition header ──
ALTER TABLE "inventory_requisitions"
  ADD COLUMN IF NOT EXISTS "from_department_id" TEXT,
  ADD COLUMN IF NOT EXISTS "from_department_name" TEXT,
  ADD COLUMN IF NOT EXISTS "to_department_id" TEXT,
  ADD COLUMN IF NOT EXISTS "to_department_name" TEXT,
  ADD COLUMN IF NOT EXISTS "local_purchase" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "product_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_discount_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "order_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_tax_id" TEXT,
  ADD COLUMN IF NOT EXISTS "order_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shipping" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_items" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "attachment_url" TEXT,
  ADD COLUMN IF NOT EXISTS "converted_to_transfer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by" TEXT;

-- ── Requisition items ──
ALTER TABLE "inventory_requisition_items"
  ADD COLUMN IF NOT EXISTS "product_type" TEXT,
  ADD COLUMN IF NOT EXISTS "option_id" TEXT,
  ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "net_unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "real_unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discount_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_rate_id" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- ── from_branch_id index (now queried for the outgoing list) ──
CREATE INDEX IF NOT EXISTS "inventory_requisitions_from_branch_id_idx"
  ON "inventory_requisitions" ("from_branch_id");

-- ── Requisition status history ──
CREATE TABLE IF NOT EXISTS "inventory_requisition_status_history" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "requisition_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "comment" TEXT,
  "created_by" TEXT,
  "created_by_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_requisition_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_requisition_status_history_tenant_id_idx"
  ON "inventory_requisition_status_history" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_requisition_status_history_requisition_id_idx"
  ON "inventory_requisition_status_history" ("requisition_id");

ALTER TABLE "inventory_requisition_status_history"
  ADD CONSTRAINT "inventory_requisition_status_history_requisition_id_fkey"
  FOREIGN KEY ("requisition_id") REFERENCES "inventory_requisitions" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
