-- Phase 2: settings master data (currencies, customer groups, expense/income
-- categories, billers) + the per-tenant settings singleton.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

CREATE TABLE "inventory_currencies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_currency_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_currencies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_currencies_tenant_id_idx" ON "inventory_currencies"("tenant_id");
CREATE INDEX "inventory_currencies_deleted_at_idx" ON "inventory_currencies"("deleted_at");
CREATE INDEX "inventory_currencies_legacy_currency_id_idx" ON "inventory_currencies"("legacy_currency_id");

CREATE TABLE "inventory_customer_groups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_customer_groups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_customer_groups_tenant_id_idx" ON "inventory_customer_groups"("tenant_id");
CREATE INDEX "inventory_customer_groups_deleted_at_idx" ON "inventory_customer_groups"("deleted_at");
CREATE INDEX "inventory_customer_groups_legacy_group_id_idx" ON "inventory_customer_groups"("legacy_group_id");

CREATE TABLE "inventory_expense_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_expense_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_expense_categories_tenant_id_idx" ON "inventory_expense_categories"("tenant_id");
CREATE INDEX "inventory_expense_categories_deleted_at_idx" ON "inventory_expense_categories"("deleted_at");
CREATE INDEX "inventory_expense_categories_legacy_category_id_idx" ON "inventory_expense_categories"("legacy_category_id");

CREATE TABLE "inventory_income_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_income_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_income_categories_tenant_id_idx" ON "inventory_income_categories"("tenant_id");
CREATE INDEX "inventory_income_categories_deleted_at_idx" ON "inventory_income_categories"("deleted_at");
CREATE INDEX "inventory_income_categories_legacy_category_id_idx" ON "inventory_income_categories"("legacy_category_id");

CREATE TABLE "inventory_billers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_number" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_biller_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_billers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_billers_tenant_id_idx" ON "inventory_billers"("tenant_id");
CREATE INDEX "inventory_billers_deleted_at_idx" ON "inventory_billers"("deleted_at");
CREATE INDEX "inventory_billers_legacy_biller_id_idx" ON "inventory_billers"("legacy_biller_id");

CREATE TABLE "inventory_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "default_currency_code" TEXT,
    "is_overselling_allowed" BOOLEAN NOT NULL DEFAULT false,
    "rows_per_page" INTEGER NOT NULL DEFAULT 20,
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "purchase_prefix" TEXT NOT NULL DEFAULT 'PO',
    "sale_prefix" TEXT NOT NULL DEFAULT 'SALE',
    "transfer_prefix" TEXT NOT NULL DEFAULT 'TR',
    "requisition_prefix" TEXT NOT NULL DEFAULT 'REQ',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inventory_settings_tenant_id_key" ON "inventory_settings"("tenant_id");
