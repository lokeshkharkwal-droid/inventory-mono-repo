-- Deferred clinical/POS extensions: POS cashier PIN, blood cross-matching,
-- IPD billing. Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- POS cashier PIN on the settings singleton.
ALTER TABLE "inventory_settings" ADD COLUMN "pos_pin" TEXT;

-- ── inventory_blood_cross_matches ──────────────────────────────────────────────
CREATE TABLE "inventory_blood_cross_matches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "request_id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "is_auto_result" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "cross_matched_by" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_blood_cross_matches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_blood_cross_matches_tenant_id_idx" ON "inventory_blood_cross_matches"("tenant_id");
CREATE INDEX "inventory_blood_cross_matches_request_id_idx" ON "inventory_blood_cross_matches"("request_id");
CREATE INDEX "inventory_blood_cross_matches_donation_id_idx" ON "inventory_blood_cross_matches"("donation_id");
CREATE INDEX "inventory_blood_cross_matches_deleted_at_idx" ON "inventory_blood_cross_matches"("deleted_at");

-- ── inventory_ipd_charges ──────────────────────────────────────────────────────
CREATE TABLE "inventory_ipd_charges" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_ipd_charges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_ipd_charges_tenant_id_idx" ON "inventory_ipd_charges"("tenant_id");
CREATE INDEX "inventory_ipd_charges_admission_id_idx" ON "inventory_ipd_charges"("admission_id");
CREATE INDEX "inventory_ipd_charges_deleted_at_idx" ON "inventory_ipd_charges"("deleted_at");
