import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { GroupedBarChart } from '@/features/reports/MiniChart';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney } from '@/features/reports/types';
import {
  REPORT_GROUPS,
  REPORTS_BY_GROUP,
  GROUP_LABELS,
} from '@/features/reports/registry';
import {
  useDashboard,
  useSalesSummary,
  usePurchaseSummary,
  useProfit,
  usePaymentsSummary,
} from '@/features/reports/api';

interface MonthRow {
  month: number;
  label?: string;
  total?: number | string;
}
interface MonthlyResp {
  year: number;
  months: MonthRow[];
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Reports landing / overview (legacy `reports` index "Overview Chart"):
 * period KPI cards, a monthly sales-vs-purchases trend chart, and a quick-link
 * grid to every migrated report (grouped exactly as the legacy sidebar).
 */
export function ReportsPage() {
  const year = useMemo(() => new Date().getFullYear(), []);
  const [range] = useState(() => ({
    from: `${new Date().getFullYear()}-01-01`,
    to: `${new Date().getFullYear()}-12-31`,
  }));

  const dashboard = useDashboard();
  const sales = useSalesSummary(range);
  const purchases = usePurchaseSummary(range);
  const profit = useProfit(range);
  const payments = usePaymentsSummary(range);
  const salesMonthly = useReport<MonthlyResp>('overview-monthly-sales', '/reports/monthly-sales', { year });
  const purchasesMonthly = useReport<MonthlyResp>('overview-monthly-purchases', '/reports/monthly-purchases', { year });

  const monthTotal = (resp: MonthlyResp | undefined, m: number): number => {
    const row = resp?.months?.find((x) => x.month === m);
    return row ? Number(row.total ?? 0) : 0;
  };
  const salesSeries = MONTH_ABBR.map((_, i) => monthTotal(salesMonthly.data, i + 1));
  const purchaseSeries = MONTH_ABBR.map((_, i) => monthTotal(purchasesMonthly.data, i + 1));
  const hasTrend = salesSeries.some((v) => v > 0) || purchaseSeries.some((v) => v > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Overview for {year} — sales, purchases, stock &amp; every detailed report.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={dashboard.data?.productCount ?? 0} hint={`${dashboard.data?.lowStockCount ?? 0} below reorder`} />
        <StatCard label="Stock value" value={fmtMoney(dashboard.data?.stockValue)} />
        <StatCard label="Sales (YTD)" value={fmtMoney(sales.data?.gross)} hint={`${sales.data?.count ?? 0} invoices · due ${fmtMoney(sales.data?.due)}`} />
        <StatCard label="Purchases (YTD)" value={fmtMoney(purchases.data?.gross)} hint={`${purchases.data?.count ?? 0} orders · due ${fmtMoney(purchases.data?.due)}`} />
        <StatCard label="Gross profit (YTD)" value={fmtMoney(profit.data?.profit)} hint={`COGS ${fmtMoney(profit.data?.cogs)}`} />
        <StatCard label="Payments received" value={fmtMoney(payments.data?.received)} />
        <StatCard label="Payments made" value={fmtMoney(payments.data?.made)} />
        <StatCard label="Net cash flow" value={fmtMoney((payments.data?.received ?? 0) - (payments.data?.made ?? 0))} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly sales vs purchases — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasTrend ? (
            <GroupedBarChart
              categories={MONTH_ABBR}
              series={[
                { name: 'Sales', data: salesSeries },
                { name: 'Purchases', data: purchaseSeries },
              ]}
              formatValue={fmtMoney}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sales or purchases recorded for {year}.
            </p>
          )}
        </CardContent>
      </Card>

      {REPORT_GROUPS.map((group) => (
        <div key={group} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {GROUP_LABELS[group]}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS_BY_GROUP[group].map((r) => {
              const Icon = r.icon;
              return (
                <Link
                  key={r.key}
                  to={r.path}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{r.label}</span>
                    <span className="block text-xs text-muted-foreground">{r.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
