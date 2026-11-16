-- EZ Health Track add-form parity for Quote (sales/purchase) and Transfer.
-- Quote: legacy header fields (biller, warehouse, GST, document, product discount,
-- total tax/items, referral snapshot) + line fields (net unit price, pack size/qty,
-- product type, option). Transfer: footer Document attachment.
-- All additive + nullable/defaulted + idempotent.

-- Quote header
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "biller_id" TEXT;
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "warehouse_id" TEXT;
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "gst_number" TEXT;
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "gst_state" TEXT;
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "product_discount" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "total_tax" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "total_items" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "inventory_quotes" ADD COLUMN IF NOT EXISTS "referral_info" JSONB;

-- Quote item
ALTER TABLE "inventory_quote_items" ADD COLUMN IF NOT EXISTS "net_unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "inventory_quote_items" ADD COLUMN IF NOT EXISTS "pack_size" TEXT;
ALTER TABLE "inventory_quote_items" ADD COLUMN IF NOT EXISTS "pack_quantity" DECIMAL(18,4);
ALTER TABLE "inventory_quote_items" ADD COLUMN IF NOT EXISTS "product_type" TEXT;
ALTER TABLE "inventory_quote_items" ADD COLUMN IF NOT EXISTS "option_id" TEXT;

-- Transfer header (footer Document attachment)
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
