-- Tenant drug master (EZHT `pharmacy_drug`) + link the per-product drug-composition
-- rows to it (EZHT `ez_product_relation`): add `drug_id` + soft-delete to the
-- existing per-product rows. Additive and idempotent.

CREATE TABLE IF NOT EXISTS "inventory_drugs" (
  "id"                TEXT NOT NULL,
  "tenant_id"         TEXT NOT NULL,
  "name"              TEXT NOT NULL,
  "dosage"            TEXT,
  "side_effect"       TEXT,
  "indication"        TEXT,
  "contra_indication" TEXT,
  "formulation"       TEXT,
  "storage_condition" TEXT,
  "precaution"        TEXT,
  "safety"            TEXT,
  "therapeutic_group" TEXT,
  "is_active"         BOOLEAN NOT NULL DEFAULT true,
  "legacy_drug_id"    TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  "deleted_at"        TIMESTAMP(3),
  CONSTRAINT "inventory_drugs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_drugs_tenant_id_idx" ON "inventory_drugs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_drugs_name_idx" ON "inventory_drugs" ("name");
CREATE INDEX IF NOT EXISTS "inventory_drugs_deleted_at_idx" ON "inventory_drugs" ("deleted_at");

ALTER TABLE "inventory_product_drugs" ADD COLUMN IF NOT EXISTS "drug_id" TEXT;
ALTER TABLE "inventory_product_drugs" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "inventory_product_drugs_drug_id_idx" ON "inventory_product_drugs" ("drug_id");
CREATE INDEX IF NOT EXISTS "inventory_product_drugs_deleted_at_idx" ON "inventory_product_drugs" ("deleted_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_drugs_drug_id_fkey'
  ) THEN
    ALTER TABLE "inventory_product_drugs"
      ADD CONSTRAINT "inventory_product_drugs_drug_id_fkey"
      FOREIGN KEY ("drug_id") REFERENCES "inventory_drugs" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
