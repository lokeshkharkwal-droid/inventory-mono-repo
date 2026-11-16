import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Wrench, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { PrintButton } from '@/components/shared/PrintButton';
import { getApiErrorMessage } from '@/lib/http';
import { exportCsv } from '@/lib/csv';
import {
  useInfiniteMaterials,
  useDeleteMaterial,
  type Material,
} from '@/features/materials/api';
import { MaterialActionsDialog } from '@/features/materials/MaterialActionsDialog';

/** Materials list + damage/repair actions. Add/Edit open the dedicated page. */
export function MaterialsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [actionsRow, setActionsRow] = useState<Material | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteMaterials({ search });
  const del = useDeleteMaterial();

  const onDelete = async (r: Material) => {
    if (!confirm(`Delete material "${r.name}"?`)) return;
    try {
      await del.mutateAsync(r.id);
      toast.success('Material deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete material'));
    }
  };

  const columns: Column<Material>[] = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
    { key: 'category', header: 'Category', render: (r) => r.category ?? '—' },
    { key: 'quantity', header: 'Qty' },
    { key: 'cost', header: 'Cost', render: (r) => r.cost.toFixed(2) },
    { key: 'isActive', header: 'Status', render: (r) => (r.isActive ? 'Active' : 'Inactive') },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <PrintButton
            path={`/print/material/${r.id}`}
            title="Print material"
            size="icon"
          />
          <Button variant="ghost" size="icon" title="Damage / Repair" onClick={() => setActionsRow(r)}>
            <Wrench className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Edit"
            onClick={() => navigate(`/materials/edit/${r.id}`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => onDelete(r)}>
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
          <h1 className="text-xl font-semibold">Materials</h1>
          <p className="text-sm text-muted-foreground">
            Consumables & equipment (with damage/repair tracking).
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
              exportCsv('materials.csv', rows as unknown as Record<string, unknown>[], [
                { key: 'name', header: 'name' },
                { key: 'code', header: 'code' },
                { key: 'category', header: 'category' },
                { key: 'unit', header: 'unit' },
                { key: 'quantity', header: 'quantity' },
                { key: 'cost', header: 'cost' },
                { key: 'isActive', header: 'isActive' },
              ]);
            }}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => navigate('/materials/add')}>
            <Plus className="h-4 w-4" /> New material
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by name or code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No materials yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <MaterialActionsDialog
        open={!!actionsRow}
        onOpenChange={(o) => !o && setActionsRow(null)}
        material={actionsRow}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Materials"
        endpoint="/materials/import"
        invalidateKey="materials"
        templateHeader="name,code,category,unit,quantity,cost"
        buildRows={(records) =>
          records.map((r) => ({
            name: r.name,
            code: r.code || undefined,
            category: r.category || undefined,
            unit: r.unit || undefined,
            quantity: r.quantity ? Number(r.quantity) : undefined,
            cost: r.cost ? Number(r.cost) : undefined,
          }))
        }
      />
    </div>
  );
}
