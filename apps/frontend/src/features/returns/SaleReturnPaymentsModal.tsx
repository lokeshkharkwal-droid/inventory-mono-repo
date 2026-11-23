import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/http';
import {
  useSaleReturnDetail,
  useSaleReturnPayments,
  useAddSaleReturnPayment,
} from './api';

interface Props {
  returnId: string;
  reference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'GIFT_CARD'];
const money = (v: number) => Number(v).toFixed(2);

/**
 * Sale-return payments (EZHT `sales/payments` + `sales/add_payment` for a return):
 * summary, existing payment history, and an add-payment form. The add is BLOCKED
 * server-side once the return is fully settled (`paid >= grandTotal`) — the modal
 * hides the form in that state and surfaces the backend guard message otherwise.
 */
export function SaleReturnPaymentsModal({
  returnId,
  reference,
  open,
  onOpenChange,
}: Props) {
  const { data: detail } = useSaleReturnDetail(open ? returnId : null);
  const { data: payments } = useSaleReturnPayments(open ? returnId : null);
  const add = useAddSaleReturnPayment();

  const [form, setForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    note: '',
  });

  const grandTotal = detail?.grandTotal ?? 0;
  const paid = detail?.paid ?? 0;
  const outstanding = grandTotal - paid;
  const fullyPaid = detail ? paid >= grandTotal : false;

  const submit = async () => {
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    try {
      await add.mutateAsync({
        id: returnId,
        input: {
          amount,
          method: form.method,
          reference: form.reference || undefined,
          note: form.note || undefined,
        },
      });
      toast.success('Payment added');
      setForm({ amount: '', method: 'CASH', reference: '', note: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add payment'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Return Payments — {reference}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {detail && (
            <div className="grid grid-cols-4 gap-3 text-sm">
              <Card label="Total" value={money(grandTotal)} />
              <Card label="Paid" value={money(paid)} />
              <Card label="Balance" value={money(outstanding)} />
              <Card label="Status" value={detail.paymentStatus} />
            </div>
          )}

          {/* Add payment — hidden once fully settled (EZHT guard). */}
          {fullyPaid ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              This return is fully settled — no further payment can be added.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Add payment</p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-32 space-y-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="w-40 space-y-1.5">
                  <Label>Method</Label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs"
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-40 space-y-1.5">
                  <Label>Reference</Label>
                  <Input
                    value={form.reference}
                    onChange={(e) =>
                      setForm({ ...form, reference: e.target.value })
                    }
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>Note</Label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
                <Button onClick={submit} disabled={add.isPending}>
                  {add.isPending ? 'Adding…' : 'Add'}
                </Button>
              </div>
            </div>
          )}

          {/* Payment history */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Payments</p>
            <div className="rounded-lg border border-border/60">
              {(payments ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-sm last:border-0"
                >
                  <span className="flex-1">
                    {new Date(p.date).toLocaleDateString()} · {p.method}
                    {p.reference ? (
                      <span className="ml-1 text-muted-foreground">
                        · {p.reference}
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">{money(p.amount)}</span>
                </div>
              ))}
              {(payments ?? []).length === 0 && (
                <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                  No payments.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      {label}
      <div className="font-semibold">{value}</div>
    </div>
  );
}
