-- Location reference ids for the address/party forms. The City/State/Country
-- dropdowns pull from SiteAdmin's canonical location data (kalnostics `/locations`);
-- we persist the chosen id (for reliable dependent dropdowns + edit re-selection)
-- alongside the existing display-name text columns. All additive + nullable.
-- Idempotent.

ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "country_id" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "state_id" TEXT;
ALTER TABLE "inventory_suppliers" ADD COLUMN IF NOT EXISTS "city_id" TEXT;

ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "country_id" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "state_id" TEXT;
ALTER TABLE "inventory_manufacturers" ADD COLUMN IF NOT EXISTS "city_id" TEXT;

ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "country_id" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "state_id" TEXT;
ALTER TABLE "inventory_customers" ADD COLUMN IF NOT EXISTS "city_id" TEXT;
