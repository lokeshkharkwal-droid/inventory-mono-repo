import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Check, X, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { exportCsv } from '@/lib/csv';
import { getApiErrorMessage } from '@/lib/http';
import { useBranchOptions } from '@/features/_shared/branches';
import {
  useInfiniteRequisitions,
  useConvertRequisitionToTransfer,
  type RequisitionListRow,
} from '@/features/requisitions/api';
import { ApprovalDialog } from '@/features/requisitions/ApprovalDialog';

const selectCls =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm';

/** Received Requisitions — incoming requests this branch must fulfil. */
export function ReceivedRequisitionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data: branches } = useBranchOptions();
  const convert = useConvertRequisitionToTransfer();

  const [dialog, setDialog] = useState<{
    requisition: RequisitionListRow;
    action: 'approve' | 'reject';
  } | null>(null);

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
        onSuccess: () => toast.success('Transfer created from requisition'),
        onError: (e) =>
          toast.error(getApiErrorMessage(e, 'Could not create transfer')),
      },
    );
  };

  const columns: Column<RequisitionListRow>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleDateString(),
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

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No received requisitions."
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
