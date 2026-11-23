-- EZ Health Track batch parity for requisitions & transfers.
-- Link each requisition/transfer line to the specific product batch it reserves or
-- draws stock from (the legacy `option_id` / `serial_no` / `expiry` + `purchase_items`
-- analogue), and snapshot batch_no/serial_no/expiry on the line so the chosen batch
-- survives requisition -> transfer conversion and is shown on detail/PDF views.
-- Additive, nullable, idempotent; no back-fill (legacy rows keep batch_id NULL and
-- fall back to product-level stock movement in send/receive).

-- Transfer item: batch link + batch_no snapshot (expiry_date + product_serial already exist).
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "batch_no" TEXT;
CREATE INDEX IF NOT EXISTS "inventory_transfer_items_batch_id_idx"
  ON "inventory_transfer_items" ("batch_id");

-- Requisition item: batch link + snapshots (option_id already exists).
ALTER TABLE "inventory_requisition_items" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;
ALTER TABLE "inventory_requisition_items" ADD COLUMN IF NOT EXISTS "batch_no" TEXT;
ALTER TABLE "inventory_requisition_items" ADD COLUMN IF NOT EXISTS "serial_no" TEXT;
ALTER TABLE "inventory_requisition_items" ADD COLUMN IF NOT EXISTS "expiry_date" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "inventory_requisition_items_batch_id_idx"
  ON "inventory_requisition_items" ("batch_id");
