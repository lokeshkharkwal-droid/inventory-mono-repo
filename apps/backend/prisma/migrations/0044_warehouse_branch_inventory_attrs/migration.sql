-- Branch-level inventory state on the per-branch warehouse row. A product is
-- tenant-level (shared across branches), but quantity/pricing/batch is managed
-- per branch via quantity adjustments. These columns hold the "current" values
-- surfaced in the branch-scoped product listing. Additive, nullable, idempotent.

ALTER TABLE "inventory_warehouse_products" ADD COLUMN IF NOT EXISTS "pack_size" TEXT;
ALTER TABLE "inventory_warehouse_products" ADD COLUMN IF NOT EXISTS "pack_quantity" DECIMAL(18,4);
ALTER TABLE "inventory_warehouse_products" ADD COLUMN IF NOT EXISTS "unit_mrp" DECIMAL(18,4);
ALTER TABLE "inventory_warehouse_products" ADD COLUMN IF NOT EXISTS "pack_mrp" DECIMAL(18,4);
ALTER TABLE "inventory_warehouse_products" ADD COLUMN IF NOT EXISTS "batch_no" TEXT;
ALTER TABLE "inventory_warehouse_products" ADD COLUMN IF NOT EXISTS "expiry_date" DATE;
