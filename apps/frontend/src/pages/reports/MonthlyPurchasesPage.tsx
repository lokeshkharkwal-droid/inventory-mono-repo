import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, type ReportColumn } from '@/features/reports/types';
import { YearFilter, WarehouseFilter } from '@/features/reports/filters';

interface MonthRow {
  month: number;
  label: string;
  discount: number;
  shipping: number;
  productTax: number;
  orderTax: number;
  total: number;
}
interface MonthlyResp {
  year: number;
  months: MonthRow[];
  yearTotal: { discount: number; shipping: number; productTax: number; orderTax: number; total: number };
}

/** Monthly Purchases — month-by-month purchase totals for a year. */
export function MonthlyPurchasesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading } = useReport<MonthlyResp>('monthly-purchases', '/reports/monthly-purchases', { year, warehouseId });
  const rows = data?.months ?? [];
  const t = data?.yearTotal;

  const columns: ReportColumn<MonthRow>[] = [
    { key: 'month', header: 'Month', value: (r) => r.label },
    { key: 'discount', header: 'Discount', align: 'right', value: (r) => fmtMoney(r.discount) },
    { key: 'shipping', header: 'Shipping', align: 'right', value: (r) => fmtMoney(r.shipping) },
    { key: 'ptax', header: 'Product Tax', align: 'right', value: (r) => fmtMoney(r.productTax) },
    { key: 'otax', header: 'Order Tax', align: 'right', value: (r) => fmtMoney(r.orderTax) },
    { key: 'total', header: 'Total', align: 'right', value: (r) => fmtMoney(r.total) },
  ];
  const totalsRow = t
    ? ['Year total', fmtMoney(t.discount), fmtMoney(t.shipping), fmtMoney(t.productTax), fmtMoney(t.orderTax), fmtMoney(t.total)]
    : undefined;

  return (
    <ReportShell
      title="Monthly Purchases"
      description="Month-by-month purchase totals for the selected year."
      filters={
        <>
          <YearFilter value={year} onChange={setYear} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: `monthly-purchases-${year}`, columns, rows, subtitle: String(year), totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Year total" value={fmtMoney(t?.total)} />
        <StatCard label="Order tax" value={fmtMoney(t?.orderTax)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => String(r.month)} isLoading={isLoading} emptyMessage="No data for this year." totalsRow={totalsRow} />
    </ReportShell>
  );
}
