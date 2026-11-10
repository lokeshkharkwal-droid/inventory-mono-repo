-- Phase 1b: products, variants, per-branch stock, adjustments, batches.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- ── inventory_products ────────────────────────────────────────────────────────
CREATE TABLE "inventory_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "sub_category_id" TEXT,
    "unit_id" TEXT,
    "brand_id" TEXT,
    "tax_rate_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "alert_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "is_stock_tracked" BOOLEAN NOT NULL DEFAULT true,
    "is_tax_included" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "barcode_symbology" TEXT,
    "image_url" TEXT,
    "description" TEXT,
    "generic_name" TEXT,
    "strength" TEXT,
    "legacy_product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inventory_products_tenant_id_code_key" ON "inventory_products"("tenant_id", "code");
CREATE INDEX "inventory_products_tenant_id_idx" ON "inventory_products"("tenant_id");
CREATE INDEX "inventory_products_category_id_idx" ON "inventory_products"("category_id");
CREATE INDEX "inventory_products_brand_id_idx" ON "inventory_products"("brand_id");
CREATE INDEX "inventory_products_deleted_at_idx" ON "inventory_products"("deleted_at");
CREATE INDEX "inventory_products_legacy_product_id_idx" ON "inventory_products"("legacy_product_id");
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "inventory_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "inventory_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "inventory_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "inventory_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "inventory_tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── inventory_product_variants ────────────────────────────────────────────────
CREATE TABLE "inventory_product_variants" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "cost_adjustment" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "price_adjustment" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "legacy_variant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_product_variants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_product_variants_tenant_id_idx" ON "inventory_product_variants"("tenant_id");
CREATE INDEX "inventory_product_variants_product_id_idx" ON "inventory_product_variants"("product_id");
CREATE INDEX "inventory_product_variants_deleted_at_idx" ON "inventory_product_variants"("deleted_at");
ALTER TABLE "inventory_product_variants" ADD CONSTRAINT "inventory_product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_warehouse_products ──────────────────────────────────────────────
CREATE TABLE "inventory_warehouse_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "avg_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rack" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_warehouse_products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inventory_warehouse_products_product_id_branch_id_key" ON "inventory_warehouse_products"("product_id", "branch_id");
CREATE INDEX "inventory_warehouse_products_tenant_id_idx" ON "inventory_warehouse_products"("tenant_id");
CREATE INDEX "inventory_warehouse_products_branch_id_idx" ON "inventory_warehouse_products"("branch_id");
CREATE INDEX "inventory_warehouse_products_product_id_idx" ON "inventory_warehouse_products"("product_id");
ALTER TABLE "inventory_warehouse_products" ADD CONSTRAINT "inventory_warehouse_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_stock_adjustments ───────────────────────────────────────────────
CREATE TABLE "inventory_stock_adjustments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "created_by" TEXT,
    "legacy_adjustment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_stock_adjustments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_stock_adjustments_tenant_id_idx" ON "inventory_stock_adjustments"("tenant_id");
CREATE INDEX "inventory_stock_adjustments_branch_id_idx" ON "inventory_stock_adjustments"("branch_id");
CREATE INDEX "inventory_stock_adjustments_product_id_idx" ON "inventory_stock_adjustments"("product_id");
CREATE INDEX "inventory_stock_adjustments_deleted_at_idx" ON "inventory_stock_adjustments"("deleted_at");
ALTER TABLE "inventory_stock_adjustments" ADD CONSTRAINT "inventory_stock_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── inventory_product_batches ─────────────────────────────────────────────────
CREATE TABLE "inventory_product_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_no" TEXT,
    "serial_no" TEXT,
    "expiry_date" TIMESTAMP(3),
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cost" DECIMAL(18,4),
    "legacy_serial_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_product_batches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_product_batches_tenant_id_idx" ON "inventory_product_batches"("tenant_id");
CREATE INDEX "inventory_product_batches_branch_id_idx" ON "inventory_product_batches"("branch_id");
CREATE INDEX "inventory_product_batches_product_id_idx" ON "inventory_product_batches"("product_id");
CREATE INDEX "inventory_product_batches_expiry_date_idx" ON "inventory_product_batches"("expiry_date");
CREATE INDEX "inventory_product_batches_deleted_at_idx" ON "inventory_product_batches"("deleted_at");
ALTER TABLE "inventory_product_batches" ADD CONSTRAINT "inventory_product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
