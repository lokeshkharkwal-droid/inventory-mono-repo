import { useNavigate } from 'react-router-dom';
import { PrintBarcodesDialog } from '@/features/products/PrintBarcodesDialog';

/**
 * Dedicated Print Barcodes page (EZHT `products/print_barcodes`). Reuses the
 * barcode-print flow; closing returns to the products list.
 */
export function PrintBarcodesPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Print Barcodes</h1>
        <p className="text-sm text-muted-foreground">
          Select products and a label style, then print a barcode sheet.
        </p>
      </div>
      <PrintBarcodesDialog
        open
        onOpenChange={(o) => {
          if (!o) navigate('/products');
        }}
      />
    </div>
  );
}
