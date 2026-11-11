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

/**
 * Read-only product detail view (legacy `modal_view`). Shows the full product
 * record, its variants and per-branch stock — without the edit form.
 */
export function ProductDetailDialog({ product, onOpenChange }: Props) {
  const open = !!product;
  const { data: p, isLoading } = useProduct(open ? product!.id : null);
  const { data: stock } = useProductStock(open ? product!.id : null);

  const yesNo = (v: boolean | undefined) => (v ? 'Yes' : 'No');

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
              <Field label="Tax rate" value={p.taxRate?.name} />
              <Field label="HSN code" value={p.hsnCode} />
              <Field label="Cost" value={p.cost?.toFixed(2)} />
              <Field label="Price" value={p.price?.toFixed(2)} />
              <Field label="Alert qty" value={p.alertQuantity} />
              <Field label="Total stock" value={p.totalQuantity} />
              <Field label="Tax included" value={yesNo(p.isTaxIncluded)} />
              <Field label="Stock tracked" value={yesNo(p.isStockTracked)} />
              <Field label="Serialized" value={yesNo(p.isSerialized)} />
              <Field label="Generic name" value={p.genericName} />
              <Field label="Strength" value={p.strength} />
              <Field label="Potency" value={p.potency} />
            </div>

            {p.description && (
              <Field label="Description" value={p.description} />
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
