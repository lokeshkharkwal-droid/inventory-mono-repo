import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  TextFilter,
  WarehouseFilter,
  EntityFilter,
} from '@/features/reports/filters';

interface IncomeRow {
  id: string;
  date: string;
  reference: string;
  category: string | null;
  amount: number;
  note: string | null;
}
interface IncomeResp {
  rows: IncomeRow[];
  totals: { amount: number };
}

/** Incomes Report — standalone (non-sale) incomes by category over a date range. */
export function IncomesReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading } = useReport<IncomeResp>('incomes', '/reports/incomes', {
    from,
    to,
    reference,
    categoryId,
    search,
    warehouseId,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Legacy header set + order. The IGST/CGST/SGST/Total Tax/Grand Total/Attachment
  // columns have no source on the flattened InventoryIncome (documented data gap),
  // so they render a dash; Amount is the single stored income value.
  const columns: ReportColumn<IncomeRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference', value: (r) => r.reference },
    { key: 'category', header: 'Category', value: (r) => r.category ?? '—' },
    { key: 'amount', header: 'Amount', align: 'right', value: (r) => fmtMoney(r.amount) },
    { key: 'igst', header: 'IGST', align: 'right', value: () => '—' },
    { key: 'cgst', header: 'CGST', align: 'right', value: () => '—' },
    { key: 'sgst', header: 'SGST', align: 'right', value: () => '—' },
    { key: 'totalTax', header: 'Total Tax', align: 'right', value: () => '—' },
    { key: 'grandTotal', header: 'Grand Total', align: 'right', value: () => '—' },
    { key: 'note', header: 'Note', value: (r) => r.note ?? '—' },
    { key: 'attachment', header: 'Attachment', value: () => '—' },
  ];
  const totalsRow = t
    ? ['Total', '', '', fmtMoney(t.amount), '', '', '', '', '', '', '']
    : undefined;

  return (
    <ReportShell
      title="Incomes Report"
      description="Standalone (non-sale) incomes in the selected date range."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <EntityFilter
            label="Category"
            value={categoryId}
            onChange={setCategoryId}
            path="/income-categories"
            queryKey={['income-categories']}
          />
          <TextFilter label="Note" value={search} onChange={setSearch} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: 'incomes-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Entries" value={rows.length} />
        <StatCard label="Total income" value={fmtMoney(t?.amount)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No incomes in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
