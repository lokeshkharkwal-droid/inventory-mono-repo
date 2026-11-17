import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { OverviewChart } from '@/features/reports/OverviewChart';
import { DonutChart } from '@/features/reports/MiniChart';
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
  useOverviewChart,
  useWarehouseStock,
} from '@/features/reports/api';

/**
 * Reports landing / overview (legacy `reports` index "Stock Overview Chart"):
 * period KPI cards, the monthly sales/purchases + tax combo chart with a
 * stock-value donut, and a quick-link grid to every migrated report (grouped
 * exactly as the legacy sidebar).
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
  const overview = useOverviewChart();
  const stock = useWarehouseStock();

  const months = overview.data?.months ?? [];
  const hasTrend = months.some(
    (m) =>
      m.sales > 0 ||
      m.purchases > 0 ||
      m.soldProductTax > 0 ||
      m.orderTax > 0 ||
      m.purchasedProductTax > 0,
  );
  const stockDonut = [
    { name: 'Stock Value by Price', value: stock.data?.stockByPrice ?? 0 },
    { name: 'Stock Value by Cost', value: stock.data?.stockByCost ?? 0 },
  ];
  const hasStock = (stock.data?.stockByPrice ?? 0) > 0 || (stock.data?.stockByCost ?? 0) > 0;

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
          <CardTitle>Stock Overview Chart</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monthly sales with product &amp; order tax (columns), purchases with
            purchased product tax (lines) over the last 12 months, plus current
            stock value by cost &amp; price. Click a legend entry to show/hide it.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div>
              {hasTrend ? (
                <OverviewChart months={months} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No sales or purchases recorded in the last 12 months.
                </p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center">
              {hasStock ? (
                <>
                  <DonutChart data={stockDonut} formatValue={fmtMoney} size={200} />
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Stock value — by price vs cost
                  </p>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No stock value to show.
                </p>
              )}
            </div>
          </div>
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
