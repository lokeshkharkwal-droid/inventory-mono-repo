import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { getApiErrorMessage, requestPaged } from '@/lib/http';
import { exportCsv } from '@/lib/csv';
import {
  useInfiniteMasterProducts,
  useImportMasterProducts,
  type MasterProduct,
} from '@/features/master-products/api';
import { usePermissions, permKey } from '@/features/permissions/api';

const money = (n: number | null | undefined) =>
  n == null ? '—' : Number(n).toFixed(2);

/**
 * Import Products (EZHT `products/import_products`): browse the central master
 * catalogue and import products into this tenant's own catalogue — selected rows
 * ("Import Products") or everything available ("Import All Products"), plus
 * Excel/PDF export. Backs onto the master-catalogue browse + import endpoints.
 */
export function ImportFromMasterPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importingAll, setImportingAll] = useState(false);
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

  const runImport = async (ids: string[]) => {
    if (ids.length === 0) {
      toast.error('Select at least one product to import.');
      return;
    }
    try {
      const res = await importMut.mutateAsync(ids);
      toast.success(
        `Imported ${res.imported} of ${res.total} (${res.skipped} skipped — already imported or unavailable).`,
      );
      setSelected(new Set());
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not import products'));
    }
  };

  /** Import ALL importable masters — page through the catalogue to collect ids. */
  const importAll = async () => {
    setImportingAll(true);
    try {
      const ids: string[] = [];
      const limit = 100;
      for (let page = 1; ; page++) {
        const { data, meta } = await requestPaged<MasterProduct>(
          'GET',
          '/master-products',
          { query: { page, limit, search: search || undefined } },
        );
        ids.push(...data.map((d) => d.id));
        const totalPages = meta.totalPages ?? 1;
        if (page >= totalPages || data.length === 0) break;
      }
      await runImport(ids);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not import products'));
    } finally {
      setImportingAll(false);
    }
  };

  const exportList = (list: MasterProduct[]) => {
    if (list.length === 0) {
      toast.error('Nothing to export.');
      return;
    }
    exportCsv(
      'importable-products.csv',
      list.map((r) => ({
        code: r.code ?? '',
        name: r.name,
        category: r.category ?? '',
        subcategory: r.subCategory ?? '',
        unit: r.unit ?? '',
        unit_cost: r.cost,
        unit_mrp: r.price,
      })),
    );
  };

  const busy = importMut.isPending || importingAll;

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
    { key: 'code', header: 'Product Code', render: (r) => r.code ?? '—' },
    { key: 'name', header: 'Product Name' },
    { key: 'category', header: 'Category', render: (r) => r.category ?? '—' },
    {
      key: 'subCategory',
      header: 'Subcategory',
      render: (r) => r.subCategory ?? '—',
    },
    { key: 'unit', header: 'Unit', render: (r) => r.unit ?? '—' },
    {
      key: 'cost',
      header: 'Unit Cost',
      className: 'text-right',
      render: (r) => money(r.cost),
    },
    {
      key: 'price',
      header: 'Unit MRP',
      className: 'text-right',
      render: (r) => money(r.price),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Import Products</h1>
          <p className="text-sm text-muted-foreground">
            Import products from the central master catalogue into your own
            inventory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportList(rows)}
            title="Export to Excel"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export to Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            title="Export to PDF"
          >
            <FileText className="h-4 w-4" /> Export to PDF
          </Button>
          <Button
            variant="outline"
            onClick={importAll}
            disabled={!canImport || busy}
            title={canImport ? undefined : 'No create permission'}
          >
            <Download className="h-4 w-4" />
            {importingAll ? 'Importing…' : 'Import All Products'}
          </Button>
          <Button
            onClick={() => runImport(selectedIds)}
            disabled={!canImport || selected.size === 0 || busy}
            title={canImport ? undefined : 'No create permission'}
          >
            <Download className="h-4 w-4" />
            {importMut.isPending
              ? 'Importing…'
              : `Import Products${selected.size ? ` (${selected.size})` : ''}`}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
