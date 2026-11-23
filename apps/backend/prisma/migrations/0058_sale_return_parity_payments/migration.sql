-- Sales module EZHT parity: Add-Sale referral/order-tags + full Sale-Return
-- header (surcharge/grand_total/customer/sale_reference/paid/payment_status) and
-- a sale-return payment ledger. Applied on the SHARED kalnostics DB via
-- `prisma db execute` (never db push). Idempotent.

-- ── Add Sale: referral link + order tags ──
ALTER TABLE "inventory_sales"
  ADD COLUMN IF NOT EXISTS "order_tags" TEXT,
  ADD COLUMN IF NOT EXISTS "referral_id" TEXT,
  ADD COLUMN IF NOT EXISTS "referral_name" TEXT;

-- ── Sale returns: full EZHT return-sale header ──
ALTER TABLE "inventory_sale_returns"
  ADD COLUMN IF NOT EXISTS "sale_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "customer" TEXT,
  ADD COLUMN IF NOT EXISTS "surcharge" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "product_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paid" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payment_status" TEXT NOT NULL DEFAULT 'PENDING';

-- Backfill grand_total for existing rows (no surcharge/tax/discount recorded before).
UPDATE "inventory_sale_returns" SET "grand_total" = "total" WHERE "grand_total" = 0;

-- ── Sale-return items: serial/batch snapshot ──
ALTER TABLE "inventory_sale_return_items"
  ADD COLUMN IF NOT EXISTS "serial_no" TEXT;

-- ── Sale-return payments ledger (mirrors inventory_sale_payments) ──
CREATE TABLE IF NOT EXISTS "inventory_sale_return_payments" (
  "id"          TEXT NOT NULL,
  "tenant_id"   TEXT NOT NULL,
  "return_id"   TEXT NOT NULL,
  "amount"      DECIMAL(18,4) NOT NULL,
  "method"      TEXT NOT NULL DEFAULT 'CASH',
  "reference"   TEXT,
  "date"        TIMESTAMP(3) NOT NULL,
  "note"        TEXT,
  "created_by"  TEXT,
  "cheque_no"   TEXT,
  "cc_no"       TEXT,
  "cc_holder"   TEXT,
  "cc_type"     TEXT,
  "cc_month"    TEXT,
  "cc_year"     TEXT,
  "gift_card_no" TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at"  TIMESTAMP(3),
  CONSTRAINT "inventory_sale_return_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_sale_return_payments_tenant_id_idx"
  ON "inventory_sale_return_payments" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_sale_return_payments_return_id_idx"
  ON "inventory_sale_return_payments" ("return_id");

DO $$ BEGIN
  ALTER TABLE "inventory_sale_return_payments"
    ADD CONSTRAINT "inventory_sale_return_payments_return_id_fkey"
    FOREIGN KEY ("return_id") REFERENCES "inventory_sale_returns" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Row-Level Security (tenant isolation) for the new table ──
ALTER TABLE "inventory_sale_return_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_sale_return_payments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_sale_return_payments_tenant_isolation" ON "inventory_sale_return_payments";
CREATE POLICY "inventory_sale_return_payments_tenant_isolation"
  ON "inventory_sale_return_payments"
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
