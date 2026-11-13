-- Master product: full SiteAdmin form parity (ids, pack/tax/prescription/custom
-- fields, variants/suppliers/combo as JSON) + drug composition rows. Idempotent.
ALTER TABLE "inventory_master_products"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS "barcode_symbology" TEXT,
  ADD COLUMN IF NOT EXISTS "category_id" TEXT,
  ADD COLUMN IF NOT EXISTS "sub_category_id" TEXT,
  ADD COLUMN IF NOT EXISTS "unit_id" TEXT,
  ADD COLUMN IF NOT EXISTS "brand_id" TEXT,
  ADD COLUMN IF NOT EXISTS "manufacturer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_rate_id" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_size" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "sales_method" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_cost" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "pack_mrp" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "tax_method" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_method_purchase" TEXT,
  ADD COLUMN IF NOT EXISTS "alert_quantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "is_track_quantity" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "gallery_image_urls" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "composition" TEXT,
  ADD COLUMN IF NOT EXISTS "unit_type" TEXT,
  ADD COLUMN IF NOT EXISTS "formulation" TEXT,
  ADD COLUMN IF NOT EXISTS "route" TEXT,
  ADD COLUMN IF NOT EXISTS "frequency" TEXT,
  ADD COLUMN IF NOT EXISTS "number_of_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "prescription_quantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "refills" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "refill_times" INTEGER,
  ADD COLUMN IF NOT EXISTS "prescription_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "cf1" TEXT, ADD COLUMN IF NOT EXISTS "cf2" TEXT, ADD COLUMN IF NOT EXISTS "cf3" TEXT,
  ADD COLUMN IF NOT EXISTS "cf4" TEXT, ADD COLUMN IF NOT EXISTS "cf5" TEXT, ADD COLUMN IF NOT EXISTS "cf6" TEXT,
  ADD COLUMN IF NOT EXISTS "cf7" TEXT, ADD COLUMN IF NOT EXISTS "cf8" TEXT, ADD COLUMN IF NOT EXISTS "cf9" TEXT,
  ADD COLUMN IF NOT EXISTS "cf10" TEXT, ADD COLUMN IF NOT EXISTS "cf11" TEXT,
  ADD COLUMN IF NOT EXISTS "has_variants" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "variants" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "suppliers" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "combo_items" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "digital_file_url" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_details" TEXT;

CREATE TABLE IF NOT EXISTS "inventory_master_product_drugs" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit_value" TEXT,
  "unit" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_master_product_drugs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_product_drugs_product_id_idx" ON "inventory_master_product_drugs" ("product_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_master_product_drugs_product_id_fkey') THEN
    ALTER TABLE "inventory_master_product_drugs"
      ADD CONSTRAINT "inventory_master_product_drugs_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "inventory_master_products" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
