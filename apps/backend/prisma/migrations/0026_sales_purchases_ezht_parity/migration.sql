-- EZHT sales & purchases parity: extend the sale/purchase header, line-item, and
-- payment tables with the full legacy add-sale / add-purchase field set
-- (biller, order discount/tax specs, GST igst/cgst/sgst, HSN, pack sizes,
-- serial/batch/expiry, mrp, net/real unit cost, payment-method detail, payment
-- term/due date, staff note, attachment, edit note). All additive + nullable or
-- defaulted so existing rows migrate cleanly. New columns inherit each table's
-- existing RLS policy (no new tables), so rls.sql is unchanged.

-- ── Sales header ──
ALTER TABLE "inventory_sales"
  ADD COLUMN IF NOT EXISTS "staff_note" TEXT,
  ADD COLUMN IF NOT EXISTS "biller_id" TEXT,
  ADD COLUMN IF NOT EXISTS "order_discount_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "product_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_tax_id" TEXT,
  ADD COLUMN IF NOT EXISTS "order_tax_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "total_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "roundoff" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_items" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payment_term" INTEGER,
  ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gst_number" TEXT,
  ADD COLUMN IF NOT EXISTS "gst_state" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_method" TEXT,
  ADD COLUMN IF NOT EXISTS "igst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "attachment_url" TEXT,
  ADD COLUMN IF NOT EXISTS "quote_id" TEXT,
  ADD COLUMN IF NOT EXISTS "doctor_name" TEXT;

-- ── Sale items ──
ALTER TABLE "inventory_sale_items"
  ADD COLUMN IF NOT EXISTS "option_id" TEXT,
  ADD COLUMN IF NOT EXISTS "net_unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "real_unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pack_size" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "pack_quantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "serial_no" TEXT,
  ADD COLUMN IF NOT EXISTS "expiry_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "hsn_code" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_method" TEXT,
  ADD COLUMN IF NOT EXISTS "discount_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "igst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- ── Sale payments ──
ALTER TABLE "inventory_sale_payments"
  ADD COLUMN IF NOT EXISTS "cheque_no" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_no" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_holder" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_type" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_month" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_year" TEXT,
  ADD COLUMN IF NOT EXISTS "gift_card_no" TEXT;

-- ── Purchases header ──
ALTER TABLE "inventory_purchases"
  ADD COLUMN IF NOT EXISTS "order_discount_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "product_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "order_tax_id" TEXT,
  ADD COLUMN IF NOT EXISTS "order_tax_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "total_tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "roundoff" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_items" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payment_term" INTEGER,
  ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gst_number" TEXT,
  ADD COLUMN IF NOT EXISTS "gst_state" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_method" TEXT,
  ADD COLUMN IF NOT EXISTS "igst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "attachment_url" TEXT,
  ADD COLUMN IF NOT EXISTS "edit_note" TEXT,
  ADD COLUMN IF NOT EXISTS "is_edited" BOOLEAN NOT NULL DEFAULT false;

-- ── Purchase items ──
ALTER TABLE "inventory_purchase_items"
  ADD COLUMN IF NOT EXISTS "option_id" TEXT,
  ADD COLUMN IF NOT EXISTS "net_unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "real_unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "pack_size" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "pack_quantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "free_pack_quantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "free_quantity" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "quantity_received" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "quantity_balance" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "hsn_code" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_method" TEXT,
  ADD COLUMN IF NOT EXISTS "discount_spec" TEXT,
  ADD COLUMN IF NOT EXISTS "part_no" TEXT,
  ADD COLUMN IF NOT EXISTS "igst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- ── Purchase payments ──
ALTER TABLE "inventory_purchase_payments"
  ADD COLUMN IF NOT EXISTS "cheque_no" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_no" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_holder" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_type" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_month" TEXT,
  ADD COLUMN IF NOT EXISTS "cc_year" TEXT,
  ADD COLUMN IF NOT EXISTS "supplier_payment_id" TEXT;
