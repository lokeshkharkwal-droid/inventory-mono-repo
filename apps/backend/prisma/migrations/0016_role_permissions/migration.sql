-- Per-tenant, per-role permission overrides (runtime RBAC grants).
CREATE TABLE IF NOT EXISTS "inventory_role_permissions" (
  "id"           TEXT NOT NULL,
  "tenant_id"    TEXT NOT NULL,
  "profile_key"  TEXT NOT NULL,
  "permissions"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_role_permissions_tenant_id_profile_key_key"
  ON "inventory_role_permissions" ("tenant_id", "profile_key");

CREATE INDEX IF NOT EXISTS "inventory_role_permissions_tenant_id_idx"
  ON "inventory_role_permissions" ("tenant_id");
