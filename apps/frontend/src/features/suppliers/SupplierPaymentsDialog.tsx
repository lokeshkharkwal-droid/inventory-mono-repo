import { useState } from 'react';
import { toast } from 'sonner';
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
  useSupplierPayments,
  useAddSupplierPayment,
  type Supplier,
} from '@/features/suppliers/api';

interface Props {
  supplier: Supplier | null;
  onOpenChange: (open: boolean) => void;
}

const selectCls =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/** Supplier-level payments ledger (legacy Purchases::supplier_payments). */
export function SupplierPaymentsDialog({ supplier, onOpenChange }: Props) {
  const open = !!supplier;
  const { data } = useSupplierPayments(supplier?.id ?? null);
  const add = useAddSupplierPayment();
  const [form, setForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    date: '',
  });

  const submit = async () => {
    if (!supplier || !form.amount) {
      toast.error('Amount is required.');
      return;
    }
    try {
      await add.mutateAsync({
        supplierId: supplier.id,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || undefined,
        date: form.date || undefined,
      });
      toast.success('Payment recorded');
      setForm({ amount: '', method: 'CASH', reference: '', date: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record payment'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payments — {supplier?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
            Total paid:{' '}
            <span className="font-semibold">
              {Number(data?.total ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_auto] items-end gap-2">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="any"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <select
                className={selectCls}
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <Button onClick={submit} disabled={add.isPending}>
              Add
            </Button>
          </div>

          <div className="rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.payments ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">{p.method}</td>
                    <td className="px-3 py-2">{p.reference ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {Number(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(data?.payments ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
