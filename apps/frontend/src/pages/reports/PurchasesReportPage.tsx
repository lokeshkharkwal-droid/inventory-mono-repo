import { useEffect, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, fmtItems, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, SupplierFilter, WarehouseFilter, TextFilter, ProductFilter, SelectFilter, UserFilter } from '@/features/reports/filters';
import { PurchaseDetailModal } from './PurchaseDetailModal';

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
  page: number;
  limit: number;
  total: number;
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
  const [createdBy, setCreatedBy] = useState('');
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [from, to, supplierId, warehouseId, productId, reference, status, createdBy]);

  const { data, isLoading } = useReport<PurResp>('purchases', '/reports/purchases', {
    from,
    to,
    supplierId,
    warehouseId,
    productId,
    reference,
    status,
    createdBy,
    page,
    limit: pageSize === -1 ? 100000 : pageSize,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<PurResp>('purchases-export', '/reports/purchases', {
    from,
    to,
    supplierId,
    warehouseId,
    productId,
    reference,
    status,
    createdBy,
    limit: 100000,
  });
  const exportRows = exportQuery.data?.rows ?? rows;

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
      imageExport
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <UserFilter label="Created By" value={createdBy} onChange={setCreatedBy} />
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
      exportConfig={{ filename: 'purchases-report', columns, rows: exportRows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Orders" value={data?.total ?? rows.length} />
        <StatCard label="Grand total" value={fmtMoney(t?.grandTotal)} />
        <StatCard label="Paid" value={fmtMoney(t?.paid)} />
        <StatCard label="Balance due" value={fmtMoney(t?.balance)} />
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
