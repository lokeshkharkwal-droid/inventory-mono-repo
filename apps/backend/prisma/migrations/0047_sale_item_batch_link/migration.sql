-- Batch-aware sales. Link each sale line to the batch it drew stock from, so the
-- batch ledger (inventory_product_batches) can be decremented on sale and restored
-- on edit. Add a tenant toggle to block selling from expired batches (default off =
-- sellable with a UI warning). Additive, nullable, idempotent.

ALTER TABLE "inventory_sale_items" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;
CREATE INDEX IF NOT EXISTS "inventory_sale_items_batch_id_idx"
  ON "inventory_sale_items" ("batch_id");

-- Composite lookup for per-(tenant, branch, product) batch availability queries.
CREATE INDEX IF NOT EXISTS "inventory_product_batches_lookup_idx"
  ON "inventory_product_batches" ("tenant_id", "branch_id", "product_id", "deleted_at");

-- Link a batch back to the purchase receipt that created it, so a purchase edit can
-- reconcile exactly the batches it owns (stable across item replacement).
ALTER TABLE "inventory_product_batches" ADD COLUMN IF NOT EXISTS "source_purchase_id" TEXT;
CREATE INDEX IF NOT EXISTS "inventory_product_batches_source_purchase_id_idx"
  ON "inventory_product_batches" ("source_purchase_id");

ALTER TABLE "inventory_settings"
  ADD COLUMN IF NOT EXISTS "is_expired_sale_blocked" BOOLEAN NOT NULL DEFAULT false;
