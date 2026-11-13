-- SiteAdmin master catalogue extensions: variants, expense/income categories,
-- suppliers, manufacturers, proformas, settings + extra category/tax-rate fields.
-- Platform-level (no tenant_id, no RLS). Idempotent.

ALTER TABLE "inventory_master_categories" ADD COLUMN IF NOT EXISTS "image_url" TEXT;

ALTER TABLE "inventory_master_tax_rates" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'percentage';
ALTER TABLE "inventory_master_tax_rates" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;
ALTER TABLE "inventory_master_tax_rates" ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(9,4);
ALTER TABLE "inventory_master_tax_rates" ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(9,4);
ALTER TABLE "inventory_master_tax_rates" ADD COLUMN IF NOT EXISTS "igst" DECIMAL(9,4);

CREATE TABLE IF NOT EXISTS "inventory_master_variants" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_variants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_variants_deleted_at_idx" ON "inventory_master_variants" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_expense_categories" (
  "id" TEXT NOT NULL, "code" TEXT, "name" TEXT NOT NULL,
  "tax_rate_id" TEXT, "tax_method" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
  "is_active" BOOLEAN NOT NULL DEFAULT true, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_expense_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_expense_categories_deleted_at_idx" ON "inventory_master_expense_categories" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_income_categories" (
  "id" TEXT NOT NULL, "code" TEXT, "name" TEXT NOT NULL,
  "tax_rate_id" TEXT, "tax_method" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
  "is_active" BOOLEAN NOT NULL DEFAULT true, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_income_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_income_categories_deleted_at_idx" ON "inventory_master_income_categories" ("deleted_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_master_expense_categories_tax_rate_id_fkey') THEN
    ALTER TABLE "inventory_master_expense_categories"
      ADD CONSTRAINT "inventory_master_expense_categories_tax_rate_id_fkey"
      FOREIGN KEY ("tax_rate_id") REFERENCES "inventory_master_tax_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_master_income_categories_tax_rate_id_fkey') THEN
    ALTER TABLE "inventory_master_income_categories"
      ADD CONSTRAINT "inventory_master_income_categories_tax_rate_id_fkey"
      FOREIGN KEY ("tax_rate_id") REFERENCES "inventory_master_tax_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_master_suppliers" (
  "id" TEXT NOT NULL, "company" TEXT, "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT,
  "address" TEXT, "city" TEXT, "state" TEXT, "postal_code" TEXT, "country" TEXT, "vat_no" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_suppliers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_suppliers_deleted_at_idx" ON "inventory_master_suppliers" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_manufacturers" (
  "id" TEXT NOT NULL, "logo_url" TEXT, "company" TEXT NOT NULL, "name" TEXT NOT NULL,
  "vat_no" TEXT, "email" TEXT, "phone" TEXT, "address" TEXT, "city" TEXT, "state" TEXT,
  "postal_code" TEXT, "country" TEXT, "invoice_footer" TEXT,
  "cf1" TEXT, "cf2" TEXT, "cf3" TEXT, "cf4" TEXT, "cf5" TEXT, "cf6" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_manufacturers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_manufacturers_deleted_at_idx" ON "inventory_master_manufacturers" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_proformas" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "notes" TEXT, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3),
  CONSTRAINT "inventory_master_proformas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_proformas_deleted_at_idx" ON "inventory_master_proformas" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_master_proforma_items" (
  "id" TEXT NOT NULL, "proforma_id" TEXT NOT NULL,
  "master_product_id" TEXT, "lab_test_id" TEXT,
  "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_master_proforma_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_master_proforma_items_proforma_id_idx" ON "inventory_master_proforma_items" ("proforma_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_master_proforma_items_proforma_id_fkey') THEN
    ALTER TABLE "inventory_master_proforma_items"
      ADD CONSTRAINT "inventory_master_proforma_items_proforma_id_fkey"
      FOREIGN KEY ("proforma_id") REFERENCES "inventory_master_proformas" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_master_settings" (
  "id" TEXT NOT NULL, "data" JSONB NOT NULL DEFAULT '{}',
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_master_settings_pkey" PRIMARY KEY ("id")
);
