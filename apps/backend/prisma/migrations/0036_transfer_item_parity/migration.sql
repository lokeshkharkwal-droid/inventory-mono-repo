-- EZ Health Track "Add Transfer" full item-column parity: header departments +
-- shipping + grand total, and per-line expiry/serial/pack/rate/MRP/tax/subtotal.
-- Additive + nullable; the two-stage send/receive stock flow (quantity + cost) is
-- unchanged. Idempotent.

ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "from_department" TEXT;
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "to_department" TEXT;
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "shipping" DECIMAL(18,4);
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "grand_total" DECIMAL(18,4);

ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "expiry_date" TIMESTAMP(3);
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "product_serial" TEXT;
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "pack_size" TEXT;
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "pack_quantity" DECIMAL(18,4);
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "rate" DECIMAL(18,4);
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(18,4);
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(9,4);
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(18,4);
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(18,4);
