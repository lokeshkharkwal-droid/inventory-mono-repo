import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, fmtItems, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  SupplierFilter,
  WarehouseFilter,
  ProductFilter,
  TextFilter,
} from '@/features/reports/filters';

interface PtRow {
  id: string;
  date: string;
  reference: string;
  warehouse: string | null;
  supplier: string;
  items: { productName: string; quantity: number }[];
  grandTotal: number;
  productTax: number;
  igst: number;
  cgst: number;
  sgst: number;
}
interface PtResp {
  rows: PtRow[];
  totals: { grandTotal: number; productTax: number; igst: number; cgst: number; sgst: number };
}

/** Purchases Tax Report — per-purchase input GST register. */
export function PurchasesTaxPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useReport<PtResp>('purchases-tax', '/reports/purchases-tax', {
    from,
    to,
    reference,
    supplierId,
    warehouseId,
    productId,
    search,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<PtRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference No', value: (r) => r.reference },
    { key: 'warehouse', header: 'Warehouse', value: (r) => r.warehouse ?? '—' },
    { key: 'supplier', header: 'Supplier', value: (r) => r.supplier },
    { key: 'products', header: 'Product (Qty)', value: (r) => fmtItems(r.items), render: (r) => <span className="whitespace-pre-line text-xs">{fmtItems(r.items)}</span> },
    { key: 'grand', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
    { key: 'ptax', header: 'Product Tax', align: 'right', value: (r) => fmtMoney(r.productTax) },
    { key: 'igst', header: 'IGST', align: 'right', value: (r) => fmtMoney(r.igst) },
    { key: 'cgst', header: 'CGST', align: 'right', value: (r) => fmtMoney(r.cgst) },
    { key: 'sgst', header: 'SGST', align: 'right', value: (r) => fmtMoney(r.sgst) },
  ];
  const totalsRow = t
    ? ['Total', '', '', '', '', fmtMoney(t.grandTotal), fmtMoney(t.productTax), fmtMoney(t.igst), fmtMoney(t.cgst), fmtMoney(t.sgst)]
    : undefined;

  return (
    <ReportShell
      title="Purchases Tax Report"
      description="Per-purchase input GST register — grand total with CGST/SGST/IGST split."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <SupplierFilter value={supplierId} onChange={setSupplierId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <ProductFilter value={productId} onChange={setProductId} />
          <TextFilter label="Batch No" value={search} onChange={setSearch} />
        </>
      }
      exportConfig={{ filename: 'purchases-tax-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Grand total" value={fmtMoney(t?.grandTotal)} />
        <StatCard label="Input tax" value={fmtMoney(t?.productTax)} />
        <StatCard label="CGST" value={fmtMoney(t?.cgst)} />
        <StatCard label="SGST" value={fmtMoney(t?.sgst)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No purchases in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
