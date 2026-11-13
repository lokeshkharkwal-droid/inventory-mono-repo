import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  TextFilter,
  EntityFilter,
} from '@/features/reports/filters';

interface IeRow {
  id: string;
  date: string;
  type: string;
  reference: string;
  category: string | null;
  amount: number;
  note: string | null;
}
interface IeResp {
  rows: IeRow[];
  totals: { income: number; expense: number; net: number };
}

/** Income Expense Report — combined chronological income (+) / expense (−) ledger. */
export function IncomeExpensePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  // Income category narrows the income half (param `categoryId`); expense
  // category narrows the expense half (param `subCategoryId`) — see the
  // incomeExpense service method, which reuses the superset DTO for both halves.
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useReport<IeResp>('income-expense', '/reports/income-expense', {
    from,
    to,
    reference,
    categoryId,
    subCategoryId,
    search,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<IeRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'type', header: 'Type', value: (r) => r.type },
    { key: 'ref', header: 'Reference', value: (r) => r.reference },
    { key: 'category', header: 'Category', value: (r) => r.category ?? '—' },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      value: (r) => fmtMoney(r.amount),
      render: (r) => <span className={r.amount < 0 ? 'text-destructive' : ''}>{fmtMoney(r.amount)}</span>,
    },
    { key: 'note', header: 'Note', value: (r) => r.note ?? '—' },
  ];
  const totalsRow = t ? ['Net', '', '', '', fmtMoney(t.net), ''] : undefined;

  return (
    <ReportShell
      title="Income Expense Report"
      description="Combined income and expense statement for the date range."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <EntityFilter
            label="Income Category"
            value={categoryId}
            onChange={setCategoryId}
            path="/income-categories"
            queryKey={['income-categories']}
          />
          <EntityFilter
            label="Expense Category"
            value={subCategoryId}
            onChange={setSubCategoryId}
            path="/expense-categories"
            queryKey={['expense-categories']}
          />
          <TextFilter label="Note" value={search} onChange={setSearch} />
        </>
      }
      exportConfig={{ filename: 'income-expense-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Income" value={fmtMoney(t?.income)} />
        <StatCard label="Expense" value={fmtMoney(t?.expense)} />
        <StatCard label="Net" value={fmtMoney(t?.net)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No entries in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
