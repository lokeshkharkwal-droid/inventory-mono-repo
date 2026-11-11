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
  useInfinitePurchaseReturns,
  useCreatePurchaseReturn,
  type ReturnRow,
} from '@/features/returns/api';

interface Line {
  productId: string;
  quantity: string;
  cost: string;
}

/** Purchase returns: list + create (reverses inbound stock). */
export function PurchaseReturnsPage() {
  const [open, setOpen] = useState(false);
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfinitePurchaseReturns();
  const create = useCreatePurchaseReturn();

  const [purchaseId, setPurchaseId] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: '1', cost: '0' }]);

  const submit = async () => {
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity || 0), cost: Number(l.cost || 0) }));
    if (!purchaseId || items.length === 0) {
      toast.error('Select a purchase and at least one line.');
      return;
    }
    try {
      await create.mutateAsync({ purchaseId, items });
      toast.success('Purchase return recorded');
      setOpen(false);
      setPurchaseId('');
      setLines([{ productId: '', quantity: '1', cost: '0' }]);
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
          <h1 className="text-xl font-semibold">Purchase returns</h1>
          <p className="text-sm text-muted-foreground">Goods returned to suppliers.</p>
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
        emptyMessage="No purchase returns yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New purchase return</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Purchase</Label>
              <InfiniteSelect
                value={purchaseId}
                onChange={setPurchaseId}
                queryKey={['purchases']}
                path="/purchases"
                getOptionValue={(p) => p.id}
                getOptionLabel={(p) => p.reference}
                placeholder="Select purchase…"
                clearable
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { productId: '', quantity: '1', cost: '0' }])}>
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
                <Input placeholder="Cost" type="number" step="any" value={l.cost} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} />
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
