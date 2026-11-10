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
  usePurchase,
  useAddPurchasePayment,
  useDeletePurchasePayment,
  usePurchaseExpenses,
  useAddPurchaseExpense,
  type PurchaseListRow,
} from '@/features/purchases/api';

interface Props {
  purchase: PurchaseListRow | null;
  onOpenChange: (open: boolean) => void;
}

/** Manage a purchase's payments + expenses (legacy Purchases payments/expenses). */
export function PurchaseManageDialog({ purchase, onOpenChange }: Props) {
  const open = !!purchase;
  const id = purchase?.id ?? '';
  const { data: detail } = usePurchase(open ? id : null);
  const { data: expenses } = usePurchaseExpenses(open ? id : null);
  const addPayment = useAddPurchasePayment(id);
  const delPayment = useDeletePurchasePayment(id);
  const addExpense = useAddPurchaseExpense(id);

  const [pay, setPay] = useState({ amount: '', method: 'CASH' });
  const [exp, setExp] = useState({ amount: '', category: '' });

  const submitPayment = async () => {
    if (!pay.amount) return toast.error('Amount is required.');
    try {
      await addPayment.mutateAsync({
        amount: Number(pay.amount),
        method: pay.method,
      });
      toast.success('Payment added');
      setPay({ amount: '', method: 'CASH' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add payment'));
    }
  };

  const submitExpense = async () => {
    if (!exp.amount) return toast.error('Amount is required.');
    try {
      await addExpense.mutateAsync({
        amount: Number(exp.amount),
        category: exp.category || undefined,
      });
      toast.success('Expense added');
      setExp({ amount: '', category: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add expense'));
    }
  };

  const money = (v: number) => Number(v).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage — {purchase?.reference}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {detail && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                Total <div className="font-semibold">{money(detail.grandTotal)}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                Paid <div className="font-semibold">{money(detail.paid)}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                Status <div className="font-semibold">{detail.paymentStatus}</div>
              </div>
            </div>
          )}

          {/* Payments */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Payments</p>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="any"
                  value={pay.amount}
                  onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                />
              </div>
              <div className="w-40 space-y-1.5">
                <Label>Method</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs"
                  value={pay.method}
                  onChange={(e) => setPay({ ...pay, method: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                </select>
              </div>
              <Button onClick={submitPayment} disabled={addPayment.isPending}>
                Add
              </Button>
            </div>
            <div className="rounded-lg border border-border/60">
              {(detail?.payments ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-sm last:border-0"
                >
                  <span className="flex-1">
                    {new Date(p.date).toLocaleDateString()} · {p.method}
                  </span>
                  <span>{money(p.amount)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => delPayment.mutate(p.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {(detail?.payments ?? []).length === 0 && (
                <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                  No payments.
                </p>
              )}
            </div>
          </div>

          {/* Expenses */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Expenses{' '}
              <span className="text-muted-foreground">
                (total {money(expenses?.total ?? 0)})
              </span>
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="any"
                  value={exp.amount}
                  onChange={(e) => setExp({ ...exp, amount: e.target.value })}
                />
              </div>
              <div className="w-40 space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={exp.category}
                  onChange={(e) => setExp({ ...exp, category: e.target.value })}
                  placeholder="Freight…"
                />
              </div>
              <Button onClick={submitExpense} disabled={addExpense.isPending}>
                Add
              </Button>
            </div>
            <div className="rounded-lg border border-border/60">
              {(expenses?.expenses ?? []).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 text-sm last:border-0"
                >
                  <span>
                    {new Date(e.date).toLocaleDateString()} · {e.category ?? '—'}
                  </span>
                  <span>{money(e.amount)}</span>
                </div>
              ))}
              {(expenses?.expenses ?? []).length === 0 && (
                <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                  No expenses.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
