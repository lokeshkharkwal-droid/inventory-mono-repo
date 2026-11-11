import { useState } from 'react';
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
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage } from '@/lib/http';
import {
  useInfiniteSaleReturns,
  useCreateSaleReturn,
  type ReturnRow,
} from '@/features/returns/api';

interface Line {
  productId: string;
  quantity: string;
  price: string;
}

/** Sale returns: list + create (restocks + optional refund). */
export function SaleReturnsPage() {
  const [open, setOpen] = useState(false);
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteSaleReturns();
  const create = useCreateSaleReturn();

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
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No sale returns yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
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
                <InfiniteSelect
                  value={saleId}
                  onChange={setSaleId}
                  queryKey={['sales']}
                  path="/sales"
                  getOptionValue={(s) => s.id}
                  getOptionLabel={(s) => s.reference}
                  placeholder="Select sale…"
                  clearable
                />
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
                <InfiniteSelect
                  value={l.productId}
                  onChange={(id) => setLines(lines.map((x, j) => (j === i ? { ...x, productId: id } : x)))}
                  queryKey={['products']}
                  path="/products"
                  getOptionValue={(p) => p.id}
                  getOptionLabel={(p) => p.name}
                  placeholder="Select product…"
                />
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
