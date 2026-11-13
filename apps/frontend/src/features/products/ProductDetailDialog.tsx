import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useProduct,
  useProductStock,
  type ProductDetail,
  type ProductListRow,
} from './api';

interface Props {
  product: ProductListRow | null;
  onOpenChange: (open: boolean) => void;
}

/** One label/value row in the detail grid. */
function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

/** Ordered prescription fields → labels. */
const PRESCRIPTION_FIELDS: { key: keyof ProductDetail; label: string }[] = [
  { key: 'composition', label: 'Composition' },
  { key: 'strength', label: 'Strength' },
  { key: 'unitType', label: 'Unit Type' },
  { key: 'formulation', label: 'Formulation' },
  { key: 'route', label: 'Route' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'numberOfDays', label: 'Number of Days' },
  { key: 'prescriptionQuantity', label: 'Prescription Quantity' },
  { key: 'refills', label: 'Refills' },
  { key: 'refillTimes', label: 'Refill Times' },
  { key: 'prescriptionNotes', label: 'Prescription Notes' },
];

/** Ordered custom fields (cf1..cf11) → EZHT labels. */
const CUSTOM_FIELDS: { key: keyof ProductDetail; label: string }[] = [
  { key: 'cf1', label: 'Formula' },
  { key: 'cf2', label: 'Why its taken' },
  { key: 'cf3', label: 'With what it should be taken' },
  { key: 'cf4', label: 'When it should be taken' },
  { key: 'cf5', label: 'For which disease' },
  { key: 'cf6', label: 'Whom should take it' },
  { key: 'cf7', label: 'Mutually Exclusive to which other medicines' },
  { key: 'cf8', label: 'Food and Drink restrictions' },
  { key: 'cf9', label: 'Any specific Ethnicity based restrictions' },
  { key: 'cf10', label: 'Female restriction' },
  { key: 'cf11', label: 'Side affects' },
];

/**
 * Read-only product detail view (legacy `modal_view`). Shows the full product
 * record — general info, images, pricing, prescription/custom fields, invoice
 * details, variants and per-branch stock — without the edit form.
 */
export function ProductDetailDialog({ product, onOpenChange }: Props) {
  const open = !!product;
  const { data: p, isLoading } = useProduct(open ? product!.id : null);
  const { data: stock } = useProductStock(open ? product!.id : null);

  const yesNo = (v: boolean | undefined) => (v ? 'Yes' : 'No');
  const money = (v: number | null | undefined) =>
    v == null ? '—' : v.toFixed(2);

  const prescriptionRows = p
    ? PRESCRIPTION_FIELDS.filter((f) => !!p[f.key])
    : [];
  const customRows = p ? CUSTOM_FIELDS.filter((f) => !!p[f.key]) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product?.name ?? 'Product'}</DialogTitle>
        </DialogHeader>

        {isLoading || !p ? (
          <p className="py-6 text-center text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Code" value={p.code} />
              <Field label="Type" value={p.type} />
              <Field label="Status" value={p.isActive ? 'Active' : 'Inactive'} />
              <Field label="Category" value={p.category?.name} />
              <Field label="Sub-category" value={p.subCategory?.name} />
              <Field label="Brand" value={p.brand?.name} />
              <Field label="Unit" value={p.unit?.name} />
              <Field label="Pack size" value={p.packSize} />
              <Field label="Sales method" value={p.salesMethod} />
              <Field label="Barcode symbology" value={p.barcodeSymbology} />
              <Field label="Alert qty" value={p.alertQuantity} />
              <Field label="Total stock" value={p.totalQuantity} />
              <Field label="Stock tracked" value={yesNo(p.isStockTracked)} />
              <Field label="Serialized" value={yesNo(p.isSerialized)} />
            </div>

            {/* Images */}
            {(p.imageUrl || (p.galleryImageUrls?.length ?? 0) > 0) && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Images</p>
                <div className="flex flex-wrap gap-2">
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt="Product"
                      className="h-24 w-24 rounded-md border object-cover"
                    />
                  )}
                  {(p.galleryImageUrls ?? []).map((url, i) => (
                    <img
                      key={`${url}-${i}`}
                      src={url}
                      alt={`Gallery ${i + 1}`}
                      className="h-20 w-20 rounded-md border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Pricing</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Pack cost" value={money(p.packCost)} />
                <Field label="Unit cost" value={money(p.cost)} />
                <Field label="Pack MRP" value={money(p.packMrp)} />
                <Field label="Unit MRP" value={money(p.price)} />
                <Field label="Tax rate" value={p.taxRate?.name} />
                <Field label="HSN code" value={p.hsnCode} />
                <Field label="Tax method (sales)" value={p.taxMethod} />
                <Field
                  label="Tax method (purchase)"
                  value={p.taxMethodPurchase}
                />
                <Field label="Tax included" value={yesNo(p.isTaxIncluded)} />
              </div>
            </div>

            {p.description && (
              <Field label="Product details" value={p.description} />
            )}
            {p.invoiceDetails && (
              <Field label="Product details for invoice" value={p.invoiceDetails} />
            )}

            {/* Prescription fields */}
            {prescriptionRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Prescription fields</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {prescriptionRows.map((f) => (
                    <Field
                      key={f.key as string}
                      label={f.label}
                      value={p[f.key] as ReactNode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom fields */}
            {customRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Custom fields</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {customRows.map((f) => (
                    <Field
                      key={f.key as string}
                      label={f.label}
                      value={p[f.key] as ReactNode}
                    />
                  ))}
                </div>
              </div>
            )}

            {p.variants.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Variants</p>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Cost +/−</TableHead>
                        <TableHead>Price +/−</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.variants.map((v, i) => (
                        <TableRow key={v.id ?? i}>
                          <TableCell>{v.name}</TableCell>
                          <TableCell>{v.sku ?? '—'}</TableCell>
                          <TableCell>{v.costAdjustment}</TableCell>
                          <TableCell>{v.priceAdjustment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">Per-branch stock</p>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Avg cost</TableHead>
                      <TableHead>Rack</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stock?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No stock recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stock!.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">
                            {s.branchId}
                          </TableCell>
                          <TableCell>{s.quantity}</TableCell>
                          <TableCell>{s.avgCost}</TableCell>
                          <TableCell>{s.rack ?? '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
