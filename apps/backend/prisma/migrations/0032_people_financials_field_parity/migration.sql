-- EZ Health Track field parity for the People (Supplier/Manufacturer/Customer)
-- and Financials (Expense/Income) entities. Each legacy "Add" form carries more
-- fields than the simplified monorepo tables had — this adds the missing columns
-- so the full-page forms can persist them. All additive + nullable, so existing
-- rows migrate cleanly. These tables already have tenant RLS (no new policy
-- needed for additive columns). Idempotent.

-- ── Suppliers (legacy "Add Supplier") ──
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "contact_person" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "drug_license" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "vat_no" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "gst_no" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "pan_no" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "gst_state" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "cf1" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "cf2" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "cf3" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "cf4" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "cf5" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "cf6" TEXT;

-- ── Manufacturers (legacy "Add Manufacturer") ──
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "contact_person" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "vat_no" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "invoice_footer" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "cf1" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "cf2" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "cf3" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "cf4" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "cf5" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "cf6" TEXT;

-- ── Customers / Patients (legacy "Add Customer" + "Add Patient") ──
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "contact_person" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "vat_no" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "gst_no" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "pan_no" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "gst_state" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "ccf1" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "ccf2" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "ccf3" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "ccf4" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "ccf5" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "ccf6" TEXT;

-- ── Expenses (legacy "Add Expense") ──
ALTER TABLE "inventory_expenses" ADD COLUMN IF NOT EXISTS "warehouse_id" TEXT;
ALTER TABLE "inventory_expenses" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;
ALTER TABLE "inventory_expenses" ADD COLUMN IF NOT EXISTS "tax_method" TEXT;
ALTER TABLE "inventory_expenses" ADD COLUMN IF NOT EXISTS "gst_no" TEXT;
ALTER TABLE "inventory_expenses" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;

-- ── Incomes (legacy "Add Income") ──
ALTER TABLE "inventory_incomes" ADD COLUMN IF NOT EXISTS "warehouse_id" TEXT;
ALTER TABLE "inventory_incomes" ADD COLUMN IF NOT EXISTS "tax_method" TEXT;
ALTER TABLE "inventory_incomes" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
