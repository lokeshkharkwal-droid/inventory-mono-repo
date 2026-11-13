import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtQty, type ReportColumn } from '@/features/reports/types';
import { WarehouseFilter, TextFilter } from '@/features/reports/filters';

interface AlertRow {
  productId: string;
  imageUrl: string | null;
  code: string;
  name: string;
  quantity: number;
  alertQuantity: number;
  shortfall: number;
}
interface AlertsResp {
  warehouseId: string | null;
  warehouseName: string | null;
  rows: AlertRow[];
  total: number;
}

/**
 * Product Quantity Alerts — stock-tracked products whose on-hand quantity has
 * fallen below their reorder alert threshold, scoped to all warehouses or a
 * single warehouse (branch). Mirrors the legacy quantity_alerts list view:
 * Image | Product Code | Product Name | Quantity | Alert Quantity, with a
 * Shortfall UX enhancement, CSV/PDF export and low-stock KPIs.
 */
export function QuantityAlertsPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');

  const params = { warehouseId, search };
  const { data, isLoading } = useReport<AlertsResp>(
    'quantity-alerts',
    '/reports/quantity-alerts',
    params,
  );
  const rows = data?.rows ?? [];

  const columns: ReportColumn<AlertRow>[] = [
    {
      key: 'image',
      header: 'Image',
      value: (r) => r.imageUrl ?? '—',
      render: (r) =>
        r.imageUrl ? (
          <img
            src={r.imageUrl}
            alt={r.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'code', header: 'Product Code', value: (r) => r.code },
    { key: 'name', header: 'Product Name', value: (r) => r.name },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      value: (r) => fmtQty(r.quantity),
    },
    {
      key: 'alertQuantity',
      header: 'Alert Quantity',
      align: 'right',
      value: (r) => fmtQty(r.alertQuantity),
    },
    {
      key: 'shortfall',
      header: 'Shortfall',
      align: 'right',
      value: (r) => fmtQty(r.shortfall),
      render: (r) => (
        <span className="font-medium text-destructive">{fmtQty(r.shortfall)}</span>
      ),
    },
  ];

  const totalShortfall = rows.reduce((s, r) => s + r.shortfall, 0);
  const outOfStock = rows.filter((r) => r.quantity <= 0).length;
  const scopeLabel = data?.warehouseName ?? (warehouseId ? 'Selected warehouse' : 'All warehouses');

  return (
    <ReportShell
      title="Product Quantity Alerts"
      description="Stock-tracked products below their reorder alert threshold."
      filters={
        <>
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Code or name…"
          />
        </>
      }
      exportConfig={{
        filename: 'quantity-alerts',
        columns,
        rows,
        subtitle: scopeLabel,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Scope" value={scopeLabel} />
        <StatCard label="Products below alert" value={data?.total ?? rows.length} />
        <StatCard label="Out of stock" value={outOfStock} />
        <StatCard label="Total shortfall" value={fmtQty(totalShortfall)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.productId}
        isLoading={isLoading}
        emptyMessage="No products below their alert quantity."
      />
    </ReportShell>
  );
}
