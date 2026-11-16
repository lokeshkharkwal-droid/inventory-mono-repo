import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import {
  useInfiniteMaterialDamages,
  type MaterialDamage,
} from '@/features/materials/api';

/**
 * Material Damages / Condemned list (EZ Health Track "Damages"). Read-only across
 * materials.
 */
export function MaterialDamagesPage() {
  const [search, setSearch] = useState('');
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteMaterialDamages({ search });

  const columns: Column<MaterialDamage>[] = [
    { key: 'material', header: 'Material', render: (r) => r.material?.name ?? '—' },
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleDateString(),
    },
    { key: 'quantity', header: 'Qty', render: (r) => Number(r.quantity) },
    { key: 'reason', header: 'Reason', render: (r) => r.reason ?? '—' },
    { key: 'note', header: 'Note', render: (r) => r.note ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Condemned / Damages</h1>
        <p className="text-sm text-muted-foreground">
          Damage &amp; condemnation records logged against materials.
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
        emptyMessage="No damages recorded."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />
    </div>
  );
}
