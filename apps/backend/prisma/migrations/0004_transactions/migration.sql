-- Phase 1c: parties (suppliers, customers) + transactions (purchases, sales,
-- transfers, requisitions) with line items + payments.
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- ── inventory_suppliers ───────────────────────────────────────────────────────
CREATE TABLE "inventory_suppliers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_number" TEXT,
    "opening_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_supplier_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_suppliers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_suppliers_tenant_id_idx" ON "inventory_suppliers"("tenant_id");
CREATE INDEX "inventory_suppliers_deleted_at_idx" ON "inventory_suppliers"("deleted_at");
CREATE INDEX "inventory_suppliers_legacy_supplier_id_idx" ON "inventory_suppliers"("legacy_supplier_id");

-- ── inventory_customers ───────────────────────────────────────────────────────
CREATE TABLE "inventory_customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_number" TEXT,
    "credit_limit" DECIMAL(18,4),
    "patient_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_customers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_customers_tenant_id_idx" ON "inventory_customers"("tenant_id");
CREATE INDEX "inventory_customers_deleted_at_idx" ON "inventory_customers"("deleted_at");
CREATE INDEX "inventory_customers_patient_id_idx" ON "inventory_customers"("patient_id");
CREATE INDEX "inventory_customers_legacy_customer_id_idx" ON "inventory_customers"("legacy_customer_id");

-- ── inventory_purchases ───────────────────────────────────────────────────────
CREATE TABLE "inventory_purchases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "order_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "order_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paid" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_by" TEXT,
    "legacy_purchase_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_purchases_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_purchases_tenant_id_idx" ON "inventory_purchases"("tenant_id");
CREATE INDEX "inventory_purchases_branch_id_idx" ON "inventory_purchases"("branch_id");
CREATE INDEX "inventory_purchases_supplier_id_idx" ON "inventory_purchases"("supplier_id");
CREATE INDEX "inventory_purchases_deleted_at_idx" ON "inventory_purchases"("deleted_at");
CREATE INDEX "inventory_purchases_legacy_purchase_id_idx" ON "inventory_purchases"("legacy_purchase_id");
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "inventory_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_purchase_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "cost" DECIMAL(18,4) NOT NULL,
    "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "batch_no" TEXT,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_purchase_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_purchase_items_tenant_id_idx" ON "inventory_purchase_items"("tenant_id");
CREATE INDEX "inventory_purchase_items_purchase_id_idx" ON "inventory_purchase_items"("purchase_id");
CREATE INDEX "inventory_purchase_items_product_id_idx" ON "inventory_purchase_items"("product_id");
ALTER TABLE "inventory_purchase_items" ADD CONSTRAINT "inventory_purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "inventory_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "inventory_purchase_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_purchase_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_purchase_payments_tenant_id_idx" ON "inventory_purchase_payments"("tenant_id");
CREATE INDEX "inventory_purchase_payments_purchase_id_idx" ON "inventory_purchase_payments"("purchase_id");
ALTER TABLE "inventory_purchase_payments" ADD CONSTRAINT "inventory_purchase_payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "inventory_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_sales ───────────────────────────────────────────────────────────
CREATE TABLE "inventory_sales" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "biller_name" TEXT,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "order_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "order_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paid" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_by" TEXT,
    "legacy_sale_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_sales_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_sales_tenant_id_idx" ON "inventory_sales"("tenant_id");
CREATE INDEX "inventory_sales_branch_id_idx" ON "inventory_sales"("branch_id");
CREATE INDEX "inventory_sales_customer_id_idx" ON "inventory_sales"("customer_id");
CREATE INDEX "inventory_sales_deleted_at_idx" ON "inventory_sales"("deleted_at");
CREATE INDEX "inventory_sales_legacy_sale_id_idx" ON "inventory_sales"("legacy_sale_id");
ALTER TABLE "inventory_sales" ADD CONSTRAINT "inventory_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "inventory_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_sale_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_sale_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_sale_items_tenant_id_idx" ON "inventory_sale_items"("tenant_id");
CREATE INDEX "inventory_sale_items_sale_id_idx" ON "inventory_sale_items"("sale_id");
CREATE INDEX "inventory_sale_items_product_id_idx" ON "inventory_sale_items"("product_id");
ALTER TABLE "inventory_sale_items" ADD CONSTRAINT "inventory_sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "inventory_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "inventory_sale_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_sale_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_sale_payments_tenant_id_idx" ON "inventory_sale_payments"("tenant_id");
CREATE INDEX "inventory_sale_payments_sale_id_idx" ON "inventory_sale_payments"("sale_id");
ALTER TABLE "inventory_sale_payments" ADD CONSTRAINT "inventory_sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "inventory_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_transfers ───────────────────────────────────────────────────────
CREATE TABLE "inventory_transfers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_branch_id" TEXT NOT NULL,
    "to_branch_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_by" TEXT,
    "legacy_transfer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_transfers_tenant_id_idx" ON "inventory_transfers"("tenant_id");
CREATE INDEX "inventory_transfers_from_branch_id_idx" ON "inventory_transfers"("from_branch_id");
CREATE INDEX "inventory_transfers_to_branch_id_idx" ON "inventory_transfers"("to_branch_id");
CREATE INDEX "inventory_transfers_deleted_at_idx" ON "inventory_transfers"("deleted_at");
CREATE INDEX "inventory_transfers_legacy_transfer_id_idx" ON "inventory_transfers"("legacy_transfer_id");

CREATE TABLE "inventory_transfer_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_transfer_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_transfer_items_tenant_id_idx" ON "inventory_transfer_items"("tenant_id");
CREATE INDEX "inventory_transfer_items_transfer_id_idx" ON "inventory_transfer_items"("transfer_id");
CREATE INDEX "inventory_transfer_items_product_id_idx" ON "inventory_transfer_items"("product_id");
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "inventory_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_requisitions ────────────────────────────────────────────────────
CREATE TABLE "inventory_requisitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "from_branch_id" TEXT,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_by" TEXT,
    "approved_by" TEXT,
    "legacy_requisition_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_requisitions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_requisitions_tenant_id_idx" ON "inventory_requisitions"("tenant_id");
CREATE INDEX "inventory_requisitions_branch_id_idx" ON "inventory_requisitions"("branch_id");
CREATE INDEX "inventory_requisitions_deleted_at_idx" ON "inventory_requisitions"("deleted_at");
CREATE INDEX "inventory_requisitions_legacy_requisition_id_idx" ON "inventory_requisitions"("legacy_requisition_id");

CREATE TABLE "inventory_requisition_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_requisition_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_requisition_items_tenant_id_idx" ON "inventory_requisition_items"("tenant_id");
CREATE INDEX "inventory_requisition_items_requisition_id_idx" ON "inventory_requisition_items"("requisition_id");
CREATE INDEX "inventory_requisition_items_product_id_idx" ON "inventory_requisition_items"("product_id");
ALTER TABLE "inventory_requisition_items" ADD CONSTRAINT "inventory_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "inventory_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
