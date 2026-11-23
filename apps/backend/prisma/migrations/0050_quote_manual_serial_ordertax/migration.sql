-- Quote parity follow-ups (all additive + idempotent):
--  • manual (off-catalogue) quote lines → product_id becomes nullable
--  • per-line serial number (EZHT item serial)
--  • order-tax percentage stored so an edit re-shows the rate (order_tax holds the
--    resolved amount)

ALTER TABLE "inventory_quote_items" ALTER COLUMN "product_id" DROP NOT NULL;

ALTER TABLE "inventory_quote_items"
  ADD COLUMN IF NOT EXISTS "serial_no" TEXT;

ALTER TABLE "inventory_quotes"
  ADD COLUMN IF NOT EXISTS "order_tax_percent" DECIMAL(8, 4);
