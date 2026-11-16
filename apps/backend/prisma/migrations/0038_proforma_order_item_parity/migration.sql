-- EZ Health Track "Add Proforma" order-item parity: a proforma `name` (the
-- legacy required title) and a per-line `quantity_method` (1 = Single, keep the
-- line separate; 2 = Combined, merge quantity when the product is re-added).
-- Additive + nullable/defaulted + idempotent.

ALTER TABLE "inventory_proformas" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "inventory_proforma_items" ADD COLUMN IF NOT EXISTS "quantity_method" INTEGER NOT NULL DEFAULT 1;
