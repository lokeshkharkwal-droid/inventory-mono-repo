import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, type ReportColumn } from '@/features/reports/types';
import {
  YearFilter,
  MonthFilter,
  WarehouseFilter,
} from '@/features/reports/filters';

interface DayRow {
  day: number;
  date: string;
  count: number;
  discount: number;
  shipping: number;
  productTax: number;
  orderTax: number;
  total: number;
}
interface DailyResp {
  year: number;
  month: number;
  days: DayRow[];
  totals: {
    discount: number;
    shipping: number;
    productTax: number;
    orderTax: number;
    grandTotal: number;
    salesCount: number;
    daysWithSales: number;
  };
}

/**
 * Daily Sales — a day-by-day calendar grid of sales totals for a month. This is
 * the canonical "calendar grid" template (daily/monthly sales & purchases).
 */
export function DailySalesPage() {
  const nowY = new Date().getFullYear();
  const nowM = new Date().getMonth() + 1;
  const [year, setYear] = useState(nowY);
  const [month, setMonth] = useState(nowM);
  const [warehouseId, setWarehouseId] = useState('');

  const params = { year, month, warehouseId };
  const { data, isLoading } = useReport<DailyResp>('daily-sales', '/reports/daily-sales', params);
  const rows = data?.days ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<DayRow>[] = [
    { key: 'day', header: 'Day', value: (r) => `${r.day} (${r.date})` },
    { key: 'discount', header: 'Discount', align: 'right', value: (r) => fmtMoney(r.discount) },
    { key: 'shipping', header: 'Shipping', align: 'right', value: (r) => fmtMoney(r.shipping) },
    { key: 'productTax', header: 'Product Tax', align: 'right', value: (r) => fmtMoney(r.productTax) },
    { key: 'orderTax', header: 'Order Tax', align: 'right', value: (r) => fmtMoney(r.orderTax) },
    { key: 'total', header: 'Total', align: 'right', value: (r) => fmtMoney(r.total) },
  ];

  const totalsRow = totals
    ? ['Month total', fmtMoney(totals.discount), fmtMoney(totals.shipping), fmtMoney(totals.productTax), fmtMoney(totals.orderTax), fmtMoney(totals.grandTotal)]
    : undefined;

  return (
    <ReportShell
      title="Daily Sales"
      description="Day-by-day sales totals for the selected month."
      filters={
        <>
          <MonthFilter value={month} onChange={setMonth} />
          <YearFilter value={year} onChange={setYear} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{
        filename: `daily-sales-${year}-${month}`,
        columns,
        rows,
        subtitle: `${year}-${String(month).padStart(2, '0')}`,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Month total" value={fmtMoney(totals?.grandTotal)} />
        <StatCard label="Invoices" value={totals?.salesCount ?? 0} />
        <StatCard label="Days with sales" value={totals?.daysWithSales ?? 0} />
        <StatCard label="Order tax" value={fmtMoney(totals?.orderTax)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => String(r.day)}
        isLoading={isLoading}
        emptyMessage="No data for this month."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
