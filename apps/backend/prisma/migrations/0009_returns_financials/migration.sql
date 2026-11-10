-- Deferred extensions: purchase/sale returns, sale deliveries, expenses, incomes,
-- gift cards. Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

-- ── inventory_purchase_returns ─────────────────────────────────────────────────
CREATE TABLE "inventory_purchase_returns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_purchase_returns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_purchase_returns_tenant_id_idx" ON "inventory_purchase_returns"("tenant_id");
CREATE INDEX "inventory_purchase_returns_branch_id_idx" ON "inventory_purchase_returns"("branch_id");
CREATE INDEX "inventory_purchase_returns_purchase_id_idx" ON "inventory_purchase_returns"("purchase_id");
CREATE INDEX "inventory_purchase_returns_deleted_at_idx" ON "inventory_purchase_returns"("deleted_at");

CREATE TABLE "inventory_purchase_return_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "cost" DECIMAL(18,4) NOT NULL,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_purchase_return_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_purchase_return_items_tenant_id_idx" ON "inventory_purchase_return_items"("tenant_id");
CREATE INDEX "inventory_purchase_return_items_return_id_idx" ON "inventory_purchase_return_items"("return_id");
CREATE INDEX "inventory_purchase_return_items_product_id_idx" ON "inventory_purchase_return_items"("product_id");
ALTER TABLE "inventory_purchase_return_items" ADD CONSTRAINT "inventory_purchase_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "inventory_purchase_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_sale_returns ─────────────────────────────────────────────────────
CREATE TABLE "inventory_sale_returns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "refund_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_sale_returns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_sale_returns_tenant_id_idx" ON "inventory_sale_returns"("tenant_id");
CREATE INDEX "inventory_sale_returns_branch_id_idx" ON "inventory_sale_returns"("branch_id");
CREATE INDEX "inventory_sale_returns_sale_id_idx" ON "inventory_sale_returns"("sale_id");
CREATE INDEX "inventory_sale_returns_deleted_at_idx" ON "inventory_sale_returns"("deleted_at");

CREATE TABLE "inventory_sale_return_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_sale_return_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_sale_return_items_tenant_id_idx" ON "inventory_sale_return_items"("tenant_id");
CREATE INDEX "inventory_sale_return_items_return_id_idx" ON "inventory_sale_return_items"("return_id");
CREATE INDEX "inventory_sale_return_items_product_id_idx" ON "inventory_sale_return_items"("product_id");
ALTER TABLE "inventory_sale_return_items" ADD CONSTRAINT "inventory_sale_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "inventory_sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── inventory_sale_deliveries ──────────────────────────────────────────────────
CREATE TABLE "inventory_sale_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "sale_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tracking_no" TEXT,
    "delivered_to" TEXT,
    "address" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_sale_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_sale_deliveries_tenant_id_idx" ON "inventory_sale_deliveries"("tenant_id");
CREATE INDEX "inventory_sale_deliveries_sale_id_idx" ON "inventory_sale_deliveries"("sale_id");
CREATE INDEX "inventory_sale_deliveries_deleted_at_idx" ON "inventory_sale_deliveries"("deleted_at");

-- ── inventory_expenses ─────────────────────────────────────────────────────────
CREATE TABLE "inventory_expenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "category_id" TEXT,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "legacy_expense_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_expenses_tenant_id_idx" ON "inventory_expenses"("tenant_id");
CREATE INDEX "inventory_expenses_branch_id_idx" ON "inventory_expenses"("branch_id");
CREATE INDEX "inventory_expenses_deleted_at_idx" ON "inventory_expenses"("deleted_at");

-- ── inventory_incomes ──────────────────────────────────────────────────────────
CREATE TABLE "inventory_incomes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "category_id" TEXT,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "legacy_income_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_incomes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_incomes_tenant_id_idx" ON "inventory_incomes"("tenant_id");
CREATE INDEX "inventory_incomes_branch_id_idx" ON "inventory_incomes"("branch_id");
CREATE INDEX "inventory_incomes_deleted_at_idx" ON "inventory_incomes"("deleted_at");

-- ── inventory_gift_cards ───────────────────────────────────────────────────────
CREATE TABLE "inventory_gift_cards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "code" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "balance" DECIMAL(18,4) NOT NULL,
    "customer_id" TEXT,
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "legacy_gift_card_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_gift_cards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_gift_cards_tenant_id_idx" ON "inventory_gift_cards"("tenant_id");
CREATE INDEX "inventory_gift_cards_deleted_at_idx" ON "inventory_gift_cards"("deleted_at");
CREATE UNIQUE INDEX "inventory_gift_cards_tenant_code_active_unique" ON "inventory_gift_cards"("tenant_id", "code") WHERE "deleted_at" IS NULL;
