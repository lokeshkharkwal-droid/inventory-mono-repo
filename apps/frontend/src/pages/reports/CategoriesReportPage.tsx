import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  CategoryFilter,
  WarehouseFilter,
} from '@/features/reports/filters';

interface CategoryRow {
  categoryId: string;
  code: string | null;
  name: string;
  purchasedQty: number;
  soldQty: number;
  purchasedAmount: number;
  soldAmount: number;
  profit: number;
}
interface CategoriesResp {
  rows: CategoryRow[];
  totals: {
    purchasedQty: number;
    soldQty: number;
    purchasedAmount: number;
    soldAmount: number;
    profit: number;
  };
  meta: {
    from: string | null;
    to: string | null;
    categoryId: string | null;
    branchId: string | null;
  };
}

/**
 * Categories Report — per product-category rollup of purchased vs sold quantity
 * and amount over a date range, with the resulting profit/loss (sold − purchased)
 * per category. Footer totals row plus CSV/PDF export, following the list-report
 * template. Branch scoping filters the sale/purchase side (categories themselves
 * are tenant-level master data).
 */
export function CategoriesReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [branchId, setBranchId] = useState('');

  const params = { from, to, categoryId, branchId };
  const { data, isLoading } = useReport<CategoriesResp>(
    'categories',
    '/reports/categories',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<CategoryRow>[] = [
    { key: 'code', header: 'Category Code', value: (r) => r.code ?? '—' },
    { key: 'name', header: 'Category Name', value: (r) => r.name },
    {
      key: 'purchasedQty',
      header: 'Purchased',
      align: 'right',
      value: (r) => fmtQty(r.purchasedQty),
    },
    {
      key: 'soldQty',
      header: 'Sold',
      align: 'right',
      value: (r) => fmtQty(r.soldQty),
    },
    {
      key: 'purchasedAmount',
      header: 'Purchased Amount',
      align: 'right',
      value: (r) => fmtMoney(r.purchasedAmount),
    },
    {
      key: 'soldAmount',
      header: 'Sold Amount',
      align: 'right',
      value: (r) => fmtMoney(r.soldAmount),
    },
    {
      key: 'profit',
      header: 'Profit / Loss',
      align: 'right',
      value: (r) => fmtMoney(r.profit),
      render: (r) => (
        <span className={r.profit < 0 ? 'text-red-600' : undefined}>
          {fmtMoney(r.profit)}
        </span>
      ),
    },
  ];

  const totalsRow = totals
    ? [
        'Total',
        '',
        fmtQty(totals.purchasedQty),
        fmtQty(totals.soldQty),
        fmtMoney(totals.purchasedAmount),
        fmtMoney(totals.soldAmount),
        fmtMoney(totals.profit),
      ]
    : undefined;

  return (
    <ReportShell
      title="Categories Report"
      description="Purchased vs sold quantity and amount per product category, with profit/loss."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <CategoryFilter value={categoryId} onChange={setCategoryId} />
          <WarehouseFilter value={branchId} onChange={setBranchId} />
        </>
      }
      exportConfig={{
        filename: 'categories-report',
        columns,
        rows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Categories" value={rows.length} />
        <StatCard label="Purchased amount" value={fmtMoney(totals?.purchasedAmount)} />
        <StatCard label="Sold amount" value={fmtMoney(totals?.soldAmount)} />
        <StatCard label="Profit / Loss" value={fmtMoney(totals?.profit)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.categoryId}
        isLoading={isLoading}
        emptyMessage="No category activity in range."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
