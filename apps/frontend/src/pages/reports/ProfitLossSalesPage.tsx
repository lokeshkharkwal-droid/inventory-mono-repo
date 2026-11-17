import { useEffect, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  CustomerFilter,
  WarehouseFilter,
  TextFilter,
  CategoryFilter,
  UserFilter,
} from '@/features/reports/filters';

interface PlsRow {
  saleId: string;
  date: string;
  reference: string;
  billerName: string;
  customerName: string;
  productName: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
  totalSales: number;
  totalPurchase: number;
  profit: number;
}
interface PlsResp {
  rows: PlsRow[];
  totals: { totalSales: number; totalPurchase: number; profit: number; marginPct: number };
  page: number;
  pageSize: number;
  total: number;
}

/** Profit and/or Loss on Sales — per sale-line margin (revenue − COGS). */
export function ProfitLossSalesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reference, setReference] = useState('');
  const [billerName, setBillerName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [serial, setSerial] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [from, to, customerId, warehouseId, reference, billerName, categoryId, createdBy, serial]);

  const filters = {
    from,
    to,
    customerId,
    warehouseId,
    reference,
    billerName,
    categoryId,
    createdBy,
    serial,
  };
  const { data, isLoading } = useReport<PlsResp>('profit-loss-sales', '/reports/profit-loss-sales', {
    ...filters,
    page,
    limit: pageSize === -1 ? 100000 : pageSize,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<PlsResp>('profit-loss-sales-export', '/reports/profit-loss-sales', {
    ...filters,
    limit: 100000,
  });
  const exportRows = exportQuery.data?.rows ?? rows;

  const columns: ReportColumn<PlsRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference', value: (r) => r.reference },
    { key: 'biller', header: 'Biller', value: (r) => r.billerName ?? '—' },
    { key: 'customer', header: 'Customer', value: (r) => r.customerName },
    { key: 'product', header: 'Product', value: (r) => r.productName },
    { key: 'qty', header: 'Qty', align: 'right', value: (r) => fmtQty(r.quantity) },
    { key: 'sp', header: 'Sale Price', align: 'right', value: (r) => fmtMoney(r.salePrice) },
    { key: 'pp', header: 'Cost Price', align: 'right', value: (r) => fmtMoney(r.purchasePrice) },
    { key: 'ts', header: 'Total Sales', align: 'right', value: (r) => fmtMoney(r.totalSales) },
    { key: 'tp', header: 'Total Cost', align: 'right', value: (r) => fmtMoney(r.totalPurchase) },
    {
      key: 'profit',
      header: 'Profit / Loss',
      align: 'right',
      value: (r) => fmtMoney(r.profit),
      render: (r) => (
        <span className={r.profit < 0 ? 'text-destructive' : ''}>{fmtMoney(r.profit)}</span>
      ),
    },
  ];
  const totalsRow = t
    ? ['Total', '', '', '', '', '', '', '', fmtMoney(t.totalSales), fmtMoney(t.totalPurchase), fmtMoney(t.profit)]
    : undefined;

  return (
    <ReportShell
      title="Profit and/or Loss on Sales"
      description="Per sale-line profit: revenue minus snapshotted unit cost."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <UserFilter label="Created By" value={createdBy} onChange={setCreatedBy} />
          <TextFilter label="Serial Number" value={serial} onChange={setSerial} placeholder="Serial…" />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <TextFilter label="Biller" value={billerName} onChange={setBillerName} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <CategoryFilter value={categoryId} onChange={setCategoryId} />
        </>
      }
      exportConfig={{ filename: 'profit-loss-on-sales', columns, rows: exportRows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={fmtMoney(t?.totalSales)} />
        <StatCard label="COGS" value={fmtMoney(t?.totalPurchase)} />
        <StatCard label="Profit" value={fmtMoney(t?.profit)} />
        <StatCard label="Margin %" value={`${(t?.marginPct ?? 0).toFixed(2)}%`} />
      </div>
      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => `${r.saleId}-${i}`}
        isLoading={isLoading}
        emptyMessage="No sales in range."
        totalsRow={totalsRow}
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
    </ReportShell>
  );
}
