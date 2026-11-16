import { useNavigate } from 'react-router-dom';
import { ImportDialog } from '@/components/shared/ImportDialog';

const num = (v: string | undefined) => (v ? Number(v) : undefined);
const str = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

/** Exact EZHT `sample_product_update.csv` header (16 columns, in order). */
const HEADER =
  'Code,Name,Category Code,Unit,Pack Size,Sales Method,Pack Cost,Unit Cost,' +
  'Pack MRP,Unit MRP,Alert Quantity,Tax Rate Name,HSN Code,Tax Method Sales,' +
  'Tax Method Purchase,Sub Category Code';

/**
 * Update Products via CSV (EZHT `products/update_csv`). Updates EXISTING products
 * (matched by `Code`) from the legacy 16-column sheet; blank cells leave the
 * product untouched. Preview → commit; closing returns to the product list.
 */
export function UpdateCsvPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Update Products via CSV</h1>
        <p className="text-sm text-muted-foreground">
          Update existing products in bulk by product code.
        </p>
      </div>
      <ImportDialog
        open
        onOpenChange={(o) => {
          if (!o) navigate('/products');
        }}
        title="Update Products via CSV"
        endpoint="/products/update-import"
        invalidateKey="products"
        templateHeader={HEADER}
        buildRows={(records) =>
          records.map((r) => ({
            code: r['Code'],
            name: str(r['Name']),
            categoryCode: str(r['Category Code']),
            unit: str(r['Unit']),
            packSize: str(r['Pack Size']),
            salesMethod: str(r['Sales Method']),
            packCost: num(r['Pack Cost']),
            cost: num(r['Unit Cost']),
            packMrp: num(r['Pack MRP']),
            price: num(r['Unit MRP']),
            alertQuantity: num(r['Alert Quantity']),
            taxRateName: str(r['Tax Rate Name']),
            hsnCode: str(r['HSN Code']),
            taxMethodSales: str(r['Tax Method Sales']),
            taxMethodPurchase: str(r['Tax Method Purchase']),
            subCategoryCode: str(r['Sub Category Code']),
          }))
        }
      />
    </div>
  );
}
