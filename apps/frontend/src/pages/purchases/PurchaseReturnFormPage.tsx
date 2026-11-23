import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/http';
import { usePurchase } from '@/features/purchases/api';
import { useCreatePurchaseReturn } from '@/features/returns/api';

const money = (v: number) => v.toFixed(2);

/**
 * Create a purchase return from an existing purchase (EZHT `return_purchase`):
 * lists the purchase's items, the user enters a per-line return quantity and a
 * return surcharge, and the refund is computed server-side (goods + tax − surcharge).
 */
export function PurchaseReturnFormPage() {
  const { purchaseId = '' } = useParams();
  const navigate = useNavigate();
  const { data: p, isLoading } = usePurchase(purchaseId || null);
  const create = useCreatePurchaseReturn();

  const [qty, setQty] = useState<Record<string, string>>({});
  const [surcharge, setSurcharge] = useState('0');
  const [note, setNote] = useState('');

  const refund = useMemo(() => {
    if (!p) return 0;
    const goods = p.items.reduce((s, i) => {
      const q = Number(qty[i.id] || 0);
      // Approximate live refund (net cost + tax share) × return qty; server is exact.
      const perUnit =
        Number(i.quantity) > 0 ? Number(i.subtotal) / Number(i.quantity) : 0;
      return s + perUnit * q;
    }, 0);
    return Math.max(0, goods - Number(surcharge || 0));
  }, [p, qty, surcharge]);

  if (isLoading) return <p className="p-4 text-muted-foreground">Loading…</p>;
  if (!p) return <p className="p-4 text-muted-foreground">Purchase not found.</p>;

  const submit = async () => {
    const items = p.items
      .filter((i) => Number(qty[i.id] || 0) > 0)
      .map((i) => ({
        productId: i.productId,
        purchaseItemId: i.id,
        quantity: Number(qty[i.id]),
        cost: i.cost,
        taxRate: i.taxRate,
        discount: i.discountSpec ?? String(i.discount ?? ''),
        batchNo: i.batchNo ?? undefined,
        expiryDate: i.expiryDate ?? undefined,
        mrp: i.mrp ?? undefined,
        packSize: i.packSize ?? undefined,
        hsnCode: i.hsnCode ?? undefined,
      }));
    if (items.length === 0) {
      toast.error('Enter a return quantity for at least one item.');
      return;
    }
    // Over-return guard (client-side mirror of the purchased quantities).
    for (const i of p.items) {
      if (Number(qty[i.id] || 0) > Number(i.quantity)) {
        toast.error(`Return quantity for ${i.productName} exceeds purchased.`);
        return;
      }
    }
    try {
      await create.mutateAsync({
        purchaseId: p.id,
        surcharge: Number(surcharge || 0),
        interState: p.taxMethod === 'igst',
        note: note || undefined,
        items,
      });
      toast.success('Purchase return recorded');
      navigate('/purchases/returns');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create return'));
    }
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/purchases')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">
            Return Purchase — {p.reference}
          </h1>
        </div>
        <Button onClick={submit} disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Save Return'}
        </Button>
      </div>

      <section className="rounded-lg border p-4 text-sm">
        <div className="flex flex-wrap gap-x-8 gap-y-1">
          <span>
            <span className="text-muted-foreground">Supplier: </span>
            {p.supplier?.name ?? '—'}
          </span>
          <span>
            <span className="text-muted-foreground">Date: </span>
            {new Date(p.date).toLocaleDateString()}
          </span>
          <span>
            <span className="text-muted-foreground">Warehouse: </span>
            {p.warehouse?.name ?? '—'}
          </span>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border p-4">
        <Label className="text-base">Items to return</Label>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Product</th>
                <th className="px-2">Batch</th>
                <th className="px-2">Expiry</th>
                <th className="px-2 text-right">Purchased Qty</th>
                <th className="px-2 text-right">Return Qty</th>
                <th className="px-2 text-right">Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {p.items.map((i) => (
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
                    {Number(i.quantity)}
                  </td>
                  <td className="px-2 text-right">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max={Number(i.quantity)}
                      className="h-9 w-24 text-right"
                      value={qty[i.id] ?? ''}
                      onChange={(e) =>
                        setQty((q) => ({ ...q, [i.id]: e.target.value }))
                      }
                    />
                  </td>
                  <td className="px-2 text-right tabular-nums">
                    {money(Number(i.cost))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3 rounded-lg border p-4">
          <div className="space-y-1.5">
            <Label>Surcharge</Label>
            <Input
              type="number"
              step="any"
              value={surcharge}
              onChange={(e) => setSurcharge(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>
        <section className="space-y-1 rounded-lg border p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Surcharge</span>
            <span className="tabular-nums">{money(Number(surcharge || 0))}</span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
            <span>Estimated refund</span>
            <span className="tabular-nums">{money(refund)}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
