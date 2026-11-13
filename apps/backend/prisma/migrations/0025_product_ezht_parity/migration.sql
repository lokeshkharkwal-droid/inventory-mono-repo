-- EZHT business product parity: extend tenant product with pack/sales, tax
-- methods, prescription fields, custom fields, gallery; add a product drug
-- table; extend stock adjustments with the full EZHT adjustment fields.

-- ── Tenant product: EZHT add-product parity fields ──
ALTER TABLE "inventory_products"
  ADD COLUMN IF NOT EXISTS "gallery_image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "pack_size" TEXT,
  ADD COLUMN IF NOT EXISTS "sales_method" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_cost" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "pack_mrp" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "tax_method" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_method_purchase" TEXT,
  ADD COLUMN IF NOT EXISTS "composition" TEXT,
  ADD COLUMN IF NOT EXISTS "unit_type" TEXT,
  ADD COLUMN IF NOT EXISTS "formulation" TEXT,
  ADD COLUMN IF NOT EXISTS "route" TEXT,
  ADD COLUMN IF NOT EXISTS "frequency" TEXT,
  ADD COLUMN IF NOT EXISTS "number_of_days" TEXT,
  ADD COLUMN IF NOT EXISTS "prescription_quantity" TEXT,
  ADD COLUMN IF NOT EXISTS "refills" TEXT,
  ADD COLUMN IF NOT EXISTS "refill_times" TEXT,
  ADD COLUMN IF NOT EXISTS "prescription_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "cf1" TEXT,
  ADD COLUMN IF NOT EXISTS "cf2" TEXT,
  ADD COLUMN IF NOT EXISTS "cf3" TEXT,
  ADD COLUMN IF NOT EXISTS "cf4" TEXT,
  ADD COLUMN IF NOT EXISTS "cf5" TEXT,
  ADD COLUMN IF NOT EXISTS "cf6" TEXT,
  ADD COLUMN IF NOT EXISTS "cf7" TEXT,
  ADD COLUMN IF NOT EXISTS "cf8" TEXT,
  ADD COLUMN IF NOT EXISTS "cf9" TEXT,
  ADD COLUMN IF NOT EXISTS "cf10" TEXT,
  ADD COLUMN IF NOT EXISTS "cf11" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_details" TEXT;

-- ── Stock adjustments: full EZHT adjustment fields ──
ALTER TABLE "inventory_stock_adjustments"
  ADD COLUMN IF NOT EXISTS "adjusted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "variant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_size" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_quantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "batch_no" TEXT,
  ADD COLUMN IF NOT EXISTS "expiry_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pack_mrp" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "unit_mrp" DECIMAL(18,4);

-- ── Product drug-composition rows (EZHT "Drugs" modal) ──
CREATE TABLE IF NOT EXISTS "inventory_product_drugs" (
  "id"         TEXT NOT NULL,
  "tenant_id"  TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "unit_value" TEXT,
  "unit"       TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_product_drugs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_product_drugs_tenant_id_idx"
  ON "inventory_product_drugs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_product_drugs_product_id_idx"
  ON "inventory_product_drugs" ("product_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_drugs_product_id_fkey'
  ) THEN
    ALTER TABLE "inventory_product_drugs"
      ADD CONSTRAINT "inventory_product_drugs_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "inventory_products" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
