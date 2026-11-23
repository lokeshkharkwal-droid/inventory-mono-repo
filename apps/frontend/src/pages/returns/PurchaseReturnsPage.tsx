import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
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
import {
  useInfinitePurchaseReturns,
  type PurchaseReturnRow,
} from '@/features/returns/api';

/**
 * Purchase returns list (EZHT `return_purchases`). Columns: Date (+time),
 * Reference, Purchase Reference, Supplier, Surcharge, Grand Total. A new return
 * is created from a chosen purchase (opens the per-item return form).
 */
export function PurchaseReturnsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pickOpen, setPickOpen] = useState(false);
  const [purchaseId, setPurchaseId] = useState('');

  const extra = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfinitePurchaseReturns({ search, extra });

  const columns: Column<PurchaseReturnRow>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleString(),
    },
    { key: 'reference', header: 'Reference Number' },
    {
      key: 'purchaseReference',
      header: 'Purchase Reference',
      render: (r) => r.purchaseReference ?? '—',
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (r) => r.supplierName ?? '—',
    },
    {
      key: 'surcharge',
      header: 'Surcharge',
      className: 'text-right',
      render: (r) => r.surcharge.toFixed(2),
    },
    {
      key: 'grandTotal',
      header: 'Grand Total',
      className: 'text-right',
      render: (r) => r.grandTotal.toFixed(2),
    },
  ];

  const startReturn = () => {
    if (!purchaseId) {
      toast.error('Select a purchase to return.');
      return;
    }
    navigate(`/purchases/return/${purchaseId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Return Purchases</h1>
          <p className="text-sm text-muted-foreground">
            Goods returned to suppliers.
          </p>
        </div>
        <Button onClick={() => setPickOpen(true)}>
          <Plus className="h-4 w-4" /> New return
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-auto"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No purchase returns yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New purchase return</DialogTitle>
          </DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startReturn}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
