import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSale } from './api';

interface Props {
  saleId: string;
  saleReference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const money = (v: number) => Number(v).toFixed(2);

/**
 * Sales Detail (EZHT `sales/view`): read-only header, line items, and payments
 * for one sale. Mirrors the proforma/purchase detail modals.
 */
export function SaleDetailModal({
  saleId,
  saleReference,
  open,
  onOpenChange,
}: Props) {
  const { data: s, isLoading } = useSale(open ? saleId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Detail — {saleReference}</DialogTitle>
        </DialogHeader>

        {isLoading || !s ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <Field label="Reference" value={s.reference} />
              <Field
                label="Date"
                value={new Date(s.date).toLocaleDateString()}
              />
              <Field label="Status" value={s.status} />
              <Field label="Customer" value={s.customer?.name ?? '—'} />
              <Field label="Phone" value={s.customer?.phone ?? '—'} />
              <Field label="Warehouse" value={s.warehouse?.name ?? '—'} />
            </div>

            <div>
              <h4 className="mb-1 font-medium">Items</h4>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                      <th className="px-3 py-2 text-right font-medium">Disc.</th>
                      <th className="px-3 py-2 text-right font-medium">Tax</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.items.map((it) => (
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
                          {it.unit ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {it.unit}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {money(it.price)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {money(it.discount)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {money(it.taxAmount)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {money(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                    {s.items.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-4 text-center text-muted-foreground"
                        >
                          No items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Row label="Subtotal" value={money(s.subtotal)} />
                <Row label="Order discount" value={money(s.orderDiscount)} />
                <Row label="Total tax" value={money(s.totalTax)} />
                <Row label="Shipping" value={money(s.shipping)} />
                <Row
                  label="Grand total"
                  value={money(s.grandTotal)}
                  strong
                />
                <Row label="Paid" value={money(s.paid)} />
                <Row
                  label="Balance"
                  value={money(s.grandTotal - s.paid)}
                  strong
                />
              </div>

              <div>
                <h4 className="mb-1 font-medium">
                  Payments{' '}
                  <span className="text-muted-foreground">
                    ({s.paymentStatus})
                  </span>
                </h4>
                <div className="rounded-md border">
                  {s.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border-b px-3 py-1.5 last:border-0"
                    >
                      <span>
                        {new Date(p.date).toLocaleDateString()} · {p.method}
                      </span>
                      <span>{money(p.amount)}</span>
                    </div>
                  ))}
                  {s.payments.length === 0 && (
                    <p className="px-3 py-3 text-center text-muted-foreground">
                      No payments.
                    </p>
                  )}
                </div>
              </div>
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

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-semibold tabular-nums' : 'tabular-nums'}>
        {value}
      </span>
    </div>
  );
}
