import { useMemo, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, TextFilter } from '@/features/reports/filters';
import { useBranchOptions } from '@/features/_shared/branches';

interface Row {
  id: string;
  date: string | null;
  reference: string;
  branchId: string | null;
  fromBranchId: string | null;
  status: string;
  grandTotal: number;
}
interface Resp {
  rows: Row[];
  totals: { grandTotal: number; count: number };
}

/** Local Purchases — requisitions fulfilled as local purchases, per requisition. */
export function LocalPurchasesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const { data: branches } = useBranchOptions();

  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (id: string | null) => (id ? (map.get(id) ?? id) : '—');
  }, [branches]);

  const params = { from, to, search };
  const { data, isLoading } = useReport<Resp>(
    'local-purchases',
    '/reports/local-purchases',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<Row>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'reference', header: 'Reference', value: (r) => r.reference },
    { key: 'branch', header: 'Branch', value: (r) => branchName(r.branchId) },
    { key: 'status', header: 'Status', value: (r) => r.status },
    { key: 'grandTotal', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
  ];

  const totalsRow = totals
    ? ['Total', '', '', '', fmtMoney(totals.grandTotal)]
    : undefined;

  return (
    <ReportShell
      title="Local Purchases"
      description="Requisitions fulfilled through a local purchase."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Search" value={search} onChange={setSearch} placeholder="Reference…" />
        </>
      }
      exportConfig={{
        filename: 'local-purchases',
        columns,
        rows,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Local purchases" value={totals?.count ?? rows.length} />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No local purchases found."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
