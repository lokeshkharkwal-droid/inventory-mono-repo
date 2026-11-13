-- Phase 2-6: EZHT parity — master product full fields + sub-entities,
-- manufacturers, suppliers, proformas, system settings (all platform-level).

-- ── Master product: full EZHT add-product fields ──
ALTER TABLE "inventory_master_products"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS "barcode_symbology" TEXT DEFAULT 'code128',
  ADD COLUMN IF NOT EXISTS "category_id" TEXT,
  ADD COLUMN IF NOT EXISTS "sub_category_id" TEXT,
  ADD COLUMN IF NOT EXISTS "unit_id" TEXT,
  ADD COLUMN IF NOT EXISTS "brand_id" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_rate_id" TEXT,
  ADD COLUMN IF NOT EXISTS "manufacturer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_size" TEXT,
  ADD COLUMN IF NOT EXISTS "sales_method" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_cost" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "pack_mrp" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "tax_method" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_method_purchase" TEXT,
  ADD COLUMN IF NOT EXISTS "alert_quantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "is_track_quantity" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "gallery_image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
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
  ADD COLUMN IF NOT EXISTS "cf1" TEXT, ADD COLUMN IF NOT EXISTS "cf2" TEXT,
  ADD COLUMN IF NOT EXISTS "cf3" TEXT, ADD COLUMN IF NOT EXISTS "cf4" TEXT,
  ADD COLUMN IF NOT EXISTS "cf5" TEXT, ADD COLUMN IF NOT EXISTS "cf6" TEXT,
  ADD COLUMN IF NOT EXISTS "cf7" TEXT, ADD COLUMN IF NOT EXISTS "cf8" TEXT,
  ADD COLUMN IF NOT EXISTS "cf9" TEXT, ADD COLUMN IF NOT EXISTS "cf10" TEXT,
  ADD COLUMN IF NOT EXISTS "cf11" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_details" TEXT,
  ADD COLUMN IF NOT EXISTS "has_variants" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "inventory_master_products_category_id_idx" ON "inventory_master_products" ("category_id");
CREATE INDEX IF NOT EXISTS "inventory_master_products_manufacturer_id_idx" ON "inventory_master_products" ("manufacturer_id");

-- ── Master product sub-entities ──
CREATE TABLE IF NOT EXISTS "inventory_master_product_variants" (
  "id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "cost" DECIMAL(18,4) NOT NULL DEFAULT 0, "price" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_master_product_variants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_product_variants_product_id_idx" ON "inventory_master_product_variants" ("product_id");

CREATE TABLE IF NOT EXISTS "inventory_master_product_suppliers" (
  "id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "supplier_id" TEXT NOT NULL,
  "part_number" TEXT, "price" DECIMAL(18,4),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_master_product_suppliers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_product_suppliers_product_id_idx" ON "inventory_master_product_suppliers" ("product_id");
CREATE INDEX IF NOT EXISTS "inventory_master_product_suppliers_supplier_id_idx" ON "inventory_master_product_suppliers" ("supplier_id");

CREATE TABLE IF NOT EXISTS "inventory_master_combo_items" (
  "id" TEXT NOT NULL, "product_id" TEXT NOT NULL, "item_product_id" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1, "price" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_master_combo_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_combo_items_product_id_idx" ON "inventory_master_combo_items" ("product_id");

-- ── Manufacturers ──
CREATE TABLE IF NOT EXISTS "inventory_master_manufacturers" (
  "id" TEXT NOT NULL, "logo_url" TEXT, "company" TEXT NOT NULL, "name" TEXT NOT NULL,
  "vat_no" TEXT, "email" TEXT, "phone" TEXT, "address" TEXT, "city" TEXT, "state" TEXT,
  "postal_code" TEXT, "country" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "invoice_footer" TEXT, "cf1" TEXT, "cf2" TEXT, "cf3" TEXT, "cf4" TEXT, "cf5" TEXT, "cf6" TEXT,
  "created_by" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_manufacturers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_manufacturers_deleted_at_idx" ON "inventory_master_manufacturers" ("deleted_at");

-- ── Suppliers ──
CREATE TABLE IF NOT EXISTS "inventory_master_suppliers" (
  "id" TEXT NOT NULL, "company" TEXT, "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT,
  "address" TEXT, "city" TEXT, "state" TEXT, "postal_code" TEXT, "country" TEXT, "vat_no" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_suppliers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_suppliers_deleted_at_idx" ON "inventory_master_suppliers" ("deleted_at");

-- ── Proformas ──
CREATE TABLE IF NOT EXISTS "inventory_master_proformas" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "notes" TEXT, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_proformas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_proformas_deleted_at_idx" ON "inventory_master_proformas" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_proforma_items" (
  "id" TEXT NOT NULL, "proforma_id" TEXT NOT NULL, "master_product_id" TEXT, "lab_test_id" TEXT,
  "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_master_proforma_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_proforma_items_proforma_id_idx" ON "inventory_master_proforma_items" ("proforma_id");

-- ── System settings (singleton) ──
CREATE TABLE IF NOT EXISTS "inventory_master_settings" (
  "id" TEXT NOT NULL, "data" JSONB NOT NULL DEFAULT '{}',
  "updated_by" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_master_settings_pkey" PRIMARY KEY ("id")
);
