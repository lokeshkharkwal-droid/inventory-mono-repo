-- Phase 1: EZHT field parity for SiteAdmin inventory reference masters.

-- Tax rate: full EZHT fields (type, HSN, CGST/SGST/IGST).
ALTER TABLE "inventory_master_tax_rates"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS "hsn_code" TEXT,
  ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(9,4),
  ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(9,4),
  ADD COLUMN IF NOT EXISTS "igst" DECIMAL(9,4);

-- Category: image.
ALTER TABLE "inventory_master_categories"
  ADD COLUMN IF NOT EXISTS "image_url" TEXT;

-- New platform-level reference masters.
CREATE TABLE IF NOT EXISTS "inventory_master_variants" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_variants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_variants_deleted_at_idx"
  ON "inventory_master_variants" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_expense_categories" (
  "id"          TEXT NOT NULL,
  "code"        TEXT,
  "name"        TEXT NOT NULL,
  "tax_rate_id" TEXT,
  "tax_method"  TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_by"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "deleted_at"  TIMESTAMP(3),
  CONSTRAINT "inventory_master_expense_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_expense_categories_deleted_at_idx"
  ON "inventory_master_expense_categories" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_income_categories" (
  "id"          TEXT NOT NULL,
  "code"        TEXT,
  "name"        TEXT NOT NULL,
  "tax_rate_id" TEXT,
  "tax_method"  TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_by"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "deleted_at"  TIMESTAMP(3),
  CONSTRAINT "inventory_master_income_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_income_categories_deleted_at_idx"
  ON "inventory_master_income_categories" ("deleted_at");
