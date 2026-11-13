import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, type ReportColumn } from '@/features/reports/types';
import { TextFilter } from '@/features/reports/filters';

interface CustomerRow {
  customerId: string;
  company: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  totalSales: number;
  totalAmount: number;
  paid: number;
  balance: number;
}
interface CustomerResp {
  rows: CustomerRow[];
  totals: { totalSales: number; totalAmount: number; paid: number; balance: number };
}

/** Walk-In Customers Report — customers with their lifetime sales totals. */
export function CustomersReportPage() {
  // Legacy had four per-column text filters (Company/Name/Phone/Email); the
  // backend collapses them into a single free-text `search` param — the only
  // query param the `customers` method honours.
  const [search, setSearch] = useState('');

  const { data, isLoading } = useReport<CustomerResp>('customers', '/reports/customers', { search });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<CustomerRow>[] = [
    { key: 'company', header: 'Company', value: (r) => r.company ?? '—' },
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
      title="Walk-In Customers Report"
      description="Walk-in customers with order count, billed, paid and balance."
      filters={
        <TextFilter
          label="Search"
          value={search}
          onChange={setSearch}
          placeholder="Company, name, phone or email"
        />
      }
      exportConfig={{ filename: 'customers-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Customers" value={rows.length} />
        <StatCard label="Total billed" value={fmtMoney(t?.totalAmount)} />
        <StatCard label="Paid" value={fmtMoney(t?.paid)} />
        <StatCard label="Balance" value={fmtMoney(t?.balance)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.customerId} isLoading={isLoading} emptyMessage="No customers with sales in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
