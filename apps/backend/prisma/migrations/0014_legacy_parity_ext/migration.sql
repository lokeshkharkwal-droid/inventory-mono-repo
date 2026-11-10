-- Legacy-parity extensions: product serials/drug meta, customer loyalty, POS
-- held bills, promotions, product templates.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- Product drug/serial columns.
ALTER TABLE "inventory_products" ADD COLUMN "potency" TEXT;
ALTER TABLE "inventory_products" ADD COLUMN "hsn_code" TEXT;
ALTER TABLE "inventory_products" ADD COLUMN "is_serialized" BOOLEAN NOT NULL DEFAULT false;

-- Customer loyalty points.
ALTER TABLE "inventory_customers" ADD COLUMN "loyalty_points" INTEGER NOT NULL DEFAULT 0;

-- ── inventory_product_serials ─────────────────────────────────────────────────
CREATE TABLE "inventory_product_serials" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "product_id" TEXT NOT NULL,
    "serial_no" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "reference" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_product_serials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_product_serials_tenant_id_idx" ON "inventory_product_serials"("tenant_id");
CREATE INDEX "inventory_product_serials_product_id_idx" ON "inventory_product_serials"("product_id");
CREATE INDEX "inventory_product_serials_serial_no_idx" ON "inventory_product_serials"("serial_no");
CREATE INDEX "inventory_product_serials_deleted_at_idx" ON "inventory_product_serials"("deleted_at");

-- ── inventory_pos_held_bills ──────────────────────────────────────────────────
CREATE TABLE "inventory_pos_held_bills" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "label" TEXT NOT NULL,
    "cart" JSONB NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_pos_held_bills_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_pos_held_bills_tenant_id_idx" ON "inventory_pos_held_bills"("tenant_id");
CREATE INDEX "inventory_pos_held_bills_branch_id_idx" ON "inventory_pos_held_bills"("branch_id");
CREATE INDEX "inventory_pos_held_bills_deleted_at_idx" ON "inventory_pos_held_bills"("deleted_at");

-- ── inventory_promotions ──────────────────────────────────────────────────────
CREATE TABLE "inventory_promotions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_promotions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_promotions_tenant_id_idx" ON "inventory_promotions"("tenant_id");
CREATE INDEX "inventory_promotions_deleted_at_idx" ON "inventory_promotions"("deleted_at");

-- ── inventory_product_templates ───────────────────────────────────────────────
CREATE TABLE "inventory_product_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "hsn_code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_product_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_product_templates_tenant_id_idx" ON "inventory_product_templates"("tenant_id");
CREATE INDEX "inventory_product_templates_deleted_at_idx" ON "inventory_product_templates"("deleted_at");
