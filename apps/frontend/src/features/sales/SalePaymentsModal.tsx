import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import {
  useSale,
  useAddSalePayment,
  useDeleteSalePayment,
} from './api';

interface Props {
  saleId: string;
  saleReference: string;
  /** When true, the modal is open; combines EZHT "View Payments" + "Add Payment". */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'GIFT_CARD'];
const money = (v: number) => Number(v).toFixed(2);

/**
 * Sale payments (EZHT `sales/payments` + `sales/add_payment`): summary, a list of
 * existing payments with delete, and an add-payment form. Reuses the existing
 * `useSale` / `useAddSalePayment` / `useDeleteSalePayment` hooks.
 */
export function SalePaymentsModal({
  saleId,
  saleReference,
  open,
  onOpenChange,
}: Props) {
  const { data: sale } = useSale(open ? saleId : null);
  const addPayment = useAddSalePayment(saleId);
  const delPayment = useDeleteSalePayment(saleId);

  const [form, setForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    note: '',
  });

  const outstanding = sale ? sale.grandTotal - sale.paid : 0;

  const submit = async () => {
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    try {
      await addPayment.mutateAsync({
        amount,
        method: form.method,
        reference: form.reference || undefined,
        note: form.note || undefined,
      });
      toast.success('Payment added');
      setForm({ amount: '', method: 'CASH', reference: '', note: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add payment'));
    }
  };

  const remove = async (paymentId: string) => {
    try {
      await delPayment.mutateAsync(paymentId);
      toast.success('Payment removed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not remove payment'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payments — {saleReference}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {sale && (
            <div className="grid grid-cols-4 gap-3 text-sm">
              <Card label="Total" value={money(sale.grandTotal)} />
              <Card label="Paid" value={money(sale.paid)} />
              <Card label="Balance" value={money(outstanding)} />
              <Card label="Status" value={sale.paymentStatus} />
            </div>
          )}

          {/* Add payment */}
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
              <Button onClick={submit} disabled={addPayment.isPending}>
                {addPayment.isPending ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>

          {/* Payment list */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Payments</p>
            <div className="rounded-lg border border-border/60">
              {(sale?.payments ?? []).map((p) => (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remove payment"
                    onClick={() => remove(p.id)}
                    disabled={delPayment.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {(sale?.payments ?? []).length === 0 && (
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
