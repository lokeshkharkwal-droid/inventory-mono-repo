-- Richer classification on global master products so imports carry sub-category,
-- brand and tax-rate (find-or-created per tenant). `unit` already existed.
ALTER TABLE "inventory_master_products"
  ADD COLUMN IF NOT EXISTS "sub_category" TEXT,
  ADD COLUMN IF NOT EXISTS "brand"        TEXT,
  ADD COLUMN IF NOT EXISTS "tax_name"     TEXT,
  ADD COLUMN IF NOT EXISTS "tax_rate"     DECIMAL(9,4);
