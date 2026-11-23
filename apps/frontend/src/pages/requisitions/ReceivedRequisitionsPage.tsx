import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Check, X, ArrowLeftRight, FileText } from 'lucide-react';
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
  useConvertRequisitionToTransfer,
  openRequisitionPdf,
  type RequisitionListRow,
} from '@/features/requisitions/api';
import { ApprovalDialog } from '@/features/requisitions/ApprovalDialog';

const selectCls =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm';

/** Received Requisitions — incoming requests this branch must fulfil. */
export function ReceivedRequisitionsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data: branches } = useBranchOptions();
  const convert = useConvertRequisitionToTransfer();

  const [dialog, setDialog] = useState<{
    requisition: RequisitionListRow;
    action: 'approve' | 'reject';
  } | null>(null);
  const sel = useRowSelection();

  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (id: string | null) => (id ? (map.get(id) ?? id) : '—');
  }, [branches]);

  const extra = useMemo(
    () => ({ received: true as const, status: status || undefined }),
    [status],
  );
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteRequisitions({ search, extra });

  const createTransfer = (r: RequisitionListRow) => {
    convert.mutate(
      { id: r.id },
      {
        onSuccess: (res) => {
          toast.success('Transfer created from requisition');
          // EZHT redirects to the prefilled transfer so the user can review the
          // (batch-populated) lines before sending. The convert endpoint returns
          // `{ requisition, transfer }`.
          const transferId = (
            res as { transfer?: { id?: string } } | undefined
          )?.transfer?.id;
          if (transferId) navigate(`/transfers/edit/${transferId}`);
        },
        onError: (e) =>
          toast.error(getApiErrorMessage(e, 'Could not create transfer')),
      },
    );
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
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ requisition: r, action: 'approve' })}
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ requisition: r, action: 'reject' })}
              >
                <X className="h-4 w-4 text-destructive" /> Reject
              </Button>
            </>
          )}
          {r.status === 'APPROVED' && (
            <Button
              variant="outline"
              size="sm"
              disabled={convert.isPending}
              onClick={() => createTransfer(r)}
            >
              <ArrowLeftRight className="h-4 w-4" /> Create transfer
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
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Received Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Incoming requests this branch must approve and fulfil.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (rows.length === 0) {
              toast.error('Nothing to export.');
              return;
            }
            exportCsv(
              'received-requisitions.csv',
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
            'Received Requisitions',
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
        emptyMessage="No received requisitions."
        selection={sel.selection}
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <ApprovalDialog
        requisition={dialog?.requisition ?? null}
        action={dialog?.action ?? 'approve'}
        open={!!dialog}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </div>
  );
}
