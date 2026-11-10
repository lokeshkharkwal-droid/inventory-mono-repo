-- Blood-donation purchase order (legacy BD purchase): flag + donor name.
ALTER TABLE "inventory_purchases"
  ADD COLUMN IF NOT EXISTS "is_blood_donation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "donor_name" TEXT;
