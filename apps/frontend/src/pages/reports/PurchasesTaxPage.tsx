import { useEffect, useState } from 'react';
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
import { PurchaseDetailModal } from './PurchaseDetailModal';

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
  page: number;
  limit: number;
  total: number;
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
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [from, to, reference, supplierId, warehouseId, productId, search]);

  const { data, isLoading } = useReport<PtResp>('purchases-tax', '/reports/purchases-tax', {
    from,
    to,
    reference,
    supplierId,
    warehouseId,
    productId,
    search,
    page,
    limit: pageSize === -1 ? 100000 : pageSize,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<PtResp>('purchases-tax-export', '/reports/purchases-tax', {
    from,
    to,
    reference,
    supplierId,
    warehouseId,
    productId,
    search,
    limit: 100000,
  });
  const exportRows = exportQuery.data?.rows ?? rows;

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
      exportConfig={{ filename: 'purchases-tax-report', columns, rows: exportRows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Grand total" value={fmtMoney(t?.grandTotal)} />
        <StatCard label="Input tax" value={fmtMoney(t?.productTax)} />
        <StatCard label="CGST" value={fmtMoney(t?.cgst)} />
        <StatCard label="SGST" value={fmtMoney(t?.sgst)} />
      </div>
      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No purchases in range."
        totalsRow={totalsRow}
        onRowClick={(r) => setPurchaseId(r.id)}
        serverPagination={{
          page,
          pageSize,
          total: data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
        }}
      />
      <PurchaseDetailModal
        purchaseId={purchaseId}
        onOpenChange={(open) => {
          if (!open) setPurchaseId(null);
        }}
      />
    </ReportShell>
  );
}
