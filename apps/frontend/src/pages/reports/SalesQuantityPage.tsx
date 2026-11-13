import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import { CustomerFilter, DateRangeFilter, ProductFilter, TextFilter, WarehouseFilter } from '@/features/reports/filters';

interface SqRow {
  date: string;
  productId: string;
  productCode: string;
  productName: string;
  unit: string | null;
  quantity: number;
}
interface SqResp {
  rows: SqRow[];
  totals: { quantity: number };
}

/** Sales Quantity Report — quantity sold per product per day. */
export function SalesQuantityPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading } = useReport<SqResp>('sales-quantity', '/reports/sales-quantity', { from, to, reference, customerId, productId, warehouseId });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<SqRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'code', header: 'Product Code', value: (r) => r.productCode },
    { key: 'name', header: 'Product Name', value: (r) => r.productName },
    { key: 'unit', header: 'Unit', value: (r) => r.unit ?? '—' },
    { key: 'qty', header: 'Quantity', align: 'right', value: (r) => fmtQty(r.quantity) },
  ];
  const totalsRow = t ? ['Total', '', '', '', fmtQty(t.quantity)] : undefined;

  return (
    <ReportShell
      title="Sales Quantity Report"
      description="Units sold per product over the selected date range."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <ProductFilter value={productId} onChange={setProductId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: 'sales-quantity-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Rows" value={rows.length} />
        <StatCard label="Total quantity" value={fmtQty(t?.quantity)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r, i) => `${r.productId}-${r.date}-${i}`} isLoading={isLoading} emptyMessage="No sales in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
