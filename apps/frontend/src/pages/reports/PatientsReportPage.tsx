import { useEffect, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, type ReportColumn } from '@/features/reports/types';
import { TextFilter, WarehouseFilter } from '@/features/reports/filters';

interface PatientRow {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  totalSales: number;
  totalAmount: number;
  paid: number;
  balance: number;
}
interface PatientResp {
  rows: PatientRow[];
  totals: { totalSales: number; totalAmount: number; paid: number; balance: number };
  page: number;
  limit: number;
  total: number;
}

/** Patients Report — patient-linked customers with their sales totals. */
export function PatientsReportPage() {
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [search, warehouseId]);

  const { data, isLoading } = useReport<PatientResp>('patients', '/reports/patients', {
    search,
    warehouseId,
    page,
    limit: pageSize === -1 ? 100000 : pageSize,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<PatientResp>('patients-export', '/reports/patients', {
    search,
    warehouseId,
    limit: 100000,
  });
  const exportRows = exportQuery.data?.rows ?? rows;

  const columns: ReportColumn<PatientRow>[] = [
    { key: 'code', header: 'Code', value: (r) => r.code ?? '—' },
    { key: 'name', header: 'Name', value: (r) => r.name },
    { key: 'phone', header: 'Phone', value: (r) => r.phone ?? '—' },
    { key: 'email', header: 'Email', value: (r) => r.email ?? '—' },
    { key: 'sales', header: 'Total Sales', align: 'right', value: (r) => r.totalSales },
    { key: 'amount', header: 'Total Amount', align: 'right', value: (r) => fmtMoney(r.totalAmount) },
    { key: 'paid', header: 'Paid', align: 'right', value: (r) => fmtMoney(r.paid) },
    { key: 'balance', header: 'Balance', align: 'right', value: (r) => fmtMoney(r.balance) },
  ];
  const totalsRow = t
    ? ['Total', '', '', '', t.totalSales, fmtMoney(t.totalAmount), fmtMoney(t.paid), fmtMoney(t.balance)]
    : undefined;

  return (
    <ReportShell
      title="Patients Report"
      description="Patient customers with order count, billed, paid and balance."
      imageExport
      filters={
        <>
          <TextFilter label="Search" value={search} onChange={setSearch} placeholder="Code, name, phone, email" />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: 'patients-report', columns, rows: exportRows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Patients" value={data?.total ?? rows.length} />
        <StatCard label="Total billed" value={fmtMoney(t?.totalAmount)} />
        <StatCard label="Paid" value={fmtMoney(t?.paid)} />
        <StatCard label="Balance" value={fmtMoney(t?.balance)} />
      </div>
      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No patients with sales in range."
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
