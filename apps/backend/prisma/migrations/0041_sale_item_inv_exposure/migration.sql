-- EZ Health Track exposures-report parity: per sale-line imaging/radiology
-- exposure count (legacy `sale_items.inv_exposure`). Additive, defaulted, idempotent.

ALTER TABLE "inventory_sale_items" ADD COLUMN IF NOT EXISTS "inv_exposure" INTEGER NOT NULL DEFAULT 0;
