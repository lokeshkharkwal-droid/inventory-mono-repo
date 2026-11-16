import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtQty, type ReportColumn } from '@/features/reports/types';
import { TextFilter, WarehouseFilter } from '@/features/reports/filters';

interface Row {
  productId: string;
  code: string | null;
  name: string;
  quantity: number;
}
interface Resp {
  rows: Row[];
  totals: { quantity: number };
}

/** Product Quantity — current on-hand quantity per product across warehouses. */
export function ProductQuantityPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');

  const params = { warehouseId, categoryId, search };
  const { data, isLoading } = useReport<Resp>(
    'product-quantity',
    '/reports/product-quantity',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<Row>[] = [
    { key: 'code', header: 'Code', value: (r) => r.code ?? '—' },
    { key: 'name', header: 'Product Name', value: (r) => r.name },
    { key: 'quantity', header: 'Quantity', align: 'right', value: (r) => fmtQty(r.quantity) },
  ];

  const totalsRow = totals ? ['Total', '', fmtQty(totals.quantity)] : undefined;

  return (
    <ReportShell
      title="Product Quantity"
      description="Current on-hand quantity per product."
      filters={
        <>
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter label="Category" value={categoryId} onChange={setCategoryId} placeholder="Category…" />
          <TextFilter label="Search" value={search} onChange={setSearch} placeholder="Name or code…" />
        </>
      }
      exportConfig={{
        filename: 'product-quantity',
        columns,
        rows,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={rows.length} />
        <StatCard label="Total quantity" value={fmtQty(totals?.quantity)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.productId}
        isLoading={isLoading}
        emptyMessage="No stock on hand."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
