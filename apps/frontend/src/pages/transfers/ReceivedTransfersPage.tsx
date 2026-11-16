import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { getApiErrorMessage } from '@/lib/http';
import {
  useInfiniteTransfers,
  useTransferAction,
  type TransferListRow,
} from '@/features/transfers/api';

const selectCls =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm';

/**
 * Received Transfers — the inbound view (stock in transit to this branch, plus
 * already-received history), with the Receive action. Mirrors the EZ Health
 * Track "Received Transfers" page.
 */
export function ReceivedTransfersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('IN_TRANSIT');
  const action = useTransferAction();

  const extra = useMemo(
    () => ({ status: status || undefined }),
    [status],
  );
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteTransfers({ search, extra });

  const receive = async (id: string) => {
    try {
      await action.mutateAsync({ id, action: 'receive' });
      toast.success('Transfer received');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not receive transfer'));
    }
  };

  const columns: Column<TransferListRow>[] = [
    { key: 'reference', header: 'Reference' },
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleDateString(),
    },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.status === 'IN_TRANSIT' && (
            <Button variant="ghost" size="sm" onClick={() => receive(r.id)}>
              <Download className="h-4 w-4" /> Receive
            </Button>
          )}
          <PrintButton path={`/print/transfer/${r.id}`} title="Print transfer" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Received Transfers</h1>
        <p className="text-sm text-muted-foreground">
          Incoming stock transfers to receive into this branch.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className={selectCls}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="IN_TRANSIT">In transit (to receive)</option>
          <option value="RECEIVED">Received</option>
          <option value="">All statuses</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No transfers to receive."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />
    </div>
  );
}
