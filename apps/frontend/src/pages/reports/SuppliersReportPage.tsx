import { useEffect, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, type ReportColumn } from '@/features/reports/types';
import { TextFilter, WarehouseFilter } from '@/features/reports/filters';

interface SupplierRow {
  supplierId: string;
  company: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  totalPurchases: number;
  totalAmount: number;
  paid: number;
  balance: number;
}
interface SupplierResp {
  rows: SupplierRow[];
  totals: { totalPurchases: number; totalAmount: number; paid: number; balance: number };
  page: number;
  limit: number;
  total: number;
}

/** Suppliers Report — suppliers with their lifetime purchase totals. */
export function SuppliersReportPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [warehouseId, search]);

  const { data, isLoading } = useReport<SupplierResp>('suppliers', '/reports/suppliers', {
    warehouseId,
    search,
    page,
    limit: pageSize === -1 ? 100000 : pageSize,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<SupplierResp>('suppliers-export', '/reports/suppliers', {
    warehouseId,
    search,
    limit: 100000,
  });
  const exportRows = exportQuery.data?.rows ?? rows;

  const columns: ReportColumn<SupplierRow>[] = [
    { key: 'company', header: 'Company', value: (r) => r.company ?? '—' },
    { key: 'name', header: 'Name', value: (r) => r.name },
    { key: 'phone', header: 'Phone', value: (r) => r.phone ?? '—' },
    { key: 'email', header: 'Email', value: (r) => r.email ?? '—' },
    { key: 'purchases', header: 'Total Purchases', align: 'right', value: (r) => r.totalPurchases },
    { key: 'amount', header: 'Total Amount', align: 'right', value: (r) => fmtMoney(r.totalAmount) },
    { key: 'paid', header: 'Paid', align: 'right', value: (r) => fmtMoney(r.paid) },
    { key: 'balance', header: 'Balance', align: 'right', value: (r) => fmtMoney(r.balance) },
  ];
  const totalsRow = t
    ? ['Total', '', '', '', t.totalPurchases, fmtMoney(t.totalAmount), fmtMoney(t.paid), fmtMoney(t.balance)]
    : undefined;

  return (
    <ReportShell
      title="Suppliers Report"
      description="Suppliers with purchase count, billed, paid and balance owed."
      imageExport
      filters={
        <>
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Company / Name / Phone / Email"
          />
        </>
      }
      exportConfig={{ filename: 'suppliers-report', columns, rows: exportRows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Suppliers" value={data?.total ?? rows.length} />
        <StatCard label="Total billed" value={fmtMoney(t?.totalAmount)} />
        <StatCard label="Paid" value={fmtMoney(t?.paid)} />
        <StatCard label="Balance owed" value={fmtMoney(t?.balance)} />
      </div>
      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.supplierId}
        isLoading={isLoading}
        emptyMessage="No suppliers with purchases in range."
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
