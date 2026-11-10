-- Phase 4: POS registers + register sessions, and a pos_session_id link on sales.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- Link sales rung up through POS to their register session.
ALTER TABLE "inventory_sales" ADD COLUMN "pos_session_id" TEXT;
CREATE INDEX "inventory_sales_pos_session_id_idx" ON "inventory_sales"("pos_session_id");

-- ── inventory_pos_registers ───────────────────────────────────────────────────
CREATE TABLE "inventory_pos_registers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_register_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_pos_registers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_pos_registers_tenant_id_idx" ON "inventory_pos_registers"("tenant_id");
CREATE INDEX "inventory_pos_registers_branch_id_idx" ON "inventory_pos_registers"("branch_id");
CREATE INDEX "inventory_pos_registers_deleted_at_idx" ON "inventory_pos_registers"("deleted_at");

-- ── inventory_pos_register_sessions ───────────────────────────────────────────
CREATE TABLE "inventory_pos_register_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "register_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "opening_cash" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "closing_cash" DECIMAL(18,4),
    "expected_cash" DECIMAL(18,4),
    "opened_by" TEXT,
    "closed_by" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_pos_register_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_pos_register_sessions_tenant_id_idx" ON "inventory_pos_register_sessions"("tenant_id");
CREATE INDEX "inventory_pos_register_sessions_branch_id_idx" ON "inventory_pos_register_sessions"("branch_id");
CREATE INDEX "inventory_pos_register_sessions_register_id_idx" ON "inventory_pos_register_sessions"("register_id");
CREATE INDEX "inventory_pos_register_sessions_status_idx" ON "inventory_pos_register_sessions"("status");
ALTER TABLE "inventory_pos_register_sessions" ADD CONSTRAINT "inventory_pos_register_sessions_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "inventory_pos_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
