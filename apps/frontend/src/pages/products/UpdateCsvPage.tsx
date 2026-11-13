import { useNavigate } from 'react-router-dom';
import { ImportDialog } from '@/components/shared/ImportDialog';

/**
 * Dedicated Update-via-CSV page (EZHT `products/update_csv`). Updates EXISTING
 * products (matched by `code`) — pricing/core fields only (preview → commit).
 */
export function UpdateCsvPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Update Products (CSV)</h1>
        <p className="text-sm text-muted-foreground">
          Update existing products in bulk by product code.
        </p>
      </div>
      <ImportDialog
        open
        onOpenChange={(o) => {
          if (!o) navigate('/products');
        }}
        title="Update Products from CSV"
        endpoint="/products/update-import"
        invalidateKey="products"
        templateHeader="code,name,packSize,salesMethod,packCost,cost,packMrp,price,alertQuantity,hsnCode,taxMethod,taxMethodPurchase"
        buildRows={(records) =>
          records.map((r) => ({
            code: r.code,
            name: r.name || undefined,
            packSize: r.packSize || undefined,
            salesMethod: r.salesMethod || undefined,
            packCost: r.packCost ? Number(r.packCost) : undefined,
            cost: r.cost ? Number(r.cost) : undefined,
            packMrp: r.packMrp ? Number(r.packMrp) : undefined,
            price: r.price ? Number(r.price) : undefined,
            alertQuantity: r.alertQuantity ? Number(r.alertQuantity) : undefined,
            hsnCode: r.hsnCode || undefined,
            taxMethod: r.taxMethod || undefined,
            taxMethodPurchase: r.taxMethodPurchase || undefined,
          }))
        }
      />
    </div>
  );
}
