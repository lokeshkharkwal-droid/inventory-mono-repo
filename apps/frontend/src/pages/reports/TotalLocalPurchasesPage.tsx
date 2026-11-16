import { useMemo, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter } from '@/features/reports/filters';
import { useBranchOptions } from '@/features/_shared/branches';

interface Row {
  branchId: string | null;
  count: number;
  grandTotal: number;
}
interface Resp {
  rows: Row[];
  totals: { grandTotal: number; count: number };
}

/** Total Local Purchases — local-purchase requisitions rolled up per branch. */
export function TotalLocalPurchasesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: branches } = useBranchOptions();

  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (id: string | null) => (id ? (map.get(id) ?? id) : '—');
  }, [branches]);

  const params = { from, to };
  const { data, isLoading } = useReport<Resp>(
    'total-local-purchases',
    '/reports/total-local-purchases',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<Row>[] = [
    { key: 'branch', header: 'Branch', value: (r) => branchName(r.branchId) },
    { key: 'count', header: 'Count', align: 'right', value: (r) => fmtQty(r.count) },
    { key: 'grandTotal', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
  ];

  const totalsRow = totals
    ? ['Total', fmtQty(totals.count), fmtMoney(totals.grandTotal)]
    : undefined;

  return (
    <ReportShell
      title="Total Local Purchases"
      description="Local-purchase requisitions summarised per branch."
      filters={<DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />}
      exportConfig={{
        filename: 'total-local-purchases',
        columns,
        rows,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Branches" value={rows.length} />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.branchId ?? 'none'}
        isLoading={isLoading}
        emptyMessage="No local purchases found."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
