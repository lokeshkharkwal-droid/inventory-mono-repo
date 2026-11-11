import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Send, Download, Upload, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { PrintButton } from '@/components/shared/PrintButton';
import { getApiErrorMessage } from '@/lib/http';
import { exportCsv } from '@/lib/csv';
import {
  useInfiniteTransfers,
  useTransferAction,
  type TransferListRow,
} from '@/features/transfers/api';
import { TransferFormDialog } from '@/features/transfers/TransferFormDialog';

/** Group flat CSV line rows into transfer documents keyed by reference. */
function groupTransferRows(records: Record<string, string>[]): unknown[] {
  const groups = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    const key = r.reference || `${r.fromBranchId}|${r.toBranchId}|${r.date}`;
    let doc = groups.get(key);
    if (!doc) {
      doc = {
        fromBranchId: r.fromBranchId,
        toBranchId: r.toBranchId,
        reference: r.reference || undefined,
        date: r.date || undefined,
        items: [] as unknown[],
      };
      groups.set(key, doc);
    }
    (doc.items as unknown[]).push({
      productId: r.productId,
      quantity: Number(r.quantity),
    });
  }
  return [...groups.values()];
}

/** Transfers list + create + two-stage send/receive. */
export function TransfersPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteTransfers({ search });
  const action = useTransferAction();

  const run = async (id: string, act: 'send' | 'receive') => {
    try {
      await action.mutateAsync({ id, action: act });
      toast.success(act === 'send' ? 'Transfer sent' : 'Transfer received');
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Could not ${act} transfer`));
    }
  };

  const columns: Column<TransferListRow>[] = [
    { key: 'reference', header: 'Reference' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.status === 'PENDING' && (
            <Button variant="ghost" size="sm" onClick={() => run(r.id, 'send')}>
              <Send className="h-4 w-4" /> Send
            </Button>
          )}
          {r.status === 'IN_TRANSIT' && (
            <Button variant="ghost" size="sm" onClick={() => run(r.id, 'receive')}>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Move stock between branches (send → receive).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (rows.length === 0) {
                toast.error('Nothing to export.');
                return;
              }
              exportCsv(
                'transfers.csv',
                rows as unknown as Record<string, unknown>[],
                [
                  { key: 'reference', header: 'reference' },
                  { key: 'date', header: 'date' },
                  { key: 'status', header: 'status' },
                ],
              );
            }}
          >
            <FileDown className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> New transfer
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by reference…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No transfers yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <TransferFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Transfers"
        endpoint="/transfers/import"
        invalidateKey="transfers"
        templateHeader="reference,fromBranchId,toBranchId,date,productId,quantity"
        buildRows={groupTransferRows}
      />
    </div>
  );
}
