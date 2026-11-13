import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  TextFilter,
  WarehouseFilter,
} from '@/features/reports/filters';

interface IpdDepartmentRow {
  department: string;
  chargeCount: number;
  admissionCount: number;
  amount: number;
}
interface IpdDepartmentResp {
  rows: IpdDepartmentRow[];
  totals: {
    departments: number;
    chargeCount: number;
    amount: number;
  };
  range: { from: string | null; to: string | null };
}

/**
 * IPD Department Sales — the IPD charge ledger rolled up by charge category
 * ("department"), one row per department carrying the number of charge lines,
 * the number of distinct admissions billed, and the summed amount, with a
 * footer totals row and CSV/PDF export. Follows the canonical list-report
 * template (SalesReportPage).
 */
export function IpdDepartmentSalesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [ipdRegNo, setIpdRegNo] = useState('');

  const params = { from, to, departmentName, warehouseId, ipdRegNo };
  const { data, isLoading } = useReport<IpdDepartmentResp>(
    'ipd-department-sales',
    '/reports/ipd-department-sales',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<IpdDepartmentRow>[] = [
    { key: 'department', header: 'Department', value: (r) => r.department },
    {
      key: 'admissionCount',
      header: 'Admissions',
      align: 'right',
      value: (r) => fmtQty(r.admissionCount),
    },
    {
      key: 'chargeCount',
      header: 'Charge Lines',
      align: 'right',
      value: (r) => fmtQty(r.chargeCount),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      value: (r) => fmtMoney(r.amount),
    },
  ];

  const totalsRow = totals
    ? ['Total', '', fmtQty(totals.chargeCount), fmtMoney(totals.amount)]
    : undefined;

  return (
    <ReportShell
      title="IPD Department Sales"
      description="Inpatient charge ledger rolled up by department (charge category), with charge/admission counts and amount."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter
            label="Department"
            value={departmentName}
            onChange={setDepartmentName}
            placeholder="Department…"
          />
          <TextFilter
            label="IPD Reg No"
            value={ipdRegNo}
            onChange={setIpdRegNo}
            placeholder="IPD reg no…"
          />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{
        filename: 'ipd-department-sales',
        columns,
        rows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Departments" value={totals?.departments ?? rows.length} />
        <StatCard label="Charge lines" value={fmtQty(totals?.chargeCount)} />
        <StatCard label="Total amount" value={fmtMoney(totals?.amount)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => `${r.department}-${i}`}
        isLoading={isLoading}
        emptyMessage="No IPD department charges in range."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
