import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, fmtItems, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  WarehouseFilter,
  TextFilter,
  CategoryFilter,
  ProductFilter,
} from '@/features/reports/filters';

interface TransferRow {
  id: string;
  date: string;
  reference: string;
  fromWarehouse: string | null;
  toWarehouse: string | null;
  fromBranchId: string;
  toBranchId: string;
  items: { productName: string; quantity: number }[];
  total: number;
  totalTax: number;
  shipping: number;
  grandTotal: number;
  status: string;
}
interface TransferResp {
  rows: TransferRow[];
  totals: { total: number; totalTax: number; shipping: number; grandTotal: number };
}

/** Transfers Report — inter-warehouse stock transfers. */
export function TransfersReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reference, setReference] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productId, setProductId] = useState('');

  const { data, isLoading } = useReport<TransferResp>('transfers', '/reports/transfers', {
    from,
    to,
    warehouseId,
    reference,
    categoryId,
    productId,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<TransferRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference', value: (r) => r.reference },
    { key: 'from', header: 'From', value: (r) => r.fromWarehouse ?? r.fromBranchId },
    { key: 'to', header: 'To', value: (r) => r.toWarehouse ?? r.toBranchId },
    { key: 'products', header: 'Product (Qty)', value: (r) => fmtItems(r.items), render: (r) => <span className="whitespace-pre-line text-xs">{fmtItems(r.items)}</span> },
    { key: 'total', header: 'Total', align: 'right', value: (r) => fmtMoney(r.total) },
    { key: 'tax', header: 'Tax', align: 'right', value: (r) => fmtMoney(r.totalTax) },
    { key: 'ship', header: 'Shipping', align: 'right', value: (r) => fmtMoney(r.shipping) },
    { key: 'grand', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
    { key: 'status', header: 'Status', value: (r) => r.status },
  ];
  const totalsRow = t
    ? ['Total', '', '', '', '', fmtMoney(t.total), fmtMoney(t.totalTax), fmtMoney(t.shipping), fmtMoney(t.grandTotal), '']
    : undefined;

  return (
    <ReportShell
      title="Transfers Report"
      description="Inter-warehouse stock transfers with their valued total."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <CategoryFilter value={categoryId} onChange={setCategoryId} />
          <ProductFilter value={productId} onChange={setProductId} />
        </>
      }
      exportConfig={{ filename: 'transfers-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Transfers" value={rows.length} />
        <StatCard label="Total value" value={fmtMoney(t?.grandTotal)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No transfers in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
