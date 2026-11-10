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
  useCustomerDeposits,
  useAddCustomerDeposit,
  type Customer,
} from '@/features/customers/api';

interface Props {
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
}

const selectCls =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/** Customer deposits / advances ledger (legacy Customers::deposits). */
export function CustomerDepositsDialog({ customer, onOpenChange }: Props) {
  const open = !!customer;
  const { data } = useCustomerDeposits(customer?.id ?? null);
  const add = useAddCustomerDeposit();
  const [form, setForm] = useState({
    amount: '',
    type: 'DEPOSIT',
    note: '',
    date: '',
  });

  const submit = async () => {
    if (!customer || !form.amount) {
      toast.error('Amount is required.');
      return;
    }
    try {
      await add.mutateAsync({
        customerId: customer.id,
        amount: Number(form.amount),
        type: form.type,
        note: form.note || undefined,
        date: form.date || undefined,
      });
      toast.success('Entry recorded');
      setForm({ amount: '', type: 'DEPOSIT', note: '', date: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record entry'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deposits — {customer?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
            Available balance:{' '}
            <span className="font-semibold">
              {Number(data?.balance ?? 0).toFixed(2)}
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
              <Label>Type</Label>
              <select
                className={selectCls}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
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
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.deposits ?? []).map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      {new Date(d.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">{d.type}</td>
                    <td className="px-3 py-2">{d.note ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {Number(d.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(data?.deposits ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No deposits yet.
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
