import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Check, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { getApiErrorMessage } from '@/lib/http';
import {
  useRequisitions,
  useRequisitionAction,
  type RequisitionListRow,
} from '@/features/requisitions/api';
import { RequisitionFormDialog } from '@/features/requisitions/RequisitionFormDialog';

const LIMIT = 20;

/** Requisitions list + create + approve/reject/receive workflow. */
export function RequisitionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useRequisitions({ page, limit: LIMIT, search });
  const action = useRequisitionAction();

  const run = async (id: string, act: 'approve' | 'reject' | 'receive') => {
    try {
      await action.mutateAsync({ id, action: act });
      toast.success(`Requisition ${act}d`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Could not ${act} requisition`));
    }
  };

  const columns: Column<RequisitionListRow>[] = [
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
            <>
              <Button variant="ghost" size="sm" onClick={() => run(r.id, 'approve')}>
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button variant="ghost" size="sm" onClick={() => run(r.id, 'reject')}>
                <X className="h-4 w-4 text-destructive" /> Reject
              </Button>
            </>
          )}
          {r.status === 'APPROVED' && (
            <Button variant="ghost" size="sm" onClick={() => run(r.id, 'receive')}>
              <Download className="h-4 w-4" /> Receive
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
          <h1 className="text-xl font-semibold">Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Internal stock requests (request → approve → receive).
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New requisition
        </Button>
      </div>

      <Input
        placeholder="Search by reference…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No requisitions yet."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <RequisitionFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
