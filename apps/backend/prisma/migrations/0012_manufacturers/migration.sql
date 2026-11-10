-- Manufacturers party master (legacy companies.group_name=manufacturer).
-- Hand-authored (migrate diff pattern). Touches ONLY inventory_* tables.

CREATE TABLE "inventory_manufacturers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "image_url" TEXT,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_manufacturer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "inventory_manufacturers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_manufacturers_tenant_id_idx" ON "inventory_manufacturers"("tenant_id");
CREATE INDEX "inventory_manufacturers_deleted_at_idx" ON "inventory_manufacturers"("deleted_at");
CREATE INDEX "inventory_manufacturers_legacy_manufacturer_id_idx" ON "inventory_manufacturers"("legacy_manufacturer_id");
