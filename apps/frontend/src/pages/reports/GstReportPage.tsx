import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, fmtItems, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, CustomerFilter, WarehouseFilter, TextFilter } from '@/features/reports/filters';

interface GstRow {
  saleId: string;
  date: string;
  reference: string;
  billerName: string | null;
  customerName: string;
  items: { productName: string; quantity: number }[];
  grandTotal: number;
  productTax: number;
  igst: number;
  cgst: number;
  sgst: number;
}
interface GstResp {
  rows: GstRow[];
  totals: { grandTotal: number; productTax: number; igst: number; cgst: number; sgst: number };
}

/** GST Report — per-invoice output GST register (GSTR-1 style rate split). */
export function GstReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reference, setReference] = useState('');

  const { data, isLoading } = useReport<GstResp>('gst', '/reports/gst-invoices', { from, to, customerId, warehouseId, reference });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<GstRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference No', value: (r) => r.reference },
    { key: 'biller', header: 'Biller', value: (r) => r.billerName ?? '—' },
    { key: 'customer', header: 'Customer', value: (r) => r.customerName },
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
      title="GST Report"
      description="Per-invoice output GST register — grand total with CGST/SGST/IGST split."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter label="Reference" value={reference} onChange={setReference} placeholder="INV-…" />
        </>
      }
      exportConfig={{ filename: 'gst-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Grand total" value={fmtMoney(t?.grandTotal)} />
        <StatCard label="Product tax" value={fmtMoney(t?.productTax)} />
        <StatCard label="CGST" value={fmtMoney(t?.cgst)} />
        <StatCard label="SGST" value={fmtMoney(t?.sgst)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.saleId} isLoading={isLoading} emptyMessage="No invoices in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
