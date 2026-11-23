-- 0059: branch-scope inventory settings + full EZHealthTrack (SMA) field parity.
-- Hand-authored (migrate diff pattern). Touches ONLY the inventory_settings table.
--
-- Scoping: a settings row is now keyed on (tenant_id, branch_id). The existing
-- per-tenant rows keep branch_id = NULL and become each tenant's tenant-level
-- default (template cloned on a branch's first access). Because Postgres treats
-- NULLs as DISTINCT in a plain unique index, uniqueness is enforced with two
-- PARTIAL unique indexes instead of one compound unique.

-- 1) Drop the old per-tenant unique; add branch scoping column + indexes.
DROP INDEX IF EXISTS "inventory_settings_tenant_id_key";

ALTER TABLE "inventory_settings" ADD COLUMN "branch_id" TEXT;

CREATE INDEX "inventory_settings_tenant_id_idx" ON "inventory_settings"("tenant_id");
CREATE INDEX "inventory_settings_branch_id_idx" ON "inventory_settings"("branch_id");

-- One tenant-level row per tenant (branch_id IS NULL) ...
CREATE UNIQUE INDEX "inventory_settings_tenant_default_key"
  ON "inventory_settings"("tenant_id") WHERE "branch_id" IS NULL;
-- ... and one row per (tenant, branch).
CREATE UNIQUE INDEX "inventory_settings_tenant_branch_key"
  ON "inventory_settings"("tenant_id", "branch_id") WHERE "branch_id" IS NOT NULL;

-- 2) Full EZHT settings-field parity (new columns). Existing rows take defaults.
-- Document numbering prefixes.
ALTER TABLE "inventory_settings" ADD COLUMN "quote_prefix"       TEXT NOT NULL DEFAULT 'QT';
ALTER TABLE "inventory_settings" ADD COLUMN "delivery_prefix"    TEXT NOT NULL DEFAULT 'DO';
ALTER TABLE "inventory_settings" ADD COLUMN "payment_prefix"     TEXT NOT NULL DEFAULT 'PAY';
ALTER TABLE "inventory_settings" ADD COLUMN "transaction_prefix" TEXT NOT NULL DEFAULT 'TXN';
ALTER TABLE "inventory_settings" ADD COLUMN "return_prefix"      TEXT NOT NULL DEFAULT 'RT';
ALTER TABLE "inventory_settings" ADD COLUMN "expense_prefix"     TEXT NOT NULL DEFAULT 'EX';
ALTER TABLE "inventory_settings" ADD COLUMN "income_prefix"      TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE "inventory_settings" ADD COLUMN "material_prefix"    TEXT NOT NULL DEFAULT 'MAT';
ALTER TABLE "inventory_settings" ADD COLUMN "product_prefix"     TEXT NOT NULL DEFAULT 'PRD';
ALTER TABLE "inventory_settings" ADD COLUMN "reference_format"   TEXT;

-- Default tax rates.
ALTER TABLE "inventory_settings" ADD COLUMN "default_product_tax_rate_id" TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "default_order_tax_rate_id"   TEXT;

-- Localization / number formatting.
ALTER TABLE "inventory_settings" ADD COLUMN "date_format"               TEXT DEFAULT 'yyyy-mm-dd';
ALTER TABLE "inventory_settings" ADD COLUMN "timezone"                  TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE "inventory_settings" ADD COLUMN "local_language"            TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "decimal_separator"         TEXT DEFAULT '.';
ALTER TABLE "inventory_settings" ADD COLUMN "thousands_separator"       TEXT DEFAULT ',';
ALTER TABLE "inventory_settings" ADD COLUMN "quantity_decimals"         INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "inventory_settings" ADD COLUMN "currency_symbol"           TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "is_currency_symbol_shown"  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "inventory_settings" ADD COLUMN "is_sac_enabled"            BOOLEAN NOT NULL DEFAULT false;

-- Image / thumbnail sizing + watermark.
ALTER TABLE "inventory_settings" ADD COLUMN "image_width"          INTEGER;
ALTER TABLE "inventory_settings" ADD COLUMN "image_height"         INTEGER;
ALTER TABLE "inventory_settings" ADD COLUMN "thumbnail_width"      INTEGER;
ALTER TABLE "inventory_settings" ADD COLUMN "thumbnail_height"     INTEGER;
ALTER TABLE "inventory_settings" ADD COLUMN "is_watermark_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Product & feature toggles.
ALTER TABLE "inventory_settings" ADD COLUMN "is_product_serial_enabled"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "is_product_expiry_enabled"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "is_product_discount_enabled"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "is_racks_enabled"             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "is_attributes_enabled"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "is_all_products_displayed"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "is_expired_removed"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "is_quotation_sales_reducing"  BOOLEAN NOT NULL DEFAULT false;

-- Barcode settings.
ALTER TABLE "inventory_settings" ADD COLUMN "is_barcode_auto_detected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "barcode_separator"        TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "barcode_fix_count"        INTEGER NOT NULL DEFAULT 0;

-- Defaults.
ALTER TABLE "inventory_settings" ADD COLUMN "default_warehouse_id" TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "default_biller_id"    TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "default_supplier_id"  TEXT;

-- Behaviour / limits.
ALTER TABLE "inventory_settings" ADD COLUMN "item_addition_method"         TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "invoice_view"                 TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "discount_limit_percentage"    DECIMAL(8,4);
ALTER TABLE "inventory_settings" ADD COLUMN "discount_limit_amount"        DECIMAL(25,4);
ALTER TABLE "inventory_settings" ADD COLUMN "editing_lock_days"            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "inventory_settings" ADD COLUMN "default_order_focus"          TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "is_purchase_rounding_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "is_sales_rounding_enabled"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_settings" ADD COLUMN "after_sale_page"              TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "expiry_alert_days"            INTEGER NOT NULL DEFAULT 0;
