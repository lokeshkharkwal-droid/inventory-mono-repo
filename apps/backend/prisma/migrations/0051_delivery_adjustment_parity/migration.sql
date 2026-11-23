-- EZ Health Track parity: batch-linked quantity adjustments + delivery fields.
-- Additive, nullable, idempotent — safe to re-run on the shared kalnostics DB.

-- Area A — a quantity adjustment can target a specific product batch (the
-- "Purchased Item" chosen in the Adjust Quantity modal). Storing the batch id
-- lets delete/reverse undo the batch balance change, not just the warehouse total.
ALTER TABLE "inventory_stock_adjustments" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;

-- Area B — deliveries carry the originating sale's reference and the customer
-- name as their own columns (EZHT `sale_reference_no` / `customer`), so the
-- Deliveries list and documents render without re-joining the sale.
ALTER TABLE "inventory_sale_deliveries" ADD COLUMN IF NOT EXISTS "sale_reference_no" TEXT;
ALTER TABLE "inventory_sale_deliveries" ADD COLUMN IF NOT EXISTS "customer" TEXT;
