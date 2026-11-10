-- Phase 1a master data: sub-categories, units, brands, tax rates, variants.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- ── inventory_sub_categories ──────────────────────────────────────────────────
CREATE TABLE "inventory_sub_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "legacy_sub_category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_sub_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_sub_categories_tenant_id_idx" ON "inventory_sub_categories"("tenant_id");
CREATE INDEX "inventory_sub_categories_category_id_idx" ON "inventory_sub_categories"("category_id");
CREATE INDEX "inventory_sub_categories_deleted_at_idx" ON "inventory_sub_categories"("deleted_at");
CREATE INDEX "inventory_sub_categories_legacy_sub_category_id_idx" ON "inventory_sub_categories"("legacy_sub_category_id");
ALTER TABLE "inventory_sub_categories"
  ADD CONSTRAINT "inventory_sub_categories_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "inventory_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── inventory_units ───────────────────────────────────────────────────────────
CREATE TABLE "inventory_units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "base_unit_id" TEXT,
    "operator" TEXT,
    "operation_value" DECIMAL(18,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_unit_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_units_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_units_tenant_id_idx" ON "inventory_units"("tenant_id");
CREATE INDEX "inventory_units_deleted_at_idx" ON "inventory_units"("deleted_at");
CREATE INDEX "inventory_units_legacy_unit_id_idx" ON "inventory_units"("legacy_unit_id");
ALTER TABLE "inventory_units"
  ADD CONSTRAINT "inventory_units_base_unit_id_fkey"
  FOREIGN KEY ("base_unit_id") REFERENCES "inventory_units"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── inventory_brands ──────────────────────────────────────────────────────────
CREATE TABLE "inventory_brands" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_brand_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_brands_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_brands_tenant_id_idx" ON "inventory_brands"("tenant_id");
CREATE INDEX "inventory_brands_deleted_at_idx" ON "inventory_brands"("deleted_at");
CREATE INDEX "inventory_brands_legacy_brand_id_idx" ON "inventory_brands"("legacy_brand_id");

-- ── inventory_tax_rates ───────────────────────────────────────────────────────
CREATE TABLE "inventory_tax_rates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(8,4) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percentage',
    "hsn_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_tax_rate_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_tax_rates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_tax_rates_tenant_id_idx" ON "inventory_tax_rates"("tenant_id");
CREATE INDEX "inventory_tax_rates_deleted_at_idx" ON "inventory_tax_rates"("deleted_at");
CREATE INDEX "inventory_tax_rates_legacy_tax_rate_id_idx" ON "inventory_tax_rates"("legacy_tax_rate_id");

-- ── inventory_variants ────────────────────────────────────────────────────────
CREATE TABLE "inventory_variants" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_variant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_variants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_variants_tenant_id_idx" ON "inventory_variants"("tenant_id");
CREATE INDEX "inventory_variants_deleted_at_idx" ON "inventory_variants"("deleted_at");
CREATE INDEX "inventory_variants_legacy_variant_id_idx" ON "inventory_variants"("legacy_variant_id");
