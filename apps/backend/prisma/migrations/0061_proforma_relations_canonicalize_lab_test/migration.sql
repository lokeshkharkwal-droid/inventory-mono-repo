-- Canonicalize existing proforma "Lab Test" mappings onto one row per logical test.
--
-- Background: `GET /lab-tests/options` used to return every per-branch Master Data
-- copy of a test (same name, different id) alongside the Tenant Master Data
-- original, so a mapping could be stored keyed on a *branch copy's* id. Kalnostics
-- now resolves each ordered test to its canonical original
-- (`lab_test.source_master_lab_test_id`, falling back to itself for a branch-only
-- test), and the picker lists only those originals. This migration brings existing
-- mappings onto the same key so they keep matching at order time: rewrite any
-- lab_test relation that points at a branch copy onto the original it was cloned
-- from.
--
-- Both `inventory_proforma_relations` and kalnostics' `lab_test` are FORCE ROW
-- LEVEL SECURITY, and `prisma db execute` runs with no `app.current_tenant_id`
-- set (so every row is hidden). We therefore run per tenant with the GUC set,
-- enumerating tenants from the platform-level, non-RLS `tenants` table.
--
-- Idempotent: an original has `source_master_lab_test_id IS NULL` and never
-- matches the join, so a re-run changes nothing.

-- 1. Branch-copy keys → their Tenant Master Data original.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    PERFORM set_config('app.current_tenant_id', t, true);

    UPDATE inventory_proforma_relations r
       SET entity_id  = lt.source_master_lab_test_id,
           updated_at = now()
      FROM lab_test lt
     WHERE r.entity_type = 'lab_test'
       AND r.deleted_at IS NULL
       AND r.tenant_id = t
       AND r.entity_id = lt.id
       AND lt.tenant_id = t
       AND lt.source_master_lab_test_id IS NOT NULL;
  END LOOP;
END $$;

-- 2. Collapse any resulting duplicate live mappings (a proforma that was mapped to
--    both a branch copy and the original now points at the same id twice): keep the
--    earliest, soft-delete the rest. Distinct-entity-id counting at consumption
--    time already makes duplicates harmless to deduction; this only keeps the
--    "Mapped lab tests" list clean.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    PERFORM set_config('app.current_tenant_id', t, true);

    UPDATE inventory_proforma_relations r
       SET deleted_at = now(),
           updated_at = now()
      FROM (
        SELECT id,
               row_number() OVER (
                 PARTITION BY proforma_id, entity_id
                 ORDER BY created_at, id
               ) AS rn
          FROM inventory_proforma_relations
         WHERE entity_type = 'lab_test'
           AND deleted_at IS NULL
           AND tenant_id = t
      ) dup
     WHERE r.id = dup.id
       AND dup.rn > 1;
  END LOOP;
END $$;
