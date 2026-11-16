-- EZ Health Track "Add Material" (asset register) full-form parity. The legacy
-- form is a ~27-field fixed-asset record; this adds the columns the simplified
-- monorepo material table was missing. All additive + nullable. Idempotent.

ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "entry_date" TIMESTAMP(3);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "purchase_order_no" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "biller_id" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "warehouse_id" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "department_room" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "seller_name" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "purchase_date" TIMESTAMP(3);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "installation_date" TIMESTAMP(3);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "material_status" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "grand_total" DECIMAL(18,4);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "amc_cost" DECIMAL(18,4);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "cmc_cost" DECIMAL(18,4);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "estimated_present_cost" DECIMAL(18,4);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "codal_life" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "amc_status" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "amc_start_date" TIMESTAMP(3);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "amc_end_date" TIMESTAMP(3);
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "issue_to" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "transfer_to" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "document_url" TEXT;
ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "staff_note" TEXT;
