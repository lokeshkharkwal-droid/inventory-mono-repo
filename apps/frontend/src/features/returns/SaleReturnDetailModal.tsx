import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Barcode } from '@/components/shared/Barcode';
import { QrCode } from '@/components/shared/QrCode';
import { useSaleReturnDetail } from './api';

interface Props {
  returnId: string;
  reference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open the Add-Payment / Email actions from inside the modal. */
  onAddPayment?: () => void;
  onEmail?: () => void;
  onDownloadPdf?: () => void;
}

const money = (v: number) => Number(v).toFixed(2);

/**
 * Sale Return Detail (EZHT `sales/modal_view` for a returned sale): header with
 * barcodes, From (customer) / To (warehouse) blocks, the returned product table
 * (Description · Quantity · Unit Price · Subtotal), a payment summary (Total /
 * Paid / Outstanding), operation info (created-by + date) and the modal actions.
 */
export function SaleReturnDetailModal({
  returnId,
  reference,
  open,
  onOpenChange,
  onAddPayment,
  onEmail,
  onDownloadPdf,
}: Props) {
  const { data: r, isLoading } = useSaleReturnDetail(open ? returnId : null);
  const balance = r ? r.grandTotal - r.paid : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Return — {reference}</DialogTitle>
        </DialogHeader>

        {isLoading || !r ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Header + barcodes */}
            <div className="flex items-start justify-between gap-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <Field label="Reference" value={r.reference} />
                <Field
                  label="Sale Reference"
                  value={r.saleReference ?? r.sale?.reference ?? '—'}
                />
                <Field
                  label="Date"
                  value={new Date(r.date).toLocaleString()}
                />
                <Field label="Payment Status" value={r.paymentStatus} />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Barcode value={r.reference} height={36} />
                <QrCode value={r.reference} size={72} />
              </div>
            </div>

            {/* From / To */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  From (Customer)
                </div>
                <div className="font-medium">
                  {r.customer ?? r.sale?.customer?.name ?? '—'}
                </div>
                {r.sale?.customer?.address ? (
                  <div>{r.sale.customer.address}</div>
                ) : null}
                {r.sale?.customer?.phone ? (
                  <div>{r.sale.customer.phone}</div>
                ) : null}
                {r.sale?.customer?.email ? (
                  <div>{r.sale.customer.email}</div>
                ) : null}
                {r.sale?.customer?.gstNo ? (
                  <div>GST: {r.sale.customer.gstNo}</div>
                ) : null}
              </div>
              <div className="rounded-md border p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  To (Warehouse)
                </div>
                <div className="font-medium">{r.warehouse?.name ?? '—'}</div>
                {r.warehouse?.address ? <div>{r.warehouse.address}</div> : null}
                {r.warehouse?.phone ? <div>{r.warehouse.phone}</div> : null}
                {r.warehouse?.email ? <div>{r.warehouse.email}</div> : null}
              </div>
            </div>

            {/* Product details */}
            <div>
              <h4 className="mb-1 font-medium">Product Details</h4>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Quantity
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Unit Price
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.items.map((it) => (
                      <tr key={it.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          {it.productName}
                          {it.productCode ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({it.productCode})
                            </span>
                          ) : null}
                          {it.serialNo ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              · Batch {it.serialNo}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(it.quantity)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {money(it.price)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {money(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                    {r.items.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
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

            {/* Payment summary + operation info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Row label="Subtotal" value={money(r.total)} />
                {r.orderDiscount ? (
                  <Row label="Order discount" value={money(r.orderDiscount)} />
                ) : null}
                {r.surcharge ? (
                  <Row label="Surcharge" value={money(r.surcharge)} />
                ) : null}
                <Row label="Total Amount" value={money(r.grandTotal)} strong />
                <Row label="Total Amount Paid" value={money(r.paid)} />
                <Row
                  label="Outstanding Balance"
                  value={money(balance)}
                  strong
                />
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div>
                  <span className="text-xs">Created by</span>
                  <div className="text-foreground">
                    {r.createdByName ?? '—'}
                  </div>
                </div>
                <div>
                  <span className="text-xs">Date</span>
                  <div className="text-foreground">
                    {new Date(r.date).toLocaleString()}
                  </div>
                </div>
                {r.note ? (
                  <div>
                    <span className="text-xs">Note</span>
                    <div className="text-foreground">{r.note}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 border-t pt-3">
              {onAddPayment && (
                <Button variant="outline" size="sm" onClick={onAddPayment}>
                  Add Payment
                </Button>
              )}
              {onEmail && (
                <Button variant="outline" size="sm" onClick={onEmail}>
                  Email
                </Button>
              )}
              {onDownloadPdf && (
                <Button variant="outline" size="sm" onClick={onDownloadPdf}>
                  Download PDF
                </Button>
              )}
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
