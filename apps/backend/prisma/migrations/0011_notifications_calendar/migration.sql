-- Notifications, Calendar, and the cross-tenant alert registry.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- ── inventory_notifications ────────────────────────────────────────────────────
CREATE TABLE "inventory_notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_notifications_tenant_id_idx" ON "inventory_notifications"("tenant_id");
CREATE INDEX "inventory_notifications_branch_id_idx" ON "inventory_notifications"("branch_id");
CREATE INDEX "inventory_notifications_is_read_idx" ON "inventory_notifications"("is_read");
CREATE INDEX "inventory_notifications_dedupe_key_idx" ON "inventory_notifications"("dedupe_key");
CREATE INDEX "inventory_notifications_deleted_at_idx" ON "inventory_notifications"("deleted_at");

-- ── inventory_calendar_events ──────────────────────────────────────────────────
CREATE TABLE "inventory_calendar_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_calendar_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_calendar_events_tenant_id_idx" ON "inventory_calendar_events"("tenant_id");
CREATE INDEX "inventory_calendar_events_branch_id_idx" ON "inventory_calendar_events"("branch_id");
CREATE INDEX "inventory_calendar_events_start_at_idx" ON "inventory_calendar_events"("start_at");
CREATE INDEX "inventory_calendar_events_deleted_at_idx" ON "inventory_calendar_events"("deleted_at");

-- ── inventory_tenant_registry (platform-level; NO RLS) ─────────────────────────
-- Enumeration source for the cross-tenant alert cron. Intentionally not
-- tenant-scoped and not placed under RLS in rls.sql.
CREATE TABLE "inventory_tenant_registry" (
    "tenant_id" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_tenant_registry_pkey" PRIMARY KEY ("tenant_id")
);
