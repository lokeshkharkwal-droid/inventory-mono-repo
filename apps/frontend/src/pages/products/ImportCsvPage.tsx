import { useNavigate } from 'react-router-dom';
import { ImportDialog } from '@/components/shared/ImportDialog';

const num = (v: string | undefined) => (v ? Number(v) : undefined);
const str = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

/** Exact EZHT `sample_product_import.csv` header (29 columns, in order). */
const HEADER =
  'Code,Name,Category Code,Unit,Pack Size,Sales Method,Pack Cost,Unit Cost,' +
  'Pack MRP,Unit MRP,Alert Quantity,Tax Rate Name,HSN Code,Tax Method Sales,' +
  'Tax Method Purchase,Subcategory Code,Product Variants Separated by |,' +
  'Custom Field 1,Custom Field 2,Custom Field 3,Custom Field 4,Custom Field 5,' +
  'Custom Field 6,Custom Field 7,Custom Field 8,Custom Field 9,Custom Field 10,' +
  'Custom Field 11,Manufacturer';

/**
 * Import Products via CSV (EZHT `products/import_csv`). Creates products in bulk
 * from the legacy 29-column sheet; references arrive as codes/names and are
 * resolved server-side. Preview → commit; closing returns to the product list.
 */
export function ImportCsvPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Import Products via CSV</h1>
        <p className="text-sm text-muted-foreground">
          Create products in bulk from the standard product import sheet.
        </p>
      </div>
      <ImportDialog
        open
        onOpenChange={(o) => {
          if (!o) navigate('/products');
        }}
        title="Import Products via CSV"
        endpoint="/products/import-csv"
        invalidateKey="products"
        templateHeader={HEADER}
        buildRows={(records) =>
          records.map((r) => ({
            code: r['Code'],
            name: r['Name'],
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
            subCategoryCode: str(r['Subcategory Code']),
            variants: str(r['Product Variants Separated by |']),
            cf1: str(r['Custom Field 1']),
            cf2: str(r['Custom Field 2']),
            cf3: str(r['Custom Field 3']),
            cf4: str(r['Custom Field 4']),
            cf5: str(r['Custom Field 5']),
            cf6: str(r['Custom Field 6']),
            cf7: str(r['Custom Field 7']),
            cf8: str(r['Custom Field 8']),
            cf9: str(r['Custom Field 9']),
            cf10: str(r['Custom Field 10']),
            cf11: str(r['Custom Field 11']),
            manufacturer: str(r['Manufacturer']),
          }))
        }
      />
    </div>
  );
}
