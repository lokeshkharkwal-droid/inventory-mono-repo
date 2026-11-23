-- EZ Health Track full add-form parity for Requisitions & Transfers.
--
-- Requisition header gains the legacy identity fields that the new form was
-- missing: Biller, Supplier, Customer (id + snapshotted name) and the Referral
-- block (source type + contact/business details + doctor + SLN id). Transfer
-- item gains Pack MRP and HSN code. All additive + nullable + idempotent; no
-- behaviour change to existing rows.

-- ── Requisition: Biller / Supplier / Customer snapshots ──
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "biller_id" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "biller_name" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "supplier_id" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "supplier_name" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "customer_id" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "customer_name" TEXT;

-- ── Requisition: Referral block (legacy ReferralForm[...]) ──
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "referral_source_type" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "referral_contact_fname" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "referral_contact_mname" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "referral_contact_lname" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "referral_business_name" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "referral_business_address" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "referral_doctor_name" TEXT;
ALTER TABLE "inventory_requisitions" ADD COLUMN IF NOT EXISTS "referral_sln_id" TEXT;

-- ── Transfer item: Pack MRP + HSN code ──
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "pack_mrp" DECIMAL(18,4);
ALTER TABLE "inventory_transfer_items" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;
