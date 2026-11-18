import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProformaDetail, useProformaRelations } from './api';

interface Props {
  proformaId: string;
  proformaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Proforma Details (EZHT `proformas/view`): header, product lines, and the current
 * Lab Test / Branch mappings. Read-only, `modal-lg`-sized.
 */
export function ProformaDetailModal({
  proformaId,
  proformaName,
  open,
  onOpenChange,
}: Props) {
  const detail = useProformaDetail(proformaId, open);
  const labTests = useProformaRelations(proformaId, 'lab_test');
  const branches = useProformaRelations(proformaId, 'branch');
  const p = detail.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proforma Details — {proformaName}</DialogTitle>
        </DialogHeader>

        {detail.isLoading || !p ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name" value={p.name ?? '—'} />
              <Field label="Reference" value={p.reference} />
              <Field label="Status" value={p.status} />
              <Field
                label="Date"
                value={new Date(p.date).toLocaleDateString()}
              />
              <Field label="Grand total" value={Number(p.grandTotal).toFixed(2)} />
            </div>

            <div>
              <h4 className="mb-1 font-medium">Products</h4>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Unit price</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(p.items ?? []).map((it) => (
                      <tr key={it.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          {it.productName}
                          {it.productCode ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({it.productCode})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(it.quantity)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(it.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(it.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {(p.items ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                          No products.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Mapping title="Mapped lab tests" rows={labTests.data} />
              <Mapping title="Assigned branches" rows={branches.data} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Mapping({
  title,
  rows,
}: {
  title: string;
  rows?: Array<{ id: string; label: string | null; entityId: string }>;
}) {
  return (
    <div>
      <h4 className="mb-1 font-medium">{title}</h4>
      {rows && rows.length > 0 ? (
        <ul className="list-inside list-disc text-muted-foreground">
          {rows.map((r) => (
            <li key={r.id}>{r.label ?? r.entityId}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">None.</p>
      )}
    </div>
  );
}
