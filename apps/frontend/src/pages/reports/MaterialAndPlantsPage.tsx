import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, TextFilter, WarehouseFilter } from '@/features/reports/filters';

interface MaterialRow {
  id: string;
  date: string | null;
  referenceNo: string | null;
  productName: string;
  category: string | null;
  quantity: number;
  balanceQuantity: number;
  unitPrice: number;
  grandTotal: number;
}
interface Resp {
  rows: MaterialRow[];
  totals: { grandTotal: number };
}

/**
 * Material & Plants — the high-value slice of the materials register (grand total
 * ≥ 1,000,000), complementing the Tools & Plants (low-value) report.
 */
export function MaterialAndPlantsPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const params = { warehouseId, categoryId, from, to, search };
  const { data, isLoading } = useReport<Resp>(
    'material-and-plants',
    '/reports/material-and-plants',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<MaterialRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'referenceNo', header: 'Reference No', value: (r) => r.referenceNo ?? '—' },
    { key: 'productName', header: 'Product Name', value: (r) => r.productName },
    { key: 'category', header: 'Category', value: (r) => r.category ?? '—' },
    { key: 'quantity', header: 'Quantity', align: 'right', value: (r) => fmtQty(r.quantity) },
    { key: 'balanceQuantity', header: 'Balance', align: 'right', value: (r) => fmtQty(r.balanceQuantity) },
    { key: 'unitPrice', header: 'Unit Price', align: 'right', value: (r) => fmtMoney(r.unitPrice) },
    { key: 'grandTotal', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
  ];

  const totalsRow = totals
    ? ['Total', '', '', '', '', '', '', fmtMoney(totals.grandTotal)]
    : undefined;

  return (
    <ReportShell
      title="Material & Plants"
      description="High-value materials & plant assets with current stock value."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter label="Category" value={categoryId} onChange={setCategoryId} placeholder="Category…" />
          <TextFilter label="Search" value={search} onChange={setSearch} placeholder="Name or code…" />
        </>
      }
      exportConfig={{
        filename: 'material-and-plants',
        columns,
        rows,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assets" value={rows.length} />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No high-value materials found."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
