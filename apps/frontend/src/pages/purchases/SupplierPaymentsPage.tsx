import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage } from '@/lib/http';
import {
  useSupplierOutstanding,
  useAddSupplierPayment,
} from '@/features/purchases/api';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

/** EZHT supplier payments: pay across a supplier's outstanding purchases. */
export function SupplierPaymentsPage() {
  const [supplierId, setSupplierId] = useState('');
  const { data, isLoading } = useSupplierOutstanding(supplierId || null);
  const addPayment = useAddSupplierPayment();

  const [alloc, setAlloc] = useState<Record<string, string>>({});
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [note, setNote] = useState('');

  // Reset allocations whenever the supplier (and its purchases) changes.
  useEffect(() => {
    setAlloc({});
  }, [supplierId, data]);

  const totalPay = useMemo(
    () =>
      Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0),
    [alloc],
  );

  const submit = async () => {
    const allocations = Object.entries(alloc)
      .map(([purchaseId, amount]) => ({ purchaseId, amount: Number(amount) }))
      .filter((a) => a.amount > 0);
    if (allocations.length === 0) {
      toast.error('Enter at least one payment amount.');
      return;
    }
    try {
      await addPayment.mutateAsync({
        supplierId,
        amount: totalPay,
        method,
        reference: reference || undefined,
        chequeNo: method === 'CHEQUE' ? chequeNo || undefined : undefined,
        note: note || undefined,
        allocations,
      });
      toast.success('Supplier payment recorded');
      setAlloc({});
      setReference('');
      setChequeNo('');
      setNote('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record payment'));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Supplier payments</h1>
        <p className="text-sm text-muted-foreground">
          Pay across a supplier&rsquo;s outstanding purchases in one transaction.
        </p>
      </div>

      <div className="max-w-sm space-y-1.5">
        <Label>Supplier</Label>
        <InfiniteSelect
          value={supplierId}
          onChange={setSupplierId}
          queryKey={['suppliers']}
          path="/suppliers"
          getOptionValue={(s) => s.id}
          getOptionLabel={(s) => s.name}
          placeholder="Select supplier…"
        />
      </div>

      {supplierId && (
        <div className="space-y-4 rounded-lg border p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (data?.purchases.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No outstanding purchases for this supplier.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2">Reference</th>
                  <th>Date</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Balance</th>
                  <th className="text-right">Pay now</th>
                </tr>
              </thead>
              <tbody>
                {data!.purchases.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{p.reference}</td>
                    <td>{new Date(p.date).toLocaleDateString()}</td>
                    <td className="text-right tabular-nums">
                      {p.grandTotal.toFixed(2)}
                    </td>
                    <td className="text-right tabular-nums">
                      {p.paid.toFixed(2)}
                    </td>
                    <td className="text-right tabular-nums">
                      {p.balance.toFixed(2)}
                    </td>
                    <td className="w-28 text-right">
                      <Input
                        type="number"
                        step="any"
                        className="h-8 text-right"
                        placeholder="0"
                        value={alloc[p.id] ?? ''}
                        onChange={(e) =>
                          setAlloc((a) => ({ ...a, [p.id]: e.target.value }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(data?.purchases.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Method</Label>
                <select
                  className={selectCls}
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {['CASH', 'CHEQUE', 'CARD', 'BANK_TRANSFER'].map((m) => (
                    <option key={m} value={m}>
                      {m.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              {method === 'CHEQUE' && (
                <div className="space-y-1.5">
                  <Label>Cheque no</Label>
                  <Input
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="col-span-2 flex items-end justify-between gap-4 md:col-span-4">
                <div className="text-sm">
                  Total to pay:{' '}
                  <strong className="tabular-nums">{totalPay.toFixed(2)}</strong>
                  {data?.totalDue != null && (
                    <span className="ml-2 text-muted-foreground">
                      (due {data.totalDue.toFixed(2)})
                    </span>
                  )}
                </div>
                <Button
                  onClick={submit}
                  disabled={addPayment.isPending || totalPay <= 0}
                >
                  {addPayment.isPending ? 'Saving…' : 'Record payment'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
