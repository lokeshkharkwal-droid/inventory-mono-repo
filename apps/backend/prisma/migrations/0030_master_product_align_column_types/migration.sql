-- Align inventory_master_products column types with schema.prisma.
-- Earlier history applied 0023_master_product_full_form (== 0027) first, creating
-- JSONB/numeric/int/bool columns; the later TEXT[]/TEXT versions in 0023/0025 were
-- no-ops because of ADD COLUMN IF NOT EXISTS. Idempotent: only alters when needed.
DO $$
DECLARE
  col TEXT;
BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'inventory_master_products'
          AND column_name = 'gallery_image_urls') = 'jsonb' THEN
    ALTER TABLE "inventory_master_products"
      ADD COLUMN "gallery_image_urls_new" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
    UPDATE "inventory_master_products"
       SET "gallery_image_urls_new" = ARRAY(SELECT jsonb_array_elements_text("gallery_image_urls"))
     WHERE jsonb_typeof("gallery_image_urls") = 'array';
    ALTER TABLE "inventory_master_products" DROP COLUMN "gallery_image_urls";
    ALTER TABLE "inventory_master_products"
      RENAME COLUMN "gallery_image_urls_new" TO "gallery_image_urls";
  END IF;

  FOREACH col IN ARRAY ARRAY['pack_size', 'prescription_quantity', 'number_of_days', 'refill_times', 'refills'] LOOP
    IF (SELECT data_type FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'inventory_master_products'
            AND column_name = col) <> 'text' THEN
      EXECUTE format('ALTER TABLE "inventory_master_products" ALTER COLUMN %I DROP DEFAULT', col);
      EXECUTE format('ALTER TABLE "inventory_master_products" ALTER COLUMN %I TYPE TEXT USING %I::text', col, col);
    END IF;
  END LOOP;
END $$;
