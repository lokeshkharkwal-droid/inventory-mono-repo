-- Phase 0 vertical slice: inventory_categories.
-- Hand-authored (migrate diff pattern) per the "Always create a Prisma
-- migration" rule — never `db push`/`migrate dev` against the shared DB.
-- Touches ONLY inventory_* tables (enforced by scripts/check-migration-ownership.ts).

CREATE TABLE "inventory_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "legacy_category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_categories_tenant_id_idx" ON "inventory_categories"("tenant_id");
CREATE INDEX "inventory_categories_deleted_at_idx" ON "inventory_categories"("deleted_at");
CREATE INDEX "inventory_categories_legacy_category_id_idx" ON "inventory_categories"("legacy_category_id");
