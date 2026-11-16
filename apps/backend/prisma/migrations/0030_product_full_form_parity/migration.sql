-- EZHT Add-Product full-form parity: give the tenant product catalogue the last
-- legacy fields it was missing — a manufacturer link, per-product suppliers (1-5
-- with part number + price), and per-variant per-warehouse stock (the legacy
-- "attributes" table: name + warehouse + quantity + cost). All additive +
-- nullable/defaulted so existing rows migrate cleanly. RLS for the two new
-- tenant-scoped tables is added in migration 0031 (per the project rule).

-- ── Product → manufacturer link ──
ALTER TABLE "inventory_products"
  ADD COLUMN IF NOT EXISTS "manufacturer_id" TEXT;

CREATE INDEX IF NOT EXISTS "inventory_products_manufacturer_id_idx"
  ON "inventory_products" ("manufacturer_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_products_manufacturer_id_fkey'
  ) THEN
    ALTER TABLE "inventory_products"
      ADD CONSTRAINT "inventory_products_manufacturer_id_fkey"
      FOREIGN KEY ("manufacturer_id") REFERENCES "inventory_manufacturers" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Per-product suppliers (legacy supplier1..5 + part no + price) ──
CREATE TABLE IF NOT EXISTS "inventory_product_suppliers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "part_number" TEXT,
  "price" DECIMAL(18,4),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_product_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_product_suppliers_tenant_id_idx"
  ON "inventory_product_suppliers" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_product_suppliers_product_id_idx"
  ON "inventory_product_suppliers" ("product_id");
CREATE INDEX IF NOT EXISTS "inventory_product_suppliers_supplier_id_idx"
  ON "inventory_product_suppliers" ("supplier_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_suppliers_product_id_fkey'
  ) THEN
    ALTER TABLE "inventory_product_suppliers"
      ADD CONSTRAINT "inventory_product_suppliers_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "inventory_products" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_suppliers_supplier_id_fkey'
  ) THEN
    ALTER TABLE "inventory_product_suppliers"
      ADD CONSTRAINT "inventory_product_suppliers_supplier_id_fkey"
      FOREIGN KEY ("supplier_id") REFERENCES "inventory_suppliers" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Per-variant per-warehouse stock (legacy "attributes" / product_options) ──
CREATE TABLE IF NOT EXISTS "inventory_variant_warehouse_products" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "cost" DECIMAL(18,4),
  "rack" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_variant_warehouse_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_variant_warehouse_products_variant_branch_unique"
  ON "inventory_variant_warehouse_products" ("variant_id", "branch_id");
CREATE INDEX IF NOT EXISTS "inventory_variant_warehouse_products_tenant_id_idx"
  ON "inventory_variant_warehouse_products" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_variant_warehouse_products_variant_id_idx"
  ON "inventory_variant_warehouse_products" ("variant_id");
CREATE INDEX IF NOT EXISTS "inventory_variant_warehouse_products_branch_id_idx"
  ON "inventory_variant_warehouse_products" ("branch_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_variant_warehouse_products_variant_id_fkey'
  ) THEN
    ALTER TABLE "inventory_variant_warehouse_products"
      ADD CONSTRAINT "inventory_variant_warehouse_products_variant_id_fkey"
      FOREIGN KEY ("variant_id") REFERENCES "inventory_product_variants" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
