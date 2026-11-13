import { useNavigate } from 'react-router-dom';
import { ImportDialog } from '@/components/shared/ImportDialog';

/**
 * Dedicated Import Products page (EZHT `products/import_products` / `import_csv`).
 * Creates new products from a CSV (preview → commit). Closing returns to the list.
 */
export function ImportProductsPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Import Products</h1>
        <p className="text-sm text-muted-foreground">
          Create products in bulk from a CSV file.
        </p>
      </div>
      <ImportDialog
        open
        onOpenChange={(o) => {
          if (!o) navigate('/products');
        }}
        title="Import Products"
        endpoint="/products/import"
        invalidateKey="products"
        templateHeader="code,name,categoryId,unitId,brandId,price,cost,alertQuantity"
        buildRows={(records) =>
          records.map((r) => ({
            code: r.code,
            name: r.name,
            categoryId: r.categoryId,
            unitId: r.unitId || undefined,
            brandId: r.brandId || undefined,
            price: r.price ? Number(r.price) : undefined,
            cost: r.cost ? Number(r.cost) : undefined,
            alertQuantity: r.alertQuantity ? Number(r.alertQuantity) : undefined,
          }))
        }
      />
    </div>
  );
}
