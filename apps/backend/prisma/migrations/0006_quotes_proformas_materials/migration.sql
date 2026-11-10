-- Phase 3: quotes, proformas, materials (+ damages/repairs).
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- ── inventory_quotes ──────────────────────────────────────────────────────────
CREATE TABLE "inventory_quotes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SALE',
    "customer_id" TEXT,
    "supplier_id" TEXT,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "order_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "order_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "converted_to_id" TEXT,
    "created_by" TEXT,
    "legacy_quote_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_quotes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_quotes_tenant_id_idx" ON "inventory_quotes"("tenant_id");
CREATE INDEX "inventory_quotes_branch_id_idx" ON "inventory_quotes"("branch_id");
CREATE INDEX "inventory_quotes_deleted_at_idx" ON "inventory_quotes"("deleted_at");
CREATE INDEX "inventory_quotes_legacy_quote_id_idx" ON "inventory_quotes"("legacy_quote_id");

CREATE TABLE "inventory_quote_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_quote_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_quote_items_tenant_id_idx" ON "inventory_quote_items"("tenant_id");
CREATE INDEX "inventory_quote_items_quote_id_idx" ON "inventory_quote_items"("quote_id");
CREATE INDEX "inventory_quote_items_product_id_idx" ON "inventory_quote_items"("product_id");
ALTER TABLE "inventory_quote_items" ADD CONSTRAINT "inventory_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "inventory_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_proformas ───────────────────────────────────────────────────────
CREATE TABLE "inventory_proformas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "customer_id" TEXT,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "order_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "order_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lab_tests" JSONB,
    "note" TEXT,
    "created_by" TEXT,
    "legacy_proforma_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_proformas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_proformas_tenant_id_idx" ON "inventory_proformas"("tenant_id");
CREATE INDEX "inventory_proformas_branch_id_idx" ON "inventory_proformas"("branch_id");
CREATE INDEX "inventory_proformas_deleted_at_idx" ON "inventory_proformas"("deleted_at");
CREATE INDEX "inventory_proformas_legacy_proforma_id_idx" ON "inventory_proformas"("legacy_proforma_id");

CREATE TABLE "inventory_proforma_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "proforma_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_proforma_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_proforma_items_tenant_id_idx" ON "inventory_proforma_items"("tenant_id");
CREATE INDEX "inventory_proforma_items_proforma_id_idx" ON "inventory_proforma_items"("proforma_id");
CREATE INDEX "inventory_proforma_items_product_id_idx" ON "inventory_proforma_items"("product_id");
ALTER TABLE "inventory_proforma_items" ADD CONSTRAINT "inventory_proforma_items_proforma_id_fkey" FOREIGN KEY ("proforma_id") REFERENCES "inventory_proformas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_materials ───────────────────────────────────────────────────────
CREATE TABLE "inventory_materials" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_material_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_materials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_materials_tenant_id_idx" ON "inventory_materials"("tenant_id");
CREATE INDEX "inventory_materials_branch_id_idx" ON "inventory_materials"("branch_id");
CREATE INDEX "inventory_materials_deleted_at_idx" ON "inventory_materials"("deleted_at");
CREATE INDEX "inventory_materials_legacy_material_id_idx" ON "inventory_materials"("legacy_material_id");

CREATE TABLE "inventory_material_damages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "reason" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_material_damages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_material_damages_tenant_id_idx" ON "inventory_material_damages"("tenant_id");
CREATE INDEX "inventory_material_damages_material_id_idx" ON "inventory_material_damages"("material_id");
ALTER TABLE "inventory_material_damages" ADD CONSTRAINT "inventory_material_damages_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "inventory_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "inventory_material_repairs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_material_repairs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_material_repairs_tenant_id_idx" ON "inventory_material_repairs"("tenant_id");
CREATE INDEX "inventory_material_repairs_material_id_idx" ON "inventory_material_repairs"("material_id");
ALTER TABLE "inventory_material_repairs" ADD CONSTRAINT "inventory_material_repairs_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "inventory_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
