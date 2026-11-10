-- Phase 6: blood bank (donors, donations, requests) + IPD admissions.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- ── inventory_blood_donors ────────────────────────────────────────────────────
CREATE TABLE "inventory_blood_donors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "patient_id" TEXT,
    "name" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "last_donation_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "legacy_donor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_blood_donors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_blood_donors_tenant_id_idx" ON "inventory_blood_donors"("tenant_id");
CREATE INDEX "inventory_blood_donors_branch_id_idx" ON "inventory_blood_donors"("branch_id");
CREATE INDEX "inventory_blood_donors_blood_group_idx" ON "inventory_blood_donors"("blood_group");
CREATE INDEX "inventory_blood_donors_deleted_at_idx" ON "inventory_blood_donors"("deleted_at");

-- ── inventory_blood_donations ─────────────────────────────────────────────────
CREATE TABLE "inventory_blood_donations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "donor_id" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "component" TEXT NOT NULL DEFAULT 'WHOLE_BLOOD',
    "volume_ml" DECIMAL(10,2),
    "bag_number" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'COLLECTED',
    "note" TEXT,
    "legacy_donation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_blood_donations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_blood_donations_tenant_id_idx" ON "inventory_blood_donations"("tenant_id");
CREATE INDEX "inventory_blood_donations_branch_id_idx" ON "inventory_blood_donations"("branch_id");
CREATE INDEX "inventory_blood_donations_blood_group_idx" ON "inventory_blood_donations"("blood_group");
CREATE INDEX "inventory_blood_donations_status_idx" ON "inventory_blood_donations"("status");
CREATE INDEX "inventory_blood_donations_deleted_at_idx" ON "inventory_blood_donations"("deleted_at");
ALTER TABLE "inventory_blood_donations" ADD CONSTRAINT "inventory_blood_donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "inventory_blood_donors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── inventory_blood_requests ──────────────────────────────────────────────────
CREATE TABLE "inventory_blood_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "patient_id" TEXT,
    "patient_name" TEXT,
    "blood_group" TEXT NOT NULL,
    "component" TEXT NOT NULL DEFAULT 'WHOLE_BLOOD',
    "units" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "legacy_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_blood_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_blood_requests_tenant_id_idx" ON "inventory_blood_requests"("tenant_id");
CREATE INDEX "inventory_blood_requests_branch_id_idx" ON "inventory_blood_requests"("branch_id");
CREATE INDEX "inventory_blood_requests_status_idx" ON "inventory_blood_requests"("status");
CREATE INDEX "inventory_blood_requests_deleted_at_idx" ON "inventory_blood_requests"("deleted_at");

-- ── inventory_ipd_admissions ──────────────────────────────────────────────────
CREATE TABLE "inventory_ipd_admissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "patient_id" TEXT,
    "patient_name" TEXT NOT NULL,
    "admission_no" TEXT NOT NULL,
    "ward" TEXT,
    "bed" TEXT,
    "referring_doctor" TEXT,
    "admitted_at" TIMESTAMP(3) NOT NULL,
    "discharged_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ADMITTED',
    "note" TEXT,
    "legacy_admission_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_ipd_admissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_ipd_admissions_tenant_id_idx" ON "inventory_ipd_admissions"("tenant_id");
CREATE INDEX "inventory_ipd_admissions_branch_id_idx" ON "inventory_ipd_admissions"("branch_id");
CREATE INDEX "inventory_ipd_admissions_status_idx" ON "inventory_ipd_admissions"("status");
CREATE INDEX "inventory_ipd_admissions_deleted_at_idx" ON "inventory_ipd_admissions"("deleted_at");
