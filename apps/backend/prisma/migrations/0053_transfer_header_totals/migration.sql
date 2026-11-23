-- EZ Health Track transfer-list parity: the legacy list shows Total (items
-- net) and Product Tax alongside Grand Total. The new transfer header only
-- stored grandTotal, so add `total` and `total_tax` header snapshots. Additive,
-- nullable, idempotent; back-filled best-effort below from existing line items.

ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "total" DECIMAL(18,4);
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "total_tax" DECIMAL(18,4);

-- Back-fill from line items (rate×qty net = subtotal − tax; tax = tax_amount).
UPDATE "inventory_transfers" t
SET "total_tax" = COALESCE(agg.tax, 0),
    "total"     = COALESCE(agg.sub, 0) - COALESCE(agg.tax, 0)
FROM (
  SELECT "transfer_id",
         SUM(COALESCE("tax_amount", 0)) AS tax,
         SUM(COALESCE("subtotal", 0))   AS sub
  FROM "inventory_transfer_items"
  GROUP BY "transfer_id"
) agg
WHERE agg."transfer_id" = t."id"
  AND t."total" IS NULL;
