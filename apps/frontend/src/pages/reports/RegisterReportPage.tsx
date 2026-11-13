import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDateTime, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, WarehouseFilter } from '@/features/reports/filters';

interface RegisterRow {
  id: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  openedBy: string | null;
  closedBy: string | null;
  registerId: string;
  registerName: string;
  openingCash: number;
  cashDeclared: number;
  cashSubmitted: number;
  cashDifference: number;
  isShort: boolean;
  note: string | null;
  // Documented data gaps — no per-tender split in the inventory schema.
  ccSlips: number | null;
  cheques: number | null;
}
interface RegisterResp {
  from: string | null;
  to: string | null;
  rows: RegisterRow[];
}

/**
 * Register Report — one row per POS open/close session over a date range, with
 * cash-drawer reconciliation (declared vs submitted, over/short) per session.
 * Short rows (closingCash < expectedCash) are flagged. CC Slips and Cheques
 * columns have no source in the inventory schema and render "N/A" (data gap
 * kept visible rather than silently dropped). No footer totals in the legacy
 * report — this is a flat per-session log.
 */
export function RegisterReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const params = { from, to, warehouseId };
  const { data, isLoading } = useReport<RegisterResp>(
    'register',
    '/reports/register',
    params,
  );
  const rows = data?.rows ?? [];

  const sessions = rows.length;
  const shortSessions = rows.filter((r) => r.isShort).length;
  const openSessions = rows.filter((r) => r.closedAt == null).length;
  const netOverShort = rows.reduce((s, r) => s + r.cashDifference, 0);

  const columns: ReportColumn<RegisterRow>[] = [
    { key: 'openedAt', header: 'Open Time', value: (r) => fmtDateTime(r.openedAt) },
    { key: 'closedAt', header: 'Close Time', value: (r) => fmtDateTime(r.closedAt) },
    { key: 'register', header: 'Register', value: (r) => r.registerName },
    { key: 'user', header: 'User', value: (r) => r.openedBy ?? '—' },
    {
      key: 'openingCash',
      header: 'Cash in Hand',
      align: 'right',
      value: (r) => fmtMoney(r.openingCash),
    },
    {
      key: 'ccSlips',
      header: 'CC Slips',
      align: 'right',
      value: (r) => (r.ccSlips == null ? 'N/A' : fmtMoney(r.ccSlips)),
    },
    {
      key: 'cheques',
      header: 'Cheques',
      align: 'right',
      value: (r) => (r.cheques == null ? 'N/A' : fmtMoney(r.cheques)),
    },
    {
      key: 'totalCash',
      header: 'Total Cash',
      value: (r) =>
        `${fmtMoney(r.cashDeclared)} / ${fmtMoney(r.cashSubmitted)} / ${fmtMoney(r.cashDifference)}`,
      render: (r) => (
        <span className="whitespace-pre-line text-xs">
          {fmtMoney(r.cashDeclared)}
          {'\n'}
          <span className="text-green-600">{fmtMoney(r.cashSubmitted)}</span>
          {'\n'}
          <span className={r.isShort ? 'text-red-600' : ''}>
            {fmtMoney(r.cashDifference)}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      value: (r) => (r.isShort ? 'Short' : r.closedAt == null ? 'Open' : 'Balanced'),
      render: (r) => (
        <span
          className={
            r.isShort
              ? 'text-red-600'
              : r.closedAt == null
                ? 'text-amber-600'
                : 'text-green-600'
          }
        >
          {r.isShort ? 'Short' : r.closedAt == null ? 'Open' : 'Balanced'}
        </span>
      ),
    },
    { key: 'note', header: 'Note', value: (r) => r.note ?? '—' },
  ];

  return (
    <ReportShell
      title="Register Report"
      description="POS open/close sessions with per-session cash-drawer reconciliation (declared vs submitted, over/short)."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{
        filename: 'register-report',
        columns,
        rows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sessions" value={sessions} />
        <StatCard label="Open sessions" value={openSessions} />
        <StatCard label="Short sessions" value={shortSessions} />
        <StatCard label="Net over/short" value={fmtMoney(netOverShort)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No register sessions in range."
      />
    </ReportShell>
  );
}
