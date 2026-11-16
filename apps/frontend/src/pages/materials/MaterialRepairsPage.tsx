import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import {
  useInfiniteMaterialRepairs,
  type MaterialRepair,
} from '@/features/materials/api';

/** Material Repairs list (EZ Health Track "Repairs"). Read-only across materials. */
export function MaterialRepairsPage() {
  const [search, setSearch] = useState('');
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteMaterialRepairs({ search });

  const columns: Column<MaterialRepair>[] = [
    { key: 'material', header: 'Material', render: (r) => r.material?.name ?? '—' },
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleDateString(),
    },
    { key: 'cost', header: 'Cost', render: (r) => Number(r.cost).toFixed(2) },
    { key: 'status', header: 'Status' },
    { key: 'note', header: 'Note', render: (r) => r.note ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Repairs</h1>
        <p className="text-sm text-muted-foreground">
          Repair records logged against materials.
        </p>
      </div>

      <Input
        placeholder="Search by material…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No repairs recorded."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />
    </div>
  );
}
