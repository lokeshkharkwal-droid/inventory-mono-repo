import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { getApiErrorMessage } from '@/lib/http';
import { useSales } from '@/features/sales/api';
import { useProducts } from '@/features/products/api';
import {
  useSaleReturns,
  useCreateSaleReturn,
  type ReturnRow,
} from '@/features/returns/api';

const LIMIT = 20;
const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

interface Line {
  productId: string;
  quantity: string;
  price: string;
}

/** Sale returns: list + create (restocks + optional refund). */
export function SaleReturnsPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSaleReturns({ page, limit: LIMIT });
  const { data: sales } = useSales({ page: 1, limit: 100 });
  const { data: products } = useProducts({ page: 1, limit: 200 });
  const create = useCreateSaleReturn();

  const saleOptions = useMemo(() => sales?.data ?? [], [sales]);
  const productOptions = useMemo(() => products?.data ?? [], [products]);

  const [saleId, setSaleId] = useState('');
  const [refund, setRefund] = useState('0');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: '1', price: '0' }]);

  const submit = async () => {
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity || 0), price: Number(l.price || 0) }));
    if (!saleId || items.length === 0) {
      toast.error('Select a sale and at least one line.');
      return;
    }
    try {
      await create.mutateAsync({ saleId, refundAmount: Number(refund || 0), items });
      toast.success('Sale return recorded');
      setOpen(false);
      setSaleId('');
      setRefund('0');
      setLines([{ productId: '', quantity: '1', price: '0' }]);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create return'));
    }
  };

  const columns: Column<ReturnRow>[] = [
    { key: 'reference', header: 'Reference' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'total', header: 'Total', render: (r) => r.total.toFixed(2) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sale returns</h1>
          <p className="text-sm text-muted-foreground">Goods returned by customers.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New return
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No sale returns yet."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New sale return</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sale</Label>
                <select className={selectCls} value={saleId} onChange={(e) => setSaleId(e.target.value)}>
                  <option value="">—</option>
                  {saleOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.reference}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Refund amount</Label>
                <Input type="number" step="any" value={refund} onChange={(e) => setRefund(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { productId: '', quantity: '1', price: '0' }])}>
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2">
                <select
                  className={selectCls}
                  value={l.productId}
                  onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))}
                >
                  <option value="">Select product…</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Input placeholder="Qty" type="number" step="any" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                <Input placeholder="Price" type="number" step="any" value={l.price} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
