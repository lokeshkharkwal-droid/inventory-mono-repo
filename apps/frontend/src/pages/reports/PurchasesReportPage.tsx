import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, fmtItems, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, SupplierFilter, WarehouseFilter, TextFilter, ProductFilter, SelectFilter } from '@/features/reports/filters';

interface PurRow {
  id: string;
  date: string;
  reference: string;
  warehouseName: string | null;
  supplierName: string;
  items: { productName: string; quantity: number }[];
  grandTotal: number;
  paid: number;
  balance: number;
  status: string;
}
interface PurResp {
  rows: PurRow[];
  totals: { grandTotal: number; paid: number; balance: number };
}

/** Purchases Report — one row per purchase order with tax/paid/balance. */
export function PurchasesReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useReport<PurResp>('purchases', '/reports/purchases', { from, to, supplierId, warehouseId, productId, reference, status });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<PurRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference No', value: (r) => r.reference },
    { key: 'warehouse', header: 'Warehouse', value: (r) => r.warehouseName ?? '—' },
    { key: 'supplier', header: 'Supplier', value: (r) => r.supplierName },
    { key: 'products', header: 'Product (Qty)', value: (r) => fmtItems(r.items), render: (r) => <span className="whitespace-pre-line text-xs">{fmtItems(r.items)}</span> },
    { key: 'grand', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
    { key: 'paid', header: 'Paid', align: 'right', value: (r) => fmtMoney(r.paid) },
    { key: 'balance', header: 'Balance', align: 'right', value: (r) => fmtMoney(r.balance) },
    { key: 'status', header: 'Status', value: (r) => r.status },
  ];
  const totalsRow = t
    ? ['Total', '', '', '', '', fmtMoney(t.grandTotal), fmtMoney(t.paid), fmtMoney(t.balance), '']
    : undefined;

  return (
    <ReportShell
      title="Purchases Report"
      description="Every purchase order with grand total, paid and balance."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <SupplierFilter value={supplierId} onChange={setSupplierId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <ProductFilter value={productId} onChange={setProductId} />
          <TextFilter label="Reference" value={reference} onChange={setReference} placeholder="PO-…" />
          <SelectFilter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'RECEIVED', label: 'Received' },
              { value: 'ORDERED', label: 'Ordered' },
              { value: 'PENDING', label: 'Pending' },
            ]}
            allLabel="All Statuses"
          />
        </>
      }
      exportConfig={{ filename: 'purchases-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Orders" value={rows.length} />
        <StatCard label="Grand total" value={fmtMoney(t?.grandTotal)} />
        <StatCard label="Paid" value={fmtMoney(t?.paid)} />
        <StatCard label="Balance due" value={fmtMoney(t?.balance)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No purchases in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
