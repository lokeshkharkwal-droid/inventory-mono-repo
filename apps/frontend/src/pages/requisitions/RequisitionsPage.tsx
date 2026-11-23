import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Download, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { useRowSelection, BulkPdfBar } from '@/components/shared/bulk-pdf';
import { exportCsv } from '@/lib/csv';
import { openCombinedPdf, printRowsAsPdf } from '@/lib/print';
import { getApiErrorMessage } from '@/lib/http';
import { useBranchOptions } from '@/features/_shared/branches';
import {
  useInfiniteRequisitions,
  useDeleteRequisition,
  openRequisitionPdf,
  type RequisitionListRow,
} from '@/features/requisitions/api';

const selectCls =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm';

/** Requisition List — outgoing requisitions this branch has raised. */
export function RequisitionsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const sel = useRowSelection();
  const { data: branches } = useBranchOptions();
  const del = useDeleteRequisition();

  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (id: string | null) => (id ? (map.get(id) ?? id) : '—');
  }, [branches]);

  const extra = useMemo(
    () => ({ status: status || undefined }),
    [status],
  );
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteRequisitions({ search, extra });

  const remove = (id: string) => {
    if (!confirm('Delete this requisition?')) return;
    del.mutate(id, {
      onSuccess: () => toast.success('Requisition deleted'),
      onError: (e) =>
        toast.error(getApiErrorMessage(e, 'Could not delete requisition')),
    });
  };

  const columns: Column<RequisitionListRow>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleString(),
    },
    { key: 'reference', header: 'Reference' },
    {
      key: 'source',
      header: 'Source branch',
      render: (r) => branchName(r.fromBranchId),
    },
    {
      key: 'destination',
      header: 'Destination branch',
      render: (r) => branchName(r.branchId),
    },
    {
      key: 'biller',
      header: 'Biller',
      render: (r) => r.billerName ?? '—',
    },
    {
      key: 'localPurchase',
      header: 'Local purchase',
      render: (r) => (r.localPurchase ? 'Yes' : 'No'),
    },
    {
      key: 'grandTotal',
      header: 'Total',
      render: (r) => Number(r.grandTotal).toFixed(2),
    },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-px whitespace-nowrap',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Requisition details"
            onClick={() => navigate(`/requisitions/view/${r.id}`)}
          >
            <FileText className="h-4 w-4" /> Details
          </Button>
          {r.status === 'PENDING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/requisitions/edit/${r.id}`)}
            >
              Edit
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Download PDF"
            onClick={() =>
              void openRequisitionPdf(r.id).catch((e) =>
                toast.error(
                  e instanceof Error ? e.message : 'Could not generate PDF',
                ),
              )
            }
          >
            <FileText className="h-4 w-4" />
          </Button>
          <EmailDocumentButton
            type="requisition"
            id={r.id}
            title="Email requisition"
          />
          <PrintButton
            path={`/print/requisition/${r.id}`}
            title="Print requisition"
          />
          {(r.status === 'PENDING' || r.status === 'REJECTED') && (
            <Button
              variant="ghost"
              size="icon"
              title="Delete"
              onClick={() => remove(r.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Internal stock requests raised from this branch.
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
                'requisitions.csv',
                rows.map((r) => ({
                  date: r.date,
                  reference: r.reference,
                  sourceBranch: branchName(r.fromBranchId),
                  destinationBranch: branchName(r.branchId),
                  biller: r.billerName ?? '',
                  localPurchase: r.localPurchase ? 'Yes' : 'No',
                  total: Number(r.grandTotal).toFixed(2),
                  status: r.status,
                })),
              );
            }}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={() => navigate('/requisitions/add')}>
            <Plus className="h-4 w-4" /> Add requisition
          </Button>
        </div>
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
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="RECEIVED">Received</option>
          <option value="TRANSFERRED">Transferred</option>
        </select>
      </div>

      <BulkPdfBar
        count={sel.selectedIds.size}
        onCombine={() => void openCombinedPdf('requisition', [...sel.selectedIds])}
        onExport={() =>
          printRowsAsPdf(
            'Requisitions',
            ['Date', 'Reference', 'Source', 'Destination', 'Biller', 'Local Purchase', 'Total', 'Status'],
            rows
              .filter((r) => sel.selectedIds.has(r.id))
              .map((r) => [
                new Date(r.date).toLocaleString(),
                r.reference,
                branchName(r.fromBranchId),
                branchName(r.branchId),
                r.billerName ?? '',
                r.localPurchase ? 'Yes' : 'No',
                Number(r.grandTotal).toFixed(2),
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
        emptyMessage="No requisitions yet."
        selection={sel.selection}
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />
    </div>
  );
}
