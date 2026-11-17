-- EZ Health Track materials-report parity: track who created each material so the
-- Materials / Tools & Plants / Material & Plants reports can filter by "Created By"
-- (legacy `materials.created_by`). Additive, nullable, idempotent.

ALTER TABLE "inventory_materials" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
