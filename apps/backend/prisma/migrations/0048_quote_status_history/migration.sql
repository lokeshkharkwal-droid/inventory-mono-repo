-- Quote status-change trail (EZHT `comments_history` for quotes). Records each
-- approve/reject/convert/edit transition with an optional comment and actor, so
-- the quote detail view can show a timeline. Additive + idempotent.

CREATE TABLE IF NOT EXISTS "inventory_quote_status_history" (
  "id"              TEXT NOT NULL,
  "tenant_id"       TEXT NOT NULL,
  "quote_id"        TEXT NOT NULL,
  "status"          TEXT NOT NULL,
  "comment"         TEXT,
  "created_by"      TEXT,
  "created_by_name" TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_quote_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_quote_status_history_tenant_id_idx"
  ON "inventory_quote_status_history" ("tenant_id");
CREATE INDEX IF NOT EXISTS "inventory_quote_status_history_quote_id_idx"
  ON "inventory_quote_status_history" ("quote_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inventory_quote_status_history_quote_id_fkey'
  ) THEN
    ALTER TABLE "inventory_quote_status_history"
      ADD CONSTRAINT "inventory_quote_status_history_quote_id_fkey"
      FOREIGN KEY ("quote_id") REFERENCES "inventory_quotes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Row-Level Security (CLAUDE.md §4.3) — tenant isolation on app.current_tenant_id.
ALTER TABLE "inventory_quote_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_quote_status_history" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_quote_status_history_tenant_isolation"
  ON "inventory_quote_status_history";
CREATE POLICY "inventory_quote_status_history_tenant_isolation"
  ON "inventory_quote_status_history"
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
