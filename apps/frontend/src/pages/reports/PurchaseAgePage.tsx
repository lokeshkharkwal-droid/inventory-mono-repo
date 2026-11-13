import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtDate, fmtItems, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, SupplierFilter, WarehouseFilter, TextFilter, ProductFilter } from '@/features/reports/filters';

interface AgeRow {
  id: string;
  date: string;
  referenceNo: string;
  warehouseName: string | null;
  products: { productName: string; quantity: number }[];
  quantityBalance: number | null;
  serialNo: string | null;
  batchNo: string | null;
  expiry: string | null;
  purchaseAgeDays: number;
  status: string;
}
interface AgeResp {
  rows: AgeRow[];
  total: number;
}

/** Purchase Aging Report — purchases with days since the purchase date. */
export function PurchaseAgePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');

  const { data, isLoading } = useReport<AgeResp>('purchase-age', '/reports/purchase-age', { from, to, reference, supplierId, warehouseId, productId });
  const rows = data?.rows ?? [];

  const columns: ReportColumn<AgeRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference No', value: (r) => r.referenceNo },
    { key: 'warehouse', header: 'Warehouse', value: (r) => r.warehouseName ?? '—' },
    { key: 'products', header: 'Product (Qty)', value: (r) => fmtItems(r.products), render: (r) => <span className="whitespace-pre-line text-xs">{fmtItems(r.products)}</span> },
    { key: 'qtyBalance', header: 'Quantity Balance', align: 'right', value: (r) => r.quantityBalance ?? '—' },
    { key: 'serial', header: 'Serial No', value: (r) => r.serialNo ?? '—' },
    { key: 'batch', header: 'Batch No', value: (r) => r.batchNo ?? '—' },
    { key: 'expiry', header: 'Expiry', value: (r) => (r.expiry ? fmtDate(r.expiry) : '—') },
    { key: 'age', header: 'Purchase Age', align: 'right', value: (r) => r.purchaseAgeDays },
    { key: 'status', header: 'Status', value: (r) => r.status },
  ];

  return (
    <ReportShell
      title="Purchase Aging Report"
      description="How long ago each purchase was received (aging in days)."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <SupplierFilter value={supplierId} onChange={setSupplierId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <ProductFilter value={productId} onChange={setProductId} />
        </>
      }
      exportConfig={{ filename: 'purchase-aging-report', columns, rows }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Purchases" value={rows.length} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No purchases in range." />
    </ReportShell>
  );
}
