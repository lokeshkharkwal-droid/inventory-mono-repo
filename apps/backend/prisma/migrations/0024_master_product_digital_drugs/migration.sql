-- EZHT parity gap-closure: digital-product file + product drug-composition list
-- (both platform-level, no RLS — consistent with the rest of inventory_master_*).

-- ── Digital product file URL (type=digital) ──
ALTER TABLE "inventory_master_products"
  ADD COLUMN IF NOT EXISTS "digital_file_url" TEXT;

-- ── Product drug-composition rows (EZHT "Drugs" modal) ──
CREATE TABLE IF NOT EXISTS "inventory_master_product_drugs" (
  "id"         TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "unit_value" TEXT,
  "unit"       TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_master_product_drugs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_master_product_drugs_product_id_idx"
  ON "inventory_master_product_drugs" ("product_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_master_product_drugs_product_id_fkey'
  ) THEN
    ALTER TABLE "inventory_master_product_drugs"
      ADD CONSTRAINT "inventory_master_product_drugs_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "inventory_master_products" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
