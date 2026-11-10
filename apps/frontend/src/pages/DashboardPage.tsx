import { StatCard } from '@/components/shared/StatCard';
import { useDashboard } from '@/features/reports/api';

/** Dashboard with live summary cards from the reports API. */
export function DashboardPage() {
  const { data } = useDashboard();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Inventory overview.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's sales"
          value={(data?.todaySalesTotal ?? 0).toFixed(2)}
          hint={`${data?.todaySalesCount ?? 0} invoices`}
        />
        <StatCard label="Products" value={data?.productCount ?? 0} />
        <StatCard label="Stock value" value={(data?.stockValue ?? 0).toFixed(2)} />
        <StatCard
          label="Low stock"
          value={data?.lowStockCount ?? 0}
          hint="at/under reorder level"
        />
      </div>
    </div>
  );
}
