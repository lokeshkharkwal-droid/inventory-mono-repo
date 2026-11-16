import { PrintBarcodes } from '@/features/products/PrintBarcodes';

/**
 * Dedicated Print Barcodes page (EZHT `products/print_barcodes`): pick products
 * + quantities, preview the barcode sheets, and print only those sheets.
 */
export function PrintBarcodesPage() {
  return <PrintBarcodes />;
}
