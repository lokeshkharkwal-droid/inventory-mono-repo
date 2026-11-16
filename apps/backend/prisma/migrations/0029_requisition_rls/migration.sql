-- Row-Level Security for the new inventory_requisition_status_history table
-- (CLAUDE.md §4.3). Kept in a separate migration from the schema change (0028)
-- per the project rule. Mirrors the tenant-isolation policy applied to every
-- other tenant-scoped inventory_* table in prisma/rls.sql; idempotent.

ALTER TABLE inventory_requisition_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_requisition_status_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_requisition_status_history_tenant_isolation
  ON inventory_requisition_status_history;
CREATE POLICY inventory_requisition_status_history_tenant_isolation
  ON inventory_requisition_status_history
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
