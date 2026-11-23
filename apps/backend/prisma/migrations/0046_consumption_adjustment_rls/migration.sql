-- Row-Level Security for the two tables added in 0045 (CLAUDE.md §4.3). Kept in a
-- separate migration from the schema change per the project rule. Mirrors the
-- tenant-isolation policy applied to every other tenant-scoped inventory_* table in
-- prisma/rls.sql; idempotent.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_consumption_lines',
    'inventory_consumption_adjustments'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
      t || '_tenant_isolation', t
    );
  END LOOP;
END $$;
