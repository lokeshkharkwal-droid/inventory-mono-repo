import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { useRowSelection, BulkPdfBar } from '@/components/shared/bulk-pdf';
import { openCombinedPdf, printRowsAsPdf } from '@/lib/print';
import { getApiErrorMessage } from '@/lib/http';
import { useBranchOptions } from '@/features/_shared/branches';
import {
  useInfiniteTransfers,
  useTransferAction,
  openTransferPdf,
  type TransferListRow,
} from '@/features/transfers/api';

const selectCls =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm';
const money = (v: string | number | null) =>
  v == null ? '—' : Number(v).toFixed(2);

/**
 * Received Transfers — the inbound view (stock in transit to this branch, plus
 * already-received history), with the Receive action. Mirrors the EZ Health
 * Track "Received Transfers" page.
 */
export function ReceivedTransfersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('IN_TRANSIT');
  const sel = useRowSelection();
  const action = useTransferAction();
  const { data: branches } = useBranchOptions();

  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (id: string | null) => (id ? (map.get(id) ?? id) : '—');
  }, [branches]);

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
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleString(),
    },
    { key: 'reference', header: 'Reference No' },
    {
      key: 'fromWarehouse',
      header: 'From Warehouse',
      render: (r) => branchName(r.fromBranchId),
    },
    {
      key: 'toWarehouse',
      header: 'To Warehouse',
      render: (r) => branchName(r.toBranchId),
    },
    { key: 'total', header: 'Total', render: (r) => money(r.total) },
    { key: 'totalTax', header: 'Product Tax', render: (r) => money(r.totalTax) },
    { key: 'grandTotal', header: 'Grand Total', render: (r) => money(r.grandTotal) },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Transfer details"
            onClick={() => navigate(`/transfers/view/${r.id}`)}
          >
            <FileText className="h-4 w-4" /> Details
          </Button>
          {r.status === 'IN_TRANSIT' && (
            <Button variant="ghost" size="sm" onClick={() => receive(r.id)}>
              <Download className="h-4 w-4" /> Receive
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Download PDF"
            onClick={() =>
              void openTransferPdf(r.id).catch((e) =>
                toast.error(
                  e instanceof Error ? e.message : 'Could not generate PDF',
                ),
              )
            }
          >
            <FileText className="h-4 w-4" />
          </Button>
          <EmailDocumentButton type="transfer" id={r.id} title="Email transfer" />
          <Button
            variant="ghost"
            size="icon"
            title="Edit transfer"
            onClick={() => navigate(`/transfers/edit/${r.id}`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
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

      <BulkPdfBar
        count={sel.selectedIds.size}
        onCombine={() => void openCombinedPdf('transfer', [...sel.selectedIds])}
        onExport={() =>
          printRowsAsPdf(
            'Received Transfers',
            ['Date', 'Reference No', 'From Warehouse', 'To Warehouse', 'Total', 'Product Tax', 'Grand Total', 'Status'],
            rows
              .filter((r) => sel.selectedIds.has(r.id))
              .map((r) => [
                new Date(r.date).toLocaleString(),
                r.reference,
                branchName(r.fromBranchId),
                branchName(r.toBranchId),
                money(r.total),
                money(r.totalTax),
                money(r.grandTotal),
                r.status,
              ]),
          )
        }
        onClear={sel.clear}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No transfers to receive."
        selection={sel.selection}
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />
    </div>
  );
}
