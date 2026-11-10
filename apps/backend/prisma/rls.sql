-- Row-Level Security policies for inventory_* tables (CLAUDE.md §4.3).
--
-- Apply AFTER migrations, against the shared kalnostics-new database. Every
-- tenant-scoped inventory table is keyed on app.current_tenant_id, which
-- PrismaService sets per request (when RLS_ENABLED=true). Idempotent: safe to
-- re-run as new inventory tables are added.
--
-- NOTE: current_tenant_id() is typically already defined by kalnostics-new.
-- We (re)create it defensively so inventory-backend can be set up independently.
-- The definition is kept BYTE-IDENTICAL to kalnostics-new's (NULLIF-wrapped so an
-- empty/unset GUC yields NULL, not ''), so this CREATE OR REPLACE is a true no-op
-- when run against the shared kalnostics database and never alters its behaviour.

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.current_tenant_id', true), '') $$;

-- ── inventory_categories ─────────────────────────────────────────────────────
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_categories_tenant_isolation ON inventory_categories;
CREATE POLICY inventory_categories_tenant_isolation ON inventory_categories
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Per-tenant uniqueness on category code, soft-delete aware.
DROP INDEX IF EXISTS inventory_categories_tenant_code_active_unique;
CREATE UNIQUE INDEX inventory_categories_tenant_code_active_unique
  ON inventory_categories (tenant_id, code)
  WHERE deleted_at IS NULL AND code IS NOT NULL;

-- ── master-data tables (Phase 1a) ─────────────────────────────────────────────
-- Reusable helper: enable + force RLS and a tenant-isolation policy per table.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_sub_categories',
    'inventory_units',
    'inventory_brands',
    'inventory_tax_rates',
    'inventory_variants',
    'inventory_products',
    'inventory_product_variants',
    'inventory_warehouse_products',
    'inventory_stock_adjustments',
    'inventory_product_batches',
    'inventory_suppliers',
    'inventory_customers',
    'inventory_purchases',
    'inventory_purchase_items',
    'inventory_purchase_payments',
    'inventory_sales',
    'inventory_sale_items',
    'inventory_sale_payments',
    'inventory_transfers',
    'inventory_transfer_items',
    'inventory_requisitions',
    'inventory_requisition_items',
    'inventory_currencies',
    'inventory_customer_groups',
    'inventory_expense_categories',
    'inventory_income_categories',
    'inventory_billers',
    'inventory_settings',
    'inventory_quotes',
    'inventory_quote_items',
    'inventory_proformas',
    'inventory_proforma_items',
    'inventory_materials',
    'inventory_material_damages',
    'inventory_material_repairs',
    'inventory_pos_registers',
    'inventory_pos_register_sessions',
    'inventory_blood_donors',
    'inventory_blood_donations',
    'inventory_blood_requests',
    'inventory_ipd_admissions',
    'inventory_purchase_returns',
    'inventory_purchase_return_items',
    'inventory_sale_returns',
    'inventory_sale_return_items',
    'inventory_sale_deliveries',
    'inventory_expenses',
    'inventory_incomes',
    'inventory_gift_cards',
    'inventory_blood_cross_matches',
    'inventory_ipd_charges',
    'inventory_notifications',
    'inventory_calendar_events',
    'inventory_manufacturers',
    'inventory_customer_deposits',
    'inventory_purchase_expenses',
    'inventory_supplier_payments',
    'inventory_email_templates',
    'inventory_product_serials',
    'inventory_pos_held_bills',
    'inventory_promotions',
    'inventory_product_templates',
    'inventory_role_permissions',
    'inventory_roles',
    'inventory_user_roles'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
      t || '_tenant_isolation', t
    );
  END LOOP;
END $$;
