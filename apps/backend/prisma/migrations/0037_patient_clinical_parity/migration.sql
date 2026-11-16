-- EZ Health Track "Add Patient" clinical-registration parity: name parts, gender,
-- age/DOB, registration date, patient type, address2, locality (area), ID type/UID.
-- Stored on inventory_customers (a Patient is a customer linked to a patient record).
-- Additive + nullable. Idempotent.

ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "middle_name" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "last_name" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "age" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "dob" TIMESTAMP(3);
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "registration_date" TIMESTAMP(3);
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "patient_type" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "address2" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "area_id" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "id_type" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "uid" TEXT;
