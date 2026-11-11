-- Customer referral suggestions: track who referred each customer (self-FK).
ALTER TABLE "inventory_customers"
  ADD COLUMN IF NOT EXISTS "referred_by_customer_id" TEXT;

CREATE INDEX IF NOT EXISTS "inventory_customers_referred_by_customer_id_idx"
  ON "inventory_customers" ("referred_by_customer_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_customers_referred_by_customer_id_fkey'
  ) THEN
    ALTER TABLE "inventory_customers"
      ADD CONSTRAINT "inventory_customers_referred_by_customer_id_fkey"
      FOREIGN KEY ("referred_by_customer_id")
      REFERENCES "inventory_customers" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
