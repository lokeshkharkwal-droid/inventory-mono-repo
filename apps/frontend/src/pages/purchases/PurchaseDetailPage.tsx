import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { getApiErrorMessage } from '@/lib/http';
import {
  usePurchase,
  useDeletePurchase,
  usePurchaseExpenses,
  type PurchaseItem,
} from '@/features/purchases/api';
import { AddPaymentDialog } from '@/features/purchases/AddPaymentDialog';
import { ViewPaymentsDialog } from '@/features/purchases/ViewPaymentsDialog';

const money = (v: number | null | undefined) => Number(v ?? 0).toFixed(2);
const packSizeOf = (i: PurchaseItem) => Number(i.packSize) || 1;

/**
 * Purchase detail page (EZHT `purchases/view/{id}`). Shows purchase + supplier
 * info, the item lines, totals and payments, with the full action set: View
 * Payments, Add Payments, Email, Download PDF, Edit, Delete.
 */
export function PurchaseDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: p, isLoading } = usePurchase(id || null);
  const { data: expenses } = usePurchaseExpenses(id || null);
  const del = useDeletePurchase();
  const [modal, setModal] = useState<'payments' | 'addPayment' | null>(null);

  if (isLoading) return <p className="p-4 text-muted-foreground">Loading…</p>;
  if (!p) return <p className="p-4 text-muted-foreground">Purchase not found.</p>;

  const balance = p.grandTotal - p.paid;

  const remove = () => {
    if (!confirm('Delete this purchase?')) return;
    del.mutate(id, {
      onSuccess: () => {
        toast.success('Purchase deleted');
        navigate('/purchases');
      },
      onError: (err) =>
        toast.error(getApiErrorMessage(err, 'Could not delete purchase')),
    });
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/purchases')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Purchase {p.reference}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setModal('payments')}>
            View Payments
          </Button>
          <Button variant="outline" onClick={() => setModal('addPayment')}>
            Add Payments
          </Button>
          <EmailDocumentButton type="purchase" id={p.id} title="Email purchase" />
          <PrintButton
            path={`/print/purchase/${p.id}`}
            title="Download PDF"
            variant="outline"
          >
            Download PDF
          </PrintButton>
          <Button
            variant="outline"
            disabled={p.hasReturn}
            title={p.hasReturn ? 'Has a return — cannot edit' : undefined}
            onClick={() => navigate(`/purchases/edit/${p.id}`)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            disabled={p.hasPayment || p.hasReturn}
            title={
              p.hasPayment
                ? 'Has payments — cannot delete'
                : p.hasReturn
                  ? 'Has a return — cannot delete'
                  : undefined
            }
            onClick={remove}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Purchase info */}
        <section className="space-y-1 rounded-lg border p-4 text-sm">
          <h2 className="mb-2 text-base font-semibold">Purchase information</h2>
          <Info label="Reference" value={p.reference} />
          <Info label="Date" value={new Date(p.date).toLocaleString()} />
          <Info label="Status" value={p.status} />
          <Info label="Payment status" value={p.paymentStatus} />
          <Info label="Warehouse" value={p.warehouse?.name ?? '—'} />
          <Info label="Created by" value={p.createdByName ?? '—'} />
          {p.paymentTerm != null && (
            <Info label="Payment term" value={`${p.paymentTerm} days`} />
          )}
          {p.dueDate && (
            <Info
              label="Due date"
              value={new Date(p.dueDate).toLocaleDateString()}
            />
          )}
          {p.note && <Info label="Note" value={p.note} />}
          {p.isEdited && p.editNote && (
            <Info label="Edit note" value={p.editNote} />
          )}
        </section>

        {/* Supplier */}
        <section className="space-y-1 rounded-lg border p-4 text-sm">
          <h2 className="mb-2 text-base font-semibold">Supplier</h2>
          <Info label="Name" value={p.supplier?.name ?? '—'} />
          {p.supplier?.companyName && (
            <Info label="Company" value={p.supplier.companyName} />
          )}
          {p.supplier?.phone && <Info label="Phone" value={p.supplier.phone} />}
          {p.supplier?.email && <Info label="Email" value={p.supplier.email} />}
          {p.supplier?.address && (
            <Info label="Address" value={p.supplier.address} />
          )}
          {p.supplier?.gstNo && <Info label="GST" value={p.supplier.gstNo} />}
        </section>
      </div>

      {/* Items */}
      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="text-base font-semibold">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Product</th>
                <th className="px-2">Batch</th>
                <th className="px-2">Expiry</th>
                <th className="px-2 text-right">Pack Size</th>
                <th className="px-2 text-right">Pack Qty</th>
                <th className="px-2 text-right">Free Pack</th>
                <th className="px-2 text-right">Rate</th>
                <th className="px-2 text-right">MRP</th>
                <th className="px-2 text-right">Discount</th>
                <th className="px-2 text-right">Product Tax</th>
                <th className="px-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {p.items.map((i) => {
                const size = packSizeOf(i);
                return (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      {i.productName}
                      {i.productCode ? ` (${i.productCode})` : ''}
                    </td>
                    <td className="px-2">{i.batchNo ?? '—'}</td>
                    <td className="px-2">
                      {i.expiryDate
                        ? new Date(i.expiryDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {i.packSize ?? '—'}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {i.packQuantity ?? '—'}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {i.freePackQuantity ?? '—'}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {money(i.cost * size)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {i.mrp != null ? money(i.mrp * size) : '—'}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {money(i.discount)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {money(i.taxAmount)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {money(i.subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Totals */}
        <section className="space-y-1 rounded-lg border p-4 text-sm">
          <h2 className="mb-2 text-base font-semibold">Totals</h2>
          <Info label="Subtotal" value={money(p.subtotal)} />
          <Info label="Product discount" value={money(p.productDiscount)} />
          <Info label="Order discount" value={money(p.orderDiscount)} />
          {p.taxMethod === 'igst' ? (
            <Info label="IGST" value={money(p.igst)} />
          ) : (
            <>
              <Info label="CGST" value={money(p.cgst)} />
              <Info label="SGST" value={money(p.sgst)} />
            </>
          )}
          <Info label="Order tax" value={money(p.orderTax)} />
          <Info label="Shipping" value={money(p.shipping)} />
          <Info label="Roundoff" value={money(p.roundoff)} />
          <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
            <span>Grand total</span>
            <span className="tabular-nums">{money(p.grandTotal)}</span>
          </div>
          <Info label="Paid" value={money(p.paid)} />
          <Info label="Balance" value={money(balance)} />
        </section>

        {/* Payments + expenses */}
        <section className="space-y-3 rounded-lg border p-4 text-sm">
          <h2 className="text-base font-semibold">Payments</h2>
          <div className="rounded-md border border-border/60">
            {p.payments.length === 0 ? (
              <p className="px-3 py-3 text-center text-muted-foreground">
                No payments.
              </p>
            ) : (
              p.payments.map((pay) => (
                <div
                  key={pay.id}
                  className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 last:border-0"
                >
                  <span>
                    {new Date(pay.date).toLocaleDateString()} · {pay.method}
                  </span>
                  <span className="tabular-nums">{money(pay.amount)}</span>
                </div>
              ))
            )}
          </div>
          {!!expenses?.expenses.length && (
            <>
              <h2 className="text-base font-semibold">
                Expenses{' '}
                <span className="font-normal text-muted-foreground">
                  (total {money(expenses.total)})
                </span>
              </h2>
              <div className="rounded-md border border-border/60">
                {expenses.expenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 last:border-0"
                  >
                    <span>
                      {new Date(e.date).toLocaleDateString()} · {e.category ?? '—'}
                    </span>
                    <span className="tabular-nums">{money(e.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <AddPaymentDialog
        purchaseId={p.id}
        reference={p.reference}
        balance={balance}
        open={modal === 'addPayment'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <ViewPaymentsDialog
        purchaseId={p.id}
        reference={p.reference}
        open={modal === 'payments'}
        onOpenChange={(o) => !o && setModal(null)}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
