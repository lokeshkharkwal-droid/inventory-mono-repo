-- EZ Health Track transfer-item parity: `quantity_balance` mirrors the legacy
-- `ez_transfer_items.quantity_balance`, set equal to `quantity` at creation.
-- (EZHT stores it = quantity and does not reduce it on receive — the partial-
-- receive flow is unimplemented in the legacy UI — so we match that behaviour.)
-- Additive, nullable, idempotent; back-filled from existing quantity.

ALTER TABLE "inventory_transfer_items"
  ADD COLUMN IF NOT EXISTS "quantity_balance" DECIMAL(18,4);

UPDATE "inventory_transfer_items"
  SET "quantity_balance" = "quantity"
  WHERE "quantity_balance" IS NULL;
