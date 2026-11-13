import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { DonutChart } from '@/features/reports/MiniChart';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, type ReportColumn } from '@/features/reports/types';
import { WarehouseFilter } from '@/features/reports/filters';

interface ChartDatum {
  name: string;
  value: number;
}
interface WarehouseStockResp {
  warehouseId: string | null;
  warehouseName: string | null;
  stockByPrice: number;
  stockByCost: number;
  profitEstimate: number;
  totalItems: number;
  totalQuantity: number;
  chart: ChartDatum[];
}

/**
 * Warehouse Stock — inventory valuation (by price vs cost) as a donut chart plus
 * item/quantity KPIs. Canonical "chart + KPI" report template (no data table).
 */
export function WarehouseStockPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const { data, isLoading } = useReport<WarehouseStockResp>(
    'warehouse-stock',
    '/reports/warehouse-stock',
    { warehouseId },
  );
  const chart = data?.chart ?? [];

  const columns: ReportColumn<ChartDatum>[] = [
    { key: 'metric', header: 'Metric', value: (r) => r.name },
    { key: 'value', header: 'Value', align: 'right', value: (r) => fmtMoney(r.value) },
  ];

  return (
    <ReportShell
      title="Warehouse Stock"
      description="On-hand stock valued by selling price vs cost, with the profit estimate."
      filters={<WarehouseFilter value={warehouseId} onChange={setWarehouseId} />}
      exportConfig={{ filename: 'warehouse-stock', columns, rows: chart }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total items" value={fmtQty(data?.totalItems)} />
        <StatCard label="Total quantity" value={fmtQty(data?.totalQuantity)} />
        <StatCard label="Stock value (price)" value={fmtMoney(data?.stockByPrice)} />
        <StatCard label="Profit estimate" value={fmtMoney(data?.profitEstimate)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock valuation</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (data?.totalQuantity ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No stock on hand.</p>
          ) : (
            <DonutChart data={chart} formatValue={fmtMoney} />
          )}
        </CardContent>
      </Card>
    </ReportShell>
  );
}
