-- Custom roles + inventory-side user→role assignments (self-contained RBAC).
CREATE TABLE IF NOT EXISTS "inventory_roles" (
  "id"          TEXT NOT NULL,
  "tenant_id"   TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_roles_tenant_id_key_key"
  ON "inventory_roles" ("tenant_id", "key");
CREATE INDEX IF NOT EXISTS "inventory_roles_tenant_id_idx"
  ON "inventory_roles" ("tenant_id");

CREATE TABLE IF NOT EXISTS "inventory_user_roles" (
  "id"         TEXT NOT NULL,
  "tenant_id"  TEXT NOT NULL,
  "person_id"  TEXT NOT NULL,
  "role_key"   TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_user_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_user_roles_tenant_id_person_id_key"
  ON "inventory_user_roles" ("tenant_id", "person_id");
CREATE INDEX IF NOT EXISTS "inventory_user_roles_tenant_id_idx"
  ON "inventory_user_roles" ("tenant_id");
