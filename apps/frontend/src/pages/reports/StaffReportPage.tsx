import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, WarehouseFilter } from '@/features/reports/filters';

interface StaffRow {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  salesCount: number;
  salesTotal: number;
  salesPaid: number;
  purchasesCount: number;
  purchasesTotal: number;
  purchasesPaid: number;
}
interface StaffResp {
  rows: StaffRow[];
  totals: {
    salesCount: number;
    salesTotal: number;
    salesPaid: number;
    purchasesCount: number;
    purchasesTotal: number;
    purchasesPaid: number;
  };
}

const dash = (v: string | null): string => (v && v.trim() ? v : '—');

/** Staff Report — sales & purchases performance per staff member (createdBy). */
export function StaffReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading } = useReport<StaffResp>('staff', '/reports/staff', {
    from,
    to,
    warehouseId,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<StaffRow>[] = [
    { key: 'firstName', header: 'First Name', value: (r) => dash(r.firstName) },
    { key: 'lastName', header: 'Last Name', value: (r) => dash(r.lastName) },
    { key: 'email', header: 'Email', value: (r) => dash(r.email) },
    { key: 'sc', header: 'Sales', align: 'right', value: (r) => r.salesCount },
    { key: 'st', header: 'Sales Total', align: 'right', value: (r) => fmtMoney(r.salesTotal) },
    { key: 'sp', header: 'Sales Paid', align: 'right', value: (r) => fmtMoney(r.salesPaid) },
    { key: 'pc', header: 'Purchases', align: 'right', value: (r) => r.purchasesCount },
    { key: 'pt', header: 'Purchases Total', align: 'right', value: (r) => fmtMoney(r.purchasesTotal) },
    { key: 'pp', header: 'Purchases Paid', align: 'right', value: (r) => fmtMoney(r.purchasesPaid) },
  ];
  const totalsRow = t
    ? ['Total', '', '', t.salesCount, fmtMoney(t.salesTotal), fmtMoney(t.salesPaid), t.purchasesCount, fmtMoney(t.purchasesTotal), fmtMoney(t.purchasesPaid)]
    : undefined;

  return (
    <ReportShell
      title="Staff Report"
      description="Sales and purchases recorded by each staff member in the range."
      filters={
        <>
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        </>
      }
      exportConfig={{ filename: 'staff-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Staff" value={rows.length} />
        <StatCard label="Sales total" value={fmtMoney(t?.salesTotal)} />
        <StatCard label="Purchases total" value={fmtMoney(t?.purchasesTotal)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.userId} isLoading={isLoading} emptyMessage="No staff activity in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
