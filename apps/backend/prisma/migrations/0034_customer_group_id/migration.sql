-- EZ Health Track "Default Customer Group" field on the customer/patient add form.
-- Stores the chosen customer-group id. Additive + nullable. Idempotent.

ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "customer_group_id" TEXT;
