-- Global master-product catalogue (SiteAdmin-maintained, platform-level).
-- NOTE: inventory_master_products has NO tenant_id and gets NO RLS policy — it
-- sits above tenants. Tenants import copies into inventory_products, linked back
-- via source_master_product_id.

CREATE TABLE IF NOT EXISTS "inventory_master_products" (
  "id"            TEXT NOT NULL,
  "code"          TEXT,
  "name"          TEXT NOT NULL,
  "category"      TEXT,
  "unit"          TEXT,
  "price"         DECIMAL(18,4) NOT NULL DEFAULT 0,
  "cost"          DECIMAL(18,4) NOT NULL DEFAULT 0,
  "hsn_code"      TEXT,
  "description"   TEXT,
  "generic_name"  TEXT,
  "strength"      TEXT,
  "is_importable" BOOLEAN NOT NULL DEFAULT true,
  "is_active"     BOOLEAN NOT NULL DEFAULT true,
  "created_by"    TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "deleted_at"    TIMESTAMP(3),
  CONSTRAINT "inventory_master_products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_master_products_deleted_at_idx"
  ON "inventory_master_products" ("deleted_at");

-- Back-link on tenant products to the master they were imported from.
ALTER TABLE "inventory_products"
  ADD COLUMN IF NOT EXISTS "source_master_product_id" TEXT;

CREATE INDEX IF NOT EXISTS "inventory_products_source_master_product_id_idx"
  ON "inventory_products" ("source_master_product_id");
