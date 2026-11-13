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

interface ExpenseRow {
  id: string;
  date: string;
  reference: string;
  category: string | null;
  categoryId: string | null;
  amount: number;
  note: string | null;
  createdBy: string | null;
}
interface ExpenseResp {
  rows: ExpenseRow[];
  totals: { amount: number };
}

/** Expenses Report — operating expenses by category over a date range. */
export function ExpensesReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [categoryId, setCategoryId] = useState('');
  // Legacy "note" filter → backend reads the `search` param (note LIKE match).
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading } = useReport<ExpenseResp>('expenses', '/reports/expenses', {
    from,
    to,
    reference,
    categoryId,
    search,
    warehouseId,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Legacy GST/tax breakdown and the attachment column have no source in the new
  // InventoryExpense schema (single `amount` Decimal) — kept for header/column
  // parity and rendered as a dash. Grand Total mirrors Amount per the spec.
  const dash = () => '—';
  const columns: ReportColumn<ExpenseRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference', value: (r) => r.reference },
    { key: 'category', header: 'Category', value: (r) => r.category ?? '—' },
    { key: 'amount', header: 'Amount', align: 'right', value: (r) => fmtMoney(r.amount) },
    { key: 'igst', header: 'IGST', align: 'right', value: dash },
    { key: 'cgst', header: 'CGST', align: 'right', value: dash },
    { key: 'sgst', header: 'SGST', align: 'right', value: dash },
    { key: 'totalTax', header: 'Total Tax', align: 'right', value: dash },
    { key: 'grandTotal', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.amount) },
    { key: 'note', header: 'Note', value: (r) => r.note ?? '—' },
    { key: 'attachment', header: 'Attachment', value: dash },
    { key: 'createdBy', header: 'Created By', value: (r) => r.createdBy ?? '—' },
  ];
  const totalsRow = t
    ? ['Total', '', '', fmtMoney(t.amount), '', '', '', '', fmtMoney(t.amount), '', '', '']
    : undefined;

  return (
    <ReportShell
      title="Expenses Report"
      description="Standalone operating expenses in the selected date range."
      filters={
        <>
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <EntityFilter
            label="Category"
            value={categoryId}
            onChange={setCategoryId}
            path="/expense-categories"
            queryKey={['expense-categories']}
          />
          <TextFilter label="Note" value={search} onChange={setSearch} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        </>
      }
      exportConfig={{ filename: 'expenses-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Entries" value={rows.length} />
        <StatCard label="Total expenses" value={fmtMoney(t?.amount)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No expenses in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
