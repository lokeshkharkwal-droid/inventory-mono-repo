import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { getApiErrorMessage } from '@/lib/http';
import {
  useAllAdjustments,
  useDeleteAdjustment,
  type AdjustmentRow,
} from '@/features/products/api';
import { AdjustmentFormDialog } from '@/features/products/AdjustmentFormDialog';
import { usePermissions, permKey } from '@/features/permissions/api';

/** Date-only formatter tolerant of null (falls back to createdAt upstream). */
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/**
 * Standalone Quantity Adjustments page (EZHT `products/quantity_adjustments`):
 * the tenant-wide history of every stock adjustment, with an "Add adjustment"
 * action and per-row delete (which reverses the stock effect).
 */
export function QuantityAdjustmentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const limit = 50;

  const { data, isLoading, refetch } = useAllAdjustments({ page, limit, search });
  const del = useDeleteAdjustment();
  const { can } = usePermissions();
  const canAdjust = can(permKey('products', 'adjust_stock'));

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  const onDelete = async (row: AdjustmentRow) => {
    if (!confirm('Delete this adjustment and reverse its stock effect?')) return;
    try {
      await del.mutateAsync({ productId: row.productId, adjId: row.id });
      toast.success('Adjustment deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete adjustment'));
    }
  };

  const columns: Column<AdjustmentRow>[] = [
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.adjustedAt ?? r.createdAt) },
    { key: 'code', header: 'Code', render: (r) => r.product?.code ?? '—' },
    { key: 'name', header: 'Product', render: (r) => r.product?.name ?? '—' },
    { key: 'batchNo', header: 'Batch', render: (r) => r.batchNo ?? '—' },
    { key: 'quantity', header: 'Quantity', render: (r) => String(r.quantity) },
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <span
          className={
            r.type === 'ADDITION' ? 'text-green-600' : 'text-destructive'
          }
        >
          {r.type === 'ADDITION' ? 'Addition' : 'Subtraction'}
        </span>
      ),
    },
    { key: 'note', header: 'Note', render: (r) => r.note ?? '—' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            title={canAdjust ? 'Delete' : 'No stock-adjust permission'}
            disabled={!canAdjust}
            onClick={() => onDelete(r)}
          >
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
          <h1 className="text-xl font-semibold">Quantity Adjustments</h1>
          <p className="text-sm text-muted-foreground">
            History of stock additions and subtractions across products.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          disabled={!canAdjust}
          title={canAdjust ? undefined : 'No stock-adjust permission'}
        >
          <Plus className="h-4 w-4" /> Add adjustment
        </Button>
      </div>

      <Input
        placeholder="Search by product code or name…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No adjustments recorded yet."
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <AdjustmentFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          void refetch();
        }}
      />
    </div>
  );
}
