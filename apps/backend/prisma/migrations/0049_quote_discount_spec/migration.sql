-- Preserve the original discount spec as entered ("10%" vs a flat amount) on quotes
-- and quote lines, so editing a quote re-shows the percentage instead of a frozen
-- computed amount (mirrors inventory_sales / inventory_sale_items). Additive + idempotent.

ALTER TABLE "inventory_quotes"
  ADD COLUMN IF NOT EXISTS "order_discount_spec" TEXT;

ALTER TABLE "inventory_quote_items"
  ADD COLUMN IF NOT EXISTS "discount_spec" TEXT;
