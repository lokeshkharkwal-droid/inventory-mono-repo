-- Platform-level canonical reference data for the global catalogue (SiteAdmin-
-- managed). No tenant_id, no RLS. Imports find-or-create the tenant equivalent
-- by name; the master-product form picks canonical names from these lists.

CREATE TABLE IF NOT EXISTS "inventory_master_categories" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "code"        TEXT,
  "description" TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_by"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "deleted_at"  TIMESTAMP(3),
  CONSTRAINT "inventory_master_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_categories_deleted_at_idx" ON "inventory_master_categories" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_sub_categories" (
  "id"          TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "code"        TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_by"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "deleted_at"  TIMESTAMP(3),
  CONSTRAINT "inventory_master_sub_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_sub_categories_category_id_idx" ON "inventory_master_sub_categories" ("category_id");
CREATE INDEX IF NOT EXISTS "inventory_master_sub_categories_deleted_at_idx" ON "inventory_master_sub_categories" ("deleted_at");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_master_sub_categories_category_id_fkey') THEN
    ALTER TABLE "inventory_master_sub_categories"
      ADD CONSTRAINT "inventory_master_sub_categories_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "inventory_master_categories" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_master_units" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "code"       TEXT,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_units_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_units_deleted_at_idx" ON "inventory_master_units" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_brands" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "code"       TEXT,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_brands_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_brands_deleted_at_idx" ON "inventory_master_brands" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_tax_rates" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "rate"       DECIMAL(9,4) NOT NULL DEFAULT 0,
  "code"       TEXT,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_tax_rates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_tax_rates_deleted_at_idx" ON "inventory_master_tax_rates" ("deleted_at");
