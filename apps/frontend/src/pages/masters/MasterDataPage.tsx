import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { getApiErrorMessage } from '@/lib/http';
import {
  useInfiniteMasterProducts,
  useImportMasterProducts,
  type MasterProduct,
} from '@/features/master-products/api';
import { usePermissions, permKey } from '@/features/permissions/api';

/**
 * Master Data — the global product catalogue (maintained centrally by SiteAdmin).
 * Business users browse importable masters and import the ones they need into
 * their own product catalogue. Management of the masters is SiteAdmin-only.
 */
export function MasterDataPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteMasterProducts({ search });
  const importMut = useImportMasterProducts();
  const { can } = usePermissions();
  const canImport = can(permKey('products', 'create'));

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const selectedIds = useMemo(() => [...selected], [selected]);

  const onImport = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one product to import.');
      return;
    }
    try {
      const res = await importMut.mutateAsync(selectedIds);
      toast.success(
        `Imported ${res.imported} of ${res.total} (${res.skipped} skipped — already imported or unavailable).`,
      );
      setSelected(new Set());
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not import products'));
    }
  };

  const columns: Column<MasterProduct>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-px',
      render: (r) => (
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={selected.has(r.id)}
          onChange={() => toggle(r.id)}
          aria-label={`Select ${r.name}`}
        />
      ),
    },
    { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (r) => r.category ?? '—' },
    { key: 'unit', header: 'Unit', render: (r) => r.unit ?? '—' },
    { key: 'cost', header: 'Cost', render: (r) => r.cost.toFixed(2) },
    { key: 'price', header: 'Price', render: (r) => r.price.toFixed(2) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Master Data</h1>
          <p className="text-sm text-muted-foreground">
            Global product catalogue — import the products you need into your own
            inventory.
          </p>
        </div>
        <Button
          onClick={onImport}
          disabled={!canImport || selected.size === 0 || importMut.isPending}
          title={canImport ? undefined : 'No create permission'}
        >
          <Download className="h-4 w-4" />{' '}
          {importMut.isPending
            ? 'Importing…'
            : `Import selected${selected.size ? ` (${selected.size})` : ''}`}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name, code or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {rows.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={allSelected}
              onChange={toggleAll}
            />
            Select all loaded
          </label>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No master products available."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />
    </div>
  );
}
