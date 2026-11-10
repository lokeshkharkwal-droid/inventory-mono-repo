-- Finance/parties extensions: customer deposits, purchase expenses, supplier
-- payments, email templates + settings business-profile/gateway columns.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- Settings: business profile + payment-gateway config.
ALTER TABLE "inventory_settings" ADD COLUMN "business_name" TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "business_address" TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "business_phone" TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "business_email" TEXT;
ALTER TABLE "inventory_settings" ADD COLUMN "payment_gateways" JSONB;

-- ── inventory_customer_deposits ───────────────────────────────────────────────
CREATE TABLE "inventory_customer_deposits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DEPOSIT',
    "amount" DECIMAL(18,4) NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_customer_deposits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_customer_deposits_tenant_id_idx" ON "inventory_customer_deposits"("tenant_id");
CREATE INDEX "inventory_customer_deposits_customer_id_idx" ON "inventory_customer_deposits"("customer_id");
CREATE INDEX "inventory_customer_deposits_deleted_at_idx" ON "inventory_customer_deposits"("deleted_at");

-- ── inventory_purchase_expenses ───────────────────────────────────────────────
CREATE TABLE "inventory_purchase_expenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "category" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_purchase_expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_purchase_expenses_tenant_id_idx" ON "inventory_purchase_expenses"("tenant_id");
CREATE INDEX "inventory_purchase_expenses_purchase_id_idx" ON "inventory_purchase_expenses"("purchase_id");
CREATE INDEX "inventory_purchase_expenses_deleted_at_idx" ON "inventory_purchase_expenses"("deleted_at");

-- ── inventory_supplier_payments ───────────────────────────────────────────────
CREATE TABLE "inventory_supplier_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_supplier_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_supplier_payments_tenant_id_idx" ON "inventory_supplier_payments"("tenant_id");
CREATE INDEX "inventory_supplier_payments_supplier_id_idx" ON "inventory_supplier_payments"("supplier_id");
CREATE INDEX "inventory_supplier_payments_deleted_at_idx" ON "inventory_supplier_payments"("deleted_at");

-- ── inventory_email_templates ─────────────────────────────────────────────────
CREATE TABLE "inventory_email_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_email_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_email_templates_tenant_id_idx" ON "inventory_email_templates"("tenant_id");
CREATE INDEX "inventory_email_templates_deleted_at_idx" ON "inventory_email_templates"("deleted_at");
