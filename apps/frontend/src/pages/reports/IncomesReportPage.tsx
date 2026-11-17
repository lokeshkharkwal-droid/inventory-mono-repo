import { useEffect, useState } from 'react';
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
  UserFilter,
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
  page: number;
  limit: number;
  total: number;
}

/** Incomes Report — standalone (non-sale) incomes by category over a date range. */
export function IncomesReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [from, to, reference, categoryId, search, warehouseId, createdBy]);

  const { data, isLoading } = useReport<IncomeResp>('incomes', '/reports/incomes', {
    from,
    to,
    reference,
    categoryId,
    search,
    warehouseId,
    createdBy,
    page,
    limit: pageSize === -1 ? 100000 : pageSize,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<IncomeResp>('incomes-export', '/reports/incomes', {
    from,
    to,
    reference,
    categoryId,
    search,
    warehouseId,
    createdBy,
    limit: 100000,
  });
  const exportRows = exportQuery.data?.rows ?? rows;

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
          <UserFilter label="Created By" value={createdBy} onChange={setCreatedBy} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: 'incomes-report', columns, rows: exportRows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Entries" value={data?.total ?? rows.length} />
        <StatCard label="Total income" value={fmtMoney(t?.amount)} />
      </div>
      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No incomes in range."
        totalsRow={totalsRow}
        serverPagination={{
          page,
          pageSize,
          total: data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
        }}
      />
    </ReportShell>
  );
}
