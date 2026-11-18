-- Proforma ↔ entity mapping (legacy EZHT `ez_proforma_relation`) + an idempotency
-- ledger linking a kalnostics-new order to the inventory it consumed. Both tables
-- are tenant-scoped (RLS in the paired 0043 migration). Additive + idempotent.

CREATE TABLE IF NOT EXISTS "inventory_proforma_relations" (
  "id"          TEXT NOT NULL,
  "tenant_id"   TEXT NOT NULL,
  "branch_id"   TEXT,
  "proforma_id" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id"   TEXT NOT NULL,
  "label"       TEXT,
  "created_by"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at"  TIMESTAMP(3),
  CONSTRAINT "inventory_proforma_relations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_proforma_relations_proforma_id_fkey"
    FOREIGN KEY ("proforma_id") REFERENCES "inventory_proformas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "inventory_proforma_relations_tenant_id_idx"
  ON "inventory_proforma_relations" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_proforma_relations_proforma_id_idx"
  ON "inventory_proforma_relations" ("proforma_id");
CREATE INDEX IF NOT EXISTS "inventory_proforma_relations_entity_type_entity_id_idx"
  ON "inventory_proforma_relations" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "inventory_proforma_relations_deleted_at_idx"
  ON "inventory_proforma_relations" ("deleted_at");

CREATE TABLE IF NOT EXISTS "inventory_order_consumptions" (
  "id"                  TEXT NOT NULL,
  "tenant_id"           TEXT NOT NULL,
  "branch_id"           TEXT NOT NULL,
  "kalnostics_order_id" TEXT NOT NULL,
  "order_code"          TEXT,
  "sale_id"             TEXT,
  "status"              TEXT NOT NULL DEFAULT 'CONSUMED',
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_order_consumptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_order_consumptions_kalnostics_order_id_key"
  ON "inventory_order_consumptions" ("kalnostics_order_id");
CREATE INDEX IF NOT EXISTS "inventory_order_consumptions_tenant_id_idx"
  ON "inventory_order_consumptions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_order_consumptions_branch_id_idx"
  ON "inventory_order_consumptions" ("branch_id");
CREATE INDEX IF NOT EXISTS "inventory_order_consumptions_sale_id_idx"
  ON "inventory_order_consumptions" ("sale_id");
