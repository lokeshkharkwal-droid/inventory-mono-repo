import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { getApiErrorMessage } from '@/lib/http';
import {
  useProformas,
  useDeleteProforma,
  type ProformaListRow,
} from '@/features/proformas/api';
import { ProformaFormDialog } from '@/features/proformas/ProformaFormDialog';

const LIMIT = 20;

/** Proformas list + create. */
export function ProformasPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useProformas({ page, limit: LIMIT, search });
  const del = useDeleteProforma();

  const onDelete = async (r: ProformaListRow) => {
    if (!confirm(`Delete proforma ${r.reference}?`)) return;
    try {
      await del.mutateAsync(r.id);
      toast.success('Proforma deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete proforma'));
    }
  };

  const columns: Column<ProformaListRow>[] = [
    { key: 'reference', header: 'Reference' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'status', header: 'Status' },
    { key: 'grandTotal', header: 'Total', render: (r) => r.grandTotal.toFixed(2) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <PrintButton path={`/print/proforma/${r.id}`} title="Print proforma" />
          <EmailDocumentButton
            type="proforma"
            id={r.id}
            title="Email proforma"
          />
          <Button variant="ghost" size="icon" onClick={() => onDelete(r)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Proformas</h1>
          <p className="text-sm text-muted-foreground">
            Pre-invoice documents (products + lab/radiology lines).
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New proforma
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
        emptyMessage="No proformas yet."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <ProformaFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
