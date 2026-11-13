import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, type ReportColumn } from '@/features/reports/types';
import { MonthFilter, YearFilter, WarehouseFilter } from '@/features/reports/filters';

interface DayRow {
  day: number;
  date: string;
  discount: number;
  shipping: number;
  orderTax: number;
  grandTotal: number;
  productTax: number | null;
}
interface DailyResp {
  year: number;
  month: number;
  days: DayRow[];
  totals: { discount: number; shipping: number; orderTax: number; grandTotal: number; productTax: number | null };
}

const dash = (v: number | null | undefined): string => (v == null ? '—' : fmtMoney(v));

/** Daily Purchases — day-by-day purchase totals for a month. */
export function DailyPurchasesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading } = useReport<DailyResp>('daily-purchases', '/reports/daily-purchases', { year, month, warehouseId });
  const rows = data?.days ?? [];
  const t = data?.totals;

  const columns: ReportColumn<DayRow>[] = [
    { key: 'day', header: 'Day', value: (r) => `${r.day} (${r.date})` },
    { key: 'discount', header: 'Discount', align: 'right', value: (r) => fmtMoney(r.discount) },
    { key: 'shipping', header: 'Shipping', align: 'right', value: (r) => fmtMoney(r.shipping) },
    { key: 'ptax', header: 'Product Tax', align: 'right', value: (r) => dash(r.productTax) },
    { key: 'otax', header: 'Order Tax', align: 'right', value: (r) => fmtMoney(r.orderTax) },
    { key: 'total', header: 'Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
  ];
  const totalsRow = t
    ? ['Month total', fmtMoney(t.discount), fmtMoney(t.shipping), dash(t.productTax), fmtMoney(t.orderTax), fmtMoney(t.grandTotal)]
    : undefined;

  return (
    <ReportShell
      title="Daily Purchases"
      description="Day-by-day purchase totals for the selected month."
      filters={
        <>
          <MonthFilter value={month} onChange={setMonth} />
          <YearFilter value={year} onChange={setYear} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: `daily-purchases-${year}-${month}`, columns, rows, subtitle: `${year}-${String(month).padStart(2, '0')}`, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Month total" value={fmtMoney(t?.grandTotal)} />
        <StatCard label="Order tax" value={fmtMoney(t?.orderTax)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => String(r.day)} isLoading={isLoading} emptyMessage="No data for this month." totalsRow={totalsRow} />
    </ReportShell>
  );
}
