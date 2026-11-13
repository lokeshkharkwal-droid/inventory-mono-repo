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
  count: number;
  discount: number;
  shipping: number;
  productTax: number;
  orderTax: number;
  total: number;
}
interface MonthlyResp {
  year: number;
  warehouseId: string | null;
  userId: string | null;
  months: MonthRow[];
  totals: {
    discount: number;
    shipping: number;
    productTax: number;
    orderTax: number;
    total: number;
  };
}

/**
 * Monthly Sales — a month-by-month roll-up of sales totals for one year
 * (Jan–Dec, always all 12, zero-filled), optionally scoped to one warehouse.
 * Each month row stacks Discount, Shipping, Product Tax, Order Tax and Total,
 * with a footer year-total row, KPI summary cards and CSV/PDF export.
 */
export function MonthlySalesPage() {
  const nowY = new Date().getFullYear();
  const [year, setYear] = useState(nowY);
  const [warehouseId, setWarehouseId] = useState('');

  const params = { year, warehouseId };
  const { data, isLoading } = useReport<MonthlyResp>(
    'monthly-sales',
    '/reports/monthly-sales',
    params,
  );
  const rows = data?.months ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<MonthRow>[] = [
    { key: 'month', header: 'Month', value: (r) => r.label },
    { key: 'discount', header: 'Discount', align: 'right', value: (r) => fmtMoney(r.discount) },
    { key: 'shipping', header: 'Shipping', align: 'right', value: (r) => fmtMoney(r.shipping) },
    { key: 'productTax', header: 'Product Tax', align: 'right', value: (r) => fmtMoney(r.productTax) },
    { key: 'orderTax', header: 'Order Tax', align: 'right', value: (r) => fmtMoney(r.orderTax) },
    { key: 'total', header: 'Total', align: 'right', value: (r) => fmtMoney(r.total) },
  ];

  const totalsRow = totals
    ? [
        'Year total',
        fmtMoney(totals.discount),
        fmtMoney(totals.shipping),
        fmtMoney(totals.productTax),
        fmtMoney(totals.orderTax),
        fmtMoney(totals.total),
      ]
    : undefined;

  return (
    <ReportShell
      title="Monthly Sales"
      description="Month-by-month sales totals for the selected year."
      filters={
        <>
          <YearFilter value={year} onChange={setYear} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{
        filename: `monthly-sales-${year}`,
        columns,
        rows,
        subtitle: String(year),
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total sales" value={fmtMoney(totals?.total)} />
        <StatCard label="Total discount" value={fmtMoney(totals?.discount)} />
        <StatCard label="Total product tax" value={fmtMoney(totals?.productTax)} />
        <StatCard label="Total order tax" value={fmtMoney(totals?.orderTax)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => String(r.month)}
        isLoading={isLoading}
        emptyMessage="No sales for this year."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
