-- Purchase module EZHT parity (payments attachment + full purchase-return model).
-- Applied on the SHARED kalnostics DB via `prisma db execute` (never db push).

-- ── Purchase payments: optional uploaded proof/receipt ──
ALTER TABLE "inventory_purchase_payments"
  ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;

-- ── Purchase returns: full EZHT return-purchase header ──
ALTER TABLE "inventory_purchase_returns"
  ADD COLUMN IF NOT EXISTS "supplier_id" TEXT,
  ADD COLUMN IF NOT EXISTS "surcharge" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "product_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_discount_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "order_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_tax_id" TEXT,
  ADD COLUMN IF NOT EXISTS "total_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "roundoff" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "igst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_method" TEXT,
  ADD COLUMN IF NOT EXISTS "gst_number" TEXT,
  ADD COLUMN IF NOT EXISTS "gst_state" TEXT,
  ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;

-- ── Purchase-return items: carry the source line's tax/discount/batch ──
ALTER TABLE "inventory_purchase_return_items"
  ADD COLUMN IF NOT EXISTS "purchase_item_id" TEXT,
  ADD COLUMN IF NOT EXISTS "net_unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discount_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "batch_no" TEXT,
  ADD COLUMN IF NOT EXISTS "expiry_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pack_size" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "hsn_code" TEXT,
  ADD COLUMN IF NOT EXISTS "igst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(18,4) NOT NULL DEFAULT 0;
